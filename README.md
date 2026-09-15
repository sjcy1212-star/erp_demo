> ⚠ **교육용 가상 자료** — 이 앱의 회사·인물·수치는 모두 교육 목적으로 만든 가상의 것이며, 실제 인물·회사와 무관합니다.

# 가온교육 인사·총무 근태 앱 (교육용 시연)

가상 회사 "가온교육(주)"의 **직원·근태·휴가·월간 집계**를 한 화면에서 다루는 작은 ERP 시연입니다.
퀴즈·미션 없이, "이 앱은 무엇인가요?" 설명과 **따라해보기 7가지 시나리오**(이 위치 보기 버튼으로 해당 자리로 이동·강조)로 배웁니다.

## 실행 방법

1. `index.html` 파일을 **더블클릭**합니다. (크롬·엣지 권장)
2. 설치·로그인·인터넷 연결이 필요 없습니다.
3. 입력한 내용은 내 컴퓨터의 브라우저 안에만 저장됩니다. 오른쪽 위 **↺ 처음 상태로** 버튼으로 언제든 초기화할 수 있습니다.

### Vercel 배포

이 앱은 빌드가 필요 없는 정적 사이트라 Vercel에 저장소를 연결하면 그대로 배포됩니다.

1. [vercel.com](https://vercel.com) → **Add New → Project** → 이 GitHub 저장소 선택
2. Framework Preset은 **Other** 그대로, Build Command·Output Directory는 비워 두고 **Deploy**
3. 배포 주소 `/` 가 큰 앱, `/erp_small` 이 작은 앱입니다. (`vercel.json`·`.vercelignore`가 설정을 담당)
4. **AI 연결 테스트**를 쓰려면 Vercel 프로젝트 **Settings → Environment Variables** 에 `GEMINI_API_KEY` 를 넣고 다시 배포합니다.

### AI 연결 테스트 (Gemini) — 로컬에서 확인

큰 앱 화면의 **"AI 연결 테스트 (Gemini)"** 칸은 서버에 넣어 둔 API 키가 잘 연결되는지 확인하는 용도입니다.
브라우저는 키를 모르고, 서버 함수 `api/gemini.js` 가 대신 Gemini를 부릅니다.

1. 폴더에 `.env` 파일을 만들고 `GEMINI_API_KEY=발급받은키` 한 줄을 적습니다. (**절대 공유·업로드 금지**, git에는 올라가지 않음)
2. `node dev_server.js` 실행 → http://localhost:3000 열기 (설치할 것 없음, Node 18 이상)
3. "Gemini에 보내기"를 누르면 아래에 `✓ 연결 성공 (gemini-3.6-flash, ○○ms)` 와 답변이 나옵니다.
   - 더블클릭(file://)으로 연 화면에서는 서버가 없어 이 칸만 비활성화되고, 나머지 기능은 그대로 동작합니다.

## 폴더 구성

| 경로 | 내용 |
|---|---|
| `index.html` | 앱 시작 파일 (이걸 열면 됩니다) |
| `app/style.css` | 화면 디자인 |
| `app/app.js` | 화면 동작·시나리오 |
| `data/seed.js` | 가상 데이터 (직원 24명, 출퇴근 720건, 휴가 37건) |
| `data/generate_seed.js` | 가상 데이터를 다시 만드는 생성기 (`node data/generate_seed.js`) |
| `data/README.md` | 데이터 설명서 + 시나리오별 대상 데이터 |
| `data/가상_인사총무.json` | 작은 연습 세트: 직원 12명 · 휴가 6건 · 급여 12건 (한국어 칸 이름, `generate_small.js`로 생성) |
| `erp_small/index.html` | **작은 앱** (직원·휴가·급여 3탭, 12명 세트). 더블클릭으로 실행. 주소 뒤에 `?test=1`을 붙이면 자동 검사 결과표가 맨 위에 나옴 |
| `erp_small/app.js`, `erp_small/style.css` | 작은 앱의 동작·디자인 (PRD.md·DESIGN2.MD 기준) |
| `tests/check.js` | 작은 앱 자동 검사 17개 (PRD 6.2 A1~A10 + 문구·유지·등록·폼유지·말풍선·스크롤·오류) |
| `vercel.json`, `.vercelignore` | Vercel 배포 설정 (정적 사이트, 미사용/·docs/ 제외) |
| `api/gemini.js` | Gemini 연결 테스트 서버 함수 (Vercel Serverless). `.env`/환경변수의 `GEMINI_API_KEY` 사용 |
| `dev_server.js` | 로컬 확인용 작은 서버 (`node dev_server.js` → localhost:3000). 정적 파일 + `/api/gemini` |
| `docs/01_기획서.md` | 기획서 |
| `docs/레퍼런스.md` | flex·Frappe HR·Odoo에서 참고할 기능 3가지와 출처 |
| `docs/DESIGN.md` | (이전 기준) Cal.com 분석 기반 흑백 디자인 |
| `docs/DESIGN2.MD` | **현재 디자인 기준** — Wise 스타일(라임그린 CTA·세이지 바탕·24px 둥근 카드·Inter 글꼴). 두 앱의 style.css가 이 문서를 따름 |
| `docs/개발순서.md` | erp_small 개발 12단계와 단계별 확인 방법 |
| `docs/PRD.md` | 12명 세트 새 앱(직원·휴가·급여)의 목적·기능·동작 규칙·데이터·확인 기준 |
| `docs/확인결과.md` (+ `확인결과/` 캡처 16장) | Playwright 실제 조작 테스트 기록: 14개 시나리오, 오작동 2건 발견·수정·재확인 |
| `docs/확인예시.md` | 작은 세트로 손 검산: 강도윤 잔여 연차·지급액, 승인 가능/잔여 초과 휴가의 입력값과 예상 결과 |
| `docs/데이터안내.md` | 직원·근태·휴가·급여에 필요한 데이터 표와 사번으로 연결하는 방법 |

## 따라해보기 시나리오 7개

① 출근 기록이 빠진 직원을 채운다 → 규칙상 판정이 바뀐다
② 09:00 넘어 출근한 직원을 지각으로 확정 → 월 합계가 오른다
③ 대기 휴가 승인 → 남은 연차가 줄어든다
④ 같은 팀 같은 날 휴가는 경고가 뜬다 → 반려하면 연차는 줄지 않는다
⑤ 남은 연차보다 많은 휴가는 승인이 막힌다
⑥ 지난달 근태를 마감한다 → 그 달 기록이 잠긴다
⑦ 연차를 수동 조정한다 → 히스토리에 근거가 남는다 (flex 참고)

각 시나리오에 쓰이는 대상 데이터는 `data/README.md`에 정리되어 있습니다.

## 미사용 폴더 (`미사용/`)

인사·총무 실습 앱과 관계없는 것들은 `미사용/`에 모아 두었으며 **현재 사용하지 않습니다.**

- `미사용/dart_app/` — DART 공시검색 웹앱 (Flask + OpenDART + Gemini 요약)
- `미사용/gemini_test.py`, `미사용/.env.example` — Gemini API 호출 예제
- `미사용/docs/opendart_공시검색_API.md` — OpenDART API 정리 문서
