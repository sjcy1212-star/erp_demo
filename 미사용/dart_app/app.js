// DART 공시검색 화면 동작 — 서버(/api/list, /api/corp)를 거쳐 OpenDART를 호출한다.
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// docs/opendart_공시검색_API.md "메시지 설명"
const STATUS_MSG = {
  "000": "정상", "010": "등록되지 않은 키입니다.", "011": "사용할 수 없는 키입니다(일시 중지).", "012": "접근할 수 없는 IP입니다.",
  "013": "조회된 데이터가 없습니다.", "014": "파일이 존재하지 않습니다.", "020": "요청 제한(하루 20,000건)을 초과했습니다.",
  "021": "조회 가능한 회사 개수(최대 100건)를 초과했습니다.", "100": "필드의 부적절한 값입니다.", "101": "부적절한 접근입니다.",
  "800": "시스템 점검으로 서비스가 중지 중입니다.", "900": "정의되지 않은 오류가 발생했습니다.", "901": "개인정보 보유기간 만료로 사용할 수 없는 키입니다.",
};
const CLS = { Y: "유가", K: "코스닥", N: "코넥스", E: "기타" };

let page = 1;
let lastQuery = null;

const ymd = (v) => (v ? v.replaceAll("-", "") : "");

function buildQuery(pageNo) {
  const f = $("#searchForm");
  const q = {
    corp_code: f.corp_code.value.trim(), bgn_de: ymd($("#bgn_de").value), end_de: ymd($("#end_de").value),
    pblntf_ty: f.pblntf_ty.value, corp_cls: f.corp_cls.value, last_reprt_at: f.last_reprt_at.value,
    sort: f.sort.value, sort_mth: f.sort_mth.value, page_count: f.page_count.value, page_no: String(pageNo),
  };
  Object.keys(q).forEach((k) => { if (!q[k]) delete q[k]; });
  return q;
}

function showMsg(text, kind) {
  const m = $("#msg");
  m.textContent = text; m.className = "msg " + (kind || ""); m.classList.remove("hidden");
}

async function search(pageNo = 1) {
  page = pageNo;
  lastQuery = buildQuery(pageNo);
  $("#btnSearch").disabled = true;
  showMsg("조회 중…", "info");
  $("#tblWrap").classList.add("hidden"); $("#pager").classList.add("hidden");
  try {
    const res = await fetch("/api/list?" + new URLSearchParams(lastQuery));
    const data = await res.json();
    render(data);
  } catch (e) {
    showMsg("서버에 연결할 수 없습니다. python dart_app/server.py 가 실행 중인지 확인하세요. (" + e.message + ")", "err");
  } finally {
    $("#btnSearch").disabled = false;
  }
}

function render(d) {
  const meta = $("#resultMeta");
  if (d.status !== "000") {
    meta.textContent = "";
    showMsg(`[${d.status}] ${STATUS_MSG[d.status] || d.message || "오류"}`, d.status === "013" ? "info" : "err");
    return;
  }
  $("#msg").classList.add("hidden");
  const list = d.list || [];
  meta.textContent = `총 ${Number(d.total_count).toLocaleString()}건 · ${d.total_page}페이지 중 ${d.page_no}페이지`;
  $("#rows").innerHTML = list.map((r) => `
    <tr>
      <td class="mono">${fmtDate(r.rcept_dt)}</td>
      <td><span class="badge c-${esc(r.corp_cls)}">${CLS[r.corp_cls] || esc(r.corp_cls)}</span></td>
      <td><b>${esc(r.corp_name)}</b><div class="small muted mono">${esc(r.corp_code)}</div></td>
      <td class="mono">${esc(r.stock_code) || "—"}</td>
      <td class="rpt"><a href="https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${esc(r.rcept_no)}" target="_blank" rel="noopener">${esc(r.report_nm)}</a></td>
      <td>${esc(r.flr_nm)}</td>
      <td>${rmBadges(r.rm)}</td>
      <td class="mono muted">${esc(r.rcept_no)}</td>
      <td><button class="btn sm summarize" data-rcept="${esc(r.rcept_no)}" data-title="${esc(r.corp_name)} · ${esc(r.report_nm)}">요약</button></td>
    </tr>`).join("");
  $("#tblWrap").classList.remove("hidden");
  const tp = Number(d.total_page) || 1;
  $("#pageInfo").textContent = `${d.page_no} / ${tp}`;
  $("#prevPage").disabled = page <= 1;
  $("#nextPage").disabled = page >= tp;
  $("#pager").classList.toggle("hidden", tp <= 1);
}

const fmtDate = (s) => (s && s.length === 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6)}` : esc(s));
const rmBadges = (rm) => (rm || "").trim().split(/\s+/).filter(Boolean).map((c) => `<span class="rm rm-${esc(c)}" title="${esc(RM[c] || c)}">${esc(c)}</span>`).join(" ");
const RM = { 유: "유가증권시장본부 소관", 코: "코스닥시장본부 소관", 채: "채권상장법인 공시", 넥: "코넥스시장 소관", 공: "공정거래위원회 소관", 연: "연결부분 포함", 정: "제출 후 정정신고 있음", 철: "철회(간주)됨" };

// ---- AI 요약 (서버 /api/summary → OpenDART 원문 → Gemini) ----
$("#rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("button.summarize");
  if (!btn) return;
  const tr = btn.closest("tr");
  const next = tr.nextElementSibling;
  if (next && next.classList.contains("summary-row")) { next.remove(); btn.textContent = "요약"; return; }  // 다시 누르면 닫기
  const row = document.createElement("tr");
  row.className = "summary-row";
  row.innerHTML = `<td colspan="9"><div class="summary"><div class="summary-head"><b>${btn.dataset.title}</b><span class="muted small">Gemini 요약 중… (원문 길이에 따라 5~20초)</span></div><div class="summary-body loading"></div></div></td>`;
  tr.after(row);
  btn.textContent = "닫기"; btn.disabled = true;
  const body = row.querySelector(".summary-body"), head = row.querySelector(".summary-head .muted");
  try {
    const res = await fetch("/api/summary?rcept_no=" + btn.dataset.rcept);
    const d = await res.json();
    if (d.error) { body.className = "summary-body err"; body.textContent = d.error; head.textContent = ""; }
    else { body.className = "summary-body"; body.textContent = d.summary; head.textContent = d.cached ? "저장된 요약" : `원문 ${Number(d.chars).toLocaleString()}자 → Gemini 요약`; }
  } catch (err) {
    body.className = "summary-body err"; body.textContent = "서버에 연결할 수 없습니다. (" + err.message + ")"; head.textContent = "";
  } finally { btn.disabled = false; }
});

// ---- 회사명 → 고유번호 찾기 ----
let corpTimer = null;
$("#corpName").addEventListener("input", (e) => {
  clearTimeout(corpTimer);
  const q = e.target.value.trim();
  const ul = $("#corpList");
  if (q.length < 1) { ul.classList.add("hidden"); return; }
  corpTimer = setTimeout(async () => {
    ul.innerHTML = `<li class="muted">찾는 중… (처음엔 회사 목록을 내려받느라 수십 초 걸릴 수 있습니다)</li>`;
    ul.classList.remove("hidden");
    try {
      const res = await fetch("/api/corp?q=" + encodeURIComponent(q));
      const rows = await res.json();
      if (rows.error) { ul.innerHTML = `<li class="err">${esc(rows.error)}</li>`; return; }
      if (!rows.length) { ul.innerHTML = `<li class="muted">일치하는 회사가 없습니다</li>`; return; }
      ul.innerHTML = rows.map((r) => `<li data-code="${esc(r.corp_code)}" data-name="${esc(r.corp_name)}"><b>${esc(r.corp_name)}</b> <span class="muted mono">${esc(r.corp_code)}${r.stock_code ? " · " + esc(r.stock_code) : ""}</span></li>`).join("");
    } catch (err) {
      ul.innerHTML = `<li class="err">회사 목록을 가져오지 못했습니다</li>`;
    }
  }, 300);
});
$("#corpList").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-code]");
  if (!li) return;
  $("#corp_code").value = li.dataset.code;
  $("#corpName").value = li.dataset.name;
  $("#corpList").classList.add("hidden");
});
document.addEventListener("click", (e) => { if (!e.target.closest(".corp")) $("#corpList").classList.add("hidden"); });

// ---- 폼 이벤트 ----
$("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); search(1); });
$("#btnReset").addEventListener("click", () => { $("#searchForm").reset(); $("#corp_code").value = ""; $("#corpName").value = ""; setDefaultDates(); });
$("#prevPage").addEventListener("click", () => search(page - 1));
$("#nextPage").addEventListener("click", () => search(page + 1));

function setDefaultDates() {
  const today = new Date();
  const from = new Date(today); from.setDate(from.getDate() - 7);
  const iso = (d) => d.toISOString().slice(0, 10);
  $("#end_de").value = iso(today);
  $("#bgn_de").value = iso(from);
}
setDefaultDates();
