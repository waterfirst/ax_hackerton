---
name: "혼팀 OS"
description: "혼자 일하지만, 혼자 일하지 않는 방법"
colors:
  void: "#07151d"
  deep: "#0b202a"
  panel: "#102b35"
  panel-raised: "#153641"
  ink: "#eef4ef"
  muted: "#9fb2b4"
  faint: "#789098"
  track: "#3bb7c7"
  running: "#72c68a"
  caution: "#f2ad49"
  conflict: "#ef6468"
  line: "#264852"
typography:
  display:
    fontFamily: "SUIT Variable, Noto Sans KR, sans-serif"
    fontSize: "clamp(32px, 4vw, 56px)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "SUIT Variable, Noto Sans KR, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "-0.02em"
  body:
    fontFamily: "SUIT Variable, Noto Sans KR, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
rounded:
  signal: "50%"
  mark: "2px"
  control-sm: "8px"
  control: "10px"
  button: "12px"
  notice: "14px"
  panel: "15px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "28px"
  3xl: "42px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.void}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
    height: "42px"
  button-signal:
    backgroundColor: "{colors.caution}"
    textColor: "#211500"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
    height: "42px"
  button-ghost:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.button}"
    padding: "10px 15px"
    height: "42px"
  field:
    backgroundColor: "{colors.void}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "12px"
---

# Design System: 혼팀 OS

## Overview

**Creative North Star: "야간 철도 신호 연동실"**

혼팀 OS는 청흑색 관제실 위에 선로, 신호등, 운행표, 원장을 배치한다. 화면은 채팅이나 카드형 SaaS 대시보드처럼 보이지 않는다. 프로젝트의 흐름을 좌측 작업 노선으로, 개별 작업의 책임과 상태를 우측 운행표로 읽게 한다.

표현은 어둡고 밀도 높지만 장식적이지 않다. 상아색 활자와 얇은 청회색 경계가 정보 구조를 만들고, 청록·녹색·호박색·적색은 작업 상태와 다음 행동에만 집중된다. 패널은 별도 페이지가 아니라 우측에서 진입하는 제어 구획으로 동작한다.

**Key Characteristics:**
- 야간 철도 신호 연동실을 닮은 청흑색 작업 환경
- 선로와 원형 신호를 이용한 작업 흐름 표현
- 카드 묶음보다 행, 구획선, 운행표를 우선하는 고밀도 구성
- 짧고 구체적인 한국어 상태 문구와 모노스페이스 식별자
- 색상과 함께 상태명, 위치, 형태를 중복 제공하는 판독 방식

## Colors

청흑색 표면을 여러 층으로 나누고, 상아색 정보 위에 철도 신호색을 제한적으로 얹는다.

### Primary
- **선로 청록:** 작업 노선, 통과 상태, 활성 탭 밑줄, 식별자와 텍스트 동작에 사용한다.

### Secondary
- **운행 녹색:** 실행 중인 작업과 로컬 운행 상태에 사용한다.
- **주의 호박:** 다음 행동, 검증 대기, 승인 필요, 포커스 링과 압축 지표에 사용한다.
- **충돌 적색:** 차단 상태, 충돌 신호, 오류 토스트에 사용한다.

### Neutral
- **야간 공백:** 문서와 입력 필드의 가장 깊은 배경이다.
- **심층 청흑:** 보조 버튼, 행 호버, 카드형 바톤의 기본 표면이다.
- **관제 패널 / 상승 패널:** 필터 선택과 제어 영역의 층위를 구분한다.
- **상아 잉크:** 주요 제목, 값, 기본 텍스트다.
- **감쇠 청회색:** 설명, 보조 상태, 메타데이터다.
- **희미한 청회색:** 비활성 신호와 작은 보조 레이블이다.
- **구획선:** 표, 레일, 탭, 패널 사이를 1px 선으로 나눈다.

**The Signal-Only Color Rule.** 녹색, 호박색, 적색은 상태와 행동을 전달할 때만 사용한다. 넓은 장식 면으로 확장하지 않는다.

**The Red Means Intervention Rule.** 적색은 충돌, 차단, 실패처럼 사용자의 개입이 필요한 상황에만 배정한다.

## Typography

**Display Font:** SUIT Variable (Noto Sans KR, sans-serif 대체)
**Body Font:** SUIT Variable (Noto Sans KR, sans-serif 대체)
**Label/Mono Font:** ui-monospace (monospace 대체)

**Character:** SUIT의 단정한 한글 가독성이 관제 정보의 주축을 맡고, 모노스페이스는 프로젝트 경로·작업 번호·패널 식별자를 기계 판독 가능한 정보처럼 분리한다. 큰 프로젝트명만 단단하게 확대하고 나머지는 작은 크기와 굵기 차이로 밀도를 유지한다.

### Hierarchy
- **Display** (700, 유동형 32–56px, 1.04): 현재 프로젝트명을 표시한다. 모바일에서는 34px로 고정된다.
- **Headline** (700, 22px, 기본 행간): 작업 운행표와 주요 섹션 제목에 사용한다. 패널 제목은 24px이다.
- **Title** (700, 15–20px): 작업명, 바톤 요약, 브랜드명에 사용한다.
- **Body** (400, 16px, 1.5): 전역 본문과 폼 컨트롤의 기준이다. 운행표 설명과 세부 정보는 11–14px로 축소한다.
- **Label** (700, 10–12px, 최대 0.08em): 작업 ID, 프로젝트 경로, 관제 정보 레이블에 사용한다. 식별자는 모노스페이스를 쓴다.

**The Identifier Split Rule.** 작업 코드와 시스템 경로만 모노스페이스로 표시하고, 제목과 설명은 SUIT로 유지한다.

## Layout

상단에는 74px 높이의 고정 관제 바가 있고, 그 아래는 310px 제어 레일과 유동형 작업 공간의 2열 구조다. 작업 공간은 좌우 `clamp(24px, 4vw, 64px)` 여백을 갖는다. 첫 화면은 좌측 작업 노선과 우측 작업 운행표가 함께 보이도록 구성되며, 운행표는 카드 그리드가 아니라 1px 구획선으로 이어지는 행 목록이다.

작업 행은 신호·작업 ID, 작업명과 산출물, 실행자, 검증자, 상태, 열기 동작의 6개 열로 구성된다. 바톤 화면은 기록과 250px 압축 계기를 나누고, 결정·근거 화면은 동일 비중의 두 원장으로 나눈다. 패널은 우측에서 최대 560px 너비로 화면 전체 높이를 차지한다.

- **1450px 이하:** 프로젝트 머리말의 제목과 동작을 세로로 쌓고 동작은 우측 정렬한다.
- **1050px 이하:** 제어 레일을 250px로 줄이고, 운행표 일부 역할·상태 열을 숨긴다. 바톤과 압축 계기, 결정과 근거 원장은 각각 한 열로 전환한다.
- **760px 이하:** 상단 바는 64px가 되고 제어 레일은 문서 흐름 안의 상단 구획이 된다. 노선도와 관제 정보는 숨기며, 운행표는 신호/ID·작업·열기의 3열이 된다. 상태명은 작업 본문 안에 다시 노출한다. 폼과 바톤 열은 한 열이 되고 가로 넘침은 차단한다.

**The Route-and-Timetable Rule.** 넓은 화면에서는 노선과 운행표를 동시에 유지한다. 작은 화면에서 노선을 숨길 때는 각 작업 행 안에 텍스트 상태를 반드시 남긴다.

## Elevation & Depth

기본 구조는 그림자보다 배경의 청흑색 층위와 1px 구획선으로 깊이를 만든다. 그림자는 떠 있는 바톤 기록, 충돌 알림, 토스트, 우측 패널처럼 문서 흐름 위로 올라오는 요소에만 사용한다.

### Shadow Vocabulary
- **패널 부상:** 우측 드로어와 토스트를 화면 위로 분리하는 깊은 그림자 (`0 18px 44px rgba(0,0,0,.28)`).
- **바톤 부상:** 바톤 기록에 쓰는 낮은 그림자 (`0 14px 34px rgba(0,0,0,.15)`).
- **충돌 부상:** 충돌 배너를 운행표에서 분리하는 얕은 그림자 (`0 12px 30px rgba(0,0,0,.16)`).
- **신호 후광:** 운행·주의·충돌 신호 주변에 같은 색의 낮은 투명도 링을 둔다.

**The Flat Track Rule.** 운행표, 원장, 제어 레일은 평평하게 유지한다. 문서 흐름을 떠나는 요소에만 그림자를 허용한다.

## Shapes

표면은 작고 부드러운 8–15px 모서리를 사용하고, 상태 신호는 완전한 원으로 만든다. 원장의 상태 표시는 2px 모서리의 작은 사각형이어서 원형 운행 신호와 구분된다. 긴 선로, 탭 밑줄, 표 구획선은 직선으로 유지해 둥근 패널 안에서도 철도 제어반의 방향성을 보존한다.

브랜드 마크는 길이가 다른 청록색 수평 선로 세 개와 호박색 원형 신호 하나로 구성한다. 장식 아이콘을 추가하기보다 선, 점, 짧은 코드의 반복을 사용한다.

## Components

### Buttons
- **Shape:** 부드러운 직사각형(12px), 최소 높이 42px, 굵은 텍스트다.
- **Primary:** 상아색 배경과 야간 공백색 텍스트로 새 프로젝트·연결 같은 확정 동작을 표시한다.
- **Signal:** 호박색 배경과 짙은 갈색 텍스트로 현재의 최우선 다음 행동을 표시한다.
- **Ghost:** 심층 청흑 배경을 사용한다. 텍스트 버튼은 배경 없이 선로 청록 글자만 쓴다.
- **Focus / Disabled:** 모든 대화형 요소는 3px 호박색 외곽선과 3px 간격을 공유한다. 비활성 버튼은 불투명도 0.45와 금지 커서를 사용한다.

### Chips
- **Style:** 필터는 심층 청흑 컨테이너 안에 8px 모서리의 작은 버튼으로 묶인다.
- **State:** 선택되지 않은 필터는 감쇠 청회색, 선택된 필터는 상승 패널색과 상아색 텍스트를 쓴다.

### Cards / Containers
- **Task Timetable:** 상하 1px 구획선으로 이어진 행이며 기본 그림자가 없다. 호버와 키보드 포커스에서 심층 청흑 배경으로 바뀐다.
- **Handoff Record:** 심층 청흑 표면, 15px 모서리, 낮은 그림자, 내부 20px 여백을 쓴다. 통과와 미해결을 2열로 나누고 다음 행동을 하단에 둔다.
- **Conflict Notice:** 짙은 적갈색 표면, 14px 모서리, 두 개의 적색 신호와 명시적인 충돌 문구를 함께 쓴다.
- **Ledger:** 그림자 없이 구획선으로 연결한 목록이며, 원형이 아닌 작은 사각 상태 표시를 쓴다.

### Inputs / Fields
- **Style:** 야간 공백색 배경, 상아색 텍스트, 1px 구획선, 10px 모서리, 12px 내부 여백을 쓴다.
- **Focus:** 버튼과 동일한 3px 호박색 외곽선과 3px 간격을 사용한다.
- **Textarea:** 세로 크기 조절만 허용한다.

### Navigation
- 상단 바는 화면 상단에 고정하고 불투명도 높은 야간 공백색 배경과 하단 구획선을 사용한다.
- 화면 탭은 감쇠 청회색 텍스트로 시작하고, 활성 상태에서 상아색 텍스트와 3px 청록 밑줄을 표시한다.
- 프로젝트 제어 레일은 데스크톱에서 고정되며, 모바일에서는 상단의 일반 문서 구획으로 전환된다.

### Work Route
- 세로 2px 선로 위에 작업 순서 코드, 원형 상태 신호, 작업명, 실행자를 배치한다.
- 대기=희미한 점, 실행 중=녹색, 검증 대기·승인 필요=호박색, 차단=적색, 통과=청록색이다. 모든 점에는 작업명과 상태가 포함된 접근성 이름이 있다.

### Drawers, Toasts, and Motion
- 우측 패널은 화면 밖 위치 이동 대신 `clip-path`와 불투명도로 열린다. 0.28초의 빠르게 감속하는 곡선을 사용하고, 내부 첫 대화형 요소로 포커스를 이동한다.
- 충돌 배너의 두 번째 적색 신호만 1.4초 주기로 점멸한다. 압축 계기는 0.6초 동안 좌측에서 우측으로 채워진다. 토스트는 0.22초 동안 아래에서 제자리로 이동하며 나타나고 2.6초 후 사라진다.
- `prefers-reduced-motion: reduce`에서는 스크롤 애니메이션, 전환, 점멸을 모두 제거한다.
- 패널은 스크림 클릭과 Escape 키로 닫히며 `aria-hidden` 상태를 함께 갱신한다. 알림은 `role="status"`와 `aria-live="polite"`를 사용한다.

## Do's and Don'ts

### Do:
- **Do** 상태를 신호색만이 아니라 상태명, 작업 ID, 위치와 함께 표시한다.
- **Do** 작업 흐름을 노선으로, 작업 책임과 검증 상태를 운행표 행으로 표현한다.
- **Do** 모든 버튼, 링크, 입력에 동일한 호박색 `:focus-visible` 처리를 유지한다.
- **Do** 760px 이하에서 보조 열을 숨긴 뒤 작업 본문 안에 텍스트 상태를 다시 노출한다.
- **Do** 움직임을 패널 진입, 경고 신호, 진행 계기, 토스트처럼 상태 변화가 있는 요소에만 사용한다.

### Don't:
- **Don't** 작업 운행표를 독립적인 SaaS 카드 그리드로 바꾸지 않는다.
- **Don't** 녹색·호박색·적색을 의미 없는 장식이나 넓은 배경 면에 사용하지 않는다.
- **Don't** 모노스페이스를 긴 설명이나 제목 전체에 적용하지 않는다.
- **Don't** 그림자로 모든 표면을 띄우지 않는다. 기본 깊이는 청흑색 층위와 구획선으로 만든다.
- **Don't** 작은 화면에서 가로 스크롤로 데스크톱 운행표를 그대로 보존하지 않는다.
