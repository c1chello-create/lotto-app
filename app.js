let lottoData=[];
let shownCount=6;
let myNums=[1,2,9,23,26,31];
let historyRange=50;
let includeBonus=true;

function $(id){return document.getElementById(id);}
function colorClass(n){n=Number(n);if(n<=9)return"yellow";if(n<=19)return"blue";if(n<=29)return"red";if(n<=39)return"black";return"green";}
function ball(n,small=false,extra=""){return `<span class="ball ${small?"small-ball":""} ${extra} ${colorClass(Number(n))}">${n}</span>`;}
function tinyBall(n,extra=""){return `<span class="ball tiny-ball ${extra} ${colorClass(Number(n))}">${n}</span>`;}
function balls(nums,bonus=null,small=false){let html=`<div class="balls">`+nums.map(n=>ball(n,small)).join("");if(bonus!==null)html+=`<span class="plus">|</span>${ball(bonus,small)}`;return html+`</div>`;}
function formatDate(date){return String(date||"").replace(/\s*\(.\)\s*$/,"");}

async function loadData(){
  let res;
  try{res=await fetch("./data/lotto.json?ts="+Date.now());if(!res.ok)throw new Error("no data/lotto.json");}
  catch(e){res=await fetch("./lotto.json?ts="+Date.now());}
  const data=await res.json();
  lottoData=(Array.isArray(data)?data:[]).filter(x=>x&&x.round&&Array.isArray(x.numbers)).sort((a,b)=>Number(b.round)-Number(a.round));
  renderHome();renderStats();renderRecommend("stat");renderMyCard();renderDetail();
}

function renderLatest(item){
  return `<div class="card center">
    <div class="round-title">${item.round}회</div>
    <div class="draw-date">${formatDate(item.date)}</div>
    <div class="label">당첨번호</div>${balls(item.numbers)}
    <div class="label">보너스번호</div>${balls([item.bonus])}
  </div>`;
}

function renderHome(){
  if(!lottoData.length){$("statusBox").innerHTML="lotto.json 데이터가 비어 있습니다.";return;}
  const latest=lottoData[0];
  $("roundInput").value=latest.round;
  $("statusBox").outerHTML=`<div id="statusBox">${renderLatest(latest)}</div>`;
  renderRecent();
}

function renderRecent(){
  $("recentList").innerHTML=lottoData.slice(0,shownCount).map((x,i)=>`
    <div class="row ${i===0?"selected":""}">
      <div class="round-cell"><b>${x.round}회</b><span>${formatDate(x.date)}</span></div>
      <div class="nums">${x.numbers.map(n=>ball(n,true)).join("")}</div>
      <div>${ball(x.bonus,true)}</div>
    </div>`).join("");
}

function renderMyCard(){
  $("myNumbers").innerHTML=myNums.map(n=>ball(n)).join("");
  const all=lottoData.flatMap(x=>x.numbers.map(Number));
  const count=myNums.reduce((s,n)=>s+all.filter(v=>v===Number(n)).length,0);
  $("appearCount").textContent=count?count+"회":"-";
  const recentIdx=lottoData.findIndex(x=>x.numbers.some(n=>myNums.includes(Number(n)))||myNums.includes(Number(x.bonus)));
  $("recentAppear").textContent=recentIdx>=0?`${recentIdx+1}회 전`:"-";
  $("missGap").textContent=recentIdx>=0?`${recentIdx+1}회`:"-";
}

function counter(){const map={};for(let i=1;i<=45;i++)map[i]=0;lottoData.forEach(x=>x.numbers.forEach(n=>map[Number(n)]++));return map;}
function renderStats(){
  if(!$("hotBalls"))return;
  const c=counter();const arr=Object.entries(c).map(([n,v])=>[Number(n),v]);
  const hot=[...arr].sort((a,b)=>b[1]-a[1]).slice(0,10);
  const cold=[...arr].sort((a,b)=>a[1]-b[1]).slice(0,10);
  $("hotBalls").innerHTML=hot.map(x=>ball(x[0])).join("");
  $("coldBalls").innerHTML=cold.map(x=>ball(x[0])).join("");
  $("hotList").innerHTML=hot.map(x=>`${x[0]}번 : ${x[1]}회`).join("<br>");
  $("coldList").innerHTML=cold.map(x=>`${x[0]}번 : ${x[1]}회`).join("<br>");
  const nums=lottoData.flatMap(x=>x.numbers);const odd=nums.filter(n=>n%2).length;const even=nums.length-odd;
  $("ratioBox").innerHTML=`홀수 ${odd}회 / 짝수 ${even}회`;
}

function recommendStat(){
  const c=counter();const arr=Object.entries(c).map(([n,v])=>[Number(n),v]);
  const hot=[...arr].sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0]);
  const cold=[...arr].sort((a,b)=>a[1]-b[1]).slice(0,20).map(x=>x[0]);
  let nums=[];while(nums.length<3&&hot.length){let n=hot[Math.floor(Math.random()*hot.length)];if(!nums.includes(n))nums.push(n);}
  while(nums.length<6&&cold.length){let n=cold[Math.floor(Math.random()*cold.length)];if(!nums.includes(n))nums.push(n);}
  while(nums.length<6){let n=Math.floor(Math.random()*45)+1;if(!nums.includes(n))nums.push(n);}
  return nums.sort((a,b)=>a-b);
}
function randomNums(){let a=[];while(a.length<6){let n=Math.floor(Math.random()*45)+1;if(!a.includes(n))a.push(n);}return a.sort((x,y)=>x-y);}
function balancedNums(){const zones=[[1,9],[10,19],[20,29],[30,39],[40,45]];let nums=[];zones.forEach(z=>{let n=Math.floor(Math.random()*(z[1]-z[0]+1))+z[0];if(!nums.includes(n))nums.push(n);});while(nums.length<6){let n=Math.floor(Math.random()*45)+1;if(!nums.includes(n))nums.push(n);}return nums.sort((a,b)=>a-b);}
function renderRecommend(type="stat"){if(!$("recommendBalls"))return;const nums=type==="random"?randomNums():type==="balanced"?balancedNums():recommendStat();$("recommendBalls").innerHTML=nums.map(n=>ball(n)).join("");}

function calcHits(nums,range="all"){
  const source=range==="all"?lottoData:lottoData.slice(0,Number(range));
  return source.map(x=>{const hit=x.numbers.filter(n=>nums.includes(Number(n)));const bonusHit=nums.includes(Number(x.bonus));return {...x,hitCount:hit.length,bonusHit};});
}
function renderDetail(){renderPickRow();renderNumberSummary();renderMatchHistory();}
function renderPickRow(){
  if(!$("pickRow")) return;

  $("pickRow").innerHTML = Array.from({length:6}).map((_, i) => {
    const v = myNums[i] || "";
    return `<input class="pick-slot pick-input" type="number" inputmode="numeric" min="1" max="45" value="${v}" data-idx="${i}">`;
  }).join("");

  document.querySelectorAll(".pick-input").forEach(input => {
    input.addEventListener("input", () => {
      const vals = [...document.querySelectorAll(".pick-input")]
        .map(el => Number(el.value))
        .filter(n => n >= 1 && n <= 45);

      myNums = [...new Set(vals)].slice(0, 6).sort((a,b) => a-b);

      renderNumberSummary();
      renderMatchHistory();
      renderMyCard();

      if($("matchInput")) $("matchInput").value = myNums.join(" ");
      if($("matchBalls")) $("matchBalls").innerHTML = myNums.map(n => ball(n)).join("");
    });
  });
}
function renderNumberSummary(){
  if(!$("numberSummary"))return;
  const rows=calcHits(myNums,"all");const appear=rows.filter(x=>x.hitCount>=1||x.bonusHit).length;
  const recentIdx=rows.findIndex(x=>x.hitCount>=1||x.bonusHit);const miss=recentIdx>=0?recentIdx+1:"-";
  $("numberSummary").innerHTML=`<div class="summary-card"><div class="summary-top"><div><h3>내 예상번호 분석 요약</h3><div class="balls">${myNums.map(n=>ball(n)).join("")}</div></div></div><div class="summary-metrics"><div><b>${appear||"-"}</b><span>출현 횟수</span></div><div><b>${recentIdx>=0?miss+"회 전":"-"}</b><span>최근 출현</span></div><div><b>${miss}</b><span>미출현 기간</span></div><div><b>균형형</b><span>구간 분포</span></div><div><b>${myNums.length}개</b><span>분석 번호</span></div></div></div>`;
}
function renderMatchHistory(){
  if(!$("matchHistory"))return;
  const range=historyRange==="all"?"all":Number(historyRange);
  let rows=calcHits(myNums,range).filter(x=>x.hitCount>0||(includeBonus&&x.bonusHit)).slice(0,30);
  $("matchHistory").innerHTML=rows.map(x=>{
    const nums=x.numbers.map(n=>tinyBall(n,myNums.includes(Number(n))?"selected-ball":"")).join("");
    let tagText=x.hitCount+"개";if(includeBonus&&x.bonusHit)tagText+="+B";
    return `<div class="history-row"><div class="round-cell"><b>${x.round}회</b><span>${formatDate(x.date)}</span></div><div class="history-balls">${nums}</div><div>${tinyBall(x.bonus,includeBonus&&x.bonusHit?"selected-ball":"")}</div><div><span class="hit-tag ${x.hitCount>=3?"hit-win":"hit-none"}">${tagText}</span></div></div>`;
  }).join("")||`<div class="history-row"><div class="round-cell"><b>-</b><span>-</span></div><div>출현 이력이 없습니다.</div><div>-</div><div>-</div></div>`;
}
function analyzeMatch(){
  const input = $("matchInput");
  const text = input ? input.value : myNums.join(" ");
  const nums = [...new Set(String(text).replaceAll(",", " ").split(/\s+/).map(Number).filter(n => n >= 1 && n <= 45))].sort((a,b) => a-b);

  if(nums.length < 1){
    alert("1~45 사이 숫자를 1개 이상 입력하세요.");
    return;
  }

  myNums = nums.slice(0, 6);
  if($("matchInput")) $("matchInput").value = myNums.join(" ");
  if($("matchBalls")) $("matchBalls").innerHTML = myNums.map(n => ball(n)).join("");

  renderDetail();
  renderMyCard();
}

function dreamRecommend(){
  const keyword=$("dreamInput").value.trim()||"행운";const seed=[...keyword].reduce((s,ch)=>s+ch.charCodeAt(0),0);let nums=[];let x=seed;
  while(nums.length<6){x=(x*9301+49297)%233280;let n=x%45+1;if(!nums.includes(n))nums.push(n);}
  nums.sort((a,b)=>a-b);$("dreamResult").innerHTML=`<h3>${keyword} 꿈 추천번호</h3>${balls(nums)}<p class="note">꿈 키워드를 숫자로 변환한 개인용 추천입니다.</p>`;
}
function showPage(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));const target=$(page);if(target)target.classList.add("active");
  document.querySelectorAll(".tab,.bottom-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  const isDetail=page==="match";$("mainHeader").classList.toggle("hidden",isDetail);$("detailHeader").classList.toggle("hidden",!isDetail);$("bottomNav").classList.toggle("hidden",isDetail);
}
function bindEvents(){
  document.querySelectorAll(".tab,.bottom-btn").forEach(btn=>btn.addEventListener("click",()=>showPage(btn.dataset.page)));
  if($("backHome"))$("backHome").addEventListener("click",()=>showPage("home"));
  if($("searchBtn"))$("searchBtn").addEventListener("click",()=>{const r=Number($("roundInput").value);const item=lottoData.find(x=>Number(x.round)===r);if(item)$("statusBox").innerHTML=renderLatest(item);else alert("회차 정보를 찾을 수 없습니다.");});
  if($("moreBtn"))$("moreBtn").addEventListener("click",()=>{shownCount+=5;renderRecent();});
  if($("detailBtn"))$("detailBtn").addEventListener("click",()=>showPage("match"));
  if($("statRecommend"))$("statRecommend").addEventListener("click",()=>renderRecommend("stat"));
  if($("balanceRecommend"))$("balanceRecommend").addEventListener("click",()=>renderRecommend("balanced"));
  if($("balancedRecommend"))$("balancedRecommend").addEventListener("click",()=>renderRecommend("balanced"));
  if($("randomRecommend"))$("randomRecommend").addEventListener("click",()=>renderRecommend("random"));
  if($("matchBtn"))$("matchBtn").addEventListener("click",analyzeMatch);
  if($("dreamBtn"))$("dreamBtn").addEventListener("click",dreamRecommend);
  if($("includeBonus"))$("includeBonus").addEventListener("change",e=>{includeBonus=e.target.checked;renderMatchHistory();});
  document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");historyRange=btn.dataset.range;renderMatchHistory();}));
}
bindEvents();
loadData().catch(err=>{$("statusBox").innerHTML="lotto.json 파일을 불러오지 못했습니다. data/lotto.json 업로드와 GitHub Pages 반영을 확인하세요.";console.error(err);});
