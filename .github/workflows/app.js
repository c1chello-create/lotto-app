
let lottoData = [];
let shownCount = 5;
let myNums = [5,14,23,33,42,9];

function colorClass(n){
  if(n <= 9) return "yellow";
  if(n <= 19) return "blue";
  if(n <= 29) return "red";
  if(n <= 39) return "black";
  return "green";
}

function ball(n, small=false){
  return `<span class="ball ${small ? 'small-ball' : ''} ${colorClass(Number(n))}">${n}</span>`;
}

function balls(nums, bonus=null, small=false){
  let html = `<div class="balls">` + nums.map(n => ball(n, small)).join("");
  if(bonus !== null) html += `<span class="plus">|</span>${ball(bonus, small)}`;
  return html + `</div>`;
}

async function loadData(){
  const res = await fetch("./data/lotto.json?ts=" + Date.now());
  const data = await res.json();
  lottoData = data.sort((a,b) => b.round - a.round);
  renderHome();
  renderStats();
  renderRecommend("stat");
  renderMyCard();
}

function renderLatest(item){
  return `
    <div class="card center">
      <div class="round-title">${item.round}회</div>
      <div class="draw-date">${item.date} 추첨</div>
      <div class="label">당첨번호</div>
      ${balls(item.numbers)}
      <div class="label">보너스번호</div>
      ${balls([item.bonus])}
    </div>
  `;
}

function renderHome(){
  if(!lottoData.length){
    document.getElementById("latestCard").innerHTML = "lotto.json 데이터가 비어 있습니다.";
    return;
  }
  const latest = lottoData[0];
  document.getElementById("roundInput").value = latest.round;
  document.getElementById("latestCard").outerHTML = `<div id="latestCard">${renderLatest(latest)}</div>`;
  renderRecent();
}

function renderRecent(){
  document.getElementById("recentList").innerHTML = lottoData.slice(0, shownCount).map((x, i) => `
    <div class="row ${i === 0 ? 'selected' : ''}">
      <div><b>${x.round}회</b></div>
      <div>${x.date.slice(5)}</div>
      <div class="nums">${x.numbers.map(n => ball(n, true)).join("")}</div>
      <div>${ball(x.bonus, true)}</div>
    </div>
  `).join("");
}

function renderMyCard(){
  document.getElementById("myNumbers").innerHTML = myNums.map(n => ball(n)).join("");
  const all = lottoData.flatMap(x => x.numbers);
  const count = myNums.reduce((s, n) => s + all.filter(v => v === n).length, 0);
  document.getElementById("appearCount").textContent = count + "회";
  const recentIdx = lottoData.findIndex(x => x.numbers.some(n => myNums.includes(n)));
  document.getElementById("recentAppear").textContent = recentIdx >= 0 ? `${recentIdx + 1}회 전` : "-";
  document.getElementById("missGap").textContent = recentIdx >= 0 ? `${recentIdx + 1}회` : "-";
}

function counter(){
  const map = {};
  for(let i=1; i<=45; i++) map[i] = 0;
  lottoData.forEach(x => x.numbers.forEach(n => map[n]++));
  return map;
}

function renderStats(){
  const c = counter();
  const arr = Object.entries(c).map(([n,v]) => [Number(n), v]);
  const hot = [...arr].sort((a,b) => b[1] - a[1]).slice(0,10);
  const cold = [...arr].sort((a,b) => a[1] - b[1]).slice(0,10);

  document.getElementById("hotNumbers").innerHTML = hot.map(x => ball(x[0])).join("");
  document.getElementById("coldNumbers").innerHTML = cold.map(x => ball(x[0])).join("");
  document.getElementById("hotList").innerHTML = hot.map(x => `${x[0]}번 : ${x[1]}회`).join("<br>");
  document.getElementById("coldList").innerHTML = cold.map(x => `${x[0]}번 : ${x[1]}회`).join("<br>");

  const nums = lottoData.flatMap(x => x.numbers);
  const odd = nums.filter(n => n % 2).length;
  const even = nums.length - odd;
  document.getElementById("ratioBox").innerHTML = `홀수 ${odd}회 / 짝수 ${even}회`;
}

function recommendStat(){
  const c = counter();
  const arr = Object.entries(c).map(([n,v]) => [Number(n), v]);
  const hot = [...arr].sort((a,b) => b[1] - a[1]).slice(0,18).map(x => x[0]);
  const cold = [...arr].sort((a,b) => a[1] - b[1]).slice(0,20).map(x => x[0]);
  let nums = [];
  while(nums.length < 3){
    let n = hot[Math.floor(Math.random() * hot.length)];
    if(!nums.includes(n)) nums.push(n);
  }
  while(nums.length < 6){
    let n = cold[Math.floor(Math.random() * cold.length)];
    if(!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a,b) => a-b);
}

function randomNums(){
  let a = [];
  while(a.length < 6){
    let n = Math.floor(Math.random() * 45) + 1;
    if(!a.includes(n)) a.push(n);
  }
  return a.sort((x,y) => x-y);
}

function balancedNums(){
  const zones = [[1,9],[10,19],[20,29],[30,39],[40,45]];
  let nums = [];
  zones.forEach(z => {
    let n = Math.floor(Math.random() * (z[1] - z[0] + 1)) + z[0];
    nums.push(n);
  });
  while(nums.length < 6){
    let n = Math.floor(Math.random() * 45) + 1;
    if(!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a,b) => a-b);
}

function renderRecommend(type="stat"){
  const nums = type === "random" ? randomNums() : type === "balanced" ? balancedNums() : recommendStat();
  document.getElementById("recommendBalls").innerHTML = nums.map(n => ball(n)).join("");
}

function analyzeMatch(){
  const text = document.getElementById("matchInput").value;
  const nums = [...new Set(text.replaceAll(",", " ").split(/\\s+/).map(Number).filter(n => n >= 1 && n <= 45))].sort((a,b) => a-b);
  if(nums.length !== 6){
    alert("1~45 사이 숫자 6개를 입력하세요.");
    return;
  }
  myNums = nums;
  document.getElementById("matchBalls").innerHTML = nums.map(n => ball(n)).join("");
  const rows = lottoData.map(x => {
    const hit = x.numbers.filter(n => nums.includes(n));
    return {...x, hitCount: hit.length, bonusHit: nums.includes(x.bonus)};
  }).sort((a,b) => (b.hitCount - a.hitCount) || ((b.bonusHit ? 1 : 0) - (a.bonusHit ? 1 : 0))).slice(0,10);
  document.getElementById("matchResult").innerHTML = rows.map(x => `
    <div class="result-row">
      <b>${x.round}회 · ${x.hitCount}개 일치 ${x.bonusHit ? "· 보너스" : ""}</b><br>
      <span class="row-date">${x.date}</span>
      ${balls(x.numbers, x.bonus, true)}
    </div>
  `).join("");
  renderMyCard();
}

function dreamRecommend(){
  const keyword = document.getElementById("dreamInput").value.trim() || "행운";
  const seed = [...keyword].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  let nums = [];
  let x = seed;
  while(nums.length < 6){
    x = (x * 9301 + 49297) % 233280;
    let n = x % 45 + 1;
    if(!nums.includes(n)) nums.push(n);
  }
  nums.sort((a,b) => a-b);
  document.getElementById("dreamResult").innerHTML = `<h3>${keyword} 꿈 추천번호</h3>${balls(nums)}<p class="note">꿈 키워드를 숫자로 변환한 개인용 추천입니다.</p>`;
}

function showPage(page){
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  document.querySelectorAll(".tab,.bottom-btn").forEach(x => x.classList.toggle("active", x.dataset.page === page));
}

document.querySelectorAll(".tab,.bottom-btn").forEach(btn => btn.addEventListener("click", () => showPage(btn.dataset.page)));
document.getElementById("roundSearch").addEventListener("click", () => {
  const r = Number(document.getElementById("roundInput").value);
  const item = lottoData.find(x => x.round === r);
  if(item) document.getElementById("latestCard").innerHTML = renderLatest(item);
  else alert("회차 정보를 찾을 수 없습니다.");
});
document.getElementById("moreBtn").addEventListener("click", () => { shownCount += 5; renderRecent(); });
document.getElementById("goMatch").addEventListener("click", () => showPage("match"));
document.getElementById("statRecommend").addEventListener("click", () => renderRecommend("stat"));
document.getElementById("balancedRecommend").addEventListener("click", () => renderRecommend("balanced"));
document.getElementById("randomRecommend").addEventListener("click", () => renderRecommend("random"));
document.getElementById("matchBtn").addEventListener("click", analyzeMatch);
document.getElementById("dreamBtn").addEventListener("click", dreamRecommend);

loadData().catch(err => {
  document.getElementById("latestCard").innerHTML = "lotto.json 파일을 불러오지 못했습니다. data/lotto.json 업로드와 GitHub Pages 반영을 확인하세요.";
  console.error(err);
});


/* =========================================================
   Detail Match History Plus v0.1
   메인 상세페이지용 선택번호 포함 회차 분석 확장
========================================================= */

let detailHistoryRange = "all";

function includeBonusMatch(){
  const cb = document.getElementById("includeBonus");
  return cb ? cb.checked : true;
}

function parseMatchNumsFlexible(){
  const input = document.getElementById("matchInput");
  if(!input) return [];
  return [...new Set(
    input.value.replaceAll(",", " ").split(/\s+/).map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 45)
  )].sort((a,b)=>a-b);
}

function starByHitCount(count){
  if(count >= 5) return "★★★★★";
  if(count === 4) return "★★★★☆";
  if(count === 3) return "★★★☆☆";
  if(count === 2) return "★★☆☆☆";
  return "★☆☆☆☆";
}

function hitGradeClass(count){
  if(count >= 5) return "grade5";
  if(count === 4) return "grade4";
  if(count === 3) return "grade3";
  if(count === 2) return "grade2";
  return "grade1";
}

function detailRowsByRange(){
  if(detailHistoryRange === "50") return lottoData.slice(0,50);
  if(detailHistoryRange === "100") return lottoData.slice(0,100);
  return lottoData;
}

function nextDrawOf(row){
  return lottoData.find(x => Number(x.round) === Number(row.round) + 1) || null;
}

function makeHighlightedBalls(nums, selected){
  const s = new Set(selected);
  return `<div class="balls">` + nums.map(n => {
    const extra = s.has(n) ? " detail-hit-ball" : "";
    return `<span class="ball small-ball ${extra} ${colorClass(Number(n))}">${n}</span>`;
  }).join("") + `</div>`;
}

function getDetailHitRows(nums){
  const useBonus = includeBonusMatch();
  return detailRowsByRange()
    .map(row => {
      const normalHits = (row.numbers || []).filter(n => nums.includes(n));
      const bonusHit = useBonus && nums.includes(row.bonus);
      const allHits = bonusHit ? [...normalHits, row.bonus] : normalHits;
      return {row, normalHits, bonusHit, allHits, hitCount: allHits.length, next: nextDrawOf(row)};
    })
    .filter(x => x.hitCount >= 1)
    .sort((a,b) => b.hitCount - a.hitCount || b.row.round - a.row.round);
}

function nextNumberFrequency(hitRows){
  const map = {};
  for(let i=1;i<=45;i++) map[i] = 0;
  hitRows.forEach(item => {
    if(!item.next) return;
    (item.next.numbers || []).forEach(n => map[n]++);
  });
  return Object.entries(map).map(([n,c]) => ({n:Number(n), count:c}))
    .filter(x => x.count > 0).sort((a,b)=>b.count-a.count || a.n-b.n);
}

function renderNextFrequencySummary(hitRows){
  const freq = nextNumberFrequency(hitRows).slice(0,10);
  if(!freq.length){
    return `<div class="detail-plus-card"><b>다음 회차 번호 빈도</b><p class="detail-muted">다음 회차 데이터를 집계할 수 없습니다.</p></div>`;
  }
  return `<div class="detail-plus-card">
    <b>다음 회차 번호 빈도 TOP 10</b>
    <p class="detail-muted">선택번호가 포함된 회차의 바로 다음 회차에서 자주 나온 번호입니다.</p>
    <div class="detail-frequency-list">
      ${freq.map(x => `
        <div class="detail-frequency-row">
          ${ball(x.n,true)}
          <div class="detail-frequency-bar"><i style="width:${Math.max(8, Math.min(100, x.count / freq[0].count * 100))}%"></i></div>
          <span>${x.count}회</span>
        </div>
      `).join("")}
    </div>
  </div>`;
}

function renderTemporalPatternHint(hitRows){
  const top = nextNumberFrequency(hitRows).slice(0,6).map(x=>x.n).sort((a,b)=>a-b);
  if(!top.length) return "";
  return `<div class="detail-plus-card detail-pattern-card">
    <b>시간축 패턴 후보</b>
    <p class="detail-muted">선택번호 포함 회차 이후에 반복된 번호를 기준으로 한 연구용 후보입니다.</p>
    <div class="balls">${top.map(n=>ball(n)).join("")}</div>
  </div>`;
}

function renderDetailRangeButtons(){
  return `<div class="detail-range-row">
    <button class="detail-range-btn ${detailHistoryRange==="50"?"active":""}" data-detail-range="50">최근 50회</button>
    <button class="detail-range-btn ${detailHistoryRange==="100"?"active":""}" data-detail-range="100">최근 100회</button>
    <button class="detail-range-btn ${detailHistoryRange==="all"?"active":""}" data-detail-range="all">전체 회차</button>
  </div>`;
}

function renderDetailIncludedHistory(nums){
  const hitRows = getDetailHitRows(nums);
  const rangeLabel = detailHistoryRange === "all" ? "전체 회차" : `최근 ${detailHistoryRange}회`;

  const rowsHtml = hitRows.length ? hitRows.map(item => {
    const nextText = item.next ? `${item.next.round}회 · ${item.next.date || ""}` : "다음 회차 없음";
    return `<div class="detail-history-row ${hitGradeClass(item.hitCount)}">
      <div class="detail-history-head">
        <div><b>${item.row.round}회</b><span>${item.row.date || ""}</span></div>
        <div class="detail-stars">${starByHitCount(item.hitCount)}</div>
      </div>
      <div class="detail-history-section">
        <span class="detail-label">당첨번호</span>
        ${makeHighlightedBalls(item.row.numbers || [], nums)}
        <span class="detail-bonus">보너스 ${item.bonusHit ? `<b class="detail-hit-text">${item.row.bonus}</b>` : item.row.bonus}</span>
      </div>
      <p class="detail-hit-summary">포함번호: <b>${item.allHits.join(", ")}</b> · 총 ${item.hitCount}개 포함</p>
      <div class="detail-next-box">
        <span class="detail-label">다음 회차</span>
        <p class="detail-muted">${nextText}</p>
        ${item.next ? makeHighlightedBalls(item.next.numbers || [], []) : ""}
      </div>
    </div>`;
  }).join("") : `<div class="detail-empty">선택한 번호가 포함된 회차가 없습니다.</div>`;

  return `<div class="detail-plus">
    <div class="detail-plus-title"><b>선택번호 포함 회차</b><span>${rangeLabel} · ${hitRows.length}회</span></div>
    ${renderDetailRangeButtons()}
    ${renderNextFrequencySummary(hitRows)}
    ${renderTemporalPatternHint(hitRows)}
    <div class="detail-history-list">${rowsHtml}</div>
  </div>`;
}

function bindDetailRangeButtons(nums){
  document.querySelectorAll(".detail-range-btn").forEach(btn => {
    btn.onclick = () => {
      detailHistoryRange = btn.dataset.detailRange;
      const box = document.getElementById("matchResult");
      if(box) box.innerHTML = renderDetailIncludedHistory(nums);
      bindDetailRangeButtons(nums);
    };
  });
}

function injectDetailPlusStyle(){
  if(document.getElementById("detailPlusStyle")) return;
  const st = document.createElement("style");
  st.id = "detailPlusStyle";
  st.textContent = `
    .detail-plus{margin-top:14px}.detail-plus-title{display:flex;justify-content:space-between;align-items:center;margin:12px 0;font-weight:900;color:#102a5c}.detail-plus-title span{font-size:13px;color:#667085}
    .detail-range-row{display:flex;gap:8px;margin:10px 0 14px}.detail-range-btn{flex:1;border:1px solid #cbd5e1;background:#fff;border-radius:14px;padding:10px 8px;font-weight:900;color:#11366b}.detail-range-btn.active{background:#11366b;color:#fff;border-color:#11366b}
    .detail-plus-card{background:#fff;border:1px solid #e7edf5;border-radius:18px;padding:14px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.04)}.detail-pattern-card{background:#f7fff4}.detail-muted{color:#667085;font-size:13px;line-height:1.45}
    .detail-frequency-row{display:grid;grid-template-columns:38px 1fr 44px;gap:8px;align-items:center;margin:7px 0}.detail-frequency-bar{height:9px;background:#eaf4ff;border-radius:999px;overflow:hidden}.detail-frequency-bar i{display:block;height:100%;background:#2d8cff;border-radius:999px}.detail-frequency-row span{font-size:13px;font-weight:900;color:#11366b;text-align:right}
    .detail-history-row{background:#fff;border:1px solid #e7edf5;border-radius:18px;padding:14px;margin:12px 0;box-shadow:0 2px 8px rgba(0,0,0,.04)}.detail-history-row.grade5{border-color:#f2d99b;background:#fffaf0}.detail-history-row.grade4{border-color:#b7e4c7;background:#f4fff8}.detail-history-row.grade3{border-color:#bfdbfe;background:#f8fbff}
    .detail-history-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.detail-history-head b{font-size:18px;color:#11366b}.detail-history-head span{display:block;font-size:12px;color:#667085}.detail-stars{font-weight:900;color:#8a5b00;letter-spacing:1px}
    .detail-history-section{border-top:1px solid #eef2f7;padding-top:10px;margin-top:8px}.detail-label{display:block;font-size:12px;color:#667085;font-weight:900;margin:4px 0}.detail-bonus{display:block;margin-top:5px;color:#475467;font-size:13px}.detail-hit-ball{outline:4px solid #f8e388;box-shadow:0 0 0 3px rgba(255,214,100,.4)}.detail-hit-text{color:#b42318}.detail-hit-summary{font-size:13px;color:#344054;line-height:1.45}.detail-next-box{background:#f8fafc;border-radius:14px;padding:10px;margin-top:8px}.detail-empty{background:#fff;border:1px dashed #cbd5e1;border-radius:18px;padding:20px;text-align:center;color:#667085}
    @media(max-width:430px){.detail-range-btn{font-size:13px;padding:9px 4px}.detail-history-row .ball.small-ball{width:26px;height:26px;font-size:12px}}
  `;
  document.head.appendChild(st);
}

function analyzeMatch(){
  injectDetailPlusStyle();
  const nums = parseMatchNumsFlexible();
  if(nums.length < 2 || nums.length > 6){
    alert("1~45 사이 숫자 2개~6개를 입력하세요.");
    return;
  }
  myNums = nums;
  const matchBalls = document.getElementById("matchBalls");
  if(matchBalls) matchBalls.innerHTML = nums.map(n => ball(n)).join("");
  const box = document.getElementById("matchResult");
  if(box) {
    box.innerHTML = renderDetailIncludedHistory(nums);
    bindDetailRangeButtons(nums);
  }
  renderMyCard();
}
