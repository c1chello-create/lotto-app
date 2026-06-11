import streamlit as st
from lotto import (
    get_lotto,
    get_latest_round,
    get_statistics,
    recommend_numbers
)

st.set_page_config(page_title="로또 분석기", layout="centered")

st.title("🎰 개인용 로또 분석기")

menu = st.sidebar.selectbox(
    "메뉴 선택",
    ["최신 번호", "회차 검색", "번호 추천", "번호 통계"]
)

# 최신 번호
if menu == "최신 번호":

    latest = get_latest_round()
    result = get_lotto(latest)

    st.subheader(f"{latest}회 당첨번호")

    st.success(result["numbers"])
    st.info(f"보너스 번호 : {result['bonus']}")

# 회차 검색
elif menu == "회차 검색":

    round_no = st.number_input(
        "회차 입력",
        min_value=1,
        step=1
    )

    if st.button("검색"):

        result = get_lotto(round_no)

        if result:
            st.success(result["numbers"])
            st.info(f"보너스 번호 : {result['bonus']}")
        else:
            st.error("회차 정보를 찾을 수 없습니다.")

# 번호 추천
elif menu == "번호 추천":

    if st.button("추천 받기"):

        nums = recommend_numbers()

        st.success(nums)

# 번호 통계
elif menu == "번호 통계":

    st.write("번호 출현 빈도 TOP 10")

    stats = get_statistics()

    for num, count in stats[:10]:
        st.write(f"{num}번 : {count}회")
