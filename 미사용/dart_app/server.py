"""OpenDART 공시검색 웹앱 — 작은 서버 (참고: docs/opendart_공시검색_API.md)

브라우저에서 OpenDART API를 직접 부르면 CORS로 막히고 인증키도 노출되므로,
이 서버가 .env의 DART_API_KEY를 붙여 대신 호출(프록시)하고 화면(index.html)도 함께 내려준다.
공시 원문 요약은 .env의 GEMINI_API_KEY로 Gemini를 부른다(선택 기능).

준비:  pip install flask requests google-genai   (이미 설치돼 있으면 생략)
실행:  python dart_app/server.py   →  브라우저에서 http://127.0.0.1:5000 열기
"""
import io
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import requests
from flask import Flask, jsonify, request, send_from_directory

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
CACHE = HERE / "cache"
DART = "https://opendart.fss.or.kr/api"

# 문서의 "요청 인자" 중 인증키를 뺀 나머지 — 이 이름만 그대로 전달한다
LIST_PARAMS = ["corp_code", "bgn_de", "end_de", "last_reprt_at", "pblntf_ty", "pblntf_detail_ty",
               "corp_cls", "sort", "sort_mth", "page_no", "page_count"]


def load_env(path: Path) -> None:
    """.env 의 KEY=VALUE 줄을 환경변수로 넣는다 (이미 있는 값은 유지)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env(ROOT / ".env")
API_KEY = os.environ.get("DART_API_KEY", "")
if not API_KEY:
    sys.exit("DART_API_KEY가 없습니다. 프로젝트 루트의 .env 에 DART_API_KEY=... 를 적어 주세요.")

app = Flask(__name__, static_folder=str(HERE), static_url_path="")


@app.get("/")
def index():
    return send_from_directory(HERE, "index.html")


@app.get("/api/list")
def api_list():
    """공시검색 (list.json) 프록시. 화면에서 넘어온 인자 + 인증키를 붙여 OpenDART에 묻는다."""
    params = {"crtfc_key": API_KEY}
    for k in LIST_PARAMS:
        v = request.args.get(k, "").strip()
        if v:
            params[k] = v
    try:
        r = requests.get(f"{DART}/list.json", params=params, timeout=15)
        r.raise_for_status()
        return jsonify(r.json())
    except requests.RequestException as e:
        return jsonify({"status": "999", "message": f"OpenDART 호출 실패: {e}"}), 502


def load_corp_codes() -> list[dict]:
    """회사 고유번호 목록(corpCode.xml, zip)을 내려받아 JSON으로 캐시한다. 처음 한 번만 느리다(약 10MB)."""
    cache = CACHE / "corp_codes.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    r = requests.get(f"{DART}/corpCode.xml", params={"crtfc_key": API_KEY}, timeout=60)
    r.raise_for_status()
    if r.headers.get("content-type", "").startswith("application/json"):
        raise RuntimeError(r.json().get("message", "고유번호 파일을 받지 못했습니다"))
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        xml = z.read(z.namelist()[0])
    rows = []
    for el in ET.fromstring(xml).iter("list"):
        rows.append({
            "corp_code": el.findtext("corp_code", "").strip(),
            "corp_name": el.findtext("corp_name", "").strip(),
            "stock_code": el.findtext("stock_code", "").strip(),
        })
    CACHE.mkdir(exist_ok=True)
    cache.write_text(json.dumps(rows, ensure_ascii=False), encoding="utf-8")
    return rows


@app.get("/api/corp")
def api_corp():
    """회사명으로 고유번호 찾기. 상장사(종목코드 있음)를 먼저, 최대 20건."""
    q = request.args.get("q", "").strip()
    if len(q) < 1:
        return jsonify([])
    try:
        rows = load_corp_codes()
    except Exception as e:  # 네트워크·키 오류 등
        return jsonify({"error": str(e)}), 502
    hit = [r for r in rows if q in r["corp_name"]]
    hit.sort(key=lambda r: (r["stock_code"] == "", len(r["corp_name"])))
    return jsonify(hit[:20])


MAX_DOC_CHARS = 40000  # Gemini에 보낼 원문 최대 길이 (너무 길면 앞부분만)


def fetch_document_text(rcept_no: str) -> str:
    """공시 원문(document.xml, zip 안의 HTML/XML)을 받아 태그를 벗긴 순수 글자만 돌려준다."""
    r = requests.get(f"{DART}/document.xml", params={"crtfc_key": API_KEY, "rcept_no": rcept_no}, timeout=60)
    r.raise_for_status()
    if r.headers.get("content-type", "").startswith("application/json"):
        raise RuntimeError(r.json().get("message", "원문을 받지 못했습니다"))
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        names = sorted(z.namelist(), key=len)  # 본문 파일이 보통 제일 짧은 이름
        raw = z.read(names[0])
    for enc in ("utf-8", "cp949"):
        try:
            html = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    else:
        html = raw.decode("utf-8", errors="ignore")
    html = re.sub(r"(?is)<(style|script)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?i)</(tr|p|div|br|li|h\d|table)>", "\n", html)
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"[ \t\xa0]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text).strip()
    return text


@app.get("/api/summary")
def api_summary():
    """공시 원문을 받아 Gemini로 요약한다. 같은 접수번호는 파일로 캐시해 두 번 부르지 않는다."""
    rcept_no = request.args.get("rcept_no", "").strip()
    if not re.fullmatch(r"\d{14}", rcept_no):
        return jsonify({"error": "접수번호(14자리)가 올바르지 않습니다."}), 400
    if not os.environ.get("GEMINI_API_KEY"):
        return jsonify({"error": ".env에 GEMINI_API_KEY가 없어 요약할 수 없습니다."}), 500
    cache = CACHE / f"summary_{rcept_no}.txt"
    if cache.exists():
        return jsonify({"summary": cache.read_text(encoding="utf-8"), "cached": True})
    try:
        text = fetch_document_text(rcept_no)
        if not text:
            return jsonify({"error": "원문에서 글자를 찾지 못했습니다(그림·PDF만 있는 공시일 수 있음)."}), 422
        clipped = text[:MAX_DOC_CHARS]
        from google import genai  # 요약을 쓸 때만 불러온다
        client = genai.Client()
        prompt = (
            "다음은 한국 금융감독원 DART에 제출된 공시 원문입니다. 일반 투자자가 이해하기 쉽게 한국어로 요약해 주세요.\n"
            "형식: 첫 줄에 한 문장 핵심 요약, 그다음 '- '로 시작하는 핵심 항목 3~6개(회사, 무엇을, 얼마나, 언제, 왜/영향). "
            "원문에 없는 내용은 지어내지 말고, 숫자·날짜는 원문 그대로 쓰세요. 마크다운 굵게(**)는 쓰지 마세요.\n\n"
            f"[공시 원문 시작]\n{clipped}\n[공시 원문 끝]"
            + ("\n\n(원문이 길어 앞부분만 제공됨)" if len(text) > MAX_DOC_CHARS else "")
        )
        interaction = client.interactions.create(model="gemini-3.6-flash", input=prompt)
        summary = (interaction.output_text or "").strip()
        CACHE.mkdir(exist_ok=True)
        cache.write_text(summary, encoding="utf-8")
        return jsonify({"summary": summary, "cached": False, "chars": len(text)})
    except Exception as e:
        return jsonify({"error": f"요약 실패: {e}"}), 502


if __name__ == "__main__":
    print("OpenDART 공시검색 웹앱: http://127.0.0.1:5000  (종료: Ctrl+C)")
    app.run(host="127.0.0.1", port=5000, debug=False)
