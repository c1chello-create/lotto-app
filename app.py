import streamlit as st
import random
import requests
from collections import Counter
from datetime import datetime

st.set_page_config(
    page_title="행운로또",
    page_icon="🍀",
    layout="centered",
    initial_sidebar_state="collapsed"
)

BASE_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

st.markdown("""
<style>
.block-container {
    padding-top: 0rem;
    padding-left: 0.7rem;
    padding-right: 0.7rem;
    padding-bottom: 5rem;
    max-width: 520px;
}
#MainMenu, footer, header {visibility: hidden;}
[data-testid="stToolbar"] {display: none;}
.app-header {
    background: linear-gradient(135deg, #073b7a, #0452a5);
    color: white;
    padding: 18px 12px;
    border-radius: 0 0 24px 24px;
    text-align: center;
    margin: -8px -6px 12px -6px;
    box-shadow: 0 6px 16px rgba(3, 54, 112, .25);
}
.app-title {
    font-size: 31px;
    font-weight: 900;
    letter-spacing: -1px;
}
.app-subtitle {
    font-size: 13px;
    opacity: .9;
    margin-top: 4px;
}
.card {
    background: #fff;
    border: 1px solid #e6edf5;
    border-radius: 18px;
    padding: 15px 12px;
    margin: 10px 0;
    box-shadow: 0 4px 14px rgba(15, 23, 42, .08);
}
.card-blue {
    background: linear-gradient(180deg, #ffffff, #f8fbff);
}
.round-title {
    text-align: center;
    font-size: 30px;
    font-weight: 900;
    color: #073b7a;
    line-height: 1.1;
}
.draw-date {
    text-align: center;
    font-size: 14px;
    color: #64748b;
    margin: 6px 0 12px 0;
}
.ball-row {
    display: flex;
    gap: 6px;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    margin: 9px 0;
}
.ball {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    color: white;
    font-weight: 900;
    font-size: 18px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    text-shadow: 0 1px 1px rgba(0,0,0,.25);
    box-shadow: inset 0 -5px 8px rgba(0,0,0,.20), 0 3px 7px rgba(0,0,0,.18);
}
.plus {
    font-size: 22px;
    font-weight: 900;
    color: #64748b;
    margin: 0 2px;
}
.label {
    text-align: center;
    font-size: 13px;
    color: #64748b;
    font-weight: 800;
}
.legend {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 9px 7px;
    text-align: center;
    color: #475569;
    font-size: 12.5px;
    margin-bottom: 10px;
}
.section-title {
    font-size: 20px;
    font-weight: 900;
    color: #0f2f5f;
    margin: 18px 0 8px 0;
}
.list-row {
    background: #ffffff;
    border: 1px solid #e6edf5;
    border-radius: 16px;
    padding: 12px 10px;
    margin: 9px 0;
}
.row-title {
    font-size: 16px;
    font-weight: 900;
    color: #0f2f5f;
}
.row-date {
    font-size: 12px;
    color: #64748b;
}
.metric-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
    margin: 10px 0;
}
.metric-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px 8px;
    text-align: center;
}
.metric-value {
    font-size: 23px;
    font-weight: 900;
    color: #073b7a;
}
.small {
    font-size: 12px;
    color: #64748b;
}
.stRadio div[role="radiogroup"] {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    gap: 7px;
}
.stRadio label {
    background: #f8fafc !important;
    border: 1px solid #dbe7f3 !important;
    border-radius: 14px !important;
    padding: 8px 6px !important;
    min-height: 42px;
}
.stButton button {
    border-radius: 14px;
    min-height: 42px;
    font-weight: 800;
}
input {
    border-radius: 14px !important;
}
</style>
""", unsafe_allow_html=True)

def ball_color(n: int) -> str:
    if 1 <= n <= 9:
        return "#f2b705"
    if 10 <= n <= 19:
        return "#1976d2"
    if 20 <= n <= 29:
        return "#e53935"
    if 30 <= n <= 39:
        return "#4b5563"
    return "#43a047"

def ball_html(n):
    return f'<span class="ball" style="background:{ball_color(int(n))}">{int(n)}</span>'

def render_balls(numbers, bonus=None):
    html = '<div class="ball-row">'
    for n in numbers:
        html += ball_html(n)
    if bonus is not None:
        html += '<span class="plus">+</span>'
        html += ball_html(bonus)
    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

def get_lotto(round_no):
    try:
        response = requests.get(BASE_URL + str(int(round_no)), timeout=10)
        data = response.json()
        if data.get("returnValue") != "success":
            return None
        return {
            "round": int(round_no),
            "date": data.get("drwNoDate", ""),
            "numbers": [data[f"drwtNo{i}"] for i in range(1, 7)],
            "bonus": data["bnusNo"]
        }
    except Exception:
        return None

@st.cache_data(ttl=3600, show_spinner=False)
def latest_round():
    first_draw = datetime(2002, 12, 7)
    estimated = ((datetime.today() - first_draw).days // 7) + 1
    for r in range(estimated + 4, max(1, estimated - 20), -1):
        if get_lotto(r):
            return r
    return 1

@st.cache_data(ttl=3600, show_spinner=False)
def recent_data(count=80):
    latest = latest_round()
    rows = []
    for r in range(latest, max(0, latest - count), -1):
        item = get_lotto(r)
        if item:
            rows.append(item)
    return rows

def render_round_card(item):
    st.markdown('<div class="card card-blue">', unsafe_allow_html=True)
    st.markdown(f'<div class="round-title">{item["round"]}회</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="draw-date">{item["date"]} 추첨</div>', unsafe_allow_html=True)
    st.markdown('<div class="label">당첨번호 + 보너스</div>', unsafe_allow_html=True)
    render_balls(item["numbers"], item["bonus"])
    st.markdown('</div>', unsafe_allow_html=True)

def recommend_numbers(mode="통계"):
    if mode == "랜덤":
        return sorted(random.sample(range(1, 46), 6))

    rows = recent_data(80)
    nums = []
    for row in rows:
        nums.extend(row["numbers"])
    counts = Counter(nums)

    hot = [n for n, _ in counts.most_common(18)]
    cold = [n for n in range(1, 46) if n not in hot]

    pick = random.sample(hot, 3) + random.sample(cold, 2)
    while len(pick) < 6:
        n = random.randint(1, 45)
        if n not in pick:
            pick.append(n)
    return sorted(pick)

def match_history(my_nums):
    rows = recent_data(200)
    my_set = set(my_nums)
    result = []
    for row in rows:
        hit = sorted(my_set.intersection(row["numbers"]))
        result.append({
            "round": row["round"],
            "date": row["date"],
            "numbers": row["numbers"],
            "bonus": row["bonus"],
            "hit": hit,
            "hit_count": len(hit),
            "bonus_hit": row["bonus"] in my_set
        })
    result.sort(key=lambda x: (x["hit_count"], x["bonus_hit"]), reverse=True)
    return result

st.markdown("""
<div class="app-header">
  <div class="app-title">행운로또 🍀</div>
  <div class="app-subtitle">개인용 로또 번호 조회 · 분석 · 추천</div>
</div>
""", unsafe_allow_html=True)

menu = st.radio(
    "메뉴",
    ["회차조회", "번호분석", "번호추천", "적중분석"],
    horizontal=True,
    label_visibility="collapsed"
)

st.markdown('<div class="legend">🟡 1~9  ·  🔵 10~19  ·  🔴 20~29  ·  ⚫ 30~39  ·  🟢 40~45</div>', unsafe_allow_html=True)

with st.spinner("로또 데이터를 불러오는 중입니다..."):
    latest = latest_round()

if menu == "회차조회":
    latest_item = get_lotto(latest)
    if latest_item:
        render_round_card(latest_item)
    else:
        st.error("최신 회차 데이터를 불러오지 못했습니다.")

    st.markdown('<div class="section-title">회차 검색</div>', unsafe_allow_html=True)
    c1, c2 = st.columns([2, 1])
    with c1:
        round_no = st.number_input("회차", min_value=1, max_value=latest, value=latest, step=1, label_visibility="collapsed")
    with c2:
        clicked = st.button("조회", use_container_width=True)

    if clicked:
        item = get_lotto(round_no)
        if item:
            render_round_card(item)
        else:
            st.warning("해당 회차를 찾을 수 없습니다.")

    st.markdown('<div class="section-title">최근 5회</div>', unsafe_allow_html=True)
    for row in recent_data(5):
        st.markdown(f'<div class="list-row"><div class="row-title">{row["round"]}회</div><div class="row-date">{row["date"]}</div></div>', unsafe_allow_html=True)
        render_balls(row["numbers"], row["bonus"])

elif menu == "번호분석":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">최근 80회 번호 분석</div>', unsafe_allow_html=True)

    rows = recent_data(80)
    nums = []
    for row in rows:
        nums.extend(row["numbers"])
    counts = Counter(nums)

    top10 = counts.most_common(10)
    low10 = sorted([(n, counts.get(n, 0)) for n in range(1, 46)], key=lambda x: x[1])[:10]

    st.write("자주 나온 번호 TOP 10")
    render_balls([n for n, c in top10])
    for n, c in top10:
        st.write(f"{n}번 : {c}회")

    st.write("적게 나온 번호 TOP 10")
    render_balls([n for n, c in low10])
    st.markdown('</div>', unsafe_allow_html=True)

elif menu == "번호추천":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">추천번호</div>', unsafe_allow_html=True)

    if "recommend_mode" not in st.session_state:
        st.session_state.recommend_mode = "통계"
    if "recommend_nums" not in st.session_state:
        st.session_state.recommend_nums = recommend_numbers("통계")

    mode = st.selectbox("추천 방식", ["통계", "랜덤"])
    render_balls(st.session_state.recommend_nums)

    if st.button("새 추천 받기", use_container_width=True):
        st.session_state.recommend_nums = recommend_numbers(mode)
        st.rerun()

    st.caption("최근 회차 통계를 참고한 개인용 추천이며 당첨을 보장하지 않습니다.")
    st.markdown('</div>', unsafe_allow_html=True)

elif menu == "적중분석":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown('<div class="section-title">내 예상번호 상세분석</div>', unsafe_allow_html=True)

    text = st.text_input("예상번호 6개", value="5 14 23 33 42 9", placeholder="예: 5 14 23 33 42 9")
    try:
        my_nums = [int(x) for x in text.replace(",", " ").split()]
        my_nums = sorted(list(dict.fromkeys(my_nums)))
    except Exception:
        my_nums = []

    if len(my_nums) == 6 and all(1 <= n <= 45 for n in my_nums):
        st.write("내 예상번호")
        render_balls(my_nums)

        result = match_history(my_nums)
        best = result[0]

        st.markdown('<div class="metric-grid">', unsafe_allow_html=True)
        st.markdown(f'<div class="metric-card"><div>최고 일치</div><div class="metric-value">{best["hit_count"]}개</div><div class="small">{best["round"]}회</div></div>', unsafe_allow_html=True)
        st.markdown(f'<div class="metric-card"><div>보너스</div><div class="metric-value">{"일치" if best["bonus_hit"] else "미일치"}</div><div class="small">최근 200회</div></div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown('<div class="section-title">유사 회차 TOP 10</div>', unsafe_allow_html=True)
        for row in result[:10]:
            st.markdown(f'<div class="list-row"><div class="row-title">{row["round"]}회 · {row["hit_count"]}개 일치</div><div class="row-date">{row["date"]}</div></div>', unsafe_allow_html=True)
            render_balls(row["numbers"], row["bonus"])
    else:
        st.warning("1~45 사이 숫자 6개를 입력하세요.")
        st.markdown('</div>', unsafe_allow_html=True)
