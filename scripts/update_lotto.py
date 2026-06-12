import json
import time
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

BASE = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json,text/plain,*/*"
}

def fetch(round_no: int):
    try:
        req = Request(BASE + str(round_no), headers=HEADERS)
        with urlopen(req, timeout=15) as r:
            raw = r.read().decode("utf-8", errors="ignore").strip()

        if not raw or not raw.startswith("{"):
            return None

        data = json.loads(raw)

        if data.get("returnValue") != "success":
            return None

        return {
            "round": round_no,
            "date": data.get("drwNoDate", ""),
            "numbers": [data[f"drwtNo{i}"] for i in range(1, 7)],
            "bonus": data["bnusNo"]
        }

    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, KeyError, ValueError) as e:
        print(f"skip round {round_no}: {e}")
        return None


def estimate_latest():
    first = datetime(2002, 12, 7)
    today = datetime.today()
    return ((today - first).days // 7) + 1


def main():
    est = estimate_latest()
    latest = 0

    for r in range(est + 5, max(1, est - 40), -1):
        item = fetch(r)
        if item:
            latest = r
            break
        time.sleep(0.05)

    if latest == 0:
        raise RuntimeError("최신 회차를 찾지 못했습니다.")

    rows = []

    for r in range(1, latest + 1):
        item = fetch(r)
        if item:
            rows.append(item)

        if r % 50 == 0:
            print(f"fetched {r}/{latest}")

        time.sleep(0.03)

    rows.sort(key=lambda x: x["round"])

    Path("data").mkdir(exist_ok=True)
    Path("data/lotto.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"saved {len(rows)} rounds to data/lotto.json")


if __name__ == "__main__":
    main()
