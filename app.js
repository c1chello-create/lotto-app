
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
      <div class="draw-date">${item.date}</div>
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
      <div class="round-cell"><b>${x.round}회</b><span>${x.date}</span></div>
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
      <div class="round-cell"><b>${x.round}회</b><span>${x.date}</span></div>
      <div class="nums">${x.numbers.map(n => ball(n, true)).join("")}</div>
      <div>${ball(x.bonus, true)}</div>
      <div class="hit-tag hit-win">${x.hitCount}${x.bonusHit ? "+B" : ""}개</div>
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
