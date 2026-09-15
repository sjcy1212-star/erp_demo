// 교육용 가상 자료 — 이 앱의 회사·인물·금액은 모두 교육 목적으로 만든 가상의 것이며 실제 인물·회사와 무관합니다.
//
// 규칙 번호(R1~R9)와 기능 번호(E/L/P/C)는 docs/PRD.md 기준입니다.
// 구성: 1) 상태 저장  2) 계산 규칙  3) 화면(직원·휴가·급여)  4) 공통(탭·설명 보기·초기화)

(function () {
  "use strict";

  const DATA = window.DATA;
  const 기준일 = DATA.기준일;                       // R9
  const KEY = "erp_small_v1";
  const 직원목록 = DATA.직원;                       // 바뀌지 않으므로 저장하지 않음 (PRD 5.2)
  const 공휴일 = DATA.공휴일;

  // ---------- 1) 상태 ----------
  function fresh() {
    return { 휴가: JSON.parse(JSON.stringify(DATA.휴가)), 급여: JSON.parse(JSON.stringify(DATA.급여)), tab: "emp" };
  }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.휴가) && Array.isArray(s.급여)) return Object.assign(fresh(), s); } catch (e) { /* 새로 시작 */ }
    return fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ } }
  let state = load();

  // ---------- 2) 계산 규칙 ----------
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => [...(el || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  const addDays = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const 근무일 = (s) => ![0, 6].includes(pd(s).getUTCDay()) && !공휴일[s];          // R2, R2-1
  const 근무일수 = (a, b) => { let n = 0; for (let s = a; s <= b; s = addDays(s, 1)) if (근무일(s)) n++; return n; };
  const 직원 = (사번) => 직원목록.find(e => e.사번 === 사번);                        // R8
  const 이름 = (사번) => { const e = 직원(사번); return e ? e.이름 : 사번; };
  const 사용연차 = (사번) => state.휴가.filter(l => l.사번 === 사번 && l.상태 === "승인").reduce((s, l) => s + l.차감일수, 0);
  const 남은연차 = (사번) => +(직원(사번).연차부여 - 사용연차(사번)).toFixed(1);      // R1
  const 실지급액 = (p) => p.기본급 + p.수당 - p.공제;                                 // R6
  const 일 = (n) => (Number.isInteger(n) ? n : n.toFixed(1)) + "일";
  const 원 = (n) => n.toLocaleString("ko-KR") + "원";
  const 배지 = (s, help) => `<span class="badge ${esc(s)}" ${help ? `data-help="${esc(help)}"` : ""}>${esc(s)}</span>`;

  const msgs = {};            // 휴가 줄 아래 안내문 (저장하지 않음)
  let rejecting = null;       // 반려 사유 입력 중인 신청번호
  const formMsg = { leave: "", pay: "" };
  const formSel = { 사번: "", 지급월: "2026-08" };
  const leaveDraft = { 사번: "", 종류: "연차", 시작일: "", 종료일: "", 사유: "" };   // 등록 오류 시 입력값을 지우지 않기 위한 임시 저장
  const payDraft = { 기본급: null, 수당: null, 공제: null };                      // 저장 오류 시 입력값 유지
  let empQuery = "", empDept = "", selectedEmp = null;
  const 부서목록 = [...new Set(직원목록.map(e => e.부서))];

  // ---------- 3) 화면 ----------
  const TABS = [["emp", "직원"], ["leave", "휴가"], ["pay", "급여"]];
  function render() {
    save();
    $("#tabs").innerHTML = TABS.map(([id, n]) => `<button class="${state.tab === id ? "active" : ""}" data-tab="${id}">${n}</button>`).join("");
    ({ emp: viewEmp, leave: viewLeave, pay: viewPay })[state.tab]($("#main"));
  }
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { state.tab = b.dataset.tab; render(); } });   // C2

  // 직원 (E1~E4)
  function viewEmp(v) {
    const rows = 직원목록.filter(e => (!empDept || e.부서 === empDept) && (!empQuery || e.이름.includes(empQuery) || e.사번.includes(empQuery)));
    v.innerHTML = `
      <h2>직원</h2><p class="desc">가상 임직원 ${직원목록.length}명입니다. 이름을 누르면 연차·휴가·급여를 함께 볼 수 있습니다. 직원 정보는 보기만 합니다.</p>
      <div class="toolbar">
        <input type="text" id="empQ" value="${esc(empQuery)}" placeholder="이름·사번으로 검색" data-help="이름이나 사번 일부를 입력하면 표가 바로 걸러집니다.">
        <select id="empD" data-help="부서를 고르면 그 부서 직원만 보입니다."><option value="">전체 부서</option>${부서목록.map(d => `<option ${empDept === d ? "selected" : ""}>${d}</option>`).join("")}</select>
        <span class="muted small">${rows.length}명 표시</span>
      </div>
      ${selectedEmp ? empDetail(selectedEmp) : ""}
      <div class="tbl-wrap"><table>
        <thead><tr><th data-help="모든 기록을 잇는 열쇠입니다. 휴가·급여 표에는 이 사번만 저장됩니다.">사번</th><th>이름</th><th>부서</th><th>직급</th><th>입사일</th><th>재직상태</th>
          <th class="num" data-help="전원 15일 일괄 부여(교육용 단순화)">연차 부여</th><th class="num" data-help="상태가 '승인'인 휴가의 차감일수 합계입니다.">사용</th><th class="num" data-help="부여 − 사용. 저장된 숫자가 아니라 볼 때마다 계산합니다.">남은 연차</th></tr></thead>
        <tbody>${rows.map(e => `<tr data-emp-row="${e.사번}">
          <td>${e.사번}</td><td><button class="name-btn" data-open="${e.사번}" data-help="누르면 위에 상세가 열립니다.">${e.이름}</button></td><td>${e.부서}</td><td>${e.직급}</td><td>${e.입사일}</td><td>${배지(e.재직상태)}</td>
          <td class="num">${일(e.연차부여)}</td><td class="num">${일(사용연차(e.사번))}</td><td class="num" data-cell="rem-${e.사번}"><b>${일(남은연차(e.사번))}</b></td></tr>`).join("")}</tbody>
      </table></div>`;
    $("#empQ").oninput = e => { empQuery = e.target.value; render(); const i = $("#empQ"); i.focus(); i.setSelectionRange(99, 99); };
    $("#empD").onchange = e => { empDept = e.target.value; render(); };
    $$("[data-open]", v).forEach(b => b.onclick = () => { selectedEmp = b.dataset.open; render(); $("#detail")?.scrollIntoView({ block: "nearest" }); });
    const c = $("#closeDetail"); if (c) c.onclick = () => { selectedEmp = null; render(); };
  }
  function empDetail(사번) {
    const e = 직원(사번);
    const lv = state.휴가.filter(l => l.사번 === 사번).sort((a, b) => b.시작일.localeCompare(a.시작일));
    const py = state.급여.filter(p => p.사번 === 사번).sort((a, b) => b.지급월.localeCompare(a.지급월));
    return `<div class="detail" id="detail">
      <div class="box-head"><h3>${e.이름} ${e.직급} · ${e.사번}</h3><button class="btn sm" id="closeDetail">닫기</button></div>
      <div class="kv"><span><b>부서</b>${e.부서}</span><span><b>입사일</b>${e.입사일}</span><span><b>재직상태</b>${e.재직상태}</span>
        <span data-cell="dcalc-${사번}"><b>남은 연차</b>부여 ${일(e.연차부여)} − 사용 ${일(사용연차(사번))} = <b>${일(남은연차(사번))}</b></span></div>
      <div class="two-col">
        <div><h3>휴가 내역</h3><div class="tbl-wrap"><table><thead><tr><th>신청번호</th><th>종류</th><th>기간</th><th class="num">일수</th><th>상태</th><th>처리 메모</th></tr></thead>
          <tbody>${lv.length ? lv.map(l => `<tr><td>${l.신청번호}</td><td>${l.종류}</td><td>${l.시작일}${l.종료일 !== l.시작일 ? "<br>~ " + l.종료일 : ""}</td><td class="num">${l.사용일수}</td><td>${배지(l.상태)}</td><td class="txt">${esc(l.처리메모)}</td></tr>`).join("") : `<tr><td colspan="6" class="muted">휴가 기록이 없습니다.</td></tr>`}</tbody></table></div></div>
        <div><h3>급여</h3><div class="tbl-wrap"><table><thead><tr><th>급여번호</th><th>지급월</th><th class="num">기본급</th><th class="num">수당</th><th class="num">공제</th><th class="num">실지급액</th><th>상태</th></tr></thead>
          <tbody>${py.length ? py.map(p => `<tr><td>${p.급여번호}</td><td>${p.지급월}</td><td class="num">${원(p.기본급)}</td><td class="num">${원(p.수당)}</td><td class="num">${원(p.공제)}</td><td class="num" data-cell="dpay-${p.급여번호}"><b>${원(실지급액(p))}</b></td><td>${배지(p.상태)}</td></tr>`).join("") : `<tr><td colspan="7" class="muted">급여 기록이 없습니다.</td></tr>`}</tbody></table></div></div>
      </div>
    </div>`;
  }

  // 휴가 (L1~L5)
  function viewLeave(v) {
    const order = { 대기: 0, 승인: 1, 반려: 2 };
    const rows = state.휴가.slice().sort((a, b) => (order[a.상태] - order[b.상태]) || b.신청일.localeCompare(a.신청일) || b.신청번호.localeCompare(a.신청번호));
    v.innerHTML = `
      <h2>휴가</h2><p class="desc">휴가 종류는 연차·반차·병가·경조휴가입니다. 대기 건을 승인하거나 반려할 수 있고, 처리된 건은 다시 처리할 수 없습니다. 반려에는 사유가 필요합니다.</p>
      <div class="tbl-wrap"><table>
        <thead><tr><th>신청번호</th><th>직원</th><th>종류</th><th>기간</th><th class="num" data-help="주말·공휴일을 뺀 근무일 수. 반차는 0.5일.">사용일수</th><th class="num" data-help="이 직원의 현재 남은 연차. 승인하면 줄어듭니다.">남은 연차</th><th>사유</th><th>신청일</th><th data-help="대기 → 승인 또는 반려. 처리하면 처리일이 아래에 찍힙니다.">상태</th><th>처리</th></tr></thead>
        <tbody>${rows.map(l => {
          const e = 직원(l.사번), rem = 남은연차(l.사번), done = l.상태 !== "대기";
          return `<tr data-row="${l.신청번호}">
            <td>${l.신청번호}</td><td><b>${e.이름}</b><br><span class="muted small">${e.부서}</span></td><td>${l.종류}</td><td>${l.시작일}${l.종료일 !== l.시작일 ? "<br>~ " + l.종료일 : ""}</td>
            <td class="num" data-cell="days-${l.신청번호}">${일(l.사용일수)}</td><td class="num" data-cell="rem-${l.신청번호}"><b>${일(rem)}</b></td>
            <td class="txt">${esc(l.사유)}</td><td>${l.신청일}</td><td data-cell="st-${l.신청번호}">${배지(l.상태)}${l.처리일 ? `<br><span class="muted small">${l.처리일}</span>` : ""}</td>
            <td><button class="btn sm primary" data-approve="${l.신청번호}" ${done ? "disabled" : ""} data-help="남은 연차보다 많으면 승인되지 않습니다.">승인</button> <button class="btn sm" data-reject="${l.신청번호}" ${done ? "disabled" : ""} data-help="반려하면 처리는 되지만 남은 연차는 줄지 않습니다. 사유가 필요합니다.">반려</button>
              ${rejecting === l.신청번호 ? `<div class="inline-reject"><input type="text" id="rjReason" placeholder="반려 사유 (필수)"><button class="btn sm danger" data-rjok="${l.신청번호}">반려 확정</button><button class="btn sm" data-rjno="1">취소</button></div>` : ""}
              ${done ? `<span class="note done">이미 처리된 신청입니다${l.상태 === "반려" && l.처리메모 ? " · 사유: " + esc(l.처리메모) : ""}</span>` : ""}
              ${msgs[l.신청번호] ? `<span class="note">${esc(msgs[l.신청번호])}</span>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="form" id="leaveForm"><h3>휴가 신청 등록</h3><p class="muted small">등록하면 상태는 대기로 시작합니다. 사용일수는 기간의 근무일 수로 자동 계산합니다.</p>
        <div class="row">
          <label>직원<select id="nlEmp"><option value="">선택하세요</option>${직원목록.map(e => `<option value="${e.사번}" ${leaveDraft.사번 === e.사번 ? "selected" : ""}>${e.이름} (${e.사번})</option>`).join("")}</select></label>
          <label>종류<select id="nlType">${["연차", "반차", "병가", "경조휴가"].map(k => `<option ${leaveDraft.종류 === k ? "selected" : ""}>${k}</option>`).join("")}</select></label>
          <label>시작일<input type="date" id="nlStart" value="${leaveDraft.시작일 || addDays(기준일, 7)}"></label>
          <label>종료일<input type="date" id="nlEnd" value="${leaveDraft.종료일 || addDays(기준일, 7)}"></label>
          <label>사유<input type="text" id="nlReason" placeholder="예: 가족 행사" value="${esc(leaveDraft.사유)}"></label>
          <button class="btn primary" id="nlSubmit">등록</button>
        </div>${formMsg.leave ? `<div class="msg ${formMsg.leave.startsWith("✔") ? "" : "err"}">${esc(formMsg.leave)}</div>` : ""}</div>`;
    // L2 승인 (R3, R5)
    $$("[data-approve]", v).forEach(b => b.onclick = () => {
      const l = state.휴가.find(x => x.신청번호 === b.dataset.approve), rem = 남은연차(l.사번);
      if (l.차감일수 > rem) { msgs[l.신청번호] = `남은 연차 ${일(rem)}보다 ${일(+(l.차감일수 - rem).toFixed(1))} 많습니다. 승인할 수 없습니다.`; render(); return; }
      delete msgs[l.신청번호]; l.상태 = "승인"; l.처리일 = 기준일; l.처리메모 = "승인"; rejecting = null; render();
    });
    // L3 반려 (R4)
    $$("[data-reject]", v).forEach(b => b.onclick = () => { rejecting = b.dataset.reject; delete msgs[rejecting]; render(); $("#rjReason")?.focus(); });
    $$("[data-rjno]", v).forEach(b => b.onclick = () => { rejecting = null; render(); });
    $$("[data-rjok]", v).forEach(b => b.onclick = () => {
      const l = state.휴가.find(x => x.신청번호 === b.dataset.rjok), r = $("#rjReason").value.trim();
      if (!r) { msgs[l.신청번호] = "반려 사유를 적어야 합니다."; render(); $("#rjReason")?.focus(); return; }
      delete msgs[l.신청번호]; l.상태 = "반려"; l.처리일 = 기준일; l.처리메모 = r; rejecting = null; render();
    });
    // L5 등록 (R2, R5-1)
    $("#nlSubmit").onclick = () => {
      const 사번 = $("#nlEmp").value, 종류 = $("#nlType").value, s = $("#nlStart").value, e2 = $("#nlEnd").value, 사유 = $("#nlReason").value.trim();
      Object.assign(leaveDraft, { 사번, 종류, 시작일: s, 종료일: e2, 사유 });   // 오류가 나도 입력값 유지
      if (!사번) return setLeaveMsg("직원을 선택하세요.");
      if (!s || !e2 || e2 < s) return setLeaveMsg("기간을 확인하세요. 종료일이 시작일보다 빠릅니다.");
      const dd = 종류 === "반차" ? 0.5 : 근무일수(s, e2);
      if (dd === 0) return setLeaveMsg("기간에 근무일이 없습니다.");
      if (!사유) return setLeaveMsg("사유를 입력하세요.");
      const no = "L-" + String(state.휴가.length + 1).padStart(3, "0");
      state.휴가.push({ 신청번호: no, 사번, 종류, 시작일: s, 종료일: e2, 사용일수: dd, 차감일수: (종류 === "연차" || 종류 === "반차") ? dd : 0, 사유, 신청일: 기준일, 상태: "대기", 처리일: null, 처리메모: "" });
      Object.assign(leaveDraft, { 사번: "", 종류: "연차", 시작일: "", 종료일: "", 사유: "" });   // 성공하면 폼 비움
      setLeaveMsg(`✔ ${no} 등록됨 (${이름(사번)}, ${종류} ${일(dd)}). 표 맨 위 대기 건에서 처리할 수 있습니다.`);
    };
    function setLeaveMsg(m) { formMsg.leave = m; render(); $("#leaveForm")?.scrollIntoView({ block: "nearest" }); }
  }

  // 급여 (P1~P4)
  function viewPay(v) {
    const months = [...new Set(state.급여.map(p => p.지급월))].sort().reverse();
    const sum = (ym, f) => state.급여.filter(p => p.지급월 === ym).reduce((s, p) => s + f(p), 0);
    const rows = state.급여.slice().sort((a, b) => b.지급월.localeCompare(a.지급월) || a.급여번호.localeCompare(b.급여번호));
    const sel = state.급여.find(p => p.사번 === formSel.사번 && p.지급월 === formSel.지급월);
    v.innerHTML = `
      <h2>급여</h2><p class="desc">실지급액 = 기본급 + 수당 − 공제. 세금과 4대보험은 계산하지 않습니다. 전체 ${state.급여.length}건입니다.</p>
      <h3>월 합계</h3>
      <div class="tbl-wrap" id="payTotals"><table><thead><tr><th>지급월</th><th class="num">건수</th><th class="num">기본급 합계</th><th class="num">수당 합계</th><th class="num">공제 합계</th><th class="num" data-help="그 달 모든 건의 실지급액을 더한 값. 저장하지 않고 볼 때마다 계산합니다.">실지급액 합계</th><th class="num">확정 건수</th></tr></thead>
        <tbody>${months.map(ym => `<tr data-month="${ym}"><td><b>${ym}</b></td><td class="num" data-cell="cnt-${ym}">${state.급여.filter(p => p.지급월 === ym).length}건</td><td class="num">${원(sum(ym, p => p.기본급))}</td><td class="num">${원(sum(ym, p => p.수당))}</td><td class="num">${원(sum(ym, p => p.공제))}</td><td class="num" data-cell="tot-${ym}"><b>${원(sum(ym, 실지급액))}</b></td><td class="num">${state.급여.filter(p => p.지급월 === ym && p.상태 === "확정").length}건</td></tr>`).join("")}</tbody></table></div>
      <h3>급여 목록</h3>
      <div class="tbl-wrap"><table><thead><tr><th>급여번호</th><th>직원</th><th>지급월</th><th class="num">기본급</th><th class="num">수당</th><th class="num">공제</th><th class="num">실지급액</th><th data-help="작성 → 확정. 확정하면 급여 입력으로 고칠 수 없습니다.">상태</th><th>처리</th></tr></thead>
        <tbody>${rows.map(p => { const e = 직원(p.사번); return `<tr data-pay="${p.급여번호}"><td>${p.급여번호}</td><td><b>${e.이름}</b><br><span class="muted small">${e.부서}</span></td><td>${p.지급월}</td><td class="num">${원(p.기본급)}</td><td class="num" data-cell="allow-${p.급여번호}">${원(p.수당)}</td><td class="num">${원(p.공제)}</td><td class="num" data-cell="net-${p.급여번호}"><b>${원(실지급액(p))}</b></td><td data-cell="pst-${p.급여번호}">${배지(p.상태)}</td>
          <td><button class="btn sm primary" data-confirm="${p.급여번호}" ${p.상태 === "확정" ? "disabled" : ""} data-help="확정하면 이 건은 더 이상 수정할 수 없습니다. 취소는 없습니다.">확정</button>${p.상태 === "확정" ? '<span class="note done">확정된 급여입니다</span>' : ""}</td></tr>`; }).join("")}</tbody></table></div>
      <div class="form" id="payForm"><h3>급여 입력</h3><p class="muted small">같은 직원·같은 지급월에 이미 급여가 있으면 새로 만들지 않고 기존 건을 수정합니다. 확정된 건은 수정할 수 없습니다.</p>
        <div class="row">
          <label>직원<select id="pEmp"><option value="">선택하세요</option>${직원목록.map(e => `<option value="${e.사번}" ${formSel.사번 === e.사번 ? "selected" : ""}>${e.이름} (${e.사번})</option>`).join("")}</select></label>
          <label>지급월<input type="month" id="pMonth" value="${formSel.지급월}"></label>
          <label>기본급<input type="number" id="pBase" min="0" step="1" value="${payDraft.기본급 ?? (sel ? sel.기본급 : 3000000)}" style="width:130px"></label>
          <label>수당<input type="number" id="pAllow" min="0" step="1" value="${payDraft.수당 ?? (sel ? sel.수당 : 200000)}" style="width:120px"></label>
          <label>공제<input type="number" id="pDed" min="0" step="1" value="${payDraft.공제 ?? (sel ? sel.공제 : 100000)}" style="width:120px"></label>
          <button class="btn primary" id="pSave">저장</button>
        </div>
        ${sel ? `<p class="muted small" style="margin-top:8px">기존 건 ${sel.급여번호} ${배지(sel.상태)} 의 금액을 불러왔습니다. 저장하면 이 건이 수정됩니다.</p>` : ""}
        ${formMsg.pay ? `<div class="msg ${formMsg.pay.startsWith("✔") ? "" : "err"}">${esc(formMsg.pay)}</div>` : ""}</div>`;
    // P3 입력 (R6, R6-1, R7)
    const clearDraft = () => { payDraft.기본급 = payDraft.수당 = payDraft.공제 = null; };
    $("#pEmp").onchange = e => { formSel.사번 = e.target.value; formMsg.pay = ""; clearDraft(); render(); };      // 직원·지급월을 바꾸면 그 건의 금액을 새로 불러옴
    $("#pMonth").onchange = e => { formSel.지급월 = e.target.value; formMsg.pay = ""; clearDraft(); render(); };
    $("#pSave").onclick = () => {
      const 사번 = $("#pEmp").value, 지급월 = $("#pMonth").value;
      const 기본급 = Number($("#pBase").value), 수당 = Number($("#pAllow").value), 공제 = Number($("#pDed").value);
      Object.assign(payDraft, { 기본급: $("#pBase").value, 수당: $("#pAllow").value, 공제: $("#pDed").value });   // 오류가 나도 입력값 유지
      if (!사번) return setPayMsg("직원을 선택하세요.");
      if (!/^\d{4}-\d{2}$/.test(지급월)) return setPayMsg("지급월을 입력하세요 (예: 2026-08).");
      if ([기본급, 수당, 공제].some(n => !Number.isInteger(n) || n < 0)) return setPayMsg("금액은 0 이상의 정수로 입력하세요.");
      if (공제 > 기본급 + 수당) return setPayMsg("실지급액이 음수가 됩니다. 공제가 기본급+수당보다 큽니다.");
      const ex = state.급여.find(p => p.사번 === 사번 && p.지급월 === 지급월);
      if (ex && ex.상태 === "확정") return setPayMsg(`확정된 급여는 수정할 수 없습니다. (${ex.급여번호})`);
      if (ex) { ex.기본급 = 기본급; ex.수당 = 수당; ex.공제 = 공제; ex.실지급액 = 실지급액(ex); clearDraft(); return setPayMsg(`✔ ${ex.급여번호} 수정됨. 실지급액 ${원(실지급액(ex))}`); }
      const seq = state.급여.filter(p => p.지급월 === 지급월).length + 1;
      const no = `PY-${지급월}-${String(seq).padStart(3, "0")}`;
      state.급여.push({ 급여번호: no, 사번, 지급월, 기본급, 수당, 공제, 실지급액: 기본급 + 수당 - 공제, 상태: "작성" });
      clearDraft(); setPayMsg(`✔ ${no} 새로 등록됨 (${이름(사번)}, ${지급월}). 실지급액 ${원(기본급 + 수당 - 공제)}`);
    };
    // P4 확정 (R7)
    $$("[data-confirm]", v).forEach(b => b.onclick = () => { const p = state.급여.find(x => x.급여번호 === b.dataset.confirm); p.상태 = "확정"; render(); });
    function setPayMsg(m) { formMsg.pay = m; render(); $("#payForm")?.scrollIntoView({ block: "nearest" }); }
  }

  // ---------- 4) 공통 (C3, C4) ----------
  $$("[data-fold]").forEach(b => b.onclick = () => { const t = $("#" + b.dataset.fold); t.classList.toggle("hidden"); b.textContent = t.classList.contains("hidden") ? "펼치기" : "접기"; });
  $("#btnHelp").onclick = () => { document.body.classList.toggle("help"); $("#btnHelp").classList.toggle("on", document.body.classList.contains("help")); tip.hidden = true; };
  // 설명 말풍선: 화면에 하나만 두고, 마우스를 올린(또는 누른) 요소 아래에 붙인다. 표 상자 안에서 잘리지 않는다.
  const tip = document.createElement("div"); tip.id = "helpTip"; tip.hidden = true; document.body.appendChild(tip);
  function showTip(el) {
    if (!el || !document.body.classList.contains("help")) { tip.hidden = true; return; }
    tip.textContent = el.dataset.help; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    let left = r.left, top = r.bottom + 4;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;           // 오른쪽 넘침 방지
    if (top + h > window.innerHeight - 8) top = r.top - h - 4;                        // 아래 넘치면 위로
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  document.addEventListener("mouseover", e => showTip(e.target.closest("[data-help]")));
  document.addEventListener("mouseout", e => { if (!e.relatedTarget || !e.relatedTarget.closest("[data-help]")) tip.hidden = true; });
  document.addEventListener("click", e => showTip(e.target.closest("[data-help]")));   // 터치 기기
  window.addEventListener("scroll", () => { tip.hidden = true; }, true);
  $("#btnReset").onclick = () => $("#resetConfirm").classList.toggle("hidden");
  $("#resetNo").onclick = () => $("#resetConfirm").classList.add("hidden");
  $("#resetYes").onclick = () => {
    state = fresh(); Object.keys(msgs).forEach(k => delete msgs[k]); rejecting = null; formMsg.leave = ""; formMsg.pay = ""; selectedEmp = null; formSel.사번 = ""; formSel.지급월 = "2026-08";
    Object.assign(leaveDraft, { 사번: "", 종류: "연차", 시작일: "", 종료일: "", 사유: "" }); payDraft.기본급 = payDraft.수당 = payDraft.공제 = null;
    $("#resetConfirm").classList.add("hidden"); render();
  };

  // 콘솔 검산용 (docs/개발순서.md 2단계)
  window.ERP = { 근무일수, 남은연차, 실지급액, 사용연차, state: () => state };
  render();
  // 주소 뒤에 ?test=1 을 붙이면 tests/check.js 자동 검사를 실행 (PRD 6.2)
  if (location.search.includes("test=1")) { const s = document.createElement("script"); s.src = "../tests/check.js"; document.body.appendChild(s); }
})();
