let lottoData=[],selectedNums=[],matchRange=50,matchMode='partial';const $=id=>document.getElementById(id);

function colorClass(n){n=Number(n);if(n<=9)return'yellow';if(n<=19)return'blue';if(n<=29)return'red';if(n<=39)return'black';return'green'}
function ball(n,small=false,extra=''){return `<span class="ball ${small?'small-ball':''} ${extra} ${colorClass(n)}">${n}</span>`}
function tinyBall(n,extra=''){return `<span class="ball tiny-ball ${extra} ${colorClass(n)}">${n}</span>`}
function includeBonus(){return $('includeBonus')?$('includeBonus').checked:true}

function parseNums(){
  const raw=$('comboInput').value.trim();
  const nums=raw.split(/[\s,]+/).map(v=>Number(v)).filter(n=>Number.isInteger(n));
  const unique=[...new Set(nums)].sort((a,b)=>a-b);
  if(unique.length<2||unique.length>6){alert('번호는 2개 이상 6개 이하로 입력하세요.');return null}
  if(unique.some(n=>n<1||n>45)){alert('번호는 1부터 45 사이만 가능합니다.');return null}
  return unique;
}

function rowPool(row){return includeBonus()?[...(row.numbers||[]),row.bonus]:[...(row.numbers||[])]}
function hitInfo(row){
  const nums=row.numbers||[];
  const normal=selectedNums.filter(n=>nums.includes(n)).length;
  const bonus=selectedNums.includes(row.bonus);
  const total=normal+(includeBonus()&&bonus?1:0);
  return{normal,bonus,total};
}
function minHit(){
  if(matchMode==='exact')return selectedNums.length;
  if(selectedNums.length>=5)return 3;
  if(selectedNums.length===4)return 3;
  return selectedNums.length;
}
function sourceRows(){return matchRange==='all'?lottoData:lottoData.slice(0,Number(matchRange))}
function matchRowsFrom(rows,threshold=minHit()){
  return rows.map(row=>({row,hit:hitInfo(row)}))
    .filter(x=>x.hit.total>=threshold)
    .sort((a,b)=>b.hit.total-a.hit.total||b.row.round-a.row.round);
}
function allMatches(){return matchRowsFrom(lottoData)}
function rangeMatches(){return matchRowsFrom(sourceRows())}
function countByThreshold(threshold){return matchRowsFrom(lottoData,threshold).length}
function exactWinningRows(){
  if(selectedNums.length!==6)return[];
  const key=selectedNums.slice().sort((a,b)=>a-b).join(',');
  return lottoData.filter(row=>(row.numbers||[]).slice().sort((a,b)=>a-b).join(',')===key).sort((a,b)=>b.round-a.round);
}
function setStatusText(){
  const rule=matchMode==='exact'?'완전일치':'부분일치';
  $('status').textContent=`전체 ${lottoData.length}개 회차 데이터를 불러왔습니다. / 현재 기준: ${rule}`;
}

function renderSummary(){
  const matches=allMatches(),range=rangeMatches(),last=matches[0],gap=last?lottoData.findIndex(x=>x.round===last.row.round)+1:'-',exact=exactWinningRows(),threshold=minHit();
  let extra='';
  if(selectedNums.length>=4){
    extra=`<div><b>${countByThreshold(4)}회</b><span>4개 이상</span></div><div><b>${countByThreshold(5)}회</b><span>5개 이상</span></div>`;
  }else{
    extra=`<div><b>${threshold}개+</b><span>분석 기준</span></div><div><b>${includeBonus()?'포함':'제외'}</b><span>보너스</span></div>`;
  }
  $('summary').innerHTML=`<div class="combo-card">
    <b>${selectedNums.length}개 번호 조합 분석</b>
    <div class="combo-selected">${selectedNums.map(n=>ball(n)).join('')}</div>
    <p class="combo-guide">${matchMode==='exact'?'선택한 번호가 모두 동시에 나온 회차만 분석합니다.':'선택한 번호 중 '+threshold+'개 이상 나온 회차를 기준으로 분석합니다.'}</p>
    <div class="summary-metrics">
      <div><b>${matches.length}회</b><span>전체 출현</span></div>
      <div><b>${range.length}회</b><span>현재 범위</span></div>
      <div><b>${last?last.row.round+'회':'-'}</b><span>최근 출현</span></div>
      <div><b>${gap}</b><span>미출현 기간</span></div>
      ${extra}
      <div><b>${selectedNums.length===6?exact.length+'회':'해당없음'}</b><span>완전일치</span></div>
    </div>
  </div>`;
}

function companionAnalysis(){
  const rows=rangeMatches(),counts={};
  for(let i=1;i<=45;i++)counts[i]=0;
  rows.forEach(x=>{rowPool(x.row).forEach(n=>{if(!selectedNums.includes(n))counts[n]++})});
  const top=Object.entries(counts).map(([n,c])=>({n:Number(n),count:c}))
    .filter(x=>x.count>0)
    .sort((a,b)=>b.count-a.count||a.n-b.n)
    .slice(0,12);
  return{rows,top,recommend:top.slice(0,3).map(x=>x.n),counts};
}

function combinationScore(nums,counts,rows){
  let score=0;
  nums.forEach(n=>score+=(counts[n]||0));
  const zones=[0,0,0,0,0];
  nums.forEach(n=>{if(n<=9)zones[0]++;else if(n<=19)zones[1]++;else if(n<=29)zones[2]++;else if(n<=39)zones[3]++;else zones[4]++});
  const odd=nums.filter(n=>n%2===1).length;
  const even=6-odd;
  const zoneUsed=zones.filter(x=>x>0).length;
  if(zoneUsed>=4)score+=3;
  if(Math.abs(odd-even)<=2)score+=3;
  rows.slice(0,20).forEach(x=>{
    const pool=x.row.numbers||[];
    const hit=nums.filter(n=>pool.includes(n)).length;
    if(hit>=3)score+=hit;
  });
  return score;
}
function makeFinalCombos(data){
  const pool=data.top.map(x=>x.n).filter(n=>!selectedNums.includes(n));
  const base=selectedNums.slice(0,6);
  const need=Math.max(0,6-base.length);
  if(need===0)return [{nums:base.slice().sort((a,b)=>a-b),score:100,label:'선택번호 6개'}];
  if(pool.length<need)return [];

  const combos=[];
  function pick(start,arr){
    if(arr.length===need){
      const nums=[...base,...arr].sort((a,b)=>a-b);
      combos.push({nums,score:combinationScore(nums,data.counts,data.rows)});
      return;
    }
    for(let i=start;i<pool.length;i++)pick(i+1,[...arr,pool[i]]);
  }
  pick(0,[]);
  combos.sort((a,b)=>b.score-a.score||a.nums.join('').localeCompare(b.nums.join('')));
  return combos.slice(0,3).map((x,i)=>({...x,label:['추천 A','추천 B','추천 C'][i]}));
}
function renderFinalCombos(data){
  const combos=makeFinalCombos(data);
  if(!combos.length)return `<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🎯 추천조합 생성</b><p class="combo-guide">6개 조합을 만들 만큼 동반번호가 부족합니다. 전체 회차로 바꿔보세요.</p></div>`;
  return `<div class="combo-card" style="margin:10px 0;background:#fff7e6">
    <b>🎯 추천조합 생성</b>
    <p class="combo-guide">선택번호와 동반번호를 조합해 6개 후보조합을 만들었습니다.</p>
    ${combos.map(c=>{
      const trust=Math.max(55,Math.min(95,Math.round(c.score*3)));
      return `<div style="border-top:1px solid #f2e6c9;padding:10px 0">
        <b style="color:#8a5b00">${c.label} · 신뢰도 ${trust}%</b>
        <div class="combo-selected">${c.nums.map(n=>ball(n,true)).join('')}</div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderCompanion(){
  const data=companionAnalysis(),max=data.top.length?data.top[0].count:1,threshold=minHit();
  let html=`<div class="combo-card">
    <b>🤝 동반번호 추천</b>
    <p class="combo-guide">${selectedNums.map(n=>n+'번').join(', ')} 기준으로, ${threshold}개 이상 함께 나온 회차에서 추가 번호를 집계했습니다.</p>`;
  if(data.recommend.length){
    html+=`<div class="combo-card" style="margin:10px 0;background:#f0f7ff">
      <b>AI 추천 동반번호</b>
      <div class="combo-selected">${data.recommend.map(n=>ball(n,true)).join('')}</div>
      <p class="combo-guide">현재 선택번호 + 추천 동반번호를 조합해 후보번호로 사용할 수 있습니다.</p>
    </div>`;
    html+=renderFinalCombos(data);
  }else{
    html+=`<p class="combo-guide">현재 범위에서는 추천할 동반번호가 없습니다. 전체 회차로 바꿔보세요.</p>`;
  }
  html+=data.top.length?data.top.slice(0,10).map(x=>{
    const w=Math.max(8,Math.round(x.count/max*100));
    return `<div class="companion-row"><div>${ball(x.n,true)}</div><div class="companion-bar"><i style="width:${w}%"></i></div><div class="companion-count">${x.count}회</div></div>`;
  }).join(''):`<div class="combo-guide">동반출현 기록이 없습니다.</div>`;
  html+=`<p class="combo-guide">분석 기준: 조건을 만족한 ${data.rows.length}개 회차에서 추가 번호를 집계했습니다.</p></div>`;
  $('companion').innerHTML=html;
}

function renderHistory(){
  const matches=rangeMatches();
  if(!matches.length){$('history').innerHTML=`<div class="combo-card center">조건에 맞는 회차가 없습니다.</div>`;return}
  $('history').innerHTML=matches.map(x=>{
    const row=x.row,hit=x.hit,tag=`${hit.normal}${hit.bonus&&includeBonus()?'+B':''}개`,nums=row.numbers.map(n=>tinyBall(n,selectedNums.includes(n)?'selected-ball':'')).join('');
    return `<div class="combo-row"><div class="round-cell"><b>${row.round}회</b><span>${row.date}</span></div><div>${String(row.date).slice(5)}</div><div class="history-balls">${nums}</div><div>${tinyBall(row.bonus,selectedNums.includes(row.bonus)?'selected-ball':'')}</div><div><span class="hit-tag">${tag}</span></div></div>`;
  }).join('');
}
function renderAll(){if(!selectedNums.length)return;setStatusText();renderSummary();renderCompanion();renderHistory()}

async function loadData(){
  try{
    const res=await fetch('./data/lotto.json?ts='+Date.now());
    const data=await res.json();
    if(!Array.isArray(data))throw new Error('lotto.json 배열 아님');
    lottoData=data.sort((a,b)=>b.round-a.round);
    $('status').textContent=`전체 ${lottoData.length}개 회차 데이터를 불러왔습니다.`;
    const saved=JSON.parse(localStorage.getItem('haengun_my_nums')||'null');
    if(Array.isArray(saved)&&saved.length>=2){selectedNums=saved.slice(0,6).sort((a,b)=>a-b);$('comboInput').value=selectedNums.join(' ');renderAll()}
  }catch(e){console.error(e);$('status').textContent='데이터 오류: data/lotto.json을 읽지 못했습니다.'}
}

function addModeButtons(){
  const box=document.querySelector('.combo-btn-row');
  if(!box||document.getElementById('modePartial'))return;
  const wrap=document.createElement('div');
  wrap.className='combo-btn-row';
  wrap.innerHTML=`<button id="modePartial" class="active">부분일치</button><button id="modeExact">완전일치</button>`;
  box.insertAdjacentElement('afterend',wrap);
  $('modePartial').onclick=()=>{matchMode='partial';$('modePartial').classList.add('active');$('modeExact').classList.remove('active');renderAll()};
  $('modeExact').onclick=()=>{matchMode='exact';$('modeExact').classList.add('active');$('modePartial').classList.remove('active');renderAll()};
}

function bindEvents(){
  $('analyzeBtn').onclick=()=>{const nums=parseNums();if(!nums)return;selectedNums=nums;renderAll()};
  document.querySelectorAll('.range-btn').forEach(btn=>{btn.onclick=()=>{document.querySelectorAll('.range-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');matchRange=btn.dataset.range;renderAll()}});
  $('includeBonus').onchange=()=>renderAll();
  addModeButtons();
}
bindEvents();loadData();
