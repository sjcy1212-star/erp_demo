// 교육용 가상 자료 — 이 앱의 회사·인물·수치는 모두 교육 목적으로 만든 가상의 것이며 실제 인물·회사와 무관합니다.
//
// 구성: 1) 상태 저장   2) 계산 규칙   3) 탭 화면(직원·근태·휴가·집계)   4) 따라해보기 시나리오   5) 공통(이 위치 보기, 설명 모드, 초기화)

(function () {
  "use strict";

  const SEED = window.SEED;
  const TODAY = SEED.today;
  const THIS_MONTH = TODAY.slice(0, 7);
  const KEY = "erp_demo_v2";
  const STATUSES = ["미확정", "정상", "지각", "조퇴", "결근", "휴가", "반차"];
  const DEPTS = ["경영지원팀", "개발팀", "영업팀", "디자인팀"];
  const MONTHS = ["2026-08", "2026-09"];

  // ---------- 1) 상태 ----------
  function fresh() {
    return {
      attendance: JSON.parse(JSON.stringify(SEED.attendance)),
      leaves: JSON.parse(JSON.stringify(SEED.leaves)),
      closedMonths: [],
      adjustments: [],       // 연차 수동 조정 { empId, date, delta, reason }
      tab: "emp", attDate: TODAY, attDept: "", sumMonth: "2026-08",
      empQuery: "", empDept: "", selectedEmp: null,
    };
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.attendance)) return Object.assign(fresh(), s); } catch (e) { /* 새로 시작 */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ } }
  let state = load();
  const msgs = {};          // 줄 아래 안내문 (저장하지 않음) { "R-036": "..." }
  let rejecting = null;     // 반려 사유 입력 중인 신청번호
  let formMsg = { leave: "", adj: "" };

  // ---------- 2) 계산 규칙 ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const emp = (id) => SEED.employees.find(e => e.id === id);
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const fmt = (s) => `${s} (${WEEK[pd(s).getUTCDay()]})`;
  const isWeekend = (s) => [0, 6].includes(pd(s).getUTCDay());
  const holiday = (s) => SEED.holidays[s] || null;
  const isWorkday = (s) => !isWeekend(s) && !holiday(s);
  const addDays = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const workdays = (a, b) => { let n = 0; for (let s = a; s <= b; s = addDays(s, 1)) if (isWorkday(s)) n++; return n; };
  function months(from, to) {
    const a = pd(from), b = pd(to);
    let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
    if (b.getUTCDate() < a.getUTCDate()) m -= 1; return m;
  }
  function entitled(id) {           // 부여 연차 (입사일 규칙)
    const m = months(emp(id).hireDate, TODAY);
    if (m < 12) return Math.min(m, 11);
    return Math.min(25, 15 + Math.floor((Math.floor(m / 12) - 1) / 2));
  }
  const used = (id) => state.leaves.filter(l => l.empId === id && l.status === "승인").reduce((s, l) => s + l.deduct, 0);
  const adjust = (id) => state.adjustments.filter(a => a.empId === id).reduce((s, a) => s + a.delta, 0);
  const remaining = (id) => +(entitled(id) - used(id) + adjust(id)).toFixed(1);
  const signed = (n) => (n > 0 ? "+" : "") + (Number.isInteger(n) ? n : n.toFixed(1));
  // 연차 히스토리: 부여 → 사용 → 조정을 날짜순으로, 잔여를 누적 계산 (flex 휴가 히스토리 방식)
  function history(id) {
    const e = emp(id), m = months(e.hireDate, TODAY), rows = [];
    if (m < 12) { for (let k = 1; k <= Math.min(m, 11); k++) rows.push({ date: addMonths(e.hireDate, k), kind: "부여", delta: 1, note: `입사 ${k}개월 개근 (1년 미만 규칙)` }); }
    else rows.push({ date: "2026-01-01", kind: "부여", delta: entitled(id), note: `근속 ${Math.floor(m / 12)}년 (1년 이상 규칙)` });
    state.leaves.filter(l => l.empId === id && l.status === "승인" && l.deduct > 0).forEach(l => rows.push({ date: l.start, kind: "사용", delta: -l.deduct, note: `${l.id} ${l.type}${l.end !== l.start ? " ~ " + l.end : ""}` }));
    state.adjustments.filter(a => a.empId === id).forEach(a => rows.push({ date: a.date, kind: "조정", delta: a.delta, note: a.reason }));
    rows.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "부여" ? -1 : 1));
    let bal = 0; rows.forEach(r => { bal = +(bal + r.delta).toFixed(1); r.balance = bal; });
    return rows;
  }
  function addMonths(s, n) { const d = pd(s); const day = d.getUTCDate(); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n); const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate(); d.setUTCDate(Math.min(day, last)); return d.toISOString().slice(0, 10); }
  const days = (n) => (Number.isInteger(n) ? n : n.toFixed(1)) + "일";
  const rec = (date, id) => state.attendance.find(a => a.date === date && a.empId === id);
  const closed = (ym) => state.closedMonths.includes(ym);
  function judge(r) {                // 규칙상 판정 (참고값)
    if (r.status === "휴가" || r.status === "반차") return r.status;
    if (!r.checkIn && !r.checkOut) return r.date === TODAY ? "출근 기록 없음" : "결근";
    if (r.checkIn && r.checkIn > SEED.rules.lateAfter) return "지각";
    if (r.checkOut && r.checkOut < SEED.rules.earlyBefore) return "조퇴";
    return "정상";
  }
  function sameTeam(l) {             // 같은 팀 같은 날 다른 휴가(반려 제외)
    return state.leaves.filter(o => o.id !== l.id && o.dept === l.dept && o.status !== "반려" && o.start <= l.end && l.start <= o.end);
  }
  function monthStats(ym) {
    const rs = state.attendance.filter(a => a.date.startsWith(ym));
    const keys = ["정상", "지각", "조퇴", "결근", "휴가", "반차", "미확정"];
    const rows = SEED.employees.map(e => { const mine = rs.filter(a => a.empId === e.id); const o = { e }; keys.forEach(k => o[k] = mine.filter(a => a.status === k).length); return o; });
    const tot = {}; keys.forEach(k => tot[k] = rows.reduce((s, r) => s + r[k], 0));
    return { days: new Set(rs.map(a => a.date)).size, rows, tot };
  }
  const badge = (s, help) => `<span class="badge ${esc(s)}" ${help ? `data-help="${esc(help)}"` : ""}>${esc(s)}</span>`;

  // ---------- 3) 탭 화면 ----------
  const TABS = [["emp", "직원"], ["att", "근태"], ["leave", "휴가"], ["sum", "집계"]];
  function render() {
    save();
    $("#tabs").innerHTML = TABS.map(([id, n]) => `<button class="${state.tab === id ? "active" : ""}" data-tab="${id}">${n}</button>`).join("");
    ({ emp: viewEmp, att: viewAtt, leave: viewLeave, sum: viewSum })[state.tab]($("#main"));
    renderScenarios();
  }
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { state.tab = b.dataset.tab; render(); } });

  // 직원
  function viewEmp(v) {
    const q = state.empQuery, d = state.empDept;
    const rows = SEED.employees.filter(e => (!d || e.dept === d) && (!q || e.name.includes(q) || e.id.includes(q)));
    v.innerHTML = `
      <h2>직원</h2><p class="desc">가상 임직원 ${SEED.employees.length}명입니다. 이름을 누르면 연차·근태·휴가 내역을 함께 볼 수 있습니다.</p>
      <div class="toolbar">
        <input type="text" id="empQ" value="${esc(q)}" placeholder="이름·사번으로 검색" data-help="이름이나 사번 일부를 입력하면 표가 바로 걸러집니다.">
        <select id="empD" data-help="부서를 고르면 그 부서 직원만 보입니다."><option value="">전체 부서</option>${DEPTS.map(x => `<option ${d === x ? "selected" : ""}>${x}</option>`).join("")}</select>
        <span class="muted small">${rows.length}명 표시</span>
      </div>
      ${state.selectedEmp ? empDetail(state.selectedEmp) : ""}
      <div class="tbl-wrap"><table>
        <thead><tr><th data-help="모든 기록을 잇는 열쇠입니다. 근태·휴가 표에는 이 사번만 저장됩니다.">사번</th><th>이름</th><th>부서</th><th>직급</th><th>입사일</th><th>근속</th>
          <th class="num" data-help="입사일 기준 규칙으로 계산한 올해 연차입니다.">연차 부여</th><th class="num" data-help="상태가 '승인'인 휴가의 차감 일수 합계입니다.">사용</th><th class="num" data-help="담당자가 사유를 적고 수동으로 더하거나 뺀 일수입니다.">조정</th><th class="num" data-help="부여 − 사용 + 조정. 저장된 숫자가 아니라 볼 때마다 계산합니다.">남은 연차</th></tr></thead>
        <tbody>${rows.map(e => { const m = months(e.hireDate, TODAY); return `<tr data-emp-row="${e.id}">
          <td>${e.id}</td><td><button class="name-btn" data-open="${e.id}" data-help="누르면 위에 상세가 열립니다.">${e.name}</button></td><td>${e.dept}</td><td>${e.position}</td><td>${e.hireDate}</td>
          <td>${Math.floor(m / 12)}년 ${m % 12}개월</td><td class="num">${days(entitled(e.id))}</td><td class="num">${days(used(e.id))}</td><td class="num" data-cell="adj-${e.id}">${adjust(e.id) ? signed(adjust(e.id)) + "일" : "—"}</td><td class="num" data-cell="rem-${e.id}"><b>${days(remaining(e.id))}</b></td></tr>`; }).join("")}</tbody>
      </table></div>`;
    $("#empQ").oninput = e => { state.empQuery = e.target.value; render(); const i = $("#empQ"); i.focus(); i.setSelectionRange(99, 99); };
    $("#empD").onchange = e => { state.empDept = e.target.value; render(); };
    $$("[data-open]", v).forEach(b => b.onclick = () => { if (state.selectedEmp !== b.dataset.open) formMsg.adj = ""; state.selectedEmp = b.dataset.open; render(); $("#detail")?.scrollIntoView({ block: "nearest" }); });
    const c = $("#closeDetail"); if (c) c.onclick = () => { state.selectedEmp = null; formMsg.adj = ""; render(); };
    if (state.selectedEmp) bindAdjust(state.selectedEmp);
  }
  function empDetail(id) {
    const e = emp(id), m = months(e.hireDate, TODAY);
    const mine = state.attendance.filter(a => a.empId === id && a.date.startsWith(THIS_MONTH));
    const cnt = s => mine.filter(a => a.status === s).length;
    const lv = state.leaves.filter(l => l.empId === id).sort((a, b) => b.start.localeCompare(a.start));
    const hist = history(id);
    return `<div class="detail" id="detail">
      <div class="box-head"><h3>${e.name} ${e.position} · ${e.id}</h3><button class="btn sm" id="closeDetail">닫기</button></div>
      <div class="kv"><span><b>부서</b>${e.dept}</span><span><b>입사일</b>${e.hireDate}</span><span><b>근속</b>${Math.floor(m / 12)}년 ${m % 12}개월</span>
        <span><b>연차</b>부여 ${days(entitled(id))} − 사용 ${days(used(id))} ${adjust(id) ? `${adjust(id) > 0 ? "+" : "−"} 조정 ${days(Math.abs(adjust(id)))} ` : ""}= <span data-cell="drem-${id}">남은 <b>${days(remaining(id))}</b></span></span></div>
      <div class="stats" data-cell="dstats-${id}">${["정상", "지각", "조퇴", "결근", "휴가", "미확정"].map(k => `<div class="stat"><div class="n">${cnt(k)}</div><div class="l">${THIS_MONTH.slice(5)}월 ${k}</div></div>`).join("")}</div>
      <div class="two-col">
        <div>
          <h3 data-help="부여 → 사용 → 조정을 날짜순으로 쌓고 잔여를 누적 계산합니다. '남은 연차'가 왜 그 숫자인지 보여 주는 표입니다.">연차 히스토리</h3>
          <div class="tbl-wrap" id="history" style="margin:0 0 10px"><table><thead><tr><th>날짜</th><th>구분</th><th class="num">증감</th><th class="num">잔여</th><th>근거</th></tr></thead>
            <tbody>${hist.map(r => `<tr class="h-${r.kind}"><td>${r.date}</td><td>${badge(r.kind)}</td><td class="num">${signed(r.delta)}일</td><td class="num"><b>${days(r.balance)}</b></td><td class="txt">${esc(r.note)}</td></tr>`).join("")}</tbody></table></div>
          <div class="form" id="adjForm" style="margin:0">
            <h3>연차 조정</h3><p class="muted small">시스템 밖에서 생긴 변동(전년도 이월, 포상 휴가, 입력 실수 정정)을 반영합니다. <b>사유는 필수</b>입니다 — 나중에 "왜 바뀌었나"를 답할 근거가 됩니다.</p>
            <div class="row">
              <label>적용일<input type="date" id="adjDate" value="${TODAY}"></label>
              <label>증감 일수 (+ 추가 / − 차감)<input type="number" id="adjDelta" step="0.5" value="1" style="width:110px"></label>
              <label>사유<input type="text" id="adjReason" placeholder="예: 2025년 미사용 연차 1일 이월" style="width:240px"></label>
              <button class="btn primary" id="adjSave" data-help="사유가 비어 있으면 저장되지 않습니다.">저장</button>
            </div>${formMsg.adj ? `<div class="msg">${esc(formMsg.adj)}</div>` : ""}
          </div>
        </div>
        <div>
          <h3>휴가 내역</h3>
          <div class="tbl-wrap" style="margin:0"><table><thead><tr><th>신청번호</th><th>종류</th><th>기간</th><th class="num">일수</th><th>사유</th><th>상태</th><th>처리 메모</th></tr></thead>
            <tbody>${lv.length ? lv.map(l => `<tr><td>${l.id}</td><td>${l.type}</td><td>${l.start}${l.end !== l.start ? "<br>~ " + l.end : ""}</td><td class="num">${l.days}</td><td class="txt">${esc(l.reason)}</td><td>${badge(l.status)}</td><td class="txt">${esc(l.decisionNote)}</td></tr>`).join("") : `<tr><td colspan="7" class="muted">휴가 기록이 없습니다.</td></tr>`}</tbody></table></div>
        </div>
      </div>
    </div>`;
  }
  function bindAdjust(id) {
    const b = $("#adjSave"); if (!b) return;
    b.onclick = () => {
      const date = $("#adjDate").value, delta = Number($("#adjDelta").value), reason = $("#adjReason").value.trim();
      if (!date) return setAdjMsg("적용일을 입력하세요.");
      if (!delta) return setAdjMsg("증감 일수를 0이 아닌 값으로 입력하세요.");
      if (!reason) return setAdjMsg("사유를 적어야 저장됩니다.");
      state.adjustments.push({ empId: id, date, delta, reason });
      setAdjMsg(`${signed(delta)}일 조정을 저장했습니다. 히스토리와 남은 연차에 반영됐습니다.`);
    };
    function setAdjMsg(m) { formMsg.adj = m; render(); $("#adjForm")?.scrollIntoView({ block: "nearest" }); }
  }

  // 근태
  function viewAtt(v) {
    const date = state.attDate, ym = date.slice(0, 7), lock = closed(ym), d = state.attDept;
    const rs = state.attendance.filter(a => a.date === date && (!d || emp(a.empId).dept === d));
    const off = !isWorkday(date);
    v.innerHTML = `
      <h2>근태</h2><p class="desc">날짜별 출퇴근 시각과 근태 상태입니다. <b>규칙상 판정</b>은 참고값이고, <b>상태</b> 칸을 담당자가 확정합니다. 마감된 달은 고칠 수 없습니다.</p>
      <div class="toolbar">
        <input type="date" id="attDate" value="${date}" min="2026-08-01" max="${TODAY}" data-help="2026-08-01부터 가상의 오늘(${TODAY})까지 볼 수 있습니다.">
        <button class="btn sm" id="attPrev">◀ 전날</button><button class="btn sm" id="attNext">다음날 ▶</button><button class="btn sm" id="attToday">오늘</button>
        <select id="attDept"><option value="">전체 부서</option>${DEPTS.map(x => `<option ${d === x ? "selected" : ""}>${x}</option>`).join("")}</select>
        <span><b>${fmt(date)}</b> ${holiday(date) ? badge("휴일") + " " + holiday(date) : isWeekend(date) ? badge("휴일") : ""} ${lock ? badge("마감", "마감된 달이라 수정할 수 없습니다.") : ""} ${date === TODAY ? '<span class="muted small">오늘 — 퇴근 전이라 퇴근 시각이 비어 있습니다</span>' : ""}</span>
        ${!lock && !off ? `<button class="btn sm" id="attAuto" data-help="상태가 '미확정'이고 출근 기록이 있는 줄을 규칙상 판정값으로 채웁니다." style="margin-left:auto">미확정 건 규칙대로 채우기</button>` : ""}
      </div>
      ${off ? `<p class="muted">근무일이 아니라 기록이 없습니다.</p>` : `<div class="tbl-wrap"><table>
        <thead><tr><th>사번</th><th>이름</th><th>부서</th><th data-help="09:00 이후면 규칙상 지각입니다.">출근</th><th data-help="18:00 이전이면 규칙상 조퇴입니다.">퇴근</th><th data-help="출퇴근 시각으로 계산한 참고값입니다. 저장되지 않고 볼 때마다 계산합니다.">규칙상 판정</th><th data-help="담당자가 확정하는 최종 상태입니다. 집계는 이 값을 셉니다.">상태</th><th>비고</th></tr></thead>
        <tbody>${rs.map(r => { const e = emp(r.empId), j = judge(r), dis = lock ? "disabled" : ""; return `<tr data-att="${r.empId}">
          <td>${e.id}</td><td><b>${e.name}</b></td><td>${e.dept}</td>
          <td><input type="time" data-f="checkIn" value="${r.checkIn || ""}" ${dis}></td><td><input type="time" data-f="checkOut" value="${r.checkOut || ""}" ${dis}></td>
          <td data-cell="judge-${r.empId}">${badge(j)}</td>
          <td><select data-f="status" ${dis}>${STATUSES.map(s => `<option ${r.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td>
          <td><input type="text" data-f="note" value="${esc(r.note)}" ${dis}></td></tr>`; }).join("")}</tbody></table></div>`}`;
    $("#attDate").onchange = e => { if (e.target.value) { state.attDate = e.target.value; render(); } };
    $("#attPrev").onclick = () => { state.attDate = addDays(date, -1) < "2026-08-01" ? "2026-08-01" : addDays(date, -1); render(); };
    $("#attNext").onclick = () => { state.attDate = addDays(date, 1) > TODAY ? TODAY : addDays(date, 1); render(); };
    $("#attToday").onclick = () => { state.attDate = TODAY; render(); };
    $("#attDept").onchange = e => { state.attDept = e.target.value; render(); };
    const auto = $("#attAuto"); if (auto) auto.onclick = () => { rs.forEach(r => { if (r.status === "미확정" && r.checkIn) r.status = judge(r); }); render(); };
    $$("tr[data-att] [data-f]", v).forEach(el => el.onchange = () => {
      const r = rec(date, el.closest("tr").dataset.att), f = el.dataset.f;
      r[f] = el.value === "" ? (f === "note" ? "" : null) : el.value;
      if (f === "checkIn" && r.checkIn && r.note === "출근 기록 없음") r.note = "";
      render();
    });
  }

  // 휴가
  function viewLeave(v) {
    const order = { 대기: 0, 승인: 1, 반려: 2 };
    const rows = state.leaves.slice().sort((a, b) => (order[a.status] - order[b.status]) || b.requestedAt.localeCompare(a.requestedAt) || b.id.localeCompare(a.id));
    v.innerHTML = `
      <h2>휴가</h2><p class="desc">휴가 종류는 연차·반차·병가·경조휴가입니다. 대기 건을 승인하거나 반려할 수 있고, 처리된 건은 다시 처리할 수 없습니다.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>신청번호</th><th>직원</th><th>종류</th><th>기간</th><th class="num" data-help="근무일만 셉니다. 반차는 0.5일.">일수</th><th class="num" data-help="이 직원의 현재 남은 연차. 승인하면 줄어듭니다.">남은 연차</th><th>사유</th><th>신청일</th><th data-help="대기 → 승인 또는 반려. 처리하면 처리일이 아래에 찍힙니다.">상태</th><th data-help="같은 팀 같은 날 다른 휴가가 있으면 여기에 경고가 뜹니다.">확인 사항</th><th>처리</th></tr></thead>
        <tbody>${rows.map(l => {
          const rem = remaining(l.empId), over = l.deduct > rem, st = sameTeam(l), done = l.status !== "대기";
          const warn = st.length ? `<span class="warn">같은 팀 같은 날: ${st.map(o => `${o.empName} ${o.start}${o.end !== o.start ? "~" + o.end : ""} (${o.status}, ${o.requestedAt} 신청)`).join(", ")}</span>` : `<span class="muted small">—</span>`;
          return `<tr data-row="${l.id}">
            <td>${l.id}</td><td><b>${l.empName}</b><br><span class="muted small">${l.dept}</span></td><td>${l.type}</td><td>${l.start}${l.end !== l.start ? "<br>~ " + l.end : ""}</td>
            <td class="num" data-cell="days-${l.id}">${days(l.days)}</td><td class="num" data-cell="rem-${l.id}"><b>${days(rem)}</b></td>
            <td class="txt">${esc(l.reason)}</td><td>${l.requestedAt}</td><td data-cell="st-${l.id}">${badge(l.status)}${l.decidedAt ? `<br><span class="muted small">${l.decidedAt}</span>` : ""}</td>
            <td data-cell="warn-${l.id}">${warn}</td>
            <td><button class="btn sm primary" data-approve="${l.id}" ${done ? "disabled" : ""} data-help="남은 연차보다 많으면 승인되지 않습니다.">승인</button> <button class="btn sm" data-reject="${l.id}" ${done ? "disabled" : ""} data-help="반려하면 처리는 되지만 남은 연차는 줄지 않습니다.">반려</button>
              ${rejecting === l.id ? `<div class="inline-reject"><input type="text" id="rjReason" placeholder="반려 사유 (필수)"><button class="btn sm danger" data-rjok="${l.id}">반려 확정</button><button class="btn sm" data-rjno="1">취소</button></div>` : ""}
              ${done ? `<span class="note ok" style="color:var(--gray)">이미 처리된 신청입니다${l.decisionNote && l.status === "반려" ? " · 사유: " + esc(l.decisionNote) : ""}</span>` : ""}
              ${msgs[l.id] ? `<span class="note">${esc(msgs[l.id])}</span>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="form" id="leaveForm"><h3>휴가 신청 등록</h3><p class="muted small">등록하면 상태는 대기로 시작합니다. 사용일수는 기간의 근무일 수로 자동 계산합니다.</p>
        <div class="row">
          <label>직원<select id="nlEmp"><option value="">선택하세요</option>${SEED.employees.map(e => `<option value="${e.id}">${e.name} (${e.id})</option>`).join("")}</select></label>
          <label>종류<select id="nlType"><option>연차</option><option>반차</option><option>병가</option><option>경조휴가</option></select></label>
          <label>시작일<input type="date" id="nlStart" value="${addDays(TODAY, 7)}"></label>
          <label>종료일<input type="date" id="nlEnd" value="${addDays(TODAY, 7)}"></label>
          <label>사유<input type="text" id="nlReason" placeholder="예: 가족 행사"></label>
          <button class="btn primary" id="nlSubmit">등록</button>
        </div>${formMsg.leave ? `<div class="msg">${esc(formMsg.leave)}</div>` : ""}</div>`;
    $$("[data-approve]", v).forEach(b => b.onclick = () => {
      const l = state.leaves.find(x => x.id === b.dataset.approve), rem = remaining(l.empId);
      if (l.deduct > rem) { msgs[l.id] = `남은 연차 ${days(rem)}보다 ${days(+(l.deduct - rem).toFixed(1))} 많습니다. 승인할 수 없습니다.`; render(); return; }
      delete msgs[l.id]; l.status = "승인"; l.decidedAt = TODAY; l.decisionNote = "승인"; rejecting = null; render();
    });
    $$("[data-reject]", v).forEach(b => b.onclick = () => { rejecting = b.dataset.reject; delete msgs[rejecting]; render(); $("#rjReason")?.focus(); });
    $$("[data-rjno]", v).forEach(b => b.onclick = () => { rejecting = null; render(); });
    $$("[data-rjok]", v).forEach(b => b.onclick = () => {
      const l = state.leaves.find(x => x.id === b.dataset.rjok), r = $("#rjReason").value.trim();
      if (!r) { msgs[l.id] = "반려 사유를 적어야 합니다."; render(); $("#rjReason")?.focus(); return; }
      delete msgs[l.id]; l.status = "반려"; l.decidedAt = TODAY; l.decisionNote = r; rejecting = null; render();
    });
    $("#nlSubmit").onclick = () => {
      const id = $("#nlEmp").value, type = $("#nlType").value, s = $("#nlStart").value, e2 = $("#nlEnd").value, reason = $("#nlReason").value.trim();
      if (!id) return setMsg("직원을 선택하세요.");
      if (!s || !e2 || e2 < s) return setMsg("기간을 확인하세요. 종료일이 시작일보다 빠릅니다.");
      const dd = type === "반차" ? 0.5 : workdays(s, e2);
      if (dd === 0) return setMsg("기간에 근무일이 없습니다.");
      if (!reason) return setMsg("사유를 입력하세요.");
      const e = emp(id), no = "R-" + String(state.leaves.length + 1).padStart(3, "0");
      state.leaves.push({ id: no, empId: id, empName: e.name, dept: e.dept, type, start: s, end: e2, days: dd, deduct: (type === "연차" || type === "반차") ? dd : 0, status: "대기", reason, requestedAt: TODAY, decidedAt: null, decisionNote: "" });
      setMsg(`${no} 등록됨 (${e.name}, ${type} ${days(dd)}). 표 맨 위 대기 건에서 처리할 수 있습니다.`);
    };
    function setMsg(m) { formMsg.leave = m; render(); $("#leaveForm")?.scrollIntoView({ block: "nearest" }); }
  }

  // 집계
  function viewSum(v) {
    const ym = state.sumMonth, { days: nd, rows, tot } = monthStats(ym), lock = closed(ym);
    const canClose = !lock && tot.미확정 === 0 && ym < THIS_MONTH;
    const why = lock ? "이미 마감된 달입니다." : tot.미확정 ? `미확정 ${tot.미확정}건이 있어 마감할 수 없습니다. 근태 탭에서 상태를 확정하세요.` : ym >= THIS_MONTH ? "이번 달은 달이 끝난 뒤 마감할 수 있습니다." : "";
    v.innerHTML = `
      <h2>집계</h2><p class="desc">근태 탭의 <b>상태</b> 값을 달별로 셉니다. 확인이 끝난 달은 마감하면 근태 탭에서 잠깁니다.</p>
      <div class="toolbar">
        <select id="sumMonth">${MONTHS.map(m => `<option ${ym === m ? "selected" : ""}>${m}</option>`).join("")}</select>
        <span class="muted small">근무일 ${nd}일 · ${SEED.employees.length}명</span>
        ${lock ? badge("마감", "이 달은 마감되어 근태를 고칠 수 없습니다.") : ""}
        <button class="btn primary" id="btnClose" ${canClose ? "" : "disabled"} data-help="미확정이 0건이고 지난달이어야 누를 수 있습니다." style="margin-left:auto">${ym} 근태 마감</button>
      </div>
      ${why ? `<p class="muted small" id="closeWhy">${why}</p>` : ""}
      <h3>월 합계</h3>
      <div class="tbl-wrap" id="sumTotals"><table><thead><tr><th>지급월</th><th class="num">근무일</th><th class="num">정상</th><th class="num">지각</th><th class="num">조퇴</th><th class="num">결근</th><th class="num">휴가</th><th class="num">반차</th><th class="num">미확정</th></tr></thead>
        <tbody><tr><td><b>${ym}</b></td><td class="num">${nd}</td><td class="num">${tot.정상}</td><td class="num" data-cell="tot-late"><b>${tot.지각}</b></td><td class="num">${tot.조퇴}</td><td class="num" data-cell="tot-absent"><b>${tot.결근}</b></td><td class="num">${tot.휴가}</td><td class="num">${tot.반차}</td><td class="num" data-cell="tot-unc">${tot.미확정}</td></tr></tbody></table></div>
      <h3>직원별</h3>
      <div class="tbl-wrap"><table><thead><tr><th>사번</th><th>이름</th><th>부서</th><th class="num">정상</th><th class="num">지각</th><th class="num">조퇴</th><th class="num">결근</th><th class="num">휴가</th><th class="num">반차</th><th class="num">미확정</th></tr></thead>
        <tbody>${rows.map(r => `<tr data-sum-row="${r.e.id}"><td>${r.e.id}</td><td><b>${r.e.name}</b></td><td>${r.e.dept}</td><td class="num">${r.정상}</td><td class="num">${r.지각 || ""}</td><td class="num">${r.조퇴 || ""}</td><td class="num" style="color:${r.결근 ? "var(--red)" : ""}">${r.결근 || ""}</td><td class="num">${r.휴가 || ""}</td><td class="num">${r.반차 || ""}</td><td class="num muted">${r.미확정 || ""}</td></tr>`).join("")}</tbody></table></div>`;
    $("#sumMonth").onchange = e => { state.sumMonth = e.target.value; render(); };
    $("#btnClose").onclick = () => { state.closedMonths.push(ym); render(); };
  }

  // ---------- 4) 따라해보기 ----------
  const go = (tab, sel, label, extra) => `<button class="btn go" data-go='${esc(JSON.stringify(Object.assign({ tab, sel }, extra || {})))}'>${label || "이 위치 보기"}</button>`;
  const SCENARIOS = [
    {
      title: "① 출근 기록이 빠진 직원을 채운다 → 규칙상 판정이 바뀐다",
      now() { const r = rec(TODAY, "E-1009"); return `E-1009 도현석 · ${TODAY} (출근 시각: <span class="v">${r.checkIn || "없음"}</span> · 규칙상 판정: <span class="v">${judge(r)}</span>)`; },
      steps: [
        `근태 탭 오늘 날짜에서 <b>도현석</b> 줄을 봅니다. 출근 칸이 비어 있고 규칙상 판정이 <b>출근 기록 없음</b>입니다. ${go("att", "[data-att='E-1009']", null, { date: TODAY })}`,
        `본인 확인 결과 08:50 출근이라고 합니다. 출근 칸에 <b>08:50</b>을 입력합니다. 규칙상 판정이 <b>정상</b>으로 바뀝니다. ${go("att", "[data-att='E-1009'] [data-f='checkIn']", "출근 칸 보기", { date: TODAY })}`,
        `상태 칸은 아직 <b>미확정</b>입니다. 상태를 <b>정상</b>으로 골라 확정합니다 — 집계는 이 상태 값을 셉니다. ${go("att", "[data-att='E-1009'] [data-f='status']", "상태 칸 보기", { date: TODAY })}`,
        `직원 탭에서 <b>도현석</b> 이름을 누르면 상세의 "9월 정상" 숫자에 반영되어 있습니다. ${go("emp", "[data-open='E-1009']", "이름 버튼 보기", { open: "E-1009" })}`,
      ],
    },
    {
      title: "② 09:00 넘어 출근한 직원을 지각으로 확정 → 월 합계가 오른다",
      now() { const r = rec(TODAY, "E-1017"); return `E-1017 탁이안 · 출근 ${r.checkIn || "없음"} · 상태 <span class="v">${r.status}</span> · 9월 지각 합계 <span class="v">${monthStats(THIS_MONTH).tot.지각}건</span>`; },
      steps: [
        `근태 탭 오늘 날짜에서 <b>탁이안</b> 줄을 봅니다. 출근 09:10이라 규칙상 판정이 <b>지각</b>이지만 상태는 아직 <b>미확정</b>입니다. ${go("att", "[data-att='E-1017']", null, { date: TODAY })}`,
        `상태 칸을 <b>지각</b>으로 바꿉니다. 규칙상 판정은 참고값일 뿐, 상태를 바꿔야 집계에 잡힙니다. ${go("att", "[data-att='E-1017'] [data-f='status']", "상태 칸 보기", { date: TODAY })}`,
        `집계 탭에서 2026-09를 고르면 월 합계의 <b>지각</b>이 1 늘어 있습니다. ${go("sum", "[data-cell='tot-late']", null, { month: THIS_MONTH })}`,
        `오늘 남은 미확정 건은 <b>미확정 건 규칙대로 채우기</b>로 한 번에 확정할 수 있습니다. 출근 기록이 없는 줄은 채우지 않으니 직접 확인합니다. ${go("att", "#attAuto", "채우기 버튼 보기", { date: TODAY })}`,
      ],
    },
    {
      title: "③ 대기 휴가 승인 → 남은 연차가 줄어든다",
      now() { const l = state.leaves.find(x => x.id === "R-033"); return `R-033 (한지우, ${l.type} ${days(l.days)} · 상태 <span class="v">${l.status}</span> · 남은 연차 <span class="v">${days(remaining("E-1008"))}</span>)`; },
      steps: [
        `휴가 탭에서 <b>R-033</b> 줄을 찾습니다. 상태 배지가 <b>대기</b>입니다. ${go("leave", "[data-row='R-033']")}`,
        `그 줄의 <b>승인</b>을 누릅니다. 상태가 승인으로 바뀌고 처리일이 오늘로 찍힙니다. ${go("leave", "[data-approve='R-033']", "승인 버튼 보기")}`,
        `같은 줄의 <b>남은 연차</b>가 14.5일 → 13.5일로 줄어든 것을 확인합니다. ${go("leave", "[data-cell='rem-R-033']")}`,
        `직원 탭의 <b>한지우</b> 줄에서도 같은 값이 보입니다 — 저장된 숫자가 아니라 매번 계산하기 때문입니다. ${go("emp", "[data-cell='rem-E-1008']")}`,
      ],
    },
    {
      title: "④ 같은 팀 같은 날 휴가는 경고가 뜬다 → 반려하면 연차는 줄지 않는다",
      now() { const l = state.leaves.find(x => x.id === "R-035"); return `R-035 (구하람, 9/21 ${days(l.days)} · 상태 <span class="v">${l.status}</span>) — 같은 개발팀 한지우 R-033도 9/21`; },
      steps: [
        `휴가 탭에서 <b>R-035</b> 줄의 <b>확인 사항</b> 칸을 봅니다. "같은 팀 같은 날: 한지우 …" 경고가 있습니다. ${go("leave", "[data-cell='warn-R-035']")}`,
        `회사 규정은 <b>같은 팀 같은 날 2명 이상 연차 불가</b>이고, 먼저 신청한 사람(한지우 9/10)이 우선입니다. <b>반려</b>를 누르고 사유를 적은 뒤 <b>반려 확정</b>합니다. ${go("leave", "[data-reject='R-035']", "반려 버튼 보기")}`,
        `상태는 <b>반려</b>가 되지만 <b>남은 연차</b>는 그대로입니다. 반려는 연차를 빼지 않습니다. ${go("leave", "[data-cell='rem-R-035']")}`,
        `반려 사유는 직원 탭의 <b>구하람</b> 상세 "처리 메모"에 그대로 보입니다. ${go("emp", "[data-open='E-1010']", "이름 버튼 보기", { open: "E-1010" })}`,
      ],
    },
    {
      title: "⑤ 남은 연차보다 많은 휴가는 승인이 막힌다",
      now() { const l = state.leaves.find(x => x.id === "R-036"); return `R-036 (엄태준, ${days(l.days)} 신청 · 남은 연차 <span class="v">${days(remaining("E-1012"))}</span> · 상태 <span class="v">${l.status}</span>)`; },
      steps: [
        `휴가 탭에서 <b>R-036</b> 줄을 봅니다. 사용일수 3일이 남은 연차 1일보다 큽니다. ${go("leave", "[data-row='R-036']")}`,
        `<b>승인</b>을 눌러 봅니다. 상태는 그대로 <b>대기</b>이고 버튼 아래에 "남은 연차 1일보다 2일 많습니다" 안내가 뜹니다. ${go("leave", "[data-approve='R-036']", "승인 버튼 보기")}`,
        `대신 <b>반려</b>를 누르고 사유를 적으면 처리는 되지만 남은 연차는 줄지 않습니다. ${go("leave", "[data-reject='R-036']", "반려 버튼 보기")}`,
      ],
    },
    {
      title: "⑥ 지난달 근태를 마감한다 → 그 달 기록이 잠긴다",
      now() { const t = monthStats("2026-08").tot; return `2026-08 (미확정 ${t.미확정}건 · 지각 ${t.지각}건 · 결근 ${t.결근}건 · <span class="v">${closed("2026-08") ? "마감 완료" : "마감 전"}</span>)`; },
      steps: [
        `집계 탭에서 <b>2026-08</b>을 고릅니다. 미확정이 0건이라 마감 버튼이 켜져 있습니다. ${go("sum", "#btnClose", "마감 버튼 보기", { month: "2026-08" })}`,
        `<b>2026-08 근태 마감</b>을 누릅니다. 마감 배지가 붙고 버튼은 꺼집니다. ${go("sum", "#sumTotals", null, { month: "2026-08" })}`,
        `근태 탭에서 8월 날짜(예: 8/12)를 열면 모든 칸이 잠겨 있습니다. 마감된 달은 고칠 수 없습니다. ${go("att", "[data-att='E-1001']", null, { date: "2026-08-12" })}`,
        `집계 탭에서 <b>2026-09</b>를 고르면 미확정 건이 남아 있어 마감할 수 없다는 안내가 보입니다. ${go("sum", "#closeWhy", "안내문 보기", { month: THIS_MONTH })}`,
      ],
    },
    {
      title: "⑦ 연차를 수동 조정한다 → 히스토리에 근거가 남는다",
      now() { return `E-1012 엄태준 (부여 ${days(entitled("E-1012"))} · 사용 ${days(used("E-1012"))} · 조정 <span class="v">${adjust("E-1012") ? signed(adjust("E-1012")) + "일" : "없음"}</span> · 남은 연차 <span class="v">${days(remaining("E-1012"))}</span>)`; },
      steps: [
        `직원 탭에서 <b>엄태준</b> 이름을 눌러 상세를 엽니다. <b>연차 히스토리</b> 표에 입사 후 달마다 +1일 부여와 사용 −3일 두 번이 날짜순으로 쌓여 있고 잔여가 누적 계산됩니다. ${go("emp", "#history", "히스토리 보기", { open: "E-1012" })}`,
        `히스토리 아래 <b>연차 조정</b>에서 증감 <b>+1</b>, 사유 <b>"2025년 미사용 연차 1일 이월"</b>을 적고 저장합니다. 사유가 비어 있으면 저장되지 않습니다. ${go("emp", "#adjForm", "조정 폼 보기", { open: "E-1012" })}`,
        `히스토리에 <b>조정 +1일</b> 줄이 추가되고 남은 연차가 1일 → 2일이 됩니다. 직원 표의 <b>조정</b> 칸에도 +1일이 보입니다. ${go("emp", "[data-cell='adj-E-1012']", null, { open: "E-1012" })}`,
        `휴가 탭 <b>R-036</b> 줄의 남은 연차도 같은 값입니다 — 남은 연차는 "부여 − 사용 + 조정"을 매번 계산하기 때문입니다. ${go("leave", "[data-cell='rem-R-036']")}`,
      ],
    },
  ];
  const openScn = new Set();
  function renderScenarios() {
    $("#scenarios").innerHTML = SCENARIOS.map((s, i) => `<details class="scn" ${openScn.has(i) ? "open" : ""} data-i="${i}">
      <summary><span class="t">${s.title}</span><div class="now">현재 대상: ${s.now()}</div></summary>
      <ol>${s.steps.map(st => `<li>${st}</li>`).join("")}</ol></details>`).join("");
    $$("details.scn").forEach(d => d.ontoggle = () => { d.open ? openScn.add(+d.dataset.i) : openScn.delete(+d.dataset.i); });
  }

  // ---------- 5) 공통 ----------
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-go]"); if (!b) return;
    const g = JSON.parse(b.dataset.go);
    state.tab = g.tab;
    if (g.date) state.attDate = g.date;
    if (g.month) state.sumMonth = g.month;
    if (g.open) state.selectedEmp = g.open;
    render();
    const el = $(g.sel);
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.classList.remove("hl"); void el.offsetWidth; el.classList.add("hl");
    setTimeout(() => el.classList.remove("hl"), 2000);
  });
  $$("[data-fold]").forEach(b => b.onclick = () => { const t = $("#" + b.dataset.fold); t.classList.toggle("hidden"); b.textContent = t.classList.contains("hidden") ? "펼치기" : "접기"; });
  $("#btnHelp").onclick = () => { document.body.classList.toggle("help"); $("#btnHelp").classList.toggle("on", document.body.classList.contains("help")); };
  document.addEventListener("click", e => {          // 터치 기기: 설명 모드에서 누르면 설명 표시
    if (!document.body.classList.contains("help")) return;
    $$("[data-help].show").forEach(x => x.classList.remove("show"));
    const h = e.target.closest("[data-help]"); if (h) h.classList.add("show");
  });
  $("#btnReset").onclick = () => $("#resetConfirm").classList.toggle("hidden");
  $("#resetNo").onclick = () => $("#resetConfirm").classList.add("hidden");
  $("#resetYes").onclick = () => { state = fresh(); Object.keys(msgs).forEach(k => delete msgs[k]); rejecting = null; formMsg.leave = ""; formMsg.adj = ""; $("#resetConfirm").classList.add("hidden"); render(); };

  // ---------- 6) AI 연결 테스트 (Gemini) ----------
  // 서버 함수 /api/gemini 를 거쳐 호출한다 (키는 서버에만 있음). 더블클릭(file://)으로 열면 서버가 없으므로 안내만 한다.
  (function aiTest() {
    const status = $("#aiStatus"), out = $("#aiResult"), btn = $("#aiSend"), input = $("#aiPrompt");
    const show = (txt, kind) => { out.textContent = txt; out.className = "ai-result " + (kind || ""); };
    if (location.protocol === "file:") {
      status.textContent = "서버 없음"; status.className = "ai-status off"; btn.disabled = true;
      show("이 기능은 서버가 있어야 동작합니다. 폴더에서  node dev_server.js  를 실행한 뒤 http://localhost:3000 으로 열거나, Vercel 배포 주소에서 사용하세요.", "warn");
      return;
    }
    fetch("/api/gemini").then(r => r.json()).then(j => {
      status.textContent = j.configured ? `키 설정됨 · ${j.model}` : "키 없음";
      status.className = "ai-status " + (j.configured ? "ok" : "off");
      if (!j.configured) show("서버에 GEMINI_API_KEY 가 없습니다. 로컬은 .env, Vercel은 Settings → Environment Variables 에 넣고 다시 배포하세요.", "warn");
    }).catch(() => { status.textContent = "서버 응답 없음"; status.className = "ai-status off"; });
    btn.onclick = async () => {
      const prompt = input.value.trim(); if (!prompt) return;
      btn.disabled = true; show("Gemini 응답을 기다리는 중…");
      try {
        const r = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
        const j = await r.json();
        if (j.ok) show(`✓ 연결 성공 (${j.model}, ${j.ms}ms)

${j.text || "(빈 응답)"}`, "ok");
        else show("✗ 실패: " + (j.error || r.status), "err");
      } catch (e) { show("✗ 서버에 연결하지 못했습니다: " + e.message, "err"); }
      btn.disabled = false;
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") btn.click(); });
  })();

  render();
})();
