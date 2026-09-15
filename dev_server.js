// 로컬 확인용 작은 서버 (설치할 것 없음, Node 18 이상).
//   실행: node dev_server.js   →  브라우저에서 http://localhost:3000 열기
// 하는 일: 1) 같은 폴더의 .env 를 읽어 환경변수로 넣고  2) 정적 파일(index.html 등)을 내려주고
//          3) /api/gemini 요청은 Vercel 과 똑같이 api/gemini.js 로 넘긴다.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;

// .env 읽기 (이미 있는 환경변수는 유지)
try {
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...v] = t.split("=");
    if (!process.env[k.trim()]) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
  }
} catch (e) { console.warn("(.env 파일이 없어 환경변수만 사용합니다)"); }

const API = { "/api/gemini": require("./api/gemini.js") };
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (API[url.pathname]) { try { await API[url.pathname](req, res); } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message })); } return; }
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith("/")) p += "index.html";
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (fs.existsSync(file + "/index.html")) { res.writeHead(302, { Location: url.pathname + "/" }); return res.end(); }
    res.statusCode = 404; return res.end("없는 파일입니다: " + p);
  }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log(`가온교육 인사·총무 앱: http://localhost:${PORT}   (작은 앱: /erp_small/)`);
  console.log(`GEMINI_API_KEY ${process.env.GEMINI_API_KEY ? "있음 ✓" : "없음 ✗ — .env 를 확인하세요"}`);
});
