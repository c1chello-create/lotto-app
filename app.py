import streamlit as st
import random
import requests
from collections import Counter
from datetime import datetime

st.set_page_config(page_title="행운로또 🍀", page_icon="🍀", layout="centered")

BASE_URL = "https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo="

st.markdown("""
<style>
.block-container {padding-top: 1rem; padding-bottom: 5rem; max-width: 760px;}
.main-title {
    background: linear-gradient(135deg, #002b5c, #004e92);
    color: white; padding: 18px 14px; border-radius: 18px;
    text-align: center; font-size: 30px; font-weight: 800; margin-bottom: 14px;
}
.card {
    background: white; border: 1px solid #e5e7eb; border-radius: 18px;
    padding: 16px; margin: 10px 0; box-shadow: 0 4px 14px rgba(15,23,42,.07);
}
.round-title {text-align:center; font-size:28px; font-weight:800; color:#0f2f5f;}
.draw-date {text-align:center; font-size:15px; color:#64748b; margin-bottom:14px;}
.ball-row {display:flex; gap:7px; justify-content:center; align-items:center; flex-wrap:wrap; margin:12px 0;}
.ball {
    width:45px; height:45px; border-radius:50%; color:white; font-weight:800; font-size:20px;
    display:inline-flex; justify-content:center; align-items:center;
    box-shadow: inset 0 -4px 8px rgba(0,0,0,.18), 0 3px 7px rgba(0,0,0,.18);
}
.bonus-label {text-align:center; color:#64748b; font-size:13px; margin-top:6px;}
.metric-grid {display:grid; grid-template-columns: repeat(2,1fr); gap:9px;}
.metric-card {background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; padding:12px; text-align:center;}
.metric-value {font-size:22px; font-weight:800; color:#0f2f5f;}
.small {font-size:13px; color:#64748b;}
</style>
""", unsafe_allow_html=True)

def ball_color(n):
    if 1 <= n <= 9: return "#f6b800"
    if 10 <= n <= 19: return "#1976d2"
    if 20 <= n <= 29: return "#e53935"
    if 30 <= n <= 39: return "#4b5563"
    return "#43a047"

def render_balls(numbers):
    html = '<div class="ball-row">'
    for n in numbers:
        html += f'<span class="ball" style="background:{ball_color(n)}">{n}</span>'
    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

def get_lotto(round_no):
    try:
        data = requests.get(BASE_URL + str(round_no), timeout=8).json()
        if data.get("returnValue") != "success":
            return None
        return {
            "round": round_no,
            "date": data.get("drwNoDate", ""),
            "numbers": [data[f"drwtNo{i}"] for i in range(1, 7)],
            "bonus": data["bnusNo"]
        }
    except Exception:
        return None

@st.cache_data(ttl=3600)
def get_latest_round_fast():
    first_draw = datetime(2002, 12, 7)
    today = datetime.today()
    estimated = ((today - first_draw).days // 7) + 1
    for r in range(estimated + 3, estimated - 10, -1):
        if r > 0 and get_lotto(r):
            return r
    return 1

@st.cache_data(ttl=3600)
def get_recent_data(count=120):
    latest = get_latest_round_fast()
    start = max(1, latest - count + 1)
    data = []
    for r in range(latest, start - 1, -1):
        item = get_lotto(r)
        if item:
            data.append(item)
    return data

def recommend_numbers():
    recent = get_recent_data(120)
    all_nums = []
    for item in recent:
        all_nums.extend(item["numbers"])
    counts = Counter(all_nums)
    hot = [n for n, _ in counts.most_common(20)]
    cold = [n for n in range(1, 46) if n not in hot]
    pick = []
    pick += random.sample(hot, min(3, len(hot)))
    pick += random.sample(cold, 2)
    while len(pick) < 6:
        x = random.randint(1, 45)
        if x not in pick:
            pick.append(x)
    return sorted(pick[:6])

def match_history(my_numbers):
    recent = get_recent_data(200)
    rows = []
    my_set = set(my_numbers)
    for item in recent:
        hit = sorted(list(my_set.intersection(item["numbers"])))
        bonus_hit = item["bonus"] in my_set
        rows.append({
            "round": item["round"],
            "date": item["date"],
            "hit_count": len(hit),
            "hit": hit,
            "bonus": bonus_hit,
            "numbers": item["numbers"],
            "bonus_no": item["bonus"]
        })
    rows.sort(key=lambda x: (x["hit_count"], x["bonus"]), reverse=True)
    return rows

st.markdown('<div class="main-title">행운로또 🍀</div>', unsafe_allow_html=True)

menu = st.radio(
    "메뉴",
    ["회차별 조회", "번호 분석", "번호 추천", "적중 분석"],
    horizontal=True,
    label_visibility="collapsed"
)

st.caption("🟡 1~9 · 🔵 10~19 · 🔴 20~29 · ⚫ 30~39 · 🟢 40~45")

if menu == "회차별 조회":
    latest = get_latest_round_fast()
    round_no = st.number_input("회차 입력", min_value=1, max_value=latest, value=latest, step=1)

    if st.button("조회하기", use_container_width=True):
        item = get_lotto(round_no)
    else:
        item = get_lotto(latest)

    if item:
        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.markdown(f'<div class="round-title">{item["round"]}회</div>', unsafe_allow_html=True)
        st.markdown(f'<div class="draw-date">{item["date"]} 추첨</div>', unsafe_allow_html=True)
        st.markdown('<div class="bonus-label">당첨번호</div>', unsafe_allow_html=True)
        render_balls(item["numbers"])
        st.markdown('<div class="bonus-label">보너스번호</div>', unsafe_allow_html=True)
        render_balls([item["bonus"]])
        st.markdown('</div>', unsafe_allow_html=True)

    st.markdown("### 최근 회차")
    for item in get_recent_data(5):
        st.markdown(f"**{item['round']}회** · {item['date']}")
        render_balls(item["numbers"] + [item["bonus"]])

elif menu == "번호 분석":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.subheader("최근 120회 번호 통계")
    recent = get_recent_data(120)
    nums = []
    for item in recent:
        nums.extend(item["numbers"])
    counts = Counter(nums)
    top10 = counts.most_common(10)
    st.write("자주 나온 번호 TOP 10")
    render_balls([n for n, c in top10])
    for n, c in top10:
        st.write(f"{n}번 : {c}회")
    st.markdown('</div>', unsafe_allow_html=True)

elif menu == "번호 추천":
    st.markdown('<div class="card">', unsafe_allow_html=True)
    st.subheader("추천번호")
    if "recommended" not in st.session_state:
        st.session_state.recommended = recommend_numbers()
    render_balls(st.session_state.recommended)
    if st.button("새 추천 받기", use_container_width=True):
        st.session_state.recommended = recommend_numbers()
        st.rerun()
    st.caption("최근 120회 통계와 무작위 균형을 섞은 개인용 추천입니다.")
    st.markdown('</div>', unsafe_allow_html=True)

elif menu == "적중 분석":
    st.subheader("내 예상번호 적중 분석")
    text = st.text_input("예상번호 6개 입력", value="5 14 23 33 42 9")
    try:
        my_numbers = [int(x) for x in text.replace(",", " ").split()]
        my_numbers = sorted(list(dict.fromkeys(my_numbers)))
    except Exception:
        my_numbers = []

    if len(my_numbers) == 6 and all(1 <= n <= 45 for n in my_numbers):
        st.markdown('<div class="card">', unsafe_allow_html=True)
        st.write("내 예상번호")
        render_balls(my_numbers)
        rows = match_history(my_numbers)
        best = rows[0]
        st.markdown('<div class="metric-grid">', unsafe_allow_html=True)
        st.markdown(f'<div class="metric-card"><div>최고 일치</div><div class="metric-value">{best["hit_count"]}개</div><div class="small">{best["round"]}회</div></div>', unsafe_allow_html=True)
        st.markdown(f'<div class="metric-card"><div>보너스 일치</div><div class="metric-value">{"O" if best["bonus"] else "X"}</div><div class="small">최근 200회 기준</div></div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('</div>', unsafe_allow_html=True)

        st.write("유사 회차 TOP 10")
        for row in rows[:10]:
            st.markdown(f"**{row['round']}회** · {row['date']} · {row['hit_count']}개 일치")
            render_balls(row["numbers"] + [row["bonus_no"]])
    else:
        st.warning("1~45 사이 숫자 6개를 입력하세요.")
