import json
import time
from datetime import datetime
from pathlib import Path
from urllib.request import urlopen

BASE = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

def fetch(round_no: int):
    with urlopen(BASE + str(round_no), timeout=10) as r:
        data = json.loads(r.read().decode("utf-8"))
    if data.get("returnValue") != "success":
        return None
    return {
        "round": round_no,
        "date": data.get("drwNoDate", ""),
        "numbers": [data[f"drwtNo{i}"] for i in range(1, 7)],
        "bonus": data["bnusNo"],
    }

def estimate_latest():
    first = datetime(2002, 12, 7)
    today = datetime.today()
    return ((today - first).days // 7) + 1

def main():
    latest = 1
    est = estimate_latest()
    for r in range(est + 4, max(1, est - 30), -1):
        item = fetch(r)
        if item:
            latest = r
            break
        time.sleep(0.05)

    rows = []
    for r in range(1, latest + 1):
        item = fetch(r)
        if item:
            rows.append(item)
        time.sleep(0.03)

    Path("data").mkdir(exist_ok=True)
    Path("data/lotto.json").write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"saved {len(rows)} rounds")

if __name__ == "__main__":
    main()
