# 혼팀 OS

여러 AI의 중복 작업, 기준본 충돌, 맥락 유실을 막는 AI 협업 지휘소다. Codex CLI와 Claude Code는 각 구독 로그인으로 연결하고, Gemini·DeepSeek·Z.AI·Grok은 서버 API 키로 보조 편성한다.

## 공개 서비스

<https://waterfirst.github.io/ax_hackerton/hontim/>

## 실행

```bash
python3 -m http.server 4173
```

이 디렉터리에서 실행했다면 `http://localhost:4173/`을 열면 된다.

## 검증

```bash
node --test core.test.mjs
python3 -m unittest bridge.test_bridge
```

## HonTeam Bridge

```bash
cp deploy/bridge.env.example ~/.config/hontim/bridge.env
# 긴 HONTIM_BRIDGE_TOKEN과 필요한 API 키를 설정
python3 -m uvicorn bridge.hontim_bridge:app --host 127.0.0.1 --port 8791
```

- `codex login status`와 `claude auth status`로 구독 로그인을 확인한다.
- 메인은 Codex 또는 Claude 중 선택하고 다른 하나가 독립 검증자가 된다.
- Gemini는 근거 조사, DeepSeek는 기술 반론, Z.AI는 압축 요약, Grok은 최신 이슈·시장 관점 교차검증을 맡는다.
- 기본 실행은 읽기 전용이다. 파일 수정은 `execute` 모드에서 허용 작업폴더에만 적용된다.

## 데이터와 보안

- 프로젝트 데이터는 브라우저 `localStorage`에만 저장된다.
- 구독 인증과 API 키는 브리지 서버에만 남고 브라우저로 전달되지 않는다.
- 브리지 접속 토큰은 현재 탭의 메모리에만 남는다.
- 기본 데모는 외부 API 없이 작동한다.
- 공개 데모 데이터는 합성 예시이며 회사 자료와 개인정보를 포함하지 않는다.
