from __future__ import annotations

import asyncio
import json
import os
import shutil
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


APP_VERSION = "0.2.0"
MAX_PROMPT = 12_000
MAX_PROVIDER_OUTPUT = 32_000
DEFAULT_WORKSPACE = Path(os.getenv("HONTIM_DEFAULT_WORKSPACE", "/home/waterfirst/.cokacdir/workspace/d3nczn7h")).resolve()
WORKSPACES = {"default": DEFAULT_WORKSPACE}
TOKEN = os.getenv("HONTIM_BRIDGE_TOKEN", "")
ALLOWED_ORIGINS = [x.strip() for x in os.getenv(
    "HONTIM_ALLOWED_ORIGINS",
    "https://waterfirst.pro,https://www.waterfirst.pro,https://waterfirst.github.io,http://127.0.0.1:4173,http://localhost:4173",
).split(",") if x.strip()]

app = FastAPI(title="HonTeam Bridge", version=APP_VERSION, docs_url=None, redoc_url=None)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

_requests: dict[str, deque[float]] = defaultdict(deque)
_api_probe_cache: dict[str, tuple[float, bool, str]] = {}


class OrchestrationRequest(BaseModel):
    task: str = Field(min_length=3, max_length=MAX_PROMPT)
    main: Literal["codex", "claude"] = "claude"
    mode: Literal["plan", "execute"] = "plan"
    auxiliaries: list[Literal["gemini", "deepseek", "zai", "grok"]] = Field(default_factory=list, max_length=4)
    workspace: Literal["default"] = "default"

    @field_validator("auxiliaries")
    @classmethod
    def unique_auxiliaries(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))


class PlanRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    goal: str = Field(min_length=3, max_length=4_000)
    deadline: str = Field(default="", max_length=40)
    canonical: str = Field(default="", max_length=200)
    constraints: str = Field(default="", max_length=4_000)
    main: Literal["codex", "claude"] = "claude"
    workspace: Literal["default"] = "default"


async def require_auth(request: Request, authorization: str | None = Header(default=None)) -> None:
    if not TOKEN:
        raise HTTPException(503, "브리지 인증 토큰이 설정되지 않았어.")
    if authorization != f"Bearer {TOKEN}":
        raise HTTPException(401, "브리지 토큰이 올바르지 않아.")
    now = time.monotonic()
    bucket = _requests[request.client.host if request.client else "unknown"]
    while bucket and now - bucket[0] > 60:
        bucket.popleft()
    if len(bucket) >= 12:
        raise HTTPException(429, "1분 요청 한도를 넘었어. 잠시 후 다시 시도해.")
    bucket.append(now)


def _trim(value: str, limit: int = MAX_PROVIDER_OUTPUT) -> str:
    value = value.strip()
    return value if len(value) <= limit else value[:limit] + "\n[출력 잘림]"


async def _run(args: list[str], cwd: Path, timeout: int = 300, combine_output: bool = False) -> str:
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=os.environ.copy(),
        )
    except FileNotFoundError as exc:
        raise RuntimeError(f"{args[0]} CLI가 설치되지 않았어.") from exc
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        proc.kill()
        await proc.communicate()
        raise RuntimeError(f"{args[0]} 호출이 {timeout}초를 넘겨 중단됐어.")
    if proc.returncode:
        detail = _trim(stderr.decode("utf-8", "replace"), 2_000)
        raise RuntimeError(f"{args[0]} 호출 실패({proc.returncode}): {detail}")
    output = stdout.decode("utf-8", "replace")
    if combine_output:
        output = stderr.decode("utf-8", "replace") + "\n" + output
    return _trim(output)


async def invoke_codex(prompt: str, workspace: Path, mode: str = "plan") -> str:
    sandbox = "workspace-write" if mode == "execute" else "read-only"
    args = [
        "codex", "exec", "--ephemeral", "--ignore-rules", "--ignore-user-config",
        "--skip-git-repo-check", "--sandbox", sandbox, "-C", str(workspace), prompt,
    ]
    return await _run(args, workspace)


async def invoke_claude(prompt: str, workspace: Path, mode: str = "plan") -> str:
    args = [
        "claude", "-p", "--no-session-persistence", "--output-format", "text",
        "--permission-mode", "acceptEdits" if mode == "execute" else "plan",
    ]
    args.append(prompt)
    if mode == "execute":
        args += ["--allowedTools", "Read,Glob,Grep,Edit,Write"]
    else:
        args += ["--restricted"]
    return await _run(args, workspace)


async def invoke_cli(provider: str, prompt: str, workspace: Path, mode: str = "plan") -> str:
    if provider == "codex":
        return await invoke_codex(prompt, workspace, mode)
    if provider == "claude":
        return await invoke_claude(prompt, workspace, mode)
    raise RuntimeError(f"지원하지 않는 CLI 공급자: {provider}")


def _post_json(url: str, headers: dict[str, str], payload: dict, timeout: int = 120) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1_000]
        raise RuntimeError(f"API 오류 {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"API 연결 실패: {exc.reason}") from exc


async def invoke_api(provider: str, prompt: str) -> str:
    if provider == "gemini":
        key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not key:
            raise RuntimeError("GEMINI_API_KEY가 설정되지 않았어.")
        model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        data = await asyncio.to_thread(
            _post_json,
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            {"x-goog-api-key": key},
            {"contents": [{"parts": [{"text": prompt}]}]},
        )
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        return _trim("\n".join(str(x.get("text", "")) for x in parts))

    settings = {
        "deepseek": (
            "DEEPSEEK_API_KEY", os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        ),
        "zai": (
            "ZAI_API_KEY", os.getenv("ZAI_BASE_URL", "https://api.z.ai/api/paas/v4"),
            os.getenv("ZAI_MODEL", "glm-5.1"),
        ),
        "grok": (
            "XAI_API_KEY", os.getenv("XAI_BASE_URL", "https://api.x.ai/v1"),
            os.getenv("XAI_MODEL", "grok-4.6"),
        ),
    }
    key_name, base_url, model = settings[provider]
    key = os.getenv(key_name)
    if not key:
        raise RuntimeError(f"{key_name}가 설정되지 않았어.")
    data = await asyncio.to_thread(
        _post_json,
        f"{base_url.rstrip('/')}/chat/completions",
        {"Authorization": f"Bearer {key}"},
        {"model": model, "messages": [{"role": "user", "content": prompt}], "stream": False},
    )
    return _trim(str(data.get("choices", [{}])[0].get("message", {}).get("content", "")))


async def provider_status() -> dict:
    result: dict[str, dict] = {}
    codex_path = shutil.which("codex")
    claude_path = shutil.which("claude")
    result["codex"] = {"kind": "subscription", "installed": bool(codex_path), "connected": False}
    result["claude"] = {"kind": "subscription", "installed": bool(claude_path), "connected": False}
    if codex_path:
        try:
            output = await _run(["codex", "login", "status"], DEFAULT_WORKSPACE, timeout=20, combine_output=True)
            result["codex"]["connected"] = "Logged in" in output
            result["codex"]["detail"] = "ChatGPT 구독 로그인" if result["codex"]["connected"] else "로그인 필요"
        except RuntimeError:
            result["codex"]["detail"] = "상태 확인 실패"
    if claude_path:
        try:
            output = await _run(["claude", "auth", "status"], DEFAULT_WORKSPACE, timeout=20)
            data = json.loads(output)
            result["claude"]["connected"] = bool(data.get("loggedIn"))
            subscription = str(data.get("subscriptionType") or "구독")
            result["claude"]["detail"] = f"Claude {subscription.title()} 로그인" if data.get("loggedIn") else "로그인 필요"
        except (RuntimeError, json.JSONDecodeError):
            result["claude"]["detail"] = "상태 확인 실패"
    api_keys = {
        "gemini": ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
        "deepseek": ("DEEPSEEK_API_KEY",),
        "zai": ("ZAI_API_KEY",),
        "grok": ("XAI_API_KEY", "GROK_API_KEY"),
    }

    async def probe(provider: str, key_names: tuple[str, ...]) -> tuple[str, bool, str]:
        if not any(bool(os.getenv(name)) for name in key_names):
            return provider, False, "API 키 필요"
        cached = _api_probe_cache.get(provider)
        if cached and time.monotonic() - cached[0] < 300:
            return provider, cached[1], cached[2]
        try:
            await invoke_api(provider, "연결 점검이다. PROVIDER_OK만 출력하라.")
            state = (time.monotonic(), True, "API 응답 정상")
        except RuntimeError as exc:
            message = str(exc)
            if "429" in message:
                detail = "할당량·결제 확인 필요 (429)"
            elif "401" in message or "403" in message:
                detail = "API 키 인증 실패"
            else:
                detail = "API 연결 실패"
            state = (time.monotonic(), False, detail)
        _api_probe_cache[provider] = state
        return provider, state[1], state[2]

    api_rows = await asyncio.gather(*(probe(name, keys) for name, keys in api_keys.items()))
    for provider, connected, detail in api_rows:
        result[provider] = {"kind": "api", "installed": True, "connected": connected, "detail": detail}
    return result


def _aux_prompt(task: str, provider: str) -> str:
    roles = {
        "gemini": "공식 근거와 대안 조사",
        "deepseek": "기술적 반론과 실패 가능성 검토",
        "zai": "핵심 쟁점과 실행 체크리스트 압축",
        "grok": "최신 이슈·시장·커뮤니티 관점의 교차검증",
    }
    return f"너는 혼팀 OS의 보조 분석자다. 역할: {roles[provider]}. 직접 파일을 수정하지 말고, 다음 과업에 필요한 사실·위험·권고만 짧게 보고하라.\n\n과업:\n{task}"


async def orchestrate(payload: OrchestrationRequest) -> dict:
    workspace = WORKSPACES[payload.workspace]
    if not workspace.is_dir():
        raise RuntimeError("허용 작업폴더가 존재하지 않아.")
    secondary = "claude" if payload.main == "codex" else "codex"

    async def run_aux(name: str) -> tuple[str, str]:
        try:
            return name, await invoke_api(name, _aux_prompt(payload.task, name))
        except RuntimeError as exc:
            return name, f"[사용 불가] {exc}"

    aux_rows = await asyncio.gather(*(run_aux(name) for name in payload.auxiliaries))
    auxiliary = dict(aux_rows)
    context = "\n\n".join(f"[{name.upper()} 보조 의견]\n{text}" for name, text in auxiliary.items())
    main_prompt = (
        "너는 혼팀 OS의 메인 실행자다. 과업을 책임지고 완결하라. "
        "근거와 추론을 분리하고, 수행내용·검증근거·미해결·다음 행동을 보고하라. "
        + ("허용된 작업폴더 안에서 필요한 파일 수정을 수행하라." if payload.mode == "execute" else "파일을 수정하지 말고 실행 계획 또는 답안을 작성하라.")
        + f"\n\n과업:\n{payload.task}"
        + (f"\n\n보조 분석:\n{context}" if context else "")
    )
    main_result = await invoke_cli(payload.main, main_prompt, workspace, payload.mode)
    review_prompt = (
        "너는 독립 검증자다. 파일을 수정하지 마라. 다음 과업과 메인 결과를 대조해 "
        "누락·오류·근거 부족·위험을 찾고 PASS 또는 REVISE로 판정하라. 수정 권고를 구체적으로 적어라."
        f"\n\n과업:\n{payload.task}\n\n메인 결과:\n{main_result}"
    )
    review = await invoke_cli(secondary, review_prompt, workspace, "plan")
    final_prompt = (
        "너는 최종 책임자다. 파일을 추가 수정하지 말고, 초안과 독립 검토를 통합해 사용자에게 전달할 "
        "최종 결과만 작성하라. 검토가 지적한 오류는 바로잡고, 해결되지 않은 문제는 숨기지 마라."
        f"\n\n과업:\n{payload.task}\n\n초안/수행 결과:\n{main_result}\n\n독립 검토:\n{review}"
    )
    final = await invoke_cli(payload.main, final_prompt, workspace, "plan")
    return {
        "main": payload.main,
        "secondary": secondary,
        "mode": payload.mode,
        "auxiliary": auxiliary,
        "draft": main_result,
        "review": review,
        "final": final,
    }


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": "hontim-bridge", "version": APP_VERSION}


@app.get("/v1/providers", dependencies=[Depends(require_auth)])
async def providers() -> dict:
    return {"providers": await provider_status(), "workspaces": list(WORKSPACES)}


@app.post("/v1/orchestrate", dependencies=[Depends(require_auth)])
async def run_orchestration(payload: OrchestrationRequest) -> dict:
    try:
        return await orchestrate(payload)
    except RuntimeError as exc:
        raise HTTPException(502, str(exc)) from exc


@app.post("/v1/plan", dependencies=[Depends(require_auth)])
async def plan(payload: PlanRequest) -> dict:
    task = (
        "다음 프로젝트를 5~8개의 검증 가능한 작업으로 분해하라. JSON 객체만 반환하라. "
        "키는 tasks이며 각 작업은 title, output, writeSet(문자열 배열), executor, reviewer, "
        "humanApproval(불리언), criteria(문자열 배열)를 포함한다. executor와 reviewer는 Codex 또는 Claude로 지정하라."
        f"\n프로젝트: {payload.name}\n목표: {payload.goal}\n마감: {payload.deadline or '미정'}"
        f"\n기준본: {payload.canonical or '미정'}\n제약: {payload.constraints or '없음'}"
    )
    workspace = WORKSPACES[payload.workspace]
    try:
        raw = await invoke_cli(payload.main, task, workspace, "plan")
        start, end = raw.find("{"), raw.rfind("}")
        data = json.loads(raw[start:end + 1])
        if not isinstance(data.get("tasks"), list):
            raise ValueError("tasks 누락")
        return data
    except (RuntimeError, ValueError, json.JSONDecodeError) as exc:
        raise HTTPException(502, f"계획 JSON을 만들지 못했어: {exc}") from exc
