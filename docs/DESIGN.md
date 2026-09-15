> 교육용 가상 자료 — 이 앱의 회사·인물·금액은 모두 지어낸 것이며 실제 인물·회사와 무관합니다.

# DESIGN.md — 가온교육(가상) 인사·총무 앱 디자인 기준

버전 1.0 · 2026-09-14
적용 대상: `erp_small/`(PRD.md의 새 앱)과 기존 `index.html`(24명 근태 앱). **기능·데이터 규칙은 `PRD.md`를 따르며 이 문서는 바꾸지 않는다.**

**출처**: getdesign.md의 Cal.com 디자인 분석 문서 — https://getdesign.md/cal/design-md
(getdesign.md가 공개된 화면을 독립적으로 분석한 자료이며 Cal.com과 무관합니다. 우리는 그 값을 참고해 표 위주 업무 화면에 맞게 조정했습니다. 참고 문서의 원칙: 흰 바탕 + 검정 주 버튼, 회색 카드, 4px 간격 단위, 8px 둥근 버튼·입력칸, 12px 둥근 카드, 상태 색은 아껴 쓰기.)

---

## 0. 한눈에 보는 토큰

```yaml
colors:
  ink: "#111827"          # 제목·본문 기본 글자 (참고 #111111 → 표 글자가 많아 살짝 푸른 검정)
  body: "#374151"         # 긴 설명문
  muted: "#6b7280"        # 보조 글자, 표 머리글
  muted-soft: "#9ca3af"   # 비활성·자리표시 글자
  canvas: "#ffffff"       # 페이지 바탕
  surface-soft: "#f6f7f9" # 설명 상자 칸, 탭 묶음 배경, 표 합계 줄
  surface-card: "#f5f5f5" # 상세 카드 배경
  hairline: "#e5e7eb"     # 1px 테두리·표 구분선
  hairline-soft: "#f3f4f6"# 아주 옅은 구분선
  primary: "#111827"      # 주 버튼 배경 (참고 #111111)
  primary-active: "#242424"
  primary-disabled: "#e5e7eb"
  on-primary: "#ffffff"
  accent: "#1d4ed8"       # 링크·강조 숫자 (참고 brand-accent #3b82f6보다 진하게, 표 안 가독성)
  success: "#15803d"      # 승인·정상
  warning: "#f59e0b"      # 대기·지각·교육용 띠·강조 테두리
  warning-ink: "#92400e"  # 노란 배경 위 글자
  warning-soft: "#fffbeb" # 교육용 띠 배경
  error: "#dc2626"        # 반려·결근·오류 안내문
  error-soft: "#fef2f2"   # 초기화 확인 줄 배경

typography:
  font-ui: "Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', Inter, system-ui, sans-serif"
  font-mono: "'JetBrains Mono', Consolas, ui-monospace, monospace"
  page-title:  { size: 26px, weight: 800, lineHeight: 1.2, letterSpacing: -0.01em }  # h1 (참고 display-sm 28/600/-0.5px)
  tab-title:   { size: 22px, weight: 700, lineHeight: 1.3 }                            # 탭 제목 (참고 title-lg)
  section:     { size: 16px, weight: 700, lineHeight: 1.4 }                            # 상자 제목 (참고 title-sm)
  sub:         { size: 14px, weight: 700, lineHeight: 1.4 }                            # 표 위 소제목
  body:        { size: 14px, weight: 400, lineHeight: 1.55 }                           # 본문 (참고 body-sm)
  table:       { size: 13px, weight: 400, lineHeight: 1.5 }                            # 표 셀
  table-head:  { size: 12px, weight: 600, lineHeight: 1.4, color: muted }              # 표 머리글
  caption:     { size: 12px, weight: 500, lineHeight: 1.4 }                            # 배지·안내문 (참고 caption 13)
  button:      { size: 13px, weight: 600, lineHeight: 1 }                              # 버튼 (참고 14/600)
  number:      { weight: 700, fontVariantNumeric: "tabular-nums" }                     # 금액·일수

spacing:   { xxs: 4px, xs: 8px, sm: 12px, md: 16px, lg: 24px, xl: 32px, xxl: 48px, section: 64px }
rounded:   { xs: 4px, sm: 6px, md: 8px, lg: 12px, pill: 9999px }
shadow:    { none: "none", soft: "0 1px 2px rgba(0,0,0,.05)", raised: "0 4px 12px rgba(0,0,0,.08)" }
layout:    { maxWidth: 1120px, pagePadding: "24px 16px 60px" }
```

---

## 1. 색

### 1.1 원칙
- **행동 층은 흑백.** 주 버튼은 검정(`primary`), 보조 버튼은 흰 바탕 + 회색 테두리. 파랑·초록을 버튼에 쓰지 않는다. (참고: "Cal.com's button is near-black, not blue")
- **상태 색은 뜻이 정해져 있고 그 뜻으로만 쓴다.**

| 색 | 뜻 | 쓰는 곳 |
|---|---|---|
| `success` 초록 | 끝났고 정상 | 승인 배지, 정상 배지, "확정" 배지 |
| `warning` 노랑 | 아직 처리 전 / 주의 | 대기·미확정·지각 배지, 교육용 띠, "이 위치 보기" 강조 테두리 |
| `error` 빨강 | 거절·오류 | 반려·결근 배지, 승인 차단 안내문, 초기화 버튼 글자 |
| `accent` 파랑 | 눌러서 열 수 있는 것 / 살아 있는 숫자 | 이름 버튼 hover, 시나리오 "현재 대상"의 값 |

- **교육용 표시는 항상 노란 띠**: 왼쪽 5px `warning` 세로줄 + `warning-soft` 배경 + `warning-ink` 글자. 페이지 맨 위 고정.
- 참고 문서의 어두운 푸터(`#101010`)는 **쓰지 않는다.** 업무 화면은 위아래가 같은 흰 바탕이어야 표가 이어져 보인다. 대신 맨 아래 안내문은 `hairline` 윗줄 + `muted` 글자.

### 1.2 참고값과 달리 정한 것
| 항목 | 참고 문서 | 우리 값 | 이유 |
|---|---|---|---|
| 글자 검정 | #111111 | #111827 | 표 글자가 많아 순검정보다 눈이 덜 피로 |
| 강조 파랑 | #3b82f6 | #1d4ed8 | 13px 표 안에서 대비 확보 |
| 초록 | #10b981 | #15803d | 흰 배지 위 작은 글자의 대비 |
| 빨강 | #ef4444 | #dc2626 | 같은 이유 |
| 어두운 푸터 | #101010 | 없음 | 위 1.1 |

---

## 2. 글꼴

- **한 가지 글꼴 체계만 쓴다**: `Pretendard` → 없으면 `Malgun Gothic`(Windows) / `Apple SD Gothic Neo`(Mac) → `Inter` → 시스템 글꼴. 외부 폰트 파일을 내려받지 않는다(더블클릭 실행·오프라인 조건).
- 참고 문서는 제목용(Cal Sans)과 본문용(Inter)을 나누지만, 한글 업무 화면에서는 제목도 같은 글꼴에 **굵기와 크기**로만 구분한다.
- 제목 굵기는 700~800, 본문 400, 버튼·배지·표 머리글 600. 그 외 굵기는 쓰지 않는다.
- 페이지 제목(26px)만 `letter-spacing: -0.01em`. 나머지는 0. (참고 문서의 "display에만 음수 자간" 원칙)
- **숫자 칸은 `tabular-nums`** — 금액·일수 자릿수가 세로로 맞아야 표를 읽을 수 있다. 오른쪽 정렬.
- 크기 단계는 위 토큰 9개만 쓴다. 중간 크기(15px 등)를 새로 만들지 않는다.

---

## 3. 여백

- 기본 단위 **4px**. 모든 padding·gap·margin은 4의 배수.
- **페이지**: 최대 너비 1120px 가운데 정렬, 좌우 16px, 위 24px, 아래 60px.
- **상자(box)**: 안쪽 `16px 20px`, 상자 사이 16px, 둥글기 `lg`(12px), 테두리 `hairline`.
- **설명 상자 안 4칸**: 칸 사이 12px, 칸 안쪽 `14px 16px`, 배경 `surface-soft`, 둥글기 `md`.
- **표**: 머리글 `10px 12px`, 셀 `8px 10px`, 표 아래 18px. 표 바깥 테두리 `hairline` + 둥글기 `md`.
- **폼**: 칸 사이 10px, 라벨과 입력칸 사이 3px, 폼 안쪽 `14px 16px`.
- **탭 묶음**: 바깥 4px, 탭 하나 `6px 16px`, 탭 사이 2px. 탭 위 8px, 아래 18px.
- **띠·머리**: 교육용 띠 `8px 14px`, 제목 줄과 다음 상자 사이 8px.
- 참고 문서의 96px "섹션 간격"은 마케팅 페이지용이라 쓰지 않는다. 업무 화면의 세로 리듬은 16px(상자 사이)로 충분하다.

---

## 4. 버튼

| 종류 | 배경 | 글자 | 테두리 | 높이 | 안쪽 여백 | 둥글기 | 쓰는 곳 |
|---|---|---|---|---|---|---|---|
| **주 버튼** `primary` | `primary` | `on-primary` | 없음 | 36px | 7px 14px | `sm` 6px → 폼·머리에서는 `md` 8px | 승인, 저장, 등록, 마감, 확정 |
| **보조 버튼** (기본) | `canvas` | `ink` | 1px `hairline` (#d1d5db) | 36px | 7px 14px | `sm`/`md` | 반려, 취소, 닫기, 설명 보기, 접기 |
| **위험 버튼** `danger` | `error` | `on-primary` | 없음 | 28px | 4px 10px | `sm` | 반려 확정, 초기화 실행 |
| **위험 보조** `danger-outline` | `canvas` | `error` | 1px #fca5a5 | 36px | 7px 14px | `md` | 가상 데이터 초기화 |
| **작은 버튼** `sm` | (위와 같음) | | | 28px | 4px 10px | `sm` | 표 안 승인·반려·확정, 접기, 전날·다음날 |
| **이동 버튼** `go` | `canvas` | `ink` | 1px #cbd5e1 | 24px | 3px 9px | `sm` | 시나리오 "이 위치 보기" |
| **이름 버튼** `name-btn` | 없음 | `ink`, 밑줄 | 없음 | 글자 높이 | 0 | — | 표의 직원 이름 (누르면 상세) |

**상태**
- 눌림(active): 주 버튼 `primary-active`(#242424). 보조 버튼 배경 `surface-soft`.
- hover: 보조 버튼만 배경 `surface-soft`. 주 버튼은 #000. 그 외 hover 효과 없음. (참고: "Don't add hover state styling beyond what the system already encodes")
- 비활성(disabled): 투명도 40%, 커서 `not-allowed`. 색을 바꾸지 않는다 — "처리된 신청", "확정된 급여"는 버튼만 흐려지고 자리와 크기는 그대로.
- 켜짐(on, 토글): `accent` 배경 + 흰 글자. "? 설명 보기"에만 쓴다.

**규칙**
- 한 줄(표의 한 행, 폼 한 줄)에 **주 버튼은 하나**. 승인=주, 반려=보조.
- 글자는 600, 13px, 줄바꿈 금지(`white-space: nowrap`).
- 참고 문서 값(높이 40px, 12px 20px, 14px 글자)은 마케팅 CTA 기준이라, 표 안에 여러 개가 들어가는 업무 화면에 맞춰 **36px / 28px** 두 단계로 줄였다. 손가락 터치 목표(≥40px)는 폼의 주 버튼(저장·등록)에만 유지한다.

---

## 5. 입력칸·선택칸

| 항목 | 값 |
|---|---|
| 배경 / 글자 | `canvas` / `ink` |
| 테두리 | 1px #d1d5db, 둥글기 `md`(8px) (표 안에서는 `sm` 6px) |
| 높이·여백 | 폼 34px, `6px 10px` (참고 40px/`10px 14px`보다 촘촘) · 표 안 28px, `4px 6px` |
| 글자 | 13px |
| 포커스 | 테두리 `ink`로 진해짐. 색 바꾸지 않음 |
| 비활성 | 배경 `surface-soft`, 글자 `muted` (마감된 달의 근태 칸) |
| 라벨 | 위쪽, 12px/600/`muted` |
| 자리표시(placeholder) | `muted-soft`, 예시 값으로 ("예: 가족 행사") |
| 검증 안내문 | 폼 아래 13px. 오류는 `error`, 성공은 `ink`. 팝업(alert) 쓰지 않음 |

---

## 6. 배지·상태 표시

- 모양: 알약(`pill`), 1px `hairline` 테두리, 흰 배경, `1px 9px`, 12px/600, 앞에 6px 점.
- **점 색이 상태를 말한다.** 글자색은 점과 같은 계열이거나 `ink`.

| 상태 | 점 색 | 글자 |
|---|---|---|
| 대기 · 미확정 · 지각 · 조퇴 | `warning` | `warning-ink` (미확정은 `muted`) |
| 승인 · 정상 · 확정 · 부여 | `success` (부여는 `accent`) | `success` / `ink` |
| 반려 · 결근 | `error` | `error` |
| 휴가 · 반차 · 사용 | `accent` / `muted` | `ink` |
| 마감 · 휴일 | `ink` / `muted-soft` | `ink` |

- 참고 문서의 파스텔 배지(주황·분홍·보라·에메랄드)는 **쓰지 않는다** — 상태 색 4개(초록·노랑·빨강·파랑) 외의 색은 뜻이 없다.

---

## 7. 표

- 너비 100%, 가로로 넘치면 표 상자 안에서만 스크롤(`overflow-x: auto`). 페이지가 가로로 흔들리면 안 된다.
- 머리글: 12px/600/`muted`, 흰 배경, 아래 1px `hairline`.
- 행: 아래 1px `hairline`, 마지막 행은 선 없음. hover 시 배경 #fafafa (읽는 줄 표시용, 유일하게 허용하는 표 hover).
- 합계 줄(`tfoot`): 700, 배경 `surface-soft`.
- 숫자 칸: 오른쪽 정렬 + `tabular-nums`. 0은 빈칸으로 두어 눈에 띄는 숫자만 남긴다(집계표).
- 긴 글 칸(사유·근거): `white-space: normal`, 최소 110px 최대 160px, 행간 1.35. 그 외 칸은 줄바꿈 금지.
- 안내문이 필요한 칸(승인 차단, 사유 필수): 버튼 아래 12px `error` 글자, 최대 200px에서 줄바꿈.
- **한 화면 1120px에서 가로 스크롤 없이 들어가야 한다.** 칸이 넘치면 열을 합친다(직원+부서, 상태+처리일). 열을 좁히려고 글자를 12px 아래로 줄이지 않는다.

---

## 8. 상자·카드·탭·상세

| 요소 | 값 |
|---|---|
| 설명 상자 / 시나리오 상자 | 테두리 `hairline`, 둥글기 `lg`, `16px 20px`, 그림자 없음. 제목 16px/700 + 오른쪽 "접기/펼치기" 작은 버튼 |
| 설명 상자 안 4칸 | `surface-soft`, 둥글기 `md`, 13px. 4열 → 900px 이하 2열 → 560px 이하 1열 |
| 시나리오(details) | 테두리 `hairline`, 둥글기 `md`, `10px 14px`. 제목 14px/700, "현재 대상" 12px `muted` + 값은 `accent` |
| 탭 묶음 | 참고 문서의 nav-pill-group 그대로: 바깥 `surface-soft` + 1px `hairline`, 둥글기 9px, 안쪽 4px. 활성 탭은 흰 배경 + `shadow.soft` + `ink`, 비활성은 투명 + `muted` |
| 직원 상세 카드 | `surface-card`(#f5f5f5)… 우리 값은 `surface-soft`, 둥글기 `md`, `14px 16px`. 안에 표가 들어가므로 카드 배경은 옅게 |
| 통계 칸(stat) | 흰 배경, 1px `hairline`, 둥글기 `md`, `8px 14px`, 숫자 20px/800 + 라벨 12px `muted` |
| 확인 줄(초기화) | `error-soft` 배경 + #fca5a5 테두리, 둥글기 `md` |
| 그림자 | 활성 탭에만 `shadow.soft`. 카드·버튼에는 그림자 없음 |

---

## 9. 강조·설명 모드 (교육용 앱만의 요소)

- **"이 위치 보기" 강조**: 대상 요소에 3px `warning` 바깥선(outline-offset 2px), 둥글기 `sm`, 1.8초 동안 서서히 사라짐. 배경색을 바꾸지 않는다(표 안 값이 가려지지 않게).
- **설명 모드(? 설명 보기 켬)**: 설명이 있는 요소에 1px 파란 점선(#93c5fd) 바깥선, 커서 `help`. 마우스를 올리면 아래쪽에 `ink` 배경 + 흰 글자 12px 말풍선(둥글기 `sm`, `6px 10px`, 최대 260px). 터치 기기는 누르면 뜬다.
- 시각 효과는 이 둘뿐. 페이지 전환·표 갱신에 애니메이션을 넣지 않는다.

---

## 10. 반응형

| 폭 | 바뀌는 것 |
|---|---|
| > 960px | 기본. 설명 상자 4열, 상세 카드 2열(히스토리 / 휴가 내역) |
| 560~960px | 설명 상자 2열, 상세 카드 1열. 표는 상자 안 가로 스크롤 |
| < 560px | 설명 상자 1열, 머리 버튼 줄바꿈, 탭 묶음 줄바꿈 허용 |

터치 목표: 폼의 주 버튼 ≥ 36px 높이, 표 안 작은 버튼은 28px이지만 좌우 여백으로 44px 영역 확보.

---

## 11. 해도 되는 것 / 하면 안 되는 것

**해도 되는 것**
- 주 버튼은 검정, 한 줄에 하나.
- 상태는 배지 점 색으로, 뜻이 정해진 4색만.
- 숫자는 오른쪽 정렬 + tabular-nums, 0은 빈칸.
- 안내문은 그 자리(버튼 아래·폼 아래)에 글자로. 팝업 금지.
- 교육용 띠는 항상 맨 위, 노란색, 지우거나 접지 못하게.

**하면 안 되는 것**
- 파랑·초록 배경의 주 버튼, 그라데이션, 아이콘 이모지 버튼.
- 카드 그림자, 둥글기 16px 초과, 어두운 배경 카드.
- 15px·11px 같은 토큰 밖 글자 크기, 500·900 굵기.
- 상태 색을 장식으로 쓰기(예: 제목을 파랑으로).
- hover로 크기·위치가 바뀌는 효과.

---

## 12. 지금 코드(`app/style.css`)와의 차이 — 맞추면 좋은 것

| 항목 | 지금 | 이 문서 | 조치 |
|---|---|---|---|
| 주 버튼 둥글기 | 7px | `sm` 6px / 폼·머리 `md` 8px | 7 → 6, 폼 버튼만 8 |
| 폼 입력칸 높이 | 약 32px | 34px | padding 6→7px |
| 숫자 칸 | 오른쪽 정렬만 | + `font-variant-numeric: tabular-nums` | `.num`에 추가 |
| 강조 파랑 | #1d4ed8 | 같음 | 없음 |
| 상세 카드 배경 | `surface-soft` | 같음 (참고의 #f5f5f5 대신) | 없음 |
| 버튼 hover | 보조만 `surface-soft` | 같음 | 없음 |

`erp_small/`을 만들 때는 이 문서 값으로 `style.css`를 새로 쓰고, 기존 앱은 위 표의 3가지만 손본다.
