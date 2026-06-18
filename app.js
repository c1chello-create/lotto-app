let lottoData = [];
let shownCount = 5;
let myNums = loadMyNums();
let selectedNums = [myNums[0]];
let matchRange = 50;

const $ = id => document.getElementById(id);

function loadMyNums(){
  try{
    const saved = JSON.parse(localStorage.getItem("haengun_my_nums") || "null");
    if(Array.isArray(saved) && saved.length === 6 && saved.every(n => Number.isInteger(n) && n>=1 && n<=45)){
      return saved;
    }
  }catch(e){}
  return [5,14,23,33,42,9];
}

function saveMyNums(){
  localStorage.setItem("haengun_my_nums", JSON.stringify(myNums));
}

function setMyNumbers(){
  const current = myNums.join(" ");
  const input = prompt("예상번호 6개를 입력하세요.\\n예: 5 14 23 33 42 9", current);
  if(input === null) return;

  const nums = input
    .split(/[\s,]+/)
    .map(v => Number(v.trim()))
    .filter(v => Number.isInteger(v));

  if(nums.length !== 6){
    alert("번호는 6개를 입력해야 합니다.");
    return;
  }

  const unique = [...new Set(nums)];
  if(unique.length !== 6){
    alert("중복 번호는 사용할 수 없습니다.");
    return;
  }

  if(unique.some(n => n < 1 || n > 45)){
    alert("번호는 1부터 45 사이만 가능합니다.");
    return;
  }

  myNums = unique.sort((a,b)=>a-b);
  selectedNums = [myNums[0]];
  saveMyNums();

  renderMyCard();
  renderMatchDetail();

  alert("예상번호가 저장되었습니다.");
}

function injectComboStyle(){
  const css = `
  .pick-slot.active{border:3px solid #ffdc64!important;background:#fff8db!important}
  .combo-selected{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .combo-desc{font-size:13px;color:#667085;margin:6px 0 0}
  .history-row.combo-hit{background:#fffdf5}
  .hit-combo{background:#ffe8a3;color:#8a5b00}
  .folder-btn{cursor:pointer}
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
}

function colorClass(n){
  n = Number(n);
  if(n <= 9) return "yellow";
  if(n <= 19) return "blue";
  if(n <= 29) return "red";
  if(n <= 39) return "black";
  return "green";
}

function ball(n, small=false, extra=""){
  return `<span class="ball ${small ? "small-ball" : ""} ${extra} ${colorClass(n)}">${n}</span>`;
}

function tinyBall(n, extra=""){
  return `<span class="ball tiny-ball ${extra} ${colorClass(n)}">${n}</span>`;
}

function balls(nums, bonus=null, small=false){
  let html = `<div class="balls">` + nums.map(n => ball(n, small)).join("");
  if(bonus !== null) html += `<span class="plus">|</span>${ball(bonus, small)}`;
  return html + `</div>`;
}

async function loadData(){
  try{
    const res = await fetch("./data/lotto.json?ts=" + Date.now());
    const data = await res.json();
    if(!Array.isArray(data)) throw new Error("lotto.json 배열 아님");
    lottoData = data.sort((a,b) => b.round - a.round);
    renderHome();
    renderStats();
    renderRecommend("stat");
    renderMyCard();
    renderMatchDetail();
  }catch(e){
    console.error(e);
    if($("statusBox")) $("statusBox").innerHTML = "데이터 오류: data/lotto.json을 읽지 못했습니다.";
  }
}

function renderLatest(x){
  return `<div class="card center">
    <div class="round-title">${x.round}회</div>
    <div class="draw-date">${x.date} 추첨</div>
    <div class="label">당첨번호</div>
    ${balls(x.numbers)}
    <div class="label">보너스번호</div>
    ${balls([x.bonus])}
  </div>`;
}

function renderHome(){
  if(!lottoData.length){
    if($("statusBox")) $("statusBox").innerHTML = "lotto.json 데이터가 비어 있습니다.";
    return;
  }

  const x = lottoData[0];

  if($("roundInput")) $("roundInput").value = x.round;
  if($("statusBox")) $("statusBox").outerHTML = `<div id="statusBox">${renderLatest(x)}</div>`;

  renderRecent();
}

function renderRecent(){
  if(!$("recentList")) return;

  $("recentList").innerHTML = lottoData.slice(0, shownCount).map((x,i) => `
    <div class="row ${i===0 ? "selected" : ""}">
      <div><b>${x.round}회</b></div>
      <div>${String(x.date).slice(5)}</div>
      <div class="nums">${x.numbers.map(n => ball(n,true)).join("")}</div>
      <div>${ball(x.bonus,true)}</div>
    </div>
  `).join("");
}

function renderMyCard(){
  if($("myNumbers")){
    $("myNumbers").innerHTML = myNums.map(n => ball(n)).join("");
  }

  const all = lottoData.flatMap(x => x.numbers || []);
  const count = myNums.reduce((s,n) => s + all.filter(v => v === n).length, 0);

  if($("appearCount")) $("appearCount").textContent = count + "회";

  const idx = lottoData.findIndex(x => (x.numbers || []).some(n => myNums.includes(n)));
  if($("recentAppear")) $("recentAppear").textContent = idx >= 0 ? `${idx+1}회 전` : "-";
  if($("missGap")) $("missGap").textContent = idx >= 0 ? `${idx+1}회` : "-";
}

function counter(){
  const m = {};
  for(let i=1;i<=45;i++) m[i] = 0;
  lottoData.forEach(x => (x.numbers || []).forEach(n => m[n]++));
  return m;
}

function renderStats(){
  if(!$("hotBalls")) return;

  const c = counter();
  const arr = Object.entries(c).map(([n,v]) => [Number(n),v]);
  const hot = [...arr].sort((a,b) => b[1]-a[1]).slice(0,10);
  const cold = [...arr].sort((a,b) => a[1]-b[1]).slice(0,10);

  $("hotBalls").innerHTML = hot.map(x => ball(x[0])).join("");
  $("coldBalls").innerHTML = cold.map(x => ball(x[0])).join("");

  if($("hotList")) $("hotList").innerHTML = hot.map(x => `${x[0]}번 : ${x[1]}회`).join("<br>");
  if($("coldList")) $("coldList").innerHTML = cold.map(x => `${x[0]}번 : ${x[1]}회`).join("<br>");

  const nums = lottoData.flatMap(x => x.numbers || []);
  const odd = nums.filter(n => n % 2).length;
  if($("ratioBox")) $("ratioBox").innerHTML = `홀수 ${odd}회 / 짝수 ${nums.length-odd}회`;
}

function randomNums(){
  let a = [];
  while(a.length < 6){
    let n = Math.floor(Math.random()*45)+1;
    if(!a.includes(n)) a.push(n);
  }
  return a.sort((x,y)=>x-y);
}

function balancedNums(){
  let nums = [];
  [[1,9],[10,19],[20,29],[30,39],[40,45]].forEach(z => {
    let n = Math.floor(Math.random()*(z[1]-z[0]+1))+z[0];
    if(!nums.includes(n)) nums.push(n);
  });
  while(nums.length < 6){
    let n = Math.floor(Math.random()*45)+1;
    if(!nums.includes(n)) nums.push(n);
  }
  return nums.sort((a,b)=>a-b);
}

function recommendStat(){
  const c = counter();
  const arr = Object.entries(c).map(([n,v]) => [Number(n),v]);
  const hot = [...arr].sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0]);
  const cold = [...arr].sort((a,b)=>a[1]-b[1]).slice(0,20).map(x=>x[0]);

  let nums = [];

  while(nums.length < 3){
    let n = hot[Math.floor(Math.random()*hot.length)] || Math.floor(Math.random()*45)+1;
    if(!nums.includes(n)) nums.push(n);
  }

  while(nums.length < 6){
    let n = cold[Math.floor(Math.random()*cold.length)] || Math.floor(Math.random()*45)+1;
    if(!nums.includes(n)) nums.push(n);
  }

  return nums.sort((a,b)=>a-b);
}

function renderRecommend(type="stat"){
  if(!$("recommendBalls")) return;

  const nums = type === "random" ? randomNums() : type === "balance" ? balancedNums() : recommendStat();
  $("recommendBalls").innerHTML = nums.map(n => ball(n)).join("");
}

function dreamRecommend(){
  if(!$("dreamInput") || !$("dreamResult")) return;

  const keyword = $("dreamInput").value.trim() || "행운";
  let seed = [...keyword].reduce((s,ch) => s + ch.charCodeAt(0), 0);
  let nums = [];

  while(nums.length < 6){
    seed = (seed * 9301 + 49297) % 233280;
    let n = seed % 45 + 1;
    if(!nums.includes(n)) nums.push(n);
  }

  nums.sort((a,b)=>a-b);
  $("dreamResult").innerHTML = `<h3>${keyword} 꿈 추천번호</h3>${balls(nums)}<p class="note">꿈 키워드 기반 개인용 추천입니다.</p>`;
}

function showPage(p){
  document.querySelectorAll(".page").forEach(x => x.classList.remove("active"));
  if($(p)) $(p).classList.add("active");

  document.querySelectorAll(".tab,.bottom-btn").forEach(x => x.classList.toggle("active", x.dataset.page === p));

  const detail = p === "match";

  if($("mainHeader")) $("mainHeader").classList.toggle("hidden", detail);
  if($("detailHeader")) $("detailHeader").classList.toggle("hidden", !detail);
  if($("bottomNav")) $("bottomNav").classList.toggle("hidden", detail);

  if(detail) renderMatchDetail();
}

function toggleNumber(n){
  if(selectedNums.includes(n)){
    if(selectedNums.length > 1){
      selectedNums = selectedNums.filter(v => v !== n);
    }
  }else{
    selectedNums.push(n);
  }

  selectedNums.sort((a,b)=>a-b);
  renderMatchDetail();
}

function renderPickRow(){
  if(!$("pickRow")) return;

  let html = myNums.map(n => {
    const active = selectedNums.includes(n);
    return `<button class="pick-slot ${active ? "active" : ""}" onclick="toggleNumber(${n})">${ball(n,false,active ? "selected-ball" : "")}</button>`;
  }).join("");

  $("pickRow").innerHTML = html;
}

function includeBonus(){
  return $("includeBonus") ? $("includeBonus").checked : true;
}

function rowPool(row){
  return includeBonus() ? [...(row.numbers || []), row.bonus] : [...(row.numbers || [])];
}

function rowHasAllSelected(row){
  const pool = rowPool(row);
  return selectedNums.every(n => pool.includes(n));
}

function comboMatches(){
  const source = matchRange === "all" ? lottoData : lottoData.slice(0, Number(matchRange));
  return source.filter(rowHasAllSelected).sort((a,b)=>b.round-a.round);
}

function comboStats(){
  const allMatches = lottoData.filter(rowHasAllSelected).sort((a,b)=>b.round-a.round);
  const rangeMatches = comboMatches();
  const last = allMatches[0];
  const lastGap = last ? lottoData.findIndex(x => x.round === last.round) + 1 : "-";
  return {allMatches, rangeMatches, last, lastGap};
}

function summaryTarget(){
  return $("comboSummary") || $("numberSummary");
}

function renderComboSummary(){
  const target = summaryTarget();
  if(!target) return;

  const s = comboStats();
  const numsHtml = selectedNums.map(n => ball(n)).join("");

  target.innerHTML = `
    <div class="summary-card">
      <div class="summary-top">
        <div>
          <div class="combo-selected">${numsHtml}</div>
          <div class="summary-num">${selectedNums.length}개 번호 조합 분석</div>
          <p class="combo-desc">선택한 번호가 같은 회차에 동시에 나온 기록입니다.</p>
        </div>
      </div>
      <div class="summary-metrics">
        <div><b>${s.allMatches.length}회</b><span>전체 출현</span></div>
        <div><b>${s.rangeMatches.length}회</b><span>현재 범위</span></div>
        <div><b>${s.last ? s.last.round + "회" : "-"}</b><span>최근 출현</span></div>
        <div><b>${s.lastGap}</b><span>미출현 기간</span></div>
        <div><b>${includeBonus() ? "포함" : "제외"}</b><span>보너스</span></div>
      </div>
    </div>
  `;
}

function renderMatchHistory(){
  if(!$("matchHistory")) return;

  const matches = comboMatches();

  if(!matches.length){
    $("matchHistory").innerHTML = `<div class="card center">선택한 ${selectedNums.length}개 번호가 동시에 나온 회차가 없습니다.</div>`;
    return;
  }

  $("matchHistory").innerHTML = matches.map(x => {
    const hitCount = selectedNums.filter(n => (x.numbers || []).includes(n)).length;
    const bonusHit = selectedNums.includes(x.bonus);
    const tag = `<span class="hit-tag hit-combo">${hitCount}${bonusHit ? "+B" : ""}개</span>`;
    const nums = x.numbers.map(n => tinyBall(n, selectedNums.includes(n) ? "selected-ball" : "")).join("");

    return `<div class="history-row combo-hit">
      <div class="round-cell"><b>${x.round}회</b><span>${x.date}</span></div>
      <div>${String(x.date).slice(5)}</div>
      <div class="history-balls">${nums}</div>
      <div>${tinyBall(x.bonus, selectedNums.includes(x.bonus) ? "selected-ball" : "")}</div>
      <div>${tag}</div>
    </div>`;
  }).join("");
}

function renderMatchDetail(){
  if(!lottoData.length) return;
  renderPickRow();
  renderComboSummary();
  renderMatchHistory();
}

function bindEvents(){
  document.querySelectorAll(".tab,.bottom-btn").forEach(b => {
    b.addEventListener("click", () => showPage(b.dataset.page));
  });

  if($("searchBtn")){
    $("searchBtn").onclick = () => {
      const r = Number($("roundInput").value);
      const x = lottoData.find(v => v.round === r);
      if(x) $("statusBox").innerHTML = renderLatest(x);
      else alert("회차 정보를 찾을 수 없습니다.");
    };
  }

  if($("moreBtn")) $("moreBtn").onclick = () => { shownCount += 5; renderRecent(); };
  if($("detailBtn")) $("detailBtn").onclick = () => showPage("match");
  if($("backHome")) $("backHome").onclick = () => showPage("home");

  if($("statRecommend")) $("statRecommend").onclick = () => renderRecommend("stat");
  if($("balanceRecommend")) $("balanceRecommend").onclick = () => renderRecommend("balance");
  if($("randomRecommend")) $("randomRecommend").onclick = () => renderRecommend("random");
  if($("dreamBtn")) $("dreamBtn").onclick = dreamRecommend;

  document.querySelectorAll(".filter").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      matchRange = b.dataset.range;
      renderMatchHistory();
      renderComboSummary();
    };
  });

  if($("includeBonus")) $("includeBonus").onchange = () => renderMatchDetail();

  document.querySelectorAll(".folder-btn").forEach(btn => {
    btn.onclick = setMyNumbers;
  });
}

injectComboStyle();
bindEvents();
loadData();
