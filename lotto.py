import requests
from collections import Counter
import random

BASE_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

# 특정 회차 조회
def get_lotto(round_no):
    url = BASE_URL + str(round_no)
    data = requests.get(url).json()

    if data["returnValue"] != "success":
        return None

    numbers = [data[f"drwtNo{i}"] for i in range(1, 7)]

    return {
        "round": round_no,
        "numbers": numbers,
        "bonus": data["bnusNo"]
    }

# 최신 회차 찾기
def get_latest_round():
    round_no = 1

    while True:
        result = get_lotto(round_no)

        if result is None:
            return round_no - 1

        round_no += 1

# 전체 데이터 가져오기
def get_all_data():
    latest = get_latest_round()

    rows = []

    for r in range(1, latest + 1):
        result = get_lotto(r)

        if result:
            rows.extend(result["numbers"])

    return rows

# 번호 통계
def get_statistics():
    numbers = get_all_data()

    counter = Counter(numbers)

    return counter.most_common()

# 번호 추천
def recommend_numbers():
    nums = random.sample(range(1, 46), 6)
    nums.sort()
    return nums
