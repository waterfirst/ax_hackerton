# 혼팀 OS

여러 AI의 중복 작업, 기준본 충돌, 맥락 유실을 막는 브라우저 기반 AI 협업 지휘소다.

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
```

## 데이터와 보안

- 프로젝트 데이터는 브라우저 `localStorage`에만 저장된다.
- OpenRouter 연결은 선택사항이며 입력 키는 현재 탭의 메모리에만 남는다.
- 기본 데모는 외부 API 없이 작동한다.
- 공개 데모 데이터는 합성 예시이며 회사 자료와 개인정보를 포함하지 않는다.
