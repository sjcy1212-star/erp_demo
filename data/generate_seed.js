// ⚠ 교육용 가상 자료 — 이 파일이 만드는 회사·인물·수치는 모두 교육 목적의 가상 데이터이며 실제 인물·회사와 무관합니다.
//
// 실행: node data/generate_seed.js
// 결과: data/seed.js (앱이 읽는 파일), data/seed.json (사람이 보기 좋은 파일)
// 같은 결과가 항상 나오도록 고정된 난수(seed)를 씁니다.

const fs = require("fs");
const path = require("path");

const NOTICE = "⚠ 교육용 가상 자료 — 실제 인물·회사와 무관";
const TODAY = "2026-09-14"; // 가상의 오늘 (월요일)
const COMPANY = "㈜가온교육 (가상)";

// ---------- 고정 난수 ----------
let seed = 20260914;
function rand() {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}
function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
function chance(p) { return rand() < p; }

// ---------- 날짜 도우미 ----------
function d(str) { return new Date(str + "T00:00:00Z"); }
function iso(date) { return date.toISOString().slice(0, 10); }
function addDays(str, n) { const x = d(str); x.setUTCDate(x.getUTCDate() + n); return iso(x); }
function isWeekend(str) { const w = d(str).getUTCDay(); return w === 0 || w === 6; }
function pad(n) { return String(n).padStart(2, "0"); }

// 2026년 공휴일 (교육용으로 8~10월만 넣음)
const HOLIDAYS = {
  "2026-08-15": "광복절",
  "2026-08-17": "광복절 대체공휴일",
  "2026-09-24": "추석 연휴",
  "2026-09-25": "추석",
  "2026-09-26": "추석 연휴",
  "2026-10-03": "개천절",
  "2026-10-09": "한글날",
};
function isWorkday(str) { return !isWeekend(str) && !HOLIDAYS[str]; }

// 만 근속 개월 수 (기준일 TODAY)
function monthsBetween(from, to) {
  const a = d(from), b = d(to);
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) m -= 1;
  return m;
}

// ---------- 연차 규칙 (교육용 단순화) ----------
// 1년 미만: 개근 월마다 1일 (최대 11)
// 1년 이상: 15일, 만 3년부터 2년마다 +1, 최대 25
function annualLeaveDays(hireDate, asOf) {
  const months = monthsBetween(hireDate, asOf);
  if (months < 12) return Math.min(months, 11);
  const years = Math.floor(months / 12);
  return Math.min(25, 15 + Math.floor((years - 1) / 2));
}

// ---------- 직원 24명 ----------
// (이름은 흔치 않은 조합으로 임의 생성한 가상 인물입니다)
const EMPLOYEES = [
  // 경영지원팀 5명
  { id: "E-1001", name: "노은재", dept: "경영지원팀", position: "팀장", hireDate: "2018-03-02" },
  { id: "E-1002", name: "배서율", dept: "경영지원팀", position: "과장", hireDate: "2020-07-01" },
  { id: "E-1003", name: "임도하", dept: "경영지원팀", position: "대리", hireDate: "2023-09-01" }, // 미션5: 만 3년 → 16일
  { id: "E-1004", name: "권시온", dept: "경영지원팀", position: "주임", hireDate: "2024-11-18" },
  { id: "E-1005", name: "장유빈", dept: "경영지원팀", position: "사원", hireDate: "2026-01-14" }, // 미션4: 8개월 → 8일
  // 개발팀 7명 (미션1 정답: 7)
  { id: "E-1006", name: "석민호", dept: "개발팀", position: "팀장", hireDate: "2017-05-15" },
  { id: "E-1007", name: "차예린", dept: "개발팀", position: "과장", hireDate: "2019-10-07" },
  { id: "E-1008", name: "한지우", dept: "개발팀", position: "대리", hireDate: "2022-02-14" },
  { id: "E-1009", name: "도현석", dept: "개발팀", position: "대리", hireDate: "2022-08-22" },
  { id: "E-1010", name: "구하람", dept: "개발팀", position: "주임", hireDate: "2024-03-04" },
  { id: "E-1011", name: "표세인", dept: "개발팀", position: "사원", hireDate: "2025-06-02" },
  { id: "E-1012", name: "엄태준", dept: "개발팀", position: "사원", hireDate: "2026-02-14" }, // 미션7: 연차 7일, 6일 사용 → 잔여 1
  // 영업팀 6명
  { id: "E-1013", name: "변가온", dept: "영업팀", position: "팀장", hireDate: "2016-09-01" },
  { id: "E-1014", name: "옥준서", dept: "영업팀", position: "과장", hireDate: "2019-04-08" },
  { id: "E-1015", name: "마수아", dept: "영업팀", position: "대리", hireDate: "2021-12-01" },
  { id: "E-1016", name: "빈다온", dept: "영업팀", position: "주임", hireDate: "2023-05-22" },
  { id: "E-1017", name: "탁이안", dept: "영업팀", position: "사원", hireDate: "2025-01-06" },
  { id: "E-1018", name: "선우주", dept: "영업팀", position: "사원", hireDate: "2025-09-01" },
  // 디자인팀 6명
  { id: "E-1019", name: "국소연", dept: "디자인팀", position: "팀장", hireDate: "2018-08-20" },
  { id: "E-1020", name: "명재이", dept: "디자인팀", position: "과장", hireDate: "2020-03-16" },
  { id: "E-1021", name: "피루아", dept: "디자인팀", position: "대리", hireDate: "2022-06-13" },
  { id: "E-1022", name: "감보람", dept: "디자인팀", position: "주임", hireDate: "2023-11-06" },
  { id: "E-1023", name: "온하늘", dept: "디자인팀", position: "사원", hireDate: "2024-09-02" },
  { id: "E-1024", name: "제나윤", dept: "디자인팀", position: "사원", hireDate: "2025-04-01" },
];

// ---------- 휴가 기록 ----------
// 승인된 과거 휴가(연차 사용 내역) + 대기 중인 신청 5건
// type: 연차 / 반차 / 병가 / 경조휴가   (병가·경조휴가는 연차 차감 없음)
const LEAVES = [];
let leaveNo = 1;
function countWorkdays(start, end) {
  let n = 0;
  for (let s = start; s <= end; s = addDays(s, 1)) if (isWorkday(s)) n++;
  return n;
}
function addLeave(empId, type, start, end, status, reason, extra = {}) {
  const emp = EMPLOYEES.find(e => e.id === empId);
  const days = type === "반차" ? 0.5 : countWorkdays(start, end);
  const deduct = (type === "연차" || type === "반차") ? days : 0;
  LEAVES.push({
    id: "R-" + String(leaveNo++).padStart(3, "0"),
    empId, empName: emp.name, dept: emp.dept,
    type, start, end, days, deduct, status, reason,
    requestedAt: extra.requestedAt || addDays(start, -7),
    decidedAt: extra.decidedAt || null,
    decisionNote: extra.decisionNote || "",
  });
}

// 2026년 승인된 휴가 (연차 사용 내역) — 잔여 연차가 사람마다 다르게 보이도록
const usedPlan = {
  "E-1001": [["연차", "2026-02-02", "2026-02-03"], ["연차", "2026-07-27", "2026-07-31"]],
  "E-1002": [["연차", "2026-05-04", "2026-05-04"], ["반차", "2026-08-06", "2026-08-06"]],
  "E-1003": [["연차", "2026-03-20", "2026-03-20"], ["연차", "2026-08-10", "2026-08-11"]],
  "E-1004": [["연차", "2026-06-15", "2026-06-16"]],
  "E-1005": [["연차", "2026-08-21", "2026-08-21"]],
  "E-1006": [["연차", "2026-01-26", "2026-01-30"], ["병가", "2026-08-25", "2026-08-25"]],
  "E-1007": [["연차", "2026-04-13", "2026-04-14"], ["연차", "2026-08-03", "2026-08-04"]],
  "E-1008": [["반차", "2026-08-12", "2026-08-12"], ["연차", "2026-08-28", "2026-08-28"]],
  "E-1009": [["연차", "2026-07-06", "2026-07-08"]],
  "E-1010": [["경조휴가", "2026-08-19", "2026-08-21"]],
  "E-1011": [["연차", "2026-08-13", "2026-08-14"]],
  "E-1012": [["연차", "2026-06-15", "2026-06-17"], ["연차", "2026-08-31", "2026-09-02"]], // 6일 사용 → 잔여 1 (월 1일 부여 순서상 잔여가 음수가 되지 않게 배치)
  "E-1013": [["연차", "2026-02-16", "2026-02-20"]],
  "E-1014": [["연차", "2026-08-05", "2026-08-07"]],
  "E-1015": [["반차", "2026-08-18", "2026-08-18"]],
  "E-1016": [["연차", "2026-06-01", "2026-06-02"], ["연차", "2026-09-04", "2026-09-04"]],
  "E-1017": [["연차", "2026-08-24", "2026-08-24"]],
  "E-1018": [["연차", "2026-08-31", "2026-08-31"]],
  "E-1019": [["연차", "2026-03-02", "2026-03-06"]],
  "E-1020": [["연차", "2026-08-10", "2026-08-12"]],
  "E-1021": [["병가", "2026-09-02", "2026-09-03"]],
  "E-1022": [["연차", "2026-08-27", "2026-08-28"]],
  "E-1023": [["반차", "2026-09-09", "2026-09-09"]],
  "E-1024": [["연차", "2026-07-13", "2026-07-14"]],
};
const reasons = ["개인 사유", "가족 행사", "휴식", "병원 진료", "이사"];
for (const [empId, list] of Object.entries(usedPlan)) {
  for (const [type, s, e] of list) {
    const r = type === "병가" ? "몸살 감기" : type === "경조휴가" ? "조부상" : pick(reasons);
    addLeave(empId, type, s, e, "승인", r, { decidedAt: addDays(s, -5), decisionNote: "승인" });
  }
}

// 대기 중 신청 5건 (번호는 승인건 다음부터 이어짐)
addLeave("E-1008", "연차", "2026-09-21", "2026-09-21", "대기", "가족 행사", { requestedAt: "2026-09-10" });   // 미션6 ① 승인
addLeave("E-1015", "반차", "2026-09-22", "2026-09-22", "대기", "병원 진료", { requestedAt: "2026-09-11" });   // 미션6 ② 승인
addLeave("E-1010", "연차", "2026-09-21", "2026-09-21", "대기", "휴식", { requestedAt: "2026-09-11" });       // 미션6 ③ 반려 (개발팀 같은 날 E-1008과 중복 → 팀 규정 위반)
addLeave("E-1012", "연차", "2026-09-28", "2026-09-30", "대기", "여행", { requestedAt: "2026-09-14" });       // 미션7 반려 (잔여 1일, 신청 3일)
addLeave("E-1023", "연차", "2026-10-05", "2026-10-05", "대기", "개인 사유", { requestedAt: "2026-09-14" }); // 정상 (연습용 여분)

// ---------- 출퇴근 기록 (2026-08-01 ~ 2026-09-14) ----------
// status: 정상 / 지각 / 조퇴 / 결근 / 휴가 / 반차 / 미확정(오늘)
const ATTENDANCE = [];
function leaveOn(empId, date) {
  return LEAVES.find(l => l.empId === empId && l.status === "승인" && l.start <= date && date <= l.end);
}
function clock(h, m) { return pad(h) + ":" + pad(m); }

for (let day = "2026-08-01"; day <= TODAY; day = addDays(day, 1)) {
  if (!isWorkday(day)) continue;
  const isToday = day === TODAY;
  for (const emp of EMPLOYEES) {
    const lv = leaveOn(emp.id, day);
    const rec = { date: day, empId: emp.id, checkIn: null, checkOut: null, status: "정상", note: "" };

    if (lv && lv.type !== "반차") {
      rec.status = "휴가"; rec.note = lv.type;
    } else if (lv && lv.type === "반차") {
      rec.status = "반차";
      rec.checkIn = clock(13, Math.floor(rand() * 5));
      rec.checkOut = clock(18, Math.floor(rand() * 20));
      rec.note = "오후 출근(반차)";
    } else if (!isToday && chance(0.007)) {
      rec.status = "결근"; rec.note = "무단결근";
    } else {
      // 보통 8:35~8:59 출근
      let inH = 8, inM = 35 + Math.floor(rand() * 25);
      if (chance(0.06)) { inH = 9; inM = 3 + Math.floor(rand() * 30); } // 지각
      let outH = 18, outM = Math.floor(rand() * 50);
      let early = false;
      if (chance(0.03)) { outH = 15 + Math.floor(rand() * 3); outM = Math.floor(rand() * 60); early = true; } // 조퇴
      rec.checkIn = clock(inH, inM);
      rec.checkOut = clock(outH, outM);
      if (inH >= 9) { rec.status = "지각"; rec.note = "지각 " + inM + "분"; }
      if (early) {
        rec.status = rec.status === "지각" ? "지각" : "조퇴";
        rec.note = (rec.note ? rec.note + ", " : "") + "조퇴(개인 사유)";
      }
    }

    // 오늘(09-14)은 아직 확정 전: 퇴근 시각 없음, 상태 "미확정"
    if (isToday && rec.status !== "휴가" && rec.status !== "반차") {
      rec.checkOut = null;
      rec.status = "미확정";
      rec.note = "";
      if (rec.checkIn >= "09:00") rec.checkIn = clock(8, 40 + Math.floor(rand() * 15)); // 오늘 다른 지각은 없앰
      if (emp.id === "E-1017") rec.checkIn = "09:10";                 // 미션3: 탁이안 09:10 출근 → 지각 처리 대상
      if (emp.id === "E-1009") { rec.checkIn = null; rec.note = "출근 기록 없음"; } // 미션2: 도현석 출근 누락
    }
    ATTENDANCE.push(rec);
  }
}

// ---------- 직원별 연차 요약 ----------
const LEAVE_SUMMARY = EMPLOYEES.map(e => {
  const entitled = annualLeaveDays(e.hireDate, TODAY);
  const used = LEAVES.filter(l => l.empId === e.id && l.status === "승인").reduce((s, l) => s + l.deduct, 0);
  return { empId: e.id, months: monthsBetween(e.hireDate, TODAY), entitled, used, remaining: +(entitled - used).toFixed(1) };
});

// ---------- 회사 규정 (앱 안에서 안내문으로 보여줌) ----------
const RULES = {
  workHours: "09:00 ~ 18:00 (점심 12:00~13:00)",
  lateAfter: "09:00",
  earlyBefore: "18:00",
  teamLeaveRule: "같은 팀에서 같은 날 2명 이상 연차 사용 불가 (팀장 예외 승인 시 가능)",
  annualLeave: [
    "입사 1년 미만: 개근한 달마다 1일 (최대 11일)",
    "입사 1년 이상: 15일",
    "만 3년부터 2년마다 1일 추가, 최대 25일",
    "반차는 0.5일 차감, 병가·경조휴가는 연차 차감 없음",
  ],
};

// ---------- 미션 정답표 (앱이 자동 판정할 때 씀) ----------
const pending = LEAVES.filter(l => l.status === "대기").map(l => l.id);
const aug = ATTENDANCE.filter(a => a.date.startsWith("2026-08"));
const MISSION_KEYS = {
  m1_devTeamCount: EMPLOYEES.filter(e => e.dept === "개발팀").length,
  m2_missingCheckInEmp: "E-1009",
  m3_lateEmp: "E-1017",
  m4_emp: "E-1005", m4_answer: LEAVE_SUMMARY.find(s => s.empId === "E-1005").entitled,
  m5_emp: "E-1003", m5_answer: LEAVE_SUMMARY.find(s => s.empId === "E-1003").entitled,
  m6_requests: { approve: [pending[0], pending[1]], reject: [pending[2]] },
  m7_request: pending[3],
  m8_month: "2026-08",
  m8_summary: {
    workdays: [...new Set(aug.map(a => a.date))].length,
    late: aug.filter(a => a.status === "지각").length,
    early: aug.filter(a => a.status === "조퇴").length,
    absent: aug.filter(a => a.status === "결근").length,
    leave: aug.filter(a => a.status === "휴가").length,
    half: aug.filter(a => a.status === "반차").length,
  },
};

// ---------- 저장 ----------
const SEED = {
  notice: NOTICE, company: COMPANY, today: TODAY, generatedBy: "data/generate_seed.js",
  holidays: HOLIDAYS, rules: RULES,
  employees: EMPLOYEES, leaves: LEAVES, attendance: ATTENDANCE, leaveSummary: LEAVE_SUMMARY,
  missionKeys: MISSION_KEYS,
};
fs.writeFileSync(path.join(__dirname, "seed.json"), JSON.stringify(SEED, null, 2), "utf8");
fs.writeFileSync(path.join(__dirname, "seed.js"),
  "// " + NOTICE + "\n// 이 파일은 data/generate_seed.js 가 자동으로 만든 파일입니다. 직접 고치지 말고 생성기를 고치세요.\n" +
  "window.SEED = " + JSON.stringify(SEED) + ";\n", "utf8");

// ---------- 요약 출력 ----------
console.log("직원:", EMPLOYEES.length, "명 / 휴가기록:", LEAVES.length, "건 / 출퇴근기록:", ATTENDANCE.length, "건");
console.log("미션 정답표:", JSON.stringify(MISSION_KEYS));
console.log("연차 요약:");
for (const s of LEAVE_SUMMARY) {
  const e = EMPLOYEES.find(x => x.id === s.empId);
  console.log(` ${s.empId} ${e.name} ${e.dept} 입사 ${e.hireDate} (${s.months}개월) 부여 ${s.entitled} 사용 ${s.used} 잔여 ${s.remaining}`);
}
console.log("오늘 기록:", ATTENDANCE.filter(a => a.date === TODAY).map(a => `${a.empId}:${a.checkIn || "-"}/${a.status}`).join(" "));
console.log("대기 신청:", LEAVES.filter(l => l.status === "대기").map(l => `${l.id} ${l.empName} ${l.type} ${l.start}~${l.end} ${l.days}일`).join(" | "));
