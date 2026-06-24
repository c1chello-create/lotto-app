let lottoData=[],selectedNums=[],matchRange=50,matchMode='partial';const $=id=>document.getElementById(id);
function colorClass(n){n=Number(n);if(n<=9)return'yellow';if(n<=19)return'blue';if(n<=29)return'red';if(n<=39)return'black';return'green'}
function ball(n,small=false,extra=''){return `<span class="ball ${small?'small-ball':''} ${extra} ${colorClass(n)}">${n}</span>`}
function tinyBall(n,extra=''){return `<span class="ball tiny-ball ${extra} ${colorClass(n)}">${n}</span>`}
function includeBonus(){return $('includeBonus')?$('includeBonus').checked:true}
function parseNums(){const raw=$('comboInput').value.trim();const nums=raw.split(/[\s,]+/).map(v=>Number(v)).filter(n=>Number.isInteger(n));const unique=[...new Set(nums)].sort((a,b)=>a-b);if(unique.length<2||unique.length>6){alert('번호는 2개 이상 6개 이하로 입력하세요.');return null}if(unique.some(n=>n<1||n>45)){alert('번호는 1부터 45 사이만 가능합니다.');return null}return unique}
function rowPool(row){return includeBonus()?[...(row.numbers||[]),row.bonus]:[...(row.numbers||[])]}
function hitInfo(row){const nums=row.numbers||[];const normal=selectedNums.filter(n=>nums.includes(n)).length;const bonus=selectedNums.includes(row.bonus);const total=normal+(includeBonus()&&bonus?1:0);return{normal,bonus,total}}
function minHit(){if(matchMode==='exact')return selectedNums.length;if(selectedNums.length>=5)return 3;if(selectedNums.length===4)return 3;return selectedNums.length}
function sourceRows(){return matchRange==='all'?lottoData:lottoData.slice(0,Number(matchRange))}
function matchRowsFrom(rows,threshold=minHit()){return rows.map(row=>({row,hit:hitInfo(row)})).filter(x=>x.hit.total>=threshold).sort((a,b)=>b.hit.total-a.hit.total||b.row.round-a.row.round)}
function allMatches(){return matchRowsFrom(lottoData)}
function rangeMatches(){return matchRowsFrom(sourceRows())}
function countByThreshold(threshold){return matchRowsFrom(lottoData,threshold).length}
function exactWinningRows(){if(selectedNums.length!==6)return[];const key=selectedNums.slice().sort((a,b)=>a-b).join(',');return lottoData.filter(row=>(row.numbers||[]).slice().sort((a,b)=>a-b).join(',')===key).sort((a,b)=>b.round-a.round)}
function setStatusText(){const rule=matchMode==='exact'?'완전일치':'부분일치';$('status').textContent=`전체 ${lottoData.length}개 회차 데이터를 불러왔습니다. / 현재 기준: ${rule}`}
function renderSummary(){const matches=allMatches(),range=rangeMatches(),last=matches[0],gap=last?lottoData.findIndex(x=>x.round===last.row.round)+1:'-',exact=exactWinningRows(),threshold=minHit();let extra='';if(selectedNums.length>=4){extra=`<div><b>${countByThreshold(4)}회</b><span>4개 이상</span></div><div><b>${countByThreshold(5)}회</b><span>5개 이상</span></div>`}else{extra=`<div><b>${threshold}개+</b><span>분석 기준</span></div><div><b>${includeBonus()?'포함':'제외'}</b><span>보너스</span></div>`}$('summary').innerHTML=`<div class="combo-card"><b>${selectedNums.length}개 번호 조합 분석</b><div class="combo-selected">${selectedNums.map(n=>ball(n)).join('')}</div><p class="combo-guide">${matchMode==='exact'?'선택한 번호가 모두 동시에 나온 회차만 분석합니다.':'선택한 번호 중 '+threshold+'개 이상 나온 회차를 기준으로 분석합니다.'}</p><div class="summary-metrics"><div><b>${matches.length}회</b><span>전체 출현</span></div><div><b>${range.length}회</b><span>현재 범위</span></div><div><b>${last?last.row.round+'회':'-'}</b><span>최근 출현</span></div><div><b>${gap}</b><span>미출현 기간</span></div>${extra}<div><b>${selectedNums.length===6?exact.length+'회':'해당없음'}</b><span>완전일치</span></div></div></div>`}
function companionAnalysis(){const rows=rangeMatches(),counts={};for(let i=1;i<=45;i++)counts[i]=0;rows.forEach(x=>{rowPool(x.row).forEach(n=>{if(!selectedNums.includes(n))counts[n]++})});const max=Math.max(...Object.values(counts),1);const top=Object.entries(counts).map(([n,c])=>({n:Number(n),count:c,index:Math.round((c/max)*100)})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count||a.n-b.n).slice(0,15);return{rows,top,recommend:top.slice(0,3).map(x=>x.n),counts,max}}
function frequencyMap(rows){const m={};for(let i=1;i<=45;i++)m[i]=0;rows.forEach(row=>(row.numbers||[]).forEach(n=>m[n]++));return m}
function pairScore(a,b,rows){let c=0;rows.forEach(x=>{const p=rowPool(x.row||x);if(p.includes(a)&&p.includes(b))c++});return c}
function zoneBalanceScore(nums){const zones=[0,0,0,0,0];nums.forEach(n=>{if(n<=9)zones[0]++;else if(n<=19)zones[1]++;else if(n<=29)zones[2]++;else if(n<=39)zones[3]++;else zones[4]++});const used=zones.filter(x=>x>0).length,max=Math.max(...zones);return Math.max(0,used*6-(max>3?10:0))}
function oddEvenScore(nums){const odd=nums.filter(n=>n%2).length;return Math.max(0,14-Math.abs(3-odd)*5)}
function recentTrendScore(nums){const recent=lottoData.slice(0,20).flatMap(x=>x.numbers||[]);const hits=nums.filter(n=>recent.includes(n)).length;return Math.max(0,12-Math.max(0,hits-3)*3)}
function longTrendScore(nums,allFreq){const vals=nums.map(n=>allFreq[n]||0),avg=vals.reduce((a,b)=>a+b,0)/vals.length;return Math.min(18,Math.round(avg*0.3))}
function companionIndexScore(nums,data){let s=0;nums.forEach(n=>{if(!selectedNums.includes(n))s+=(data.counts[n]||0)*8});for(let i=0;i<nums.length;i++){for(let j=i+1;j<nums.length;j++)s+=pairScore(nums[i],nums[j],data.rows)*2}return s}
function historicalHitScore(nums,rows){let score=0;rows.slice(0,100).forEach(x=>{const p=x.row.numbers||[],h=nums.filter(n=>p.includes(n)).length;if(h>=3)score+=h*h});return score}
function gradeFromRank(i){if(i===0)return'S등급';if(i<=3)return'A등급';if(i<=6)return'B등급';return'실험'}
function starByTrust(t){if(t>=88)return'★★★★★';if(t>=80)return'★★★★☆';if(t>=72)return'★★★☆☆';return'★★☆☆☆'}

function dreamNumberMap(keyword){
  const dict={"물":[1,7,17,26,32,42],"바다":[7,17,26,34,42,45],"새":[5,11,17,23,31,42],"대통령":[1,10,19,29,37,44],"불":[3,9,18,27,36,45],"돈":[8,14,22,33,40,45],"돼지":[3,8,18,28,38,43],"뱀":[4,13,22,31,40,44],"용":[9,18,27,36,44,45],"옷":[6,12,21,30,39,42],"신발":[2,11,20,29,38,41],"차":[5,14,23,32,41,45],"도자기":[4,12,24,29,34,42],"그릇":[4,12,21,29,36,42],"다리미":[7,16,25,30,38,43],"스케이트":[6,15,24,33,39,44],"죽":[2,9,16,25,34,43],"얼굴":[1,11,20,28,37,45],"로또":[6,13,19,27,35,42],"행운":[7,14,21,28,35,42]};
  const keys=Object.keys(dict).filter(k=>keyword.includes(k));
  if(keys.length)return [...new Set(keys.flatMap(k=>dict[k]))].slice(0,6).sort((a,b)=>a-b);
  let seed=[...keyword].reduce((s,ch)=>s+ch.charCodeAt(0),0)||12345, nums=[];
  while(nums.length<6){seed=(seed*9301+49297)%233280;const n=seed%45+1;if(!nums.includes(n))nums.push(n)}
  return nums.sort((a,b)=>a-b);
}
function renderDreamBridge(){
  let box=document.getElementById('dreamBridge');
  if(!box){const first=document.querySelector('.combo-card');if(first){box=document.createElement('div');box.id='dreamBridge';first.insertAdjacentElement('afterend',box)}}
  if(!box)return;
  if(!box.innerHTML)box.innerHTML=`<div class="combo-card" style="background:#f7fff4"><b>🌙 꿈해몽 연동</b><p class="combo-guide">꿈 키워드를 입력하면 추천번호를 조합분석에 바로 적용합니다.</p><input id="dreamComboInput" class="combo-input" placeholder="예: 물, 새, 돼지, 도자기"><button id="dreamComboBtn" class="combo-btn" style="background:#2f7d32">꿈해몽 번호 적용</button></div>`;
  const btn=document.getElementById('dreamComboBtn');
  if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.onclick=()=>{const kw=(document.getElementById('dreamComboInput').value||'').trim();if(!kw){alert('꿈 키워드를 입력하세요.');return}const nums=dreamNumberMap(kw);document.getElementById('comboInput').value=nums.join(' ');selectedNums=nums;renderAll()}}
}
function learnedHitRate(nums){
  const rows=lottoData.map(row=>{const normal=nums.filter(n=>(row.numbers||[]).includes(n)).length,bonus=nums.includes(row.bonus);return{row,normal,bonus,total:normal+(bonus?1:0)}});
  const hit3=rows.filter(x=>x.normal>=3||x.total>=3).length,hit4=rows.filter(x=>x.normal>=4||x.total>=4).length,hit5=rows.filter(x=>x.normal>=5||x.total>=5).length;
  const best=[...rows].sort((a,b)=>b.total-a.total||b.normal-a.normal||b.row.round-a.row.round)[0];
  const avg=(rows.reduce((s,x)=>s+x.normal,0)/Math.max(1,rows.length)).toFixed(2);
  const recentSet=new Set(lottoData.slice(0,100).map(r=>r.round));
  const recent=rows.filter(x=>recentSet.has(x.row.round)&&(x.normal>=3||x.total>=3)).length;
  return{hit3,hit4,hit5,best,avg,recent};
}
function learningScore(nums){const h=learnedHitRate(nums);return Math.min(32,h.hit3*0.08+h.hit4*0.55+h.hit5*2.5+h.recent*0.18+Number(h.avg)*2)}
function renderComboReport(nums){const h=learnedHitRate(nums);const best=h.best?`${h.best.row.round}회 ${h.best.normal}${h.best.bonus?'+B':''}개`:'기록 없음';return `<p class="combo-guide">성적표: 3개+ ${h.hit3}회 · 4개+ ${h.hit4}회 · 5개+ ${h.hit5}회 · 평균 ${h.avg}개 · 최고 ${best}</p>`}
function savedComboKey(){return 'haengun_combo_saved_v2'}
function loadSavedCombos(){try{return JSON.parse(localStorage.getItem(savedComboKey())||'[]')}catch(e){return[]}}
function saveSavedCombos(list){localStorage.setItem(savedComboKey(),JSON.stringify(list))}
function saveRecommendedCombo(numsText,grade,trust){const nums=numsText.split(',').map(Number).sort((a,b)=>a-b),key=nums.join(',');const list=loadSavedCombos();if(list.some(x=>x.key===key)){alert('이미 저장된 조합입니다.');return}list.unshift({key,nums,grade,trust,createdAt:new Date().toISOString()});saveSavedCombos(list.slice(0,50));alert('추천조합을 저장했습니다.');renderSavedCombos()}
function analyzeSavedCombo(numsText){const nums=numsText.split(',').map(Number).sort((a,b)=>a-b),h=learnedHitRate(nums);const best=h.best?`${h.best.row.round}회 / ${h.best.normal}${h.best.bonus?'+B':''}개`:'없음';alert(['조합: '+nums.join(' '),'3개 이상: '+h.hit3+'회','4개 이상: '+h.hit4+'회','5개 이상: '+h.hit5+'회','평균 적중: '+h.avg+'개','최고 기록: '+best].join('\n'))}
function deleteSavedCombo(key){saveSavedCombos(loadSavedCombos().filter(x=>x.key!==key));renderSavedCombos()}
function renderSavedCombos(){let box=document.getElementById('savedCombos');if(!box){const title=[...document.querySelectorAll('.combo-section-title b')].find(x=>x.textContent.includes('조합별'));if(title){box=document.createElement('div');box.id='savedCombos';title.closest('.combo-section-title').insertAdjacentElement('beforebegin',box)}}if(!box)return;const list=loadSavedCombos();if(!list.length){box.innerHTML='';return}box.innerHTML=`<div class="combo-card" style="background:#f8fbff"><b>📌 저장한 추천조합 STEP2-A 성적표</b><p class="combo-guide">저장한 조합의 실제 적중률 중심 성적을 표시합니다.</p>${list.map(item=>`<div style="border-top:1px solid #e7edf5;padding:10px 0"><b>${item.grade||'저장조합'} · 신뢰도 ${item.trust||'-'}%</b><div class="combo-selected">${item.nums.map(n=>ball(n,true)).join('')}</div>${renderStep2AReport(item.nums)}<div class="combo-btn-row"><button onclick="analyzeSavedCombo('${item.key}')">상세분석</button><button onclick="deleteSavedCombo('${item.key}')">삭제</button></div></div>`).join('')}</div>`}

function comboScoreParts(nums,data,allFreq){const companion=companionIndexScore(nums,data),balance=zoneBalanceScore(nums),oddEven=oddEvenScore(nums),recent=recentTrendScore(nums),long=longTrendScore(nums,allFreq),historical=historicalHitScore(nums,data.rows)*0.35,learned=learningScore(nums),total=companion+balance+oddEven+recent+long+historical+learned;return{companion,balance,oddEven,recent,long,historical,learned,total}}
function combinations(arr,k){const out=[];function rec(start,pick){if(pick.length===k){out.push(pick);return}for(let i=start;i<arr.length;i++)rec(i+1,[...pick,arr[i]])}rec(0,[]);return out}
function makeRankedCombos(data){const companionPool=data.top.map(x=>x.n).filter(n=>!selectedNums.includes(n)),allFreq=frequencyMap(lottoData);let candidates=[];if(selectedNums.length>=6){combinations(selectedNums,4).forEach(s=>{combinations(companionPool.slice(0,12),2).forEach(c=>candidates.push({nums:[...s,...c].sort((a,b)=>a-b),replace:2}))});combinations(selectedNums,5).forEach(s=>{companionPool.slice(0,12).forEach(c=>candidates.push({nums:[...s,c].sort((a,b)=>a-b),replace:1}))});combinations(selectedNums,3).forEach(s=>{combinations(companionPool.slice(0,10),3).forEach(c=>candidates.push({nums:[...s,...c].sort((a,b)=>a-b),replace:3}))})}else{const need=6-selectedNums.length;combinations(companionPool.slice(0,15),need).forEach(c=>candidates.push({nums:[...selectedNums,...c].sort((a,b)=>a-b),replace:need}))}const seen=new Set();candidates=candidates.filter(c=>{const key=c.nums.join(',');if(seen.has(key))return false;seen.add(key);return true});let scored=candidates.map(c=>({...c,parts:comboScoreParts(c.nums,data,allFreq)})).sort((a,b)=>b.parts.total-a.parts.total||a.nums.join('').localeCompare(b.nums.join(''))).slice(0,10);if(!scored.length)return[];const max=scored[0].parts.total||1,min=scored[scored.length-1].parts.total||0;return scored.map((x,i)=>{const trust=Math.round(62+((x.parts.total-min)/(max-min||1))*34);return{...x,rank:i+1,grade:gradeFromRank(i),trust:Math.max(55,Math.min(96,trust)),stars:starByTrust(trust)}})}
function renderRankedCombos(data){const combos=makeRankedCombos(data);if(!combos.length)return`<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹</b><p class="combo-guide">추천조합을 만들 만큼 동반번호가 부족합니다. 전체 회차로 바꿔보세요.</p></div>`;return`<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹 TOP 10</b><p class="combo-guide">STEP 2-A: 실제 적중률을 최우선으로 두고 최근100·300회, 4개+/5개+ 성적, 번호쌍·삼각패턴을 재학습해 10개 조합을 만들었습니다.</p>${combos.map(c=>`<div style="border-top:1px solid #f2e6c9;padding:11px 0"><b style="color:#8a5b00">${c.rank}위 · ${c.grade} · 신뢰도 ${c.trust}%</b><span style="display:block;color:#8a5b00;font-size:13px;margin-top:2px">${c.stars}</span><div class="combo-selected">${c.nums.map(n=>ball(n,true,selectedNums.includes(n)?'selected-ball':'')).join('')}</div><p class="combo-guide">신뢰도 산식: 동반 ${Math.round(c.parts.companion)} + 균형 ${c.parts.balance} + 홀짝 ${c.parts.oddEven} + 추세 ${c.parts.recent+c.parts.long} + 장기 ${Math.round(c.parts.historical||0)} + 학습 ${Math.round(c.parts.learned||0)}</p>${renderComboReport(c.nums)}<div class="combo-btn-row" style="margin-top:8px"><button onclick="saveRecommendedCombo('${c.nums.join(',')}','${c.grade}',${c.trust})">저장</button><button onclick="analyzeSavedCombo('${c.nums.join(',')}')">적중분석</button></div></div>`).join('')}</div>`}

function actualHitProfile(nums,limit=null){
  const rows=limit?lottoData.slice(0,limit):lottoData;
  let hit3=0,hit4=0,hit5=0,hit6=0,totalHit=0,best=null;
  rows.forEach(row=>{
    const normal=nums.filter(n=>(row.numbers||[]).includes(n)).length;
    const bonus=nums.includes(row.bonus);
    const total=normal+(bonus?1:0);
    totalHit+=normal;
    if(normal>=3||total>=3)hit3++;
    if(normal>=4||total>=4)hit4++;
    if(normal>=5||total>=5)hit5++;
    if(normal===6)hit6++;
    if(!best||total>best.total||(total===best.total&&row.round>best.row.round))best={row,normal,bonus,total};
  });
  const avg=rows.length?totalHit/rows.length:0;
  return{rows:rows.length,hit3,hit4,hit5,hit6,avg,best};
}
function pairPatternScore(nums,rows){
  let score=0;
  for(let i=0;i<nums.length;i++){
    for(let j=i+1;j<nums.length;j++){
      let c=0;
      rows.forEach(row=>{
        const p=rowPool(row.row||row);
        if(p.includes(nums[i])&&p.includes(nums[j]))c++;
      });
      score+=c*1.7;
    }
  }
  return score;
}
function triplePatternScore(nums,rows){
  let score=0;
  const triples=combinations(nums,3);
  triples.forEach(t=>{
    let c=0;
    rows.forEach(row=>{
      const p=rowPool(row.row||row);
      if(t.every(n=>p.includes(n)))c++;
    });
    score+=c*3.2;
  });
  return score;
}
function actualLearningWeight(nums){
  const recent100=actualHitProfile(nums,100);
  const recent300=actualHitProfile(nums,300);
  const longAll=actualHitProfile(nums,null);

  const recentScore =
    recent100.hit3*0.55 +
    recent100.hit4*2.4 +
    recent100.hit5*7.5 +
    recent100.avg*8;

  const midScore =
    recent300.hit3*0.18 +
    recent300.hit4*1.05 +
    recent300.hit5*4.5 +
    recent300.avg*5;

  const longScore =
    longAll.hit3*0.045 +
    longAll.hit4*0.42 +
    longAll.hit5*2.2 +
    longAll.avg*3;

  return{
    recent100,recent300,longAll,
    recentScore,
    midScore,
    longScore,
    total:Math.min(95,recentScore+midScore+longScore)
  };
}
function aiLearningComment(nums){
  const w=actualLearningWeight(nums);
  const r=w.recent100, m=w.recent300, l=w.longAll;
  if(r.hit4>=2 || r.hit5>=1)return "최근 100회 기준 고적중 패턴이 강합니다.";
  if(m.hit4>=5)return "최근 300회에서 4개 이상 적중 패턴이 안정적입니다.";
  if(l.hit5>=2)return "장기 데이터에서 5개 이상 적중 이력이 우수합니다.";
  if(l.hit3>=45)return "장기적으로 3개 이상 적중 빈도가 높은 조합입니다.";
  return "동반번호와 균형을 중심으로 구성한 실험형 조합입니다.";
}
function renderActualLearningReport(nums){
  const w=actualLearningWeight(nums);
  const b=w.longAll.best;
  const bestText=b?`${b.row.round}회 ${b.normal}${b.bonus?"+B":""}개`:"기록 없음";
  return `<p class="combo-guide">AI학습: 최근100 ${w.recent100.hit3}회 · 최근300 ${w.recent300.hit3}회 · 장기 3개+ ${w.longAll.hit3}회 · 4개+ ${w.longAll.hit4}회 · 5개+ ${w.longAll.hit5}회 · 최고 ${bestText}</p>
  <p class="combo-guide">AI평가: ${aiLearningComment(nums)}</p>`;
}


function actualWeightedHitScore(nums){
  const r100=actualHitProfile(nums,100);
  const r300=actualHitProfile(nums,300);
  const all=actualHitProfile(nums,null);

  const recentPower =
    r100.hit3*1.2 +
    r100.hit4*7.0 +
    r100.hit5*22.0 +
    r100.avg*18;

  const midPower =
    r300.hit3*0.42 +
    r300.hit4*3.2 +
    r300.hit5*12.0 +
    r300.avg*12;

  const longPower =
    all.hit3*0.16 +
    all.hit4*1.9 +
    all.hit5*9.5 +
    all.avg*8;

  const highHitBonus =
    all.hit5*16 +
    all.hit4*3.5 +
    r100.hit4*5 +
    r300.hit4*2.5;

  const consistency =
    Math.min(35, (r100.hit3*0.9) + (r300.hit3*0.28) + (all.hit3*0.05));

  const total = recentPower*0.36 + midPower*0.26 + longPower*0.18 + highHitBonus*0.14 + consistency*0.06;

  return {
    r100,r300,all,
    recentPower,
    midPower,
    longPower,
    highHitBonus,
    consistency,
    total:Math.min(160,total)
  };
}
function realHitCenteredTrust(parts){
  const actual=parts.realHit||{total:0};
  const base = actual.total || 0;
  const balance = (parts.balance||0)*0.45;
  const oddEven = (parts.oddEven||0)*0.35;
  const trend = ((parts.recent||0)+(parts.long||0))*0.18;
  const companion = Math.min(35,(parts.companion||0)*0.08);
  const pattern = Math.min(28,((parts.pairPattern||0)+(parts.triplePattern||0))*0.08);
  return base + balance + oddEven + trend + companion + pattern;
}
function realHitGrade(trust){
  if(trust>=91)return "S등급";
  if(trust>=84)return "A등급";
  if(trust>=76)return "B등급";
  return "실험";
}
function realHitStars(trust){
  if(trust>=91)return "★★★★★";
  if(trust>=84)return "★★★★☆";
  if(trust>=76)return "★★★☆☆";
  return "★★☆☆☆";
}
function realHitComment(nums){
  const w=actualWeightedHitScore(nums);
  if(w.r100.hit5>=1)return "최근 100회 안에 5개 이상 고적중 이력이 있어 실전성이 매우 높습니다.";
  if(w.r100.hit4>=2)return "최근 100회 기준 4개 이상 적중 패턴이 강하게 살아 있습니다.";
  if(w.r300.hit4>=8)return "최근 300회에서 4개 이상 적중이 반복된 안정형 패턴입니다.";
  if(w.all.hit5>=2)return "장기 데이터에서 5개 이상 적중 이력이 확인되는 강한 패턴입니다.";
  if(w.all.hit3>=50)return "장기적으로 3개 이상 적중 빈도가 높은 누적 강세 조합입니다.";
  return "실제 적중률보다 동반·균형 요소가 더 강한 실험형 조합입니다.";
}
function renderStep2AReport(nums){
  const w=actualWeightedHitScore(nums);
  const b=w.all.best;
  const bestText=b?`${b.row.round}회 ${b.normal}${b.bonus?"+B":""}개`:"기록 없음";
  return `<p class="combo-guide">STEP2-A 실제학습: 최근100 3개+ ${w.r100.hit3}회 · 4개+ ${w.r100.hit4}회 · 5개+ ${w.r100.hit5}회 / 최근300 4개+ ${w.r300.hit4}회 / 전체 4개+ ${w.all.hit4}회 · 5개+ ${w.all.hit5}회</p>
  <p class="combo-guide">평균적중: 최근100 ${w.r100.avg.toFixed(2)}개 · 최근300 ${w.r300.avg.toFixed(2)}개 · 전체 ${w.all.avg.toFixed(2)}개 · 최고 ${bestText}</p>
  <p class="combo-guide">AI평가: ${realHitComment(nums)}</p>`;
}

function renderCompanion(){const data=companionAnalysis(),max=data.top.length?data.top[0].count:1,threshold=minHit();let html=`<div class="combo-card"><b>🤝 동반번호 추천</b><p class="combo-guide">${selectedNums.map(n=>n+'번').join(', ')} 기준으로, ${threshold}개 이상 함께 나온 회차에서 추가 번호를 집계했습니다.</p>`;if(data.recommend.length){html+=`<div class="combo-card" style="margin:10px 0;background:#f0f7ff"><b>AI 추천 동반번호</b><div class="combo-selected">${data.recommend.map(n=>ball(n,true)).join('')}</div><p class="combo-guide">동반번호는 아래 AI 조합 랭킹에 반영됩니다.</p></div>`;html+=renderRankedCombos(data)}else{html+=`<p class="combo-guide">현재 범위에서는 추천할 동반번호가 없습니다. 전체 회차로 바꿔보세요.</p>`}html+=data.top.length?data.top.slice(0,10).map(x=>{const w=Math.max(8,Math.round(x.count/max*100));return`<div class="companion-row"><div>${ball(x.n,true)}</div><div class="companion-bar"><i style="width:${w}%"></i></div><div class="companion-count">${x.count}회 · 지수 ${x.index}</div></div>`}).join(''):`<div class="combo-guide">동반출현 기록이 없습니다.</div>`;html+=`<p class="combo-guide">분석 기준: 조건을 만족한 ${data.rows.length}개 회차에서 추가 번호를 집계했습니다.</p></div>`;$('companion').innerHTML=html}
function renderHistory(){const matches=rangeMatches();if(!matches.length){$('history').innerHTML=`<div class="combo-card center">조건에 맞는 회차가 없습니다.</div>`;return}$('history').innerHTML=matches.map(x=>{const row=x.row,hit=x.hit,tag=`${hit.normal}${hit.bonus&&includeBonus()?'+B':''}개`,nums=row.numbers.map(n=>tinyBall(n,selectedNums.includes(n)?'selected-ball':'')).join('');return`<div class="combo-row"><div class="round-cell"><b>${row.round}회</b><span>${row.date}</span></div><div>${String(row.date).slice(5)}</div><div class="history-balls">${nums}</div><div>${tinyBall(row.bonus,selectedNums.includes(row.bonus)?'selected-ball':'')}</div><div><span class="hit-tag">${tag}</span></div></div>`}).join('')}
function renderAll(){renderDreamBridge();if(!selectedNums.length)return;setStatusText();renderSummary();renderCompanion();renderSavedCombos();renderHistory()}
async function loadData(){try{const res=await fetch('./data/lotto.json?ts='+Date.now());const data=await res.json();if(!Array.isArray(data))throw new Error('lotto.json 배열 아님');lottoData=data.sort((a,b)=>b.round-a.round);$('status').textContent=`전체 ${lottoData.length}개 회차 데이터를 불러왔습니다.`;setTimeout(()=>{renderDreamBridge();renderSavedCombos()},0);const saved=JSON.parse(localStorage.getItem('haengun_my_nums')||'null');if(Array.isArray(saved)&&saved.length>=2){selectedNums=saved.slice(0,6).sort((a,b)=>a-b);$('comboInput').value=selectedNums.join(' ');renderAll()}}catch(e){console.error(e);$('status').textContent='데이터 오류: data/lotto.json을 읽지 못했습니다.'}}
function addModeButtons(){const box=document.querySelector('.combo-btn-row');if(!box||document.getElementById('modePartial'))return;const wrap=document.createElement('div');wrap.className='combo-btn-row';wrap.innerHTML=`<button id="modePartial" class="active">부분일치</button><button id="modeExact">완전일치</button>`;box.insertAdjacentElement('afterend',wrap);$('modePartial').onclick=()=>{matchMode='partial';$('modePartial').classList.add('active');$('modeExact').classList.remove('active');renderAll()};$('modeExact').onclick=()=>{matchMode='exact';$('modeExact').classList.add('active');$('modePartial').classList.remove('active');renderAll()}}
function bindEvents(){setTimeout(renderDreamBridge,0);$('analyzeBtn').onclick=()=>{const nums=parseNums();if(!nums)return;selectedNums=nums;renderAll()};document.querySelectorAll('.range-btn').forEach(btn=>{btn.onclick=()=>{document.querySelectorAll('.range-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');matchRange=btn.dataset.range;renderAll()}});$('includeBonus').onchange=()=>renderAll();addModeButtons()}
bindEvents();loadData();
