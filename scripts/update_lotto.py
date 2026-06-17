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

# 전체 회차 재생성용 코드입니다.
# 기존 data/lotto.json 내용은 사용하지 않고 1회부터 다시 생성합니다.

def fetch(round_no: int):
    try:
        req = Request(BASE + str(round_no), headers=HEADERS)
        with urlopen(req, timeout=25) as r:
            raw = r.read().decode("utf-8", errors="ignore").strip()

        if not raw.startswith("{"):
            print(f"skip round {round_no}: non-json response")
            return None

        data = json.loads(raw)

        if data.get("returnValue") != "success":
            print(f"round {round_no}: not available")
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


def main():
    DATA_PATH.parent.mkdir(exist_ok=True)

    rows = []
    empty_count = 0

    # 현재 1200회 이후까지 충분히 확인합니다.
    # 공개되지 않은 회차가 10번 연속 나오면 종료합니다.
    for r in range(1, 1300):
        item = fetch(r)

        if item:
            rows.append(item)
            empty_count = 0

            if r % 50 == 0:
                print(f"fetched {r} rounds")
        else:
            if r > 1200:
                empty_count += 1
                if empty_count >= 10:
                    print("no more available rounds, stop")
                    break

        time.sleep(0.15)

    rows.sort(key=lambda x: int(x["round"]))

    DATA_PATH.write_text(
        json.dumps(rows, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"saved {len(rows)} rounds to data/lotto.json")

    if len(rows) < 1000:
        raise RuntimeError("전체 회차 생성 실패: 저장된 회차 수가 너무 적습니다.")


if __name__ == "__main__":
    main()
