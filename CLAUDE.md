# CLAUDE.md - 골프 카드 보드게임 프로젝트

## 최우선 원칙

### 실행 정책
- 모든 작업에 **전체 권한 부여** — 파일 생성/수정/삭제/패키지 설치/빌드/테스트 모두 사전 승인
- 작업 시작 후 **완료까지 멈추지 않는다** — "진행해도 될까요?" 금지
- 모호한 부분은 **가장 합리적인 판단으로 직접 결정**하고 진행
- 한 가지 방법 실패 시 **대안 시도 후** 보고

### 코드 수정 정책
- **기존 코드 임의 수정 금지** — 절대 규칙
- 새 기능은 기존 로직에 영향 없는 방식으로 구현
- 수정 불가피 시: 어떤 파일의 어떤 부분을 왜 수정하는지 **먼저 보고**
- 금지: 지시받지 않은 "개선", 범위 밖 스타일 변경, "이왕 하는 김에" 리팩토링

### 배포 정책
- 작업 완료 + 빌드 검증 통과 후 **자동으로 git commit + push** 수행 (사용자에게 묻지 않음)
- Render Auto-Deploy가 "On Commit" 설정이므로 push하면 자동 배포됨
- 빌드 검증: `tsc -b` (Render와 동일한 strict 모드) + `vite build`

### 테스트/프리뷰 정책
- **프리뷰(preview) 절대 실행 금지** — 테스트는 사용자가 직접 수행
- preview_start, preview_screenshot 등 프리뷰 관련 도구 사용하지 않는다
- 빌드 확인은 `tsc -b`과 `vite build`로만 수행

### 품질 관리
- 작업 완료 후 수정 내용 기록 및 오류 검사
- "다 했습니다"가 아닌 **무엇을 발견/수정/판단했는지 보고서** 형태
- 계획서/체크리스트(TodoWrite)로 외부 기억장치 운영
- 한 번에 전부 하지 말고 **한두 개 작업 → 확인 → 다음**

---

## 프로젝트 개요

**프로젝트명**: Golf Card Game (골프 카드게임)
**배포 URL**: Render (Auto-Deploy On Commit)
**기반 프로젝트**: jwgame (C:\Users\atsha\jwgame) — 오디오 시스템 등 참고

## 기술 스택

- **프론트엔드**: React 19 + TypeScript + Vite 7
- **백엔드**: Node.js + Express 5 + Socket.io 4
- **통신**: Socket.io (실시간 멀티플레이)
- **스타일**: CSS (글래스모피즘, 그라데이션, 카드 디자인)
- **애니메이션**: Framer Motion + canvas-confetti
- **오디오**: HTMLAudioElement(BGM) + Web Audio API(SFX)

## 프로젝트 구조

```
jwgame2/
├── CLAUDE.md
├── src/
│   ├── App.tsx                    # 라우팅 + BGM 카테고리 전환
│   ├── main.tsx
│   ├── types.ts                   # 게임 상태/타입 정의
│   ├── pages/
│   │   ├── LobbyPage.tsx          # 로비 (방 생성/참여/플레이리스트)
│   │   ├── LobbyPage.css
│   │   ├── WaitingRoom.tsx        # 대기실
│   │   ├── WaitingRoom.css
│   │   ├── GamePage.tsx           # 게임 진행 (MusicToggle + SFX)
│   │   ├── GamePage.css
│   │   ├── GameOverPage.tsx       # 게임 종료/결과 (confetti + SFX)
│   │   └── GameOverPage.css
│   ├── components/
│   │   ├── PlayingCard.tsx        # 포커 카드 UI + PlayingCard.css
│   │   ├── CardGrid.tsx           # 플레이어 카드 배열 (2x2 또는 2x3)
│   │   ├── DrawPile.tsx           # 뽑기 더미
│   │   ├── DiscardPile.tsx        # 버리기 더미
│   │   ├── Toast.tsx + .css       # 토스트 알림
│   │   ├── TurnIndicator.tsx      # 턴 표시
│   │   ├── CountdownBar.tsx       # 턴 타이머
│   │   ├── GlobalChat.tsx + .css  # 인게임 채팅
│   │   ├── InfoModal.tsx + .css   # 정보 모달 (게임방법, 후원)
│   │   ├── MusicToggle.tsx + .css # 음악 켜기/끄기 토글
│   │   └── PlaylistModal.tsx + .css # 플레이리스트 모달
│   ├── hooks/
│   │   └── useSocket.ts           # Socket.io 통신 훅
│   ├── utils/
│   │   ├── deck.ts                # 덱 생성/셔플 로직
│   │   ├── scoring.ts             # 점수 계산 로직
│   │   ├── audioManager.ts        # BGM 싱글턴 (카테고리별 셔플, auto/playlist)
│   │   └── sfx.ts                 # SFX 효과음 10종 (Web Audio API)
│   └── styles/
│       └── global.css             # 글로벌 CSS 변수, 글래스모피즘
├── server/
│   ├── index.js                   # 서버 로직 (Express + Socket.io)
│   └── package.json
├── public/
│   └── audio/                     # BGM MP3 10개 (약 90MB)
│       ├── opening1.mp3, opening2.mp3
│       ├── playing1~6.mp3
│       └── celebration1.mp3, celebration2.mp3
├── index.html
├── package.json
└── vite.config.ts
```

## 오디오 시스템

### BGM (audioManager.ts)
- 싱글턴 패턴, Fisher-Yates 셔플, auto/playlist 2가지 모드
- 카테고리: `opening`(로비/대기) | `playing`(게임) | `celebration`(결과/종료)
- App.tsx에서 gameState.phase에 따라 자동 카테고리 전환
- 로비 벗어나면 playlist 모드 자동 종료
- localStorage: `bgm_volume`, `bgm_muted`
- 브라우저 autoplay 정책 자동 처리 (첫 클릭 후 재생)

### SFX (sfx.ts)
- Web Audio API 오실레이터 합성 (외부 파일 불필요)
- 10종: cardFlip, cardDeal, myTurn, thankYou, swap, discard, roundEnd, gameOver, click, timerWarning
- localStorage: `sfx_enabled`

## 게임 규칙 요약

### 기본 설정
- 2~3인: 52장 1벌 / 4인+: 104장 2벌
- 카드 배분: 4장(2x2) 또는 6장(2x3) 선택 가능
- 앞줄(아래): 미리 확인 가능 / 뒷줄(위): 확인 불가

### 점수
- 1~9: 액면가 / 10, K: 0점 / J: 11점 / Q: 12점
- 같은 숫자 페어: 0점
- 상급자 모드: 4장 스트레이트 → 합계의 마이너스 (역순 A까지만)
- 상급자 모드: 마지막 전 라운드 x2, 마지막 라운드 x3
- 최저 점수가 승리

### 턴 진행
- 카드 더미 또는 버림 더미에서 1장 뽑기
- 버림 더미에서 가져올 때 [땡큐!] 버튼 필수
- 뽑은 카드를 자기 카드와 교환 or 버리기 (더미에서 뽑은 경우만)
- 버림 더미에서 뽑은 카드는 반드시 교환해야 함
- 교환 시 교체된 카드는 앞면으로 공개
- 버리기 선택 시 원하는 카드 1장을 앞면으로 뒤집기
- 모든 카드가 앞면이면 라운드 종료 (다른 플레이어 마지막 턴 1회)

## 코딩 컨벤션

- jwgame 프로젝트의 패턴/구조를 최대한 따름
- Socket.io 이벤트 네이밍: snake_case
- 컴포넌트: PascalCase
- 타입 정의는 types.ts에 집중
- 서버 로직은 server/index.js에 집중
- Framer Motion ease: `[0.22, 1, 0.36, 1] as [number, number, number, number]` (tsc -b strict 대응)
- Express 5: 와일드카드 라우트 `/{*splat}` 형식 사용 (`*` 불가)

## 알려진 이슈 / 주의사항

- Render 빌드는 `tsc -b` (로컬 `tsc --noEmit`보다 엄격) → 반드시 `tsc -b`로 검증
- public/audio/ MP3 파일 약 90MB → 빌드 시간 다소 소요
- devDependencies가 Render에서 필요 → `npm install --include=dev` (build:render 스크립트에 포함됨)

---

## 할 일 목록 (TODO)

### 우선순위 높음
1. **로비/대기실에 음악 토글(MusicToggle) 추가** — 현재 GamePage에만 있음, LobbyPage/WaitingRoom에도 필요
2. **카드 숫자 잘림 수정** — 9, 10 등 큰 숫자가 카드 내부에서 잘림, PlayingCard 폰트/레이아웃 조정 필요
3. **방 나가기/재생성 시 상태 깨끗이 정리** — 이전 방의 게임오버 축하 메시지가 다시 뜨는 문제, gameState 초기화 로직 점검
4. **플레이어 연결 끊김(튕김) 처리** — 재접속 로직, 봇 대체, 방 안내 메시지 등 필요
