import json
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

BASE = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="
DATA_PATH = Path("data/lotto.json")

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json,text/plain,*/*",
    "Referer": "https://www.dhlottery.co.kr/"
}

def fetch(round_no: int):
    try:
        req = Request(BASE + str(round_no), headers=HEADERS)
        with urlopen(req, timeout=20) as r:
            raw = r.read().decode("utf-8", errors="ignore").strip()

        if not raw.startswith("{"):
            print(f"skip round {round_no}: non-json response")
            return None

        data = json.loads(raw)

        if data.get("returnValue") != "success":
            print(f"round {round_no}: not available yet")
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


def load_existing():
    if not DATA_PATH.exists():
        return []

    try:
        rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
        if not isinstance(rows, list):
            return []

        valid = []
        for row in rows:
            if (
                isinstance(row, dict)
                and "round" in row
                and "date" in row
                and "numbers" in row
                and "bonus" in row
            ):
                valid.append(row)

        return valid

    except Exception as e:
        print(f"existing lotto.json read failed: {e}")
        return []


def main():
    DATA_PATH.parent.mkdir(exist_ok=True)

    rows = load_existing()
    existing_rounds = {int(row["round"]) for row in rows if "round" in row}
    current_max = max(existing_rounds) if existing_rounds else 0

    print(f"existing rounds: {len(existing_rounds)}")
    print(f"current max round: {current_max}")

    start = current_max + 1
    end = current_max + 40

    print(f"checking new rounds: {start} ~ {end}")

    added = 0
    consecutive_empty = 0

    for r in range(start, end + 1):
        item = fetch(r)

        if item:
            if int(item["round"]) not in existing_rounds:
                rows.append(item)
                existing_rounds.add(int(item["round"]))
                added += 1
                consecutive_empty = 0
                print(f"added round {r}")
        else:
            consecutive_empty += 1
            if consecutive_empty >= 5:
                print("no more available rounds, stop")
                break

        time.sleep(0.5)

    rows.sort(key=lambda x: int(x["round"]))

    DATA_PATH.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"saved {len(rows)} rounds to data/lotto.json")
    print(f"added {added} new rounds")


if __name__ == "__main__":
    main()
