import streamlit as st
import random
import requests
from collections import Counter
from datetime import datetime

st.set_page_config(
    page_title="행운로또 🍀",
    page_icon="🍀",
    layout="centered",
    initial_sidebar_state="collapsed"
)

BASE_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

st.markdown("""
<style>
.block-container {
    padding-top: 0.4rem;
    padding-left: 1rem;
    padding-right: 1rem;
    padding-bottom: 4rem;
    max-width: 720px;
}
#MainMenu, footer, header {visibility: hidden;}
.hero {
    background: linear-gradient(135deg, #003b7a, #0057a8);
    color: white;
    padding: 18px 14px 20px 14px;
    border-radius: 0 0 24px 24px;
    text-align: center;
    font-size: 30px;
    font-weight: 900;
    letter-spacing: -1px;
    margin-bottom: 12px;
    box-shadow: 0 4px 14px rgba(0, 57, 120, .25);
}
.card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    padding: 16px;
    margin: 10px 0;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
}
.round-title {
    text-align: center;
    font-size: 30px;
    font-weight: 900;
    color: #0f2f5f;
}
.draw-date {
    text-align: center;
    font-size: 15px;
    color: #64748b;
    margin-bottom: 12px;
}
.ball-row {
    display: flex;
    gap: 7px;
    justify-content: center;
    align-items: center;
    flex-wrap: wrap;
    margin: 10px 0;
}
.ball {
    width: 43px;
    height: 43px;
    border-radius: 50%;
    color: white;
    font-weight: 900;
    font-size: 19px;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    box-shadow: inset 0 -4px 8px rgba(0,0,0,.20), 0 3px 7px rgba(0,0,0,.18);
}
.bonus-wrap {
    border-left: 1px solid #e5e7eb;
    padding-left: 10px;
    margin-left: 4px;
}
.label {
    text-align: center;
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
}
.legend {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 10px;
    margin: 8px 0 14px 0;
    color: #475569;
    font-size: 13px;
    text-align: center;
}
.list-row {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 10px;
    margin: 8px 0;
}
.metric-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 9px;
}
.metric-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 12px;
    text-align: center;
}
.metric-value {
    font-size: 22px;
    font-weight: 900;
    color: #0f2f5f;
}
.small {
    font-size: 13px;
    color: #64748b;
}
.stRadio div[role="radiogroup"] {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
}
.stRadio label {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    padding: 7px 8px;
}
</style>
""", unsafe_allow_html=True)

def ball_color(n: int) -> str:
    if 1 <= n <= 9:
        return "#f5b800"
    if 10 <= n <= 19:
        return "#1976d2"
    if 20 <= n <= 29:
        return "#e53935"
    if 30 <= n <= 39:
        return "#4b5563"
    return "#43a047"

def render_balls(numbers, center=True):
    html = '<div class="ball-row">'
    for n in numbers:
        html += f'<span class="ball" style="background:{ball_color(int(n))}">{int(n)}</span>'
    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

def render_round_card(item):
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.markdown(f'<div class="round-title">{item["round"]}회</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="draw-date">{item["date"]} 추첨</div>', unsafe_allow_html=True)
    st.markdown('<div class="label">당첨번호</div>', unsafe_allow_html=True)
    render_balls(item["numbers"])
    st.markdown('<div class="label">보너스번호</div>', unsafe_allow_html=True)
    render_balls([item["bonus"]])
    st.markdown('</div>', unsafe_allow_html=True)

def get_lotto(round_no):
    try:
        res = requests.get(BASE_URL + str(int(round_no)), timeout=8)
        data = res.json()
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

@st.cache_data(ttl=3600)
def get_latest_round_fast():
    # 1회 추첨일 2002-12-07 기준으로 최신 회차를 빠르게 추정 후 검증
    first_draw = datetime(2002, 12, 7)
    today = datetime.today()
    estimated = ((today - first_draw).days // 7) + 1

    for r in range(estimated + 4, max(1, estimated - 15), -1):
        if get_lotto(r):
            return r
    return 1

@st.cache_data(ttl=3600)
def get_recent_data(count=60):
    latest = get_latest_round_fast()
    data = []
    for r in range(latest, max(0, latest - count), -1):
        item = get_lotto(r)
        if item:
            data.append(item)
    return data

def recommend_numbers():
    recent = get_recent_data(80)
    nums = []
    for item in recent:
        nums.extend(item["numbers"])

    counts = Counter(nums)
    hot = [n for n, _ in counts.most_common(18)]
    cold = [n for n in range(1, 46) if n not in hot]

    pick = []
    pick += random.sample(hot, 3)
    pick += random.sample(cold, 2)
    while len(pick) < 6:
        n = random.randint(1, 45)
        if n not in pick:
            pick.append(n)
    return sorted(pick)

def analyze_numbers(my_numbers):
    recent = get_recent_data(200)
    rows = []
    my_set = set(my_numbers)
    for item in recent:
        hit = sorted(list(my_set.intersection(item["numbers"])))
        rows.append({
            "round": item["round"],
            "date": item["date"],
            "hit_count": len(hit),
            "hit": hit,
            "bonus": item["bonus"] in my_set,
            "numbers": item["numbers"],
            "bonus_no": item["bonus"]
        })
    rows.sort(key=lambda x: (x["hit_count"], x["bonus"]), reverse=True)
    return rows

st.markdown('<div class="hero">행운로또 🍀</div>', unsafe_allow_html=True)

menu = st.radio(
    "메뉴",
    ["회차별 조회", "번호 분석", "번호 추천", "적중 분석"],
    horizontal=True,
    label_visibility="collapsed"
)

st.markdown(
    '<div class="legend">🟡 1~9 &nbsp; 🔵 10~19 &nbsp; 🔴 20~29 &nbsp; ⚫ 30~39 &nbsp; 🟢 40~45</div>',
    unsafe_allow_html=True
)

latest = get_latest_round_fast()

if menu == "회차별 조회":
    item = get_lotto(latest)
    if item:
        render_round_card(item)

    st.markdown("### 회차 검색")
    c1, c2 = st.columns([2, 1])
    with c1:
        round_no = st.number_input("회차 입력", min_value=1, max_value=latest, value=latest, step=1, label_visibility="collapsed")
    with c2:
        search_clicked = st.button("조회", use_container_width=True)

    if search_clicked:
        found = get_lotto(round_no)
        if found:
            render_round_card(found)
        else:
            st.error("해당 회차 정보를 찾지 못했습니다.")

    st.markdown("### 최근 회차")
    recent = get_recent_data(5)
    for r in recent:
        st.markdown(f'<div class="list-row"><b>{r["round"]}회</b> · {r["date"]}</div>', unsafe_allow_html=True)
        render_balls(r["numbers"] + [r["bonus"]])

elif menu == "번호 분석":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.subheader("번호 분석")
    recent = get_recent_data(120)
    nums = []
    for r in recent:
        nums.extend(r["numbers"])
    counts = Counter(nums)
    top = counts.most_common(10)
    low = sorted([(n, counts.get(n, 0)) for n in range(1, 46)], key=lambda x: x[1])[:10]

    st.write("자주 나온 번호 TOP 10")
    render_balls([n for n, c in top])
    for n, c in top:
        st.write(f"{n}번 : {c}회")

    st.write("최근 120회 기준 적게 나온 번호")
    render_balls([n for n, c in low])
    st.markdown('</div>', unsafe_allow_html=True)

elif menu == "번호 추천":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.subheader("번호 추천")

    if "rec_nums" not in st.session_state:
        st.session_state.rec_nums = recommend_numbers()

    render_balls(st.session_state.rec_nums)

    c1, c2 = st.columns(2)
    with c1:
        if st.button("새 추천", use_container_width=True):
            st.session_state.rec_nums = recommend_numbers()
            st.rerun()
    with c2:
        if st.button("랜덤 추천", use_container_width=True):
            st.session_state.rec_nums = sorted(random.sample(range(1, 46), 6))
            st.rerun()

    st.caption("당첨을 보장하지 않습니다. 개인용 참고 분석입니다.")
    st.markdown('</div>', unsafe_allow_html=True)

elif menu == "적중 분석":
    st.subheader("내 예상번호 상세분석")
    text = st.text_input("예상번호 6개 입력", value="5 14 23 33 42 9", placeholder="예: 5 14 23 33 42 9")

    try:
        my_numbers = [int(x) for x in text.replace(",", " ").split()]
        my_numbers = sorted(list(dict.fromkeys(my_numbers)))
    except Exception:
        my_numbers = []

    if len(my_numbers) == 6 and all(1 <= n <= 45 for n in my_numbers):
        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.write("내 예상번호")
        render_balls(my_numbers)
        rows = analyze_numbers(my_numbers)
        best = rows[0]

        st.markdown('<div class="metric-grid">', unsafe_allow_html=True)
        st.markdown(f'<div class="metric-card"><div>최고 일치</div><div class="metric-value">{best["hit_count"]}개</div><div class="small">{best["round"]}회</div></div>', unsafe_allow_html=True)
        st.markdown(f'<div class="metric-card"><div>보너스</div><div class="metric-value">{"일치" if best["bonus"] else "미일치"}</div><div class="small">최근 200회 기준</div></div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        st.markdown("### 유사 회차 TOP 10")
        for row in rows[:10]:
            st.markdown(f'<div class="list-row"><b>{row["round"]}회</b> · {row["date"]} · {row["hit_count"]}개 일치</div>', unsafe_allow_html=True)
            render_balls(row["numbers"] + [row["bonus_no"]])
    else:
        st.warning("1~45 사이 숫자 6개를 입력하세요.")
