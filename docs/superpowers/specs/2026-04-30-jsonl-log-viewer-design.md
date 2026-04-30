# JsonlLogViewer — 설계 문서

**날짜:** 2026-04-30  
**상태:** 승인됨

---

## 1. 개요

사람이 JSONL 형식의 로그를 직관적으로 읽고 분석할 수 있는 로컬 데스크톱 앱.  
비개발직군(QA, 기획, 운영팀)도 설치 후 바로 사용할 수 있도록 Electron 기반으로 제공한다.  
AI용 도구는 별도로 존재하므로 이 앱은 사람 전용 뷰어에 집중한다.

---

## 2. JSONL 필수 필드

이 앱이 처리하는 JSONL 파일은 각 줄마다 아래 세 필드를 반드시 포함해야 한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string (ISO 8601) 또는 number (Unix ms) | 로그 발생 시각 |
| `level` | string (`error`, `warn`, `info`, `debug` 등) | 로그 레벨 |
| `msg` | string | 로그 메시지 |

- 세 필드가 없는 줄은 파싱 경고 아이콘과 함께 raw 텍스트로 표시한다.
- 그 외 필드는 스키마 및 커스텀 컬럼 설정에 따라 표시한다.
- 하나의 JSONL 파일 안에 여러 스키마가 혼재할 수 있다.

---

## 3. 아키텍처

### 3.1 플랫폼

- **Electron + React (Vite) + TypeScript**
- 로컬 설치형 데스크톱 앱 (Windows 우선, macOS 대응)

### 3.2 프로세스 구조

```
Electron Main Process (Node.js)
├── 파일 열기 / 저장 (dialog API)
├── 파일 감시 — chokidar (실시간 tail)
├── 스키마 레지스트리 로드 (%APPDATA%/JsonlLogViewer/schemas/)
└── IPC 핸들러 (Renderer ↔ Main 통신)

Electron Renderer Process (React)
├── 탭 바 (멀티파일)
├── 사이드바 (파일 목록 / 스키마 관리)
├── 필터 바
├── 리스트 뷰 (가상 스크롤, 제네릭 컬럼)
├── 디테일 패널 (하단 고정, 스키마 인식)
│   ├── Schema Validator (lazy, 클릭 시 실행)
│   ├── Custom HTML Viewer (<iframe sandbox>)
│   └── Generic JSON Tree (폴백)
└── 서브 뷰 (탭 전환)
    ├── 통계 / 집계 대시보드
    ├── 타임라인
    └── Diff 뷰
```

### 3.3 UI 레이아웃

```
┌─────────────────────────────────────────────┐
│  [server.jsonl ✕]  [client.jsonl ✕]  [+]   │  ← 탭 바
├──────────┬──────────────────────────────────┤
│          │  🔍 필터...              10,243줄 │  ← 필터 바
│ 파일 목록 ├──────────────────────────────────┤
│          │ timestamp │ level │ msg          │
│ 스키마   │ 14:23:01  │ ERROR │ Conn timeout │  ← 리스트 뷰
│ 관리     │ 14:23:02  │ INFO  │ Retry...     │    (가상 스크롤)
│          │ 14:23:03  │ INFO  │ Connected    │
│          ├──────────────────────────────────┤
│          │  [ErrorLog 스키마 뷰어 — iframe] │  ← 디테일 패널
└──────────┴──────────────────────────────────┘
```

---

## 4. 기능 목록

### 4.1 핵심 기능

| 기능 | 설명 |
|------|------|
| 필터링 / 검색 | 특정 필드 값, 정규식, 레벨 필터 |
| 실시간 tail | chokidar로 파일 변경 감지 → IPC → 리스트 자동 갱신 |
| 타임라인 / 시각화 | 시간 흐름 기반 이벤트 분포 차트 |
| 멀티파일 탭 | 탭 당 독립적인 파일 뷰어 |
| 커스텀 컬럼 | 스키마별 리스트 뷰 컬럼 구성 설정 |
| 집계 / 통계 | 레벨별 카운트, 특정 필드 값 분포, 에러율 등 |
| JSON 트리 펼치기 | 디테일 패널에서 중첩 JSON 트리 뷰 |
| Diff 뷰 | 두 파일 / 두 시점의 필터링 결과 나란히 비교 |
| 스키마 관리 UI | 앱 안에서 스키마 등록 / 편집 / 삭제 |

---

## 5. 스키마 플러그인 시스템

### 5.1 저장 구조

```
%APPDATA%/JsonlLogViewer/schemas/
└── <schema-name>/
    ├── schema.json    # JSON Schema 정의 (필수)
    ├── viewer.html    # 커스텀 HTML 뷰어 (선택)
    └── config.json   # 표시명, 커스텀 컬럼 목록, 버전
```

### 5.2 스키마 매칭 (Lazy)

1. 사용자가 리스트 뷰에서 특정 줄을 클릭
2. 해당 줄의 JSON을 등록된 스키마들에 대해 순차 검증 (Ajv)
3. 첫 번째 매칭 스키마의 `viewer.html`을 iframe에 로드
4. 매칭 스키마 없음 → Generic JSON Tree 표시
5. `viewer.html` 오류 → Generic JSON Tree 폴백

**매칭 우선순위:** 스키마 등록 순서 (앞쪽 우선)

### 5.3 HTML 뷰어 인터페이스 (postMessage)

```js
// 앱 → 뷰어: 로그 데이터 주입
window.addEventListener('message', (e) => {
  if (e.data.type === 'LOG_DATA') {
    const row = e.data.payload; // 해당 줄의 JSON 객체
    // 자유롭게 렌더링
  }
});

// 뷰어 → 앱: 필터 요청 (선택적)
parent.postMessage({ type: 'FILTER', field: 'user_id', value: '123' }, '*');
```

- iframe은 `sandbox="allow-scripts"` 속성으로 격리
- `viewer.html`은 순수 HTML/JS로 작성, 외부 의존성 없이도 동작해야 함

---

## 6. 기술 스택

| 영역 | 라이브러리 |
|------|-----------|
| 런타임 | Electron |
| UI | React + Vite + TypeScript |
| 가상 스크롤 | TanStack Virtual |
| 파일 감시 | chokidar |
| JSON Schema 검증 | Ajv |
| Diff 뷰 | diff2html |

---

## 7. 엣지 케이스 처리

| 상황 | 처리 방식 |
|------|----------|
| 수백만 줄 파일 | 가상 스크롤 + 청크 단위 스트리밍 파싱 |
| `timestamp`/`level`/`msg` 미포함 줄 | raw 텍스트로 표시, 경고 아이콘 |
| 스키마 미매칭 줄 | Generic JSON Tree 폴백 |
| 여러 스키마 동시 매칭 | 등록 순서 기준 첫 번째 매칭 사용 |
| 유효하지 않은 JSON 줄 | raw 텍스트로 표시, 파싱 오류 표기 |
| `viewer.html` 런타임 오류 | iframe 오류 감지 후 JSON Tree 폴백 |

---

## 8. 범위 외 (Out of Scope)

- AI / 자동화용 CLI 도구 (별도 존재)
- 서버 배포 / 팀 공유 기능
- Qt 기반 UI
- 로그 생성 / 수집 기능
