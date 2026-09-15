"""Gemini API 호출 예제 (참고: https://ai.google.dev/gemini-api/docs/get-started?hl=ko)

준비:  pip install -U google-genai
실행:  python gemini_test.py "질문"        (질문을 안 쓰면 기본 질문으로 실행)
API 키는 같은 폴더의 .env 파일에서 읽습니다.  (GEMINI_API_KEY=...)
"""
import os
import sys
from pathlib import Path

from google import genai

MODEL = "gemini-3.6-flash"  # 공식 문서 예제와 같은 모델


def load_env(path: Path) -> None:
    """.env 파일의 KEY=VALUE 줄을 환경변수로 넣는다 (이미 있는 값은 덮어쓰지 않음)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> None:
    load_env(Path(__file__).with_name(".env"))
    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("GEMINI_API_KEY가 없습니다. .env 파일에 GEMINI_API_KEY=... 를 적어 주세요.")

    question = " ".join(sys.argv[1:]) or "AI가 어떻게 동작하는지 한 문장으로 설명해 줘."

    client = genai.Client()  # GEMINI_API_KEY 환경변수를 자동으로 읽음
    interaction = client.interactions.create(model=MODEL, input=question)

    print("질문:", question)
    print("답변:", interaction.output_text)


if __name__ == "__main__":
    main()
