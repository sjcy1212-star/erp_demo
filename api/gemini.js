// Gemini 연결 테스트용 서버 함수 (Vercel Serverless Function).
// 브라우저가 Gemini를 직접 부르면 API 키가 노출되므로, 이 함수가 GEMINI_API_KEY 를 붙여 대신 호출한다.
//   - 로컬:  node dev_server.js  →  .env 의 키를 읽어 /api/gemini 로 연결
//   - Vercel: 프로젝트 Settings → Environment Variables 에 GEMINI_API_KEY 를 넣으면 자동 동작
//   GET  /api/gemini            → 키가 설정돼 있는지만 알려줌 (키 값은 보내지 않음)
//   POST /api/gemini {prompt}   → Gemini 답변 한 건을 돌려줌

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_PROMPT = 500; // 연결 확인용이므로 짧게 제한

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;           // Vercel 이 이미 파싱한 경우
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, configured: Boolean(key), model }));
  }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ ok: false, error: "POST 로 보내 주세요." })); }
  if (!key) { res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: "GEMINI_API_KEY 가 설정되어 있지 않습니다. (로컬: .env / Vercel: Environment Variables)" })); }

  let prompt = "";
  try { prompt = String((await readJson(req)).prompt || "").trim(); } catch (e) { /* 아래에서 빈 값 처리 */ }
  if (!prompt) { res.statusCode = 400; return res.end(JSON.stringify({ ok: false, error: "prompt 가 비어 있습니다." })); }
  prompt = prompt.slice(0, MAX_PROMPT);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const started = Date.now();
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      // 연결 확인용이라 "생각(thinking)" 단계는 끄고 바로 답하게 함
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      res.statusCode = 502;
      return res.end(JSON.stringify({ ok: false, error: `Gemini 오류 ${r.status}: ${(data.error && data.error.message) || "알 수 없는 오류"}`, model }));
    }
    const parts = ((((data.candidates || [])[0] || {}).content || {}).parts) || [];
    const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();
    res.statusCode = 200;
    return res.end(JSON.stringify({ ok: true, model, text, ms: Date.now() - started }));
  } catch (e) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ ok: false, error: "Gemini 서버에 연결하지 못했습니다: " + e.message, model }));
  }
};
