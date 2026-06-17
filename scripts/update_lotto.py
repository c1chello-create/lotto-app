import json
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# 전체회차 데이터를 한 번에 받아서 우리 앱 형식(data/lotto.json)으로 변환합니다.
SOURCE_URL = "https://smok95.github.io/lotto/results/all.json"
DATA_PATH = Path("data/lotto.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json,text/plain,*/*"
}

def normalize_date(value):
    if not value:
        return ""
    return str(value)[:10]

def main():
    DATA_PATH.parent.mkdir(exist_ok=True)

    print("download all lotto data...", flush=True)

    try:
        req = Request(SOURCE_URL, headers=HEADERS)
        with urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", errors="ignore")
    except (HTTPError, URLError, TimeoutError) as e:
        raise RuntimeError(f"전체 데이터 다운로드 실패: {e}")

    source = json.loads(raw)

    if not isinstance(source, list):
        raise RuntimeError("전체 데이터 형식이 배열이 아닙니다.")

    rows = []

    for item in source:
        try:
            rows.append({
                "round": int(item["draw_no"]),
                "date": normalize_date(item.get("date", "")),
                "numbers": [int(n) for n in item["numbers"]],
                "bonus": int(item["bonus_no"])
            })
        except Exception as e:
            print(f"skip item: {e}", flush=True)

    rows.sort(key=lambda x: x["round"])

    if len(rows) < 1000:
        raise RuntimeError(f"전체 회차 수가 너무 적습니다: {len(rows)}")

    DATA_PATH.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"saved {len(rows)} rounds to data/lotto.json", flush=True)
    print(f"latest round: {rows[-1]['round']}", flush=True)

if __name__ == "__main__":
    main()
