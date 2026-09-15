// 교육용 가상 자료 — 실제 인물·회사와 무관합니다.
//
// erp_small 자동 검사 (docs/PRD.md 6.2). 실행 방법:
//   erp_small/index.html?test=1  로 열면 이 파일이 자동으로 실행되어 화면 맨 위에 결과표를 보여 줍니다.
//   (더블클릭으로 연 file:// 주소 뒤에 ?test=1 을 붙여도 됩니다)
// 검사는 두 단계로 나뉩니다: 1단계(A1~A7, 등록) → 새로고침 → 2단계(새로고침 유지, A8~A10, 문구·오류·스크롤).

(function () {
  "use strict";
  const q = s => document.querySelector(s);
  const t = s => (q(s) ? q(s).innerText.replace(/\s+/g, " ").trim() : "(없음)");
  const results = JSON.parse(sessionStorage.getItem("erp_small_test_results") || "[]");
  const phase = sessionStorage.getItem("erp_small_test_phase") || "1";
  let errorCount = Number(sessionStorage.getItem("erp_small_test_errors") || 0);
  window.addEventListener("error", () => { errorCount++; sessionStorage.setItem("erp_small_test_errors", errorCount); });

  function check(id, name, actual, expected) {
    const pass = typeof expected === "function" ? expected(actual) : String(actual) === String(expected);
    results.push({ id, name, expected: typeof expected === "function" ? "(조건)" : String(expected), actual: String(actual), pass });
    sessionStorage.setItem("erp_small_test_results", JSON.stringify(results));
  }
  const tab = id => q(`[data-tab="${id}"]`).click();
  const reset = () => { q("#btnReset").click(); q("#resetYes").click(); };

  if (phase === "1") {
    sessionStorage.setItem("erp_small_test_results", "[]"); results.length = 0; errorCount = 0; sessionStorage.setItem("erp_small_test_errors", "0");
    reset();
    check("띠", "화면 상단 교육용 문구", t(".notice").includes("교육용 가상 자료"), true);
    tab("emp");
    check("A1", "강도윤 남은 연차", t("[data-cell='rem-H-002']"), "5일");
    q("[data-open='H-002']").click();
    check("A2", "강도윤 상세 8월 실지급액", t("[data-cell='dpay-PY-2026-08-002']"), "3,100,000원");
    tab("pay");
    check("A3", "2026-08 월 합계 실지급액 / 건수", t("[data-cell='tot-2026-08']") + " / " + t("[data-cell='cnt-2026-08']"), "37,200,000원 / 12건");
    tab("leave");
    q("[data-approve='L-004']").click();
    check("A4", "L-004 승인 → 상태·처리일·백하람 남은 연차", t("[data-cell='st-L-004']") + " / " + t("[data-cell='rem-L-004']"), "승인 2026-09-14 / 13일");
    q("[data-approve='L-006']").click();
    check("A5", "L-006 승인 시도 → 대기 유지 + 안내", t("[data-cell='st-L-006']") + " / " + t("[data-row='L-006'] .note"), "대기 / 남은 연차 5일보다 2일 많습니다. 승인할 수 없습니다.");
    q("[data-reject='L-006']").click(); q("[data-rjok='L-006']").click();
    check("A6", "L-006 빈 사유 반려 → 막힘", t("[data-cell='st-L-006']") + " / " + t("[data-row='L-006'] .note"), "대기 / 반려 사유를 적어야 합니다.");
    q("#rjReason").value = "남은 연차 부족"; q("[data-rjok='L-006']").click();
    check("A7", "L-006 사유 반려 → 반려·메모·강도윤 5일 유지", t("[data-cell='st-L-006']") + " / " + t("[data-row='L-006'] .note") + " / " + t("[data-cell='rem-L-006']"), "반려 2026-09-14 / 이미 처리된 신청입니다 · 사유: 남은 연차 부족 / 5일");
    q("#nlEmp").value = "H-011"; q("#nlStart").value = "2026-10-01"; q("#nlEnd").value = "2026-10-09"; q("#nlReason").value = "검사"; q("#nlSubmit").click();
    check("등록", "휴가 등록 10/1~10/9 → 사용일수 6일, 맨 위 대기", t("#leaveForm .msg") + " / " + (q("#main tbody tr") || {}).dataset?.row, v => v.includes("L-007 등록됨") && v.includes("6일") && v.endsWith("L-007"));
    sessionStorage.setItem("erp_small_test_phase", "2");
    location.reload();
    return;
  }

  // ---- 2단계 (새로고침 후) ----
  sessionStorage.removeItem("erp_small_test_phase");
  tab("leave");
  check("유지", "새로고침 후 L-004 승인 유지", t("[data-cell='st-L-004']"), "승인 2026-09-14");
  tab("pay");
  q("#pEmp").value = "H-002"; q("#pEmp").dispatchEvent(new Event("change"));
  q("#pAllow").value = "300000"; q("#pSave").click();
  check("A8", "강도윤 8월 수당 300,000 저장 → 12건 유지·실지급·합계", t("[data-cell='cnt-2026-08']") + " / " + t("[data-cell='net-PY-2026-08-002']") + " / " + t("[data-cell='tot-2026-08']"), "12건 / 3,200,000원 / 37,300,000원");
  q("[data-confirm='PY-2026-08-002']").click();
  q("#pEmp").value = "H-002"; q("#pEmp").dispatchEvent(new Event("change"));
  q("#pAllow").value = "400000"; q("#pSave").click();
  check("A9", "확정 후 수정 → 거부·값 유지", t("#payForm .msg") + " / " + t("[data-cell='allow-PY-2026-08-002']"), "확정된 급여는 수정할 수 없습니다. (PY-2026-08-002) / 300,000원");
  reset();
  tab("emp"); const a1 = t("[data-cell='rem-H-002']");
  tab("leave"); const l4 = t("[data-cell='st-L-004']"), rows = document.querySelectorAll("#main tbody tr").length;
  tab("pay"); const a3 = t("[data-cell='tot-2026-08']"), st = t("[data-cell='pst-PY-2026-08-002']");
  check("A10", "초기화 → A1·A3 복귀, L-004 대기, 휴가 6건, 급여 작성", `${a1} / ${a3} / ${l4} / ${rows}건 / ${st}`, "5일 / 37,200,000원 / 대기 / 6건 / 작성");
  // 2026-09-14 수동 테스트에서 찾은 오작동 2건의 재발 방지
  tab("leave");
  q("#nlEmp").value = "H-008"; q("#nlStart").value = "2026-10-20"; q("#nlEnd").value = "2026-10-15"; q("#nlReason").value = "날짜 거꾸로"; q("#nlSubmit").click();
  check("폼유지", "등록 오류 뒤에도 입력값(직원·날짜·사유)이 남아 있음", `${q("#nlEmp").value} / ${q("#nlStart").value} / ${q("#nlEnd").value} / ${q("#nlReason").value}`, "H-008 / 2026-10-20 / 2026-10-15 / 날짜 거꾸로");
  tab("pay");
  q("#btnHelp").click();
  const th = q("#payTotals th[data-help]"); th.click();
  const tipEl = q("#helpTip");
  check("말풍선", "설명 모드에서 표 머리글 말풍선이 화면 위에 통째로 보임", !!tipEl && !tipEl.hidden && tipEl.textContent === th.dataset.help && tipEl.getBoundingClientRect().width > 0, true);
  q("#btnHelp").click();
  check("스크롤", "1120px에서 페이지 가로 스크롤 없음", document.documentElement.scrollWidth <= document.documentElement.clientWidth, true);
  check("오류", "자바스크립트 오류 0건", errorCount, 0);

  // ---- 결과표 ----
  const passed = results.filter(r => r.pass).length;
  const box = document.createElement("div");
  box.id = "testReport";
  box.style.cssText = "margin:12px 16px;border:2px solid " + (passed === results.length ? "#15803d" : "#dc2626") + ";border-radius:10px;padding:12px 16px;background:#fff;font-size:13px";
  box.innerHTML = `<b style="font-size:15px">자동 검사 결과: ${passed} / ${results.length} 통과</b> <span style="color:#6b7280">(tests/check.js · ${new Date().toLocaleString("ko-KR")})</span>
    <table style="margin-top:8px;border-collapse:collapse;width:100%"><thead><tr><th style="text-align:left;padding:4px 8px">번호</th><th style="text-align:left;padding:4px 8px">검사</th><th style="text-align:left;padding:4px 8px">기대값</th><th style="text-align:left;padding:4px 8px">실제값</th><th style="padding:4px 8px">결과</th></tr></thead>
    <tbody>${results.map(r => `<tr style="border-top:1px solid #e5e7eb"><td style="padding:4px 8px">${r.id}</td><td style="padding:4px 8px">${r.name}</td><td style="padding:4px 8px;color:#6b7280">${r.expected}</td><td style="padding:4px 8px">${r.actual}</td><td style="padding:4px 8px;text-align:center;font-weight:700;color:${r.pass ? "#15803d" : "#dc2626"}">${r.pass ? "PASS" : "FAIL"}</td></tr>`).join("")}</tbody></table>`;
  document.body.insertBefore(box, document.body.firstChild.nextSibling);
  console.table(results.map(r => ({ 번호: r.id, 검사: r.name, 결과: r.pass ? "PASS" : "FAIL", 실제값: r.actual })));
  window.TEST_RESULTS = results;
  sessionStorage.removeItem("erp_small_test_results");
  window.scrollTo(0, 0);   // 결과표가 맨 위에 있으므로 위로 올려 바로 보이게
})();
