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
let lastDreamPreviewInfo=null;
function rowsByLimit(limit){return limit==='all'?lottoData:lottoData.slice(0,Number(limit))}
function dreamCandidateStats(base,candidate,rows){
  let count=0, bases={};
  rows.forEach(row=>{
    const pool=[...new Set(rowPool(row).filter(Boolean))];
    if(!pool.includes(candidate))return;
    const baseHits=base.filter(n=>pool.includes(n));
    if(!baseHits.length)return;
    count++;
    baseHits.forEach(b=>bases[b]=(bases[b]||0)+1);
  });
  return {count,pct:rows.length?Number(((count/rows.length)*100).toFixed(1)):0,bases};
}
function dreamTrendFor(base,candidate){
  const r50=rowsByLimit(50), r100=rowsByLimit(100), rall=rowsByLimit('all');
  const s50=dreamCandidateStats(base,candidate,r50);
  const s100=dreamCandidateStats(base,candidate,r100);
  const sall=dreamCandidateStats(base,candidate,rall);
  let label='→ 안정', cls='trend-flat';
  if(s50.pct>=s100.pct+3 && s100.pct>=sall.pct-1){label='↗ 상승';cls='trend-up'}
  else if(s50.pct+3<=s100.pct || s100.pct+2<=sall.pct){label='↘ 약세';cls='trend-down'}
  return {s50,s100,sall,label,cls};
}
function dreamCompanionPreview(keyword){
  const base=dreamNumberMap(keyword);
  const rows=sourceRows();
  const counts={};
  for(let i=1;i<=45;i++)counts[i]={n:i,count:0,bases:{}};
  rows.forEach(row=>{
    const pool=[...new Set(rowPool(row).filter(Boolean))];
    const baseHits=base.filter(n=>pool.includes(n));
    if(!baseHits.length)return;
    pool.forEach(n=>{
      if(base.includes(n))return;
      counts[n].count++;
      baseHits.forEach(b=>counts[n].bases[b]=(counts[n].bases[b]||0)+1);
    });
  });
  const top=Object.values(counts)
    .filter(x=>x.count>0&&!base.includes(x.n))
    .map(x=>({
      ...x,
      pct: rows.length?Number(((x.count/rows.length)*100).toFixed(1)):0,
      linked:Object.entries(x.bases).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n])=>Number(n)),
      trend:dreamTrendFor(base,x.n)
    }))
    .sort((a,b)=>b.count-a.count||a.n-b.n)
    .slice(0,8);
  const addon=top.slice(0,2).map(x=>x.n);
  let final=[...base.slice(0,4),...addon];
  [...base,...top.map(x=>x.n)].forEach(n=>{if(final.length<6&&!final.includes(n))final.push(n)});
  final=[...new Set(final)].slice(0,6).sort((a,b)=>a-b);
  return {keyword,base,top,addon,final,range:matchRange==='all'?'전체':`최근 ${matchRange}회`,rows:rows.length};
}
function renderDreamPreviewResult(info){
  const box=document.getElementById('dreamPreviewResult');
  if(!box||!info)return;
  lastDreamPreviewInfo=info;
  const topText=info.top.length?info.top.slice(0,5).map(x=>`${ball(x.n,true)} <b>${x.count}회</b> · ${x.pct}% · 연결 ${x.linked.join(', ')}`).join('<br>'):'동반 보정 후보가 부족합니다.';
  const trendText=info.top.length?info.top.slice(0,5).map(x=>{
    const t=x.trend;
    return `<div class="dream-trend-row"><div>${ball(x.n,true)} <b>${t.label}</b></div><div>50회 ${t.s50.pct}% · 100회 ${t.s100.pct}% · 전체 ${t.sall.pct}%</div></div>`;
  }).join(''):'추세 분석 후보가 부족합니다.';
  box.innerHTML=`<div style="border-top:1px solid #d9ead3;margin-top:12px;padding-top:12px">
    <b>🌙 꿈해몽 AI Preview 결과</b>
    <p class="combo-guide">기본 꿈번호를 먼저 만들고, ${info.range} 데이터에서 1단계 동반번호만 보정했습니다. 분석번호 입력칸은 자동 변경하지 않습니다.</p>
    <div class="combo-guide"><b>기본 꿈번호</b></div>
    <div class="combo-selected">${info.base.map(n=>ball(n,true)).join('')}</div>
    <div class="combo-guide" style="margin-top:8px"><b>동반 보정 후보 TOP</b></div>
    <p class="combo-guide">${topText}</p>
    <div class="combo-guide" style="margin-top:8px"><b>Companion Trend 간단 분석</b></div>
    <div class="combo-guide">${trendText}</div>
    <div class="combo-guide" style="margin-top:8px"><b>Preview 추천번호</b></div>
    <div class="combo-selected">${info.final.map(n=>ball(n,true,info.addon.includes(n)?'selected-ball':'')).join('')}</div>
    <div class="combo-btn-row" style="margin-top:10px"><button id="applyDreamPreviewBtn">이 번호 적용</button><button id="myNumberFilterBtn">내 번호 필터</button></div>
    <div id="myNumberFilterResult"></div>
    <p class="combo-guide">※ Preview는 실험 기능입니다. 꿈의 원래 의미를 유지하기 위해 기본 꿈번호 4개 이상을 우선 보존하고, 동반번호 확장은 1단계에서 종료합니다.</p>
  </div>`;
  const applyBtn=document.getElementById('applyDreamPreviewBtn');
  if(applyBtn)applyBtn.onclick=()=>applyDreamPreviewNumbers(info.final);
  const filterBtn=document.getElementById('myNumberFilterBtn');
  if(filterBtn)filterBtn.onclick=()=>renderMyNumberFilter(info);
}
function applyDreamPreviewNumbers(nums){
  const final=[...new Set(nums.map(Number).filter(n=>n>=1&&n<=45))].sort((a,b)=>a-b).slice(0,6);
  if(final.length<2){alert('적용할 번호가 부족합니다.');return}
  document.getElementById('comboInput').value=final.join(' ');
  selectedNums=final;
  renderAll();
  if(lastDreamPreviewInfo)renderDreamPreviewResult(lastDreamPreviewInfo);
}
function getUserInputPool(){
  const raw=(document.getElementById('comboInput').value||'').trim();
  return [...new Set(raw.split(/[\s,]+/).map(v=>Number(v)).filter(n=>Number.isInteger(n)&&n>=1&&n<=45))].sort((a,b)=>a-b);
}
function renderMyNumberFilter(info){
  const box=document.getElementById('myNumberFilterResult');
  if(!box||!info)return;
  const pool=getUserInputPool();
  if(!pool.length){box.innerHTML=`<p class="combo-guide" style="color:#b42318">내 번호 필터를 사용하려면 위 분석번호 입력칸에 후보 번호를 먼저 입력하세요.</p>`;return}
  const sources=[...info.final,...info.base,...info.top.map(x=>x.n)];
  const filtered=pool.filter(n=>sources.includes(n));
  const topMap=new Map(info.top.map(x=>[x.n,x]));
  const reason=n=>{
    const r=[];
    if(info.final.includes(n))r.push('Preview');
    if(info.base.includes(n))r.push('기본꿈');
    if(topMap.has(n))r.push('동반후보');
    return r.join('+')||'필터';
  };
  box.innerHTML=`<div style="border-top:1px solid #e7edf5;margin-top:10px;padding-top:10px">
    <b>🔎 내 번호 필터 1차 예상</b>
    <p class="combo-guide">분석번호 입력칸의 번호 중 Preview 결과와 겹치는 번호만 추렸습니다.</p>
    <div class="combo-guide"><b>내 번호 후보</b></div>
    <div class="combo-selected">${pool.map(n=>ball(n,true)).join('')}</div>
    <div class="combo-guide" style="margin-top:8px"><b>1차 예상</b></div>
    <div class="combo-selected">${filtered.length?filtered.map(n=>ball(n,true,'selected-ball')).join(''):'<span class="combo-guide">겹치는 번호가 없습니다.</span>'}</div>
    ${filtered.length?`<p class="combo-guide">${filtered.map(n=>`${n}번: ${reason(n)}`).join(' · ')}</p>`:''}
  </div>`;
}
function renderDreamBridge(){
  let box=document.getElementById('dreamBridge');
  if(!box){const first=document.querySelector('.combo-card');if(first){box=document.createElement('div');box.id='dreamBridge';first.insertAdjacentElement('afterend',box)}}
  if(!box)return;
  if(!box.innerHTML)box.innerHTML=`<div class="combo-card" style="background:#f7fff4"><b>🌙 꿈해몽 연동</b><p class="combo-guide">꿈 키워드를 입력하면 기본 꿈번호와 AI Preview 보정 결과를 별도 카드에 표시합니다.</p><input id="dreamComboInput" class="combo-input" placeholder="예: 물, 새, 돼지, 도자기"><label class="checkline"><input type="checkbox" id="dreamAiPreview" checked> 꿈해몽 AI Preview 적용 <span style="color:#667085">(기본번호 + 1단계 동반번호 보정)</span></label><button id="dreamComboBtn" class="combo-btn" style="background:#2f7d32">꿈해몽 Preview 보기</button><div id="dreamPreviewResult"></div></div>`;
  const btn=document.getElementById('dreamComboBtn');
  if(btn&&!btn.dataset.bound){btn.dataset.bound='1';btn.onclick=()=>{const kw=(document.getElementById('dreamComboInput').value||'').trim();if(!kw){alert('꿈 키워드를 입력하세요.');return}const usePreview=document.getElementById('dreamAiPreview')?document.getElementById('dreamAiPreview').checked:true;if(usePreview&&lottoData.length){const preview=dreamCompanionPreview(kw);renderDreamPreviewResult(preview)}else{const base=dreamNumberMap(kw);lastDreamPreviewInfo={keyword:kw,base,top:[],addon:[],final:base,range:'기본',rows:0};renderDreamPreviewResult(lastDreamPreviewInfo)}}}
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
function renderSavedCombos(){let box=document.getElementById('savedCombos');if(!box){const title=[...document.querySelectorAll('.combo-section-title b')].find(x=>x.textContent.includes('조합별'));if(title){box=document.createElement('div');box.id='savedCombos';title.closest('.combo-section-title').insertAdjacentElement('beforebegin',box)}}if(!box)return;const list=loadSavedCombos();if(!list.length){box.innerHTML='';return}box.innerHTML=`<div class="combo-card" style="background:#f8fbff"><b>📌 저장한 추천조합 구조학습 성적표</b><p class="combo-guide">저장한 조합의 실제 적중률과 조합구조 성적을 표시합니다.</p>${list.map(item=>`<div style="border-top:1px solid #e7edf5;padding:10px 0"><b>${item.grade||'저장조합'} · 신뢰도 ${item.trust||'-'}%</b><div class="combo-selected">${item.nums.map(n=>ball(n,true)).join('')}</div>${renderStructureReport(item.nums)}${renderStep2AReport(item.nums)}<div class="combo-btn-row"><button onclick="analyzeSavedCombo('${item.key}')">상세분석</button><button onclick="deleteSavedCombo('${item.key}')">삭제</button></div></div>`).join('')}</div>`}

function comboScoreParts(nums,data,allFreq){const companion=companionIndexScore(nums,data),balance=zoneBalanceScore(nums),oddEven=oddEvenScore(nums),recent=recentTrendScore(nums),long=longTrendScore(nums,allFreq),historical=historicalHitScore(nums,data.rows)*0.35,learned=learningScore(nums),total=companion+balance+oddEven+recent+long+historical+learned;return{companion,balance,oddEven,recent,long,historical,learned,total}}
function combinations(arr,k){const out=[];function rec(start,pick){if(pick.length===k){out.push(pick);return}for(let i=start;i<arr.length;i++)rec(i+1,[...pick,arr[i]])}rec(0,[]);return out}
function makeRankedCombos(data){const companionPool=data.top.map(x=>x.n).filter(n=>!selectedNums.includes(n)),allFreq=frequencyMap(lottoData);let candidates=[];if(selectedNums.length>=6){combinations(selectedNums,4).forEach(s=>{combinations(companionPool.slice(0,12),2).forEach(c=>candidates.push({nums:[...s,...c].sort((a,b)=>a-b),replace:2}))});combinations(selectedNums,5).forEach(s=>{companionPool.slice(0,12).forEach(c=>candidates.push({nums:[...s,c].sort((a,b)=>a-b),replace:1}))});combinations(selectedNums,3).forEach(s=>{combinations(companionPool.slice(0,10),3).forEach(c=>candidates.push({nums:[...s,...c].sort((a,b)=>a-b),replace:3}))})}else{const need=6-selectedNums.length;combinations(companionPool.slice(0,15),need).forEach(c=>candidates.push({nums:[...selectedNums,...c].sort((a,b)=>a-b),replace:need}))}const seen=new Set();candidates=candidates.filter(c=>{const key=c.nums.join(',');if(seen.has(key))return false;seen.add(key);return true});let scored=candidates.map(c=>({...c,parts:comboScoreParts(c.nums,data,allFreq)})).sort((a,b)=>b.parts.total-a.parts.total||a.nums.join('').localeCompare(b.nums.join(''))).slice(0,10);if(!scored.length)return[];const max=scored[0].parts.total||1,min=scored[scored.length-1].parts.total||0;return scored.map((x,i)=>{const trust=Math.round(62+((x.parts.total-min)/(max-min||1))*34);return{...x,rank:i+1,grade:gradeFromRank(i),trust:Math.max(55,Math.min(96,trust)),stars:starByTrust(trust)}})}

function pctOf(value,max){return Math.max(0,Math.min(100,Math.round(((value||0)/(max||1))*100)))}
function starsFromScore(p){if(p>=88)return'★★★★★';if(p>=75)return'★★★★☆';if(p>=60)return'★★★☆☆';if(p>=40)return'★★☆☆☆';return'★☆☆☆☆'}
function scoreLabel(p){if(p>=88)return'매우 강함';if(p>=75)return'강함';if(p>=60)return'보통';if(p>=40)return'참고';return'약함'}
function renderAIScoreRow(label,pct,note){return `<div class="ai-score-row"><span>${label}</span><b>${starsFromScore(pct)}</b><em>${scoreLabel(pct)} · ${pct}점</em>${note?`<small>${note}</small>`:''}</div>`}

function aiScoreGrade(score){
  if(score>=92)return 'S';
  if(score>=85)return 'A+';
  if(score>=78)return 'A';
  if(score>=68)return 'B+';
  if(score>=58)return 'B';
  return 'C';
}
function aiScoreJudge(score){
  if(score>=88)return '적극 추천';
  if(score>=78)return '추천 검토';
  if(score>=68)return '관찰 추천';
  if(score>=58)return '보조 후보';
  return '실험 후보';
}

function uniqNums(nums){
  return Array.from(new Set((nums||[]).map(Number).filter(n=>n>=1&&n<=45))).sort((a,b)=>a-b);
}
function roundsInScope(){
  if(!window.LOTTO_DATA || !LOTTO_DATA.length)return [];
  const scope = window.currentScope || window.selectedScope || 'all';
  if(scope==='50') return LOTTO_DATA.slice(-50);
  if(scope==='100') return LOTTO_DATA.slice(-100);
  return LOTTO_DATA.slice();
}
function roundNums(row,includeBonus=true){
  const arr = (row.numbers || row.nums || row.drwtNo || []).map(Number).filter(Boolean);
  if(includeBonus && row.bonus) arr.push(Number(row.bonus));
  return arr;
}
function countMatches(row, nums, includeBonus=true){
  const set = new Set(roundNums(row,includeBonus));
  return nums.filter(n=>set.has(n)).length;
}
function comboRowsFor(nums, minHit=3){
  const includeBonus = !!(document.querySelector('#includeBonus')?.checked ?? true);
  return roundsInScope().filter(r=>countMatches(r,nums,includeBonus)>=minHit);
}
function numberFrequency(rows, excludeNums=[]){
  const ex = new Set(excludeNums);
  const m = {};
  rows.forEach(r=>{
    (r.numbers||[]).forEach(n=>{
      n=Number(n);
      if(n>=1&&n<=45&&!ex.has(n))m[n]=(m[n]||0)+1;
    });
    if(r.bonus && !ex.has(Number(r.bonus)))m[Number(r.bonus)]=(m[Number(r.bonus)]||0)+1;
  });
  return Object.entries(m).map(([n,c])=>({n:Number(n),count:c})).sort((a,b)=>b.count-a.count||a.n-b.n);
}
function getPrevRound(row, gap){
  const round = Number(row.round);
  if(!round || !window.LOTTO_DATA)return null;
  return LOTTO_DATA.find(x=>Number(x.round)===round-gap) || null;
}
function patternSeriesScores(nums){
  nums = uniqNums(nums);
  const samples = comboRowsFor(nums, Math.min(3, Math.max(2, nums.length-1))).slice(-50);
  const rows = samples.length ? samples : roundsInScope().slice(-50);
  const twoGaps = [2,4,6,8,10,12,14,16,18,20,22,24];
  const threeGaps = [3,6,9,12,15];

  function gapFreq(gaps){
    const freq = {};
    let compare = 0;
    rows.forEach(r=>{
      gaps.forEach(g=>{
        const prev = getPrevRound(r,g);
        if(!prev)return;
        compare++;
        (prev.numbers||[]).forEach(n=>freq[n]=(freq[n]||0)+1);
        if(prev.bonus)freq[prev.bonus]=(freq[prev.bonus]||0)+1;
      });
    });
    return {compare, list:Object.entries(freq).map(([n,c])=>({n:Number(n),count:c})).sort((a,b)=>b.count-a.count||a.n-b.n)};
  }

  const two = gapFreq(twoGaps);
  const three = gapFreq(threeGaps);
  const maxTwo = two.list[0]?.count || 1;
  const maxThree = three.list[0]?.count || 1;

  const candidateSet = new Set(nums);
  numberFrequency(rows, nums).slice(0,8).forEach(x=>candidateSet.add(x.n));
  two.list.slice(0,8).forEach(x=>candidateSet.add(x.n));
  three.list.slice(0,8).forEach(x=>candidateSet.add(x.n));

  const candidateScores = [];
  candidateSet.forEach(n=>{
    const t = two.list.find(x=>x.n===n)?.count || 0;
    const th = three.list.find(x=>x.n===n)?.count || 0;
    const pair = numberFrequency(rows, []).find(x=>x.n===n)?.count || 0;
    const score = Math.round((t/maxTwo)*45 + (th/maxThree)*30 + Math.min(25, pair*2));
    candidateScores.push({n,score,two:t,three:th,pair});
  });
  candidateScores.sort((a,b)=>b.score-a.score||a.n-b.n);

  return {samples, two, three, candidateScores};
}
function replayScoreFor(nums){
  nums = uniqNums(nums);
  const rows = comboRowsFor(nums, Math.min(3, Math.max(2, nums.length-1))).slice(-50);
  if(rows.length<2)return {score:0, rate:0, top:[]};
  const gaps = [2,4,6,8,10,12,14,16,18,20,22,24,3,6,9,12,15];
  const freq = {};
  let checked=0, reproduced=0;
  rows.forEach(r=>{
    gaps.forEach(g=>{
      const prev=getPrevRound(r,g);
      if(!prev)return;
      checked++;
      const arr=roundNums(prev,true);
      const hit=nums.filter(n=>arr.includes(n));
      if(hit.length>0)reproduced++;
      hit.forEach(n=>freq[n]=(freq[n]||0)+1);
    });
  });
  const top=Object.entries(freq).map(([n,c])=>({n:Number(n),count:c})).sort((a,b)=>b.count-a.count||a.n-b.n);
  const rate=checked?reproduced/checked:0;
  const score=Math.round(Math.min(100, rate*65 + Math.min(35,(top[0]?.count||0)*4)));
  return {score,rate,top,checked,reproduced};
}
function flowScoreFor(nums){
  nums = uniqNums(nums);
  const rows = comboRowsFor(nums, Math.min(3, Math.max(2, nums.length-1))).slice(-50);
  const gaps = [2,4,6,3,6,9];
  const chains = {};
  rows.forEach(r=>{
    gaps.forEach(g=>{
      const a=getPrevRound(r,g*2);
      const b=getPrevRound(r,g);
      if(!a||!b)return;
      const aa=roundNums(a,true).filter(n=>nums.includes(n));
      const bb=roundNums(b,true).filter(n=>nums.includes(n));
      const cc=roundNums(r,true).filter(n=>nums.includes(n));
      aa.forEach(x=>bb.forEach(y=>cc.forEach(z=>{
        const k=`${x}-${y}-${z}`;
        chains[k]=(chains[k]||0)+1;
      })));
    });
  });
  const list=Object.entries(chains).map(([k,c])=>({chain:k.split('-').map(Number),count:c})).sort((a,b)=>b.count-a.count||a.chain[0]-b.chain[0]);
  const max=list[0]?.count||0;
  const distinct=list.length;
  const score=Math.round(Math.min(100, max*9 + Math.min(35, distinct*2)));
  return {score,list,max,distinct};
}
function dreamScoreFor(nums){
  const replay = replayScoreFor(nums);
  const flow = flowScoreFor(nums);
  const series = patternSeriesScores(nums);
  const topNums = new Set([
    ...replay.top.slice(0,6).map(x=>x.n),
    ...series.two.list.slice(0,6).map(x=>x.n),
    ...series.three.list.slice(0,6).map(x=>x.n),
  ]);
  const preserved = uniqNums(nums).filter(n=>topNums.has(n)).length;
  const score=Math.round(Math.min(100, replay.score*0.35 + flow.score*0.35 + Math.min(30,preserved*8)));
  return {score,preserved,replay,flow,series};
}
function calcPatternLinkedScoreFor(nums){
  nums = uniqNums(nums);
  if(!nums.length)return null;
  const series = patternSeriesScores(nums);
  const replay = replayScoreFor(nums);
  const flow = flowScoreFor(nums);
  const dream = dreamScoreFor(nums);
  const pattern = Math.round(Math.min(100, (series.candidateScores[0]?.score||0)));
  return {
    key: nums.join(','),
    pattern,
    replay: replay.score,
    flow: flow.score,
    dream: dream.score,
    patternNote: `2계열 ${series.two.list[0]?.count||0} · 3계열 ${series.three.list[0]?.count||0}`,
    replayNote: `${replay.reproduced||0}/${replay.checked||0} 재현`,
    flowNote: `흐름 ${flow.max||0}회 · ${flow.distinct||0}개`,
    dreamNote: `유지 ${dream.preserved||0}개`,
  };
}
function readPatternScoreFor(nums){
  return calcPatternLinkedScoreFor(nums);
}

function renderCoreMetric(label,score,note){
  const safe = Math.max(0,Math.min(100,Math.round(score||0)));
  return `<div class="ai-core-metric">
    <div class="ai-core-metric-top"><b>${label}</b><span>${safe}점</span></div>
    <div class="ai-core-bar"><i style="width:${Math.max(6,safe)}%"></i></div>
    <p>${note||''}</p>
  </div>`;
}
function renderPendingMetric(label,note){
  return `<div class="ai-core-metric pending">
    <div class="ai-core-metric-top"><b>${label}</b><span>대기</span></div>
    <div class="ai-core-bar"><i style="width:8%"></i></div>
    <p>${note}</p>
  </div>`;
}


function renderAIScoreCard(c,maxes){
  const companion=pctOf(c.parts.companion,maxes.companion);
  const trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend);
  const structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure);
  const longlearn=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn);
  const total=c.trust;

  const patternLink = readPatternScoreFor(c.nums);
  const patternScore = patternLink ? Math.round(patternLink.pattern || patternLink.patternBase || 0) : null;
  const replayScore = patternLink ? Math.round(patternLink.replay || patternLink.replayScore || 0) : null;
  const flowScore = patternLink ? Math.round(patternLink.flow || patternLink.flowScore || 0) : null;
  const dreamScore = patternLink ? Math.round(patternLink.dream || patternLink.dreamScore || 0) : null;

  const baseAvg = Math.round((companion+trend+structure+longlearn)/4);
  const confidence = Math.max(55,Math.min(98,Math.round(total*0.68 + baseAvg*0.32)));
  const coreGrade = aiScoreGrade(total);
  const confidenceGrade = aiScoreGrade(confidence);

  const patternBlock = patternLink ? `
    ${renderCoreMetric('Pattern',patternScore,patternLink.patternNote || '패턴 후보 강도')}
    ${renderCoreMetric('Replay',replayScore,patternLink.replayNote || '패턴 재현율')}
    ${renderCoreMetric('Flow',flowScore,patternLink.flowNote || '흐름분석')}
    ${renderCoreMetric('Dream',dreamScore,patternLink.dreamNote || 'Dream Chain 반영')}
  ` : `
    ${renderPendingMetric('Pattern','pattern.html 연동 예정')}
    ${renderPendingMetric('Replay','재현율 연동 예정')}
    ${renderPendingMetric('Flow','흐름분석 연동 예정')}
    ${renderPendingMetric('Dream','Dream Chain 연동 예정')}
  `;

  return `<div class="ai-score-card ai-score-v163">
    <div class="ai-score-head">
      <b>AI Score Card</b>
      <span>${c.grade} · ${total}점</span>
    </div>

    <div class="ai-core-summary">
      <div>
        <b>${coreGrade}</b>
        <span>AI Score</span>
      </div>
      <div>
        <b>${confidence}%</b>
        <span>Confidence ${confidenceGrade}</span>
      </div>
      <div>
        <b>${aiScoreJudge(total)}</b>
        <span>AI 판단</span>
      </div>
    </div>

    <div class="ai-core-title">기존 AI 엔진</div>
    <div class="ai-core-grid">
      ${renderCoreMetric('Companion',companion,'동반번호·쌍번호 강도')}
      ${renderCoreMetric('Trend',trend,'최근 흐름과 장기 출현')}
      ${renderCoreMetric('Structure',structure,'구간균형·홀짝구성')}
      ${renderCoreMetric('Learning',longlearn,'과거 적중·구조학습')}
    </div>

    <div class="ai-core-title">Pattern Engine 연동 구조</div>
    <div class="ai-core-grid">
      ${patternBlock}
    </div>

    <details class="ai-score-detail">
      <summary>AI 계산 근거 자세히 보기</summary>
      <p class="combo-guide">기존 원점수: 동반 ${Math.round(c.parts.companion)} · 균형 ${c.parts.balance} · 홀짝 ${c.parts.oddEven} · 추세 ${(c.parts.recent||0)+(c.parts.long||0)} · 장기 ${Math.round(c.parts.historical||0)} · 학습 ${Math.round(c.parts.learned||0)}</p>
      <p class="combo-guide">Pattern Engine 영역은 현재 combo.html 내부 데이터로 실시간 계산됩니다. pattern.html과 동일한 방향의 Pattern · Replay · Flow · Dream 점수를 AI Score Card에 표시합니다.</p>
      <p class="combo-guide">Confidence는 현재 기존 AI 엔진 기준의 예비 신뢰도입니다. 당첨 확률이 아니라 분석 근거의 일관성 표시입니다.</p>
    </details>
  </div>`;
}

function renderRankedCombos(data){
  const combos=makeRankedCombos(data);
  if(!combos.length)return`<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹</b><p class="combo-guide">추천조합을 만들 만큼 동반번호가 부족합니다. 전체 회차로 바꿔보세요.</p></div>`;
  const maxes={
    companion:Math.max(...combos.map(c=>c.parts.companion||0),1),
    trend:Math.max(...combos.map(c=>(c.parts.recent||0)+(c.parts.long||0)),1),
    structure:Math.max(...combos.map(c=>(c.parts.balance||0)+(c.parts.oddEven||0)),1),
    longlearn:Math.max(...combos.map(c=>(c.parts.historical||0)+(c.parts.learned||0)),1)
  };
  return`<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹 TOP 10</b><p class="combo-guide">개발자식 원점수 대신 AI Score Card로 동반성·추세·구조·장기학습을 직관적으로 표시합니다.</p>${combos.map(c=>`<div style="border-top:1px solid #f2e6c9;padding:11px 0"><b style="color:#8a5b00">${c.rank}위 · ${c.grade} · 종합 ${c.trust}점</b><div class="combo-selected">${c.nums.map(n=>ball(n,true,selectedNums.includes(n)?'selected-ball':'')).join('')}</div>${renderAIScoreCard(c,maxes)}${renderComboReport(c.nums)}<div class="combo-btn-row" style="margin-top:8px"><button onclick="saveRecommendedCombo('${c.nums.join(',')}','${c.grade}',${c.trust})">저장</button><button onclick="analyzeSavedCombo('${c.nums.join(',')}')">적중분석</button></div></div>`).join('')}</div>`}

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


function comboStructure(nums){
  const sorted=[...nums].sort((a,b)=>a-b);
  const zones=[0,0,0,0,0];
  sorted.forEach(n=>{
    if(n<=9)zones[0]++;
    else if(n<=19)zones[1]++;
    else if(n<=29)zones[2]++;
    else if(n<=39)zones[3]++;
    else zones[4]++;
  });
  const odd=sorted.filter(n=>n%2).length;
  const even=6-odd;
  const sum=sorted.reduce((a,b)=>a+b,0);
  const low=sorted.filter(n=>n<=22).length;
  const high=6-low;
  let consecutive=0;
  for(let i=1;i<sorted.length;i++)if(sorted[i]-sorted[i-1]===1)consecutive++;
  const ending={};
  sorted.forEach(n=>ending[n%10]=(ending[n%10]||0)+1);
  const sameEndMax=Math.max(...Object.values(ending));
  const spread=sorted[5]-sorted[0];
  const sumBand=sum<90?"low":sum<=150?"mid":"high";
  return{
    zones,odd,even,sum,low,high,consecutive,sameEndMax,spread,sumBand,
    zoneKey:zones.join("-"),
    oddKey:`${odd}:${even}`,
    lowHighKey:`${low}:${high}`,
    structureKey:`${zones.join("-")}|${odd}:${even}|${sumBand}|C${Math.min(consecutive,2)}`
  };
}
function structureHitProfile(nums,limit=null){
  const s=comboStructure(nums);
  const rows=limit?lottoData.slice(0,limit):lottoData;
  let sameStructure=0, sameZone=0, sameOdd=0, sameLowHigh=0, goodSum=0, goodSpread=0, goodConsecutive=0;
  rows.forEach(row=>{
    const r=comboStructure(row.numbers||[]);
    if(r.structureKey===s.structureKey)sameStructure++;
    if(r.zoneKey===s.zoneKey)sameZone++;
    if(r.oddKey===s.oddKey)sameOdd++;
    if(r.lowHighKey===s.lowHighKey)sameLowHigh++;
    if(r.sumBand===s.sumBand)goodSum++;
    if(Math.abs(r.spread-s.spread)<=7)goodSpread++;
    if(r.consecutive===s.consecutive)goodConsecutive++;
  });
  const total=rows.length||1;
  return{structure:s,sameStructure,sameZone,sameOdd,sameLowHigh,goodSum,goodSpread,goodConsecutive,total};
}
function structureLearningScore(nums){
  const r100=structureHitProfile(nums,100);
  const r300=structureHitProfile(nums,300);
  const all=structureHitProfile(nums,null);
  const s=all.structure;
  let score=0;
  score += r100.sameStructure*4.5;
  score += r300.sameStructure*1.7;
  score += all.sameStructure*0.55;
  score += r100.sameZone*0.65;
  score += r300.sameZone*0.22;
  score += all.sameZone*0.05;
  score += r100.sameOdd*0.22;
  score += r100.sameLowHigh*0.22;
  score += r100.goodSum*0.12;
  score += r100.goodSpread*0.10;
  score += r100.goodConsecutive*0.10;
  if(s.zones.filter(x=>x>0).length>=4)score+=18;
  if(Math.max(...s.zones)<=2)score+=14;
  if(s.odd>=2&&s.odd<=4)score+=12;
  if(s.sum>=95&&s.sum<=165)score+=14;
  if(s.spread>=25&&s.spread<=43)score+=10;
  if(s.consecutive<=2)score+=8;
  if(s.sameEndMax<=2)score+=8;
  return{r100,r300,all,score:Math.min(180,score)};
}
function structureTypeLabel(nums){
  const s=comboStructure(nums);
  const used=s.zones.filter(x=>x>0).length;
  if(used>=5 && s.odd>=2 && s.odd<=4)return "균형확산형";
  if(s.consecutive>=2)return "연속번호형";
  if(s.sum<90)return "저합계형";
  if(s.sum>165)return "고합계형";
  if(Math.max(...s.zones)>=3)return "구간집중형";
  return "표준균형형";
}
function structureComment(nums){
  const p=structureLearningScore(nums);
  const s=p.all.structure;
  if(p.r100.sameStructure>=3)return "최근 100회에서 같은 조합구조가 반복된 강한 구조입니다.";
  if(p.r300.sameStructure>=7)return "최근 300회에서 같은 구조가 안정적으로 반복되었습니다.";
  if(s.zones.filter(x=>x>0).length>=5)return "전 구간에 고르게 분산된 균형 구조입니다.";
  if(Math.max(...s.zones)<=2 && s.odd>=2 && s.odd<=4)return "구간 과밀과 홀짝 쏠림이 적은 안정형 구조입니다.";
  if(s.consecutive>=3)return "연속번호 비중이 높아 실험성이 강한 구조입니다.";
  return "과거 당첨구조와의 유사도를 기준으로 보정한 조합입니다.";
}
function renderStructureReport(nums){
  const p=structureLearningScore(nums);
  const s=p.all.structure;
  return `<p class="combo-guide">구조학습: ${structureTypeLabel(nums)} · 구간 ${s.zoneKey} · 홀짝 ${s.odd}:${s.even} · 합계 ${s.sum} · 간격 ${s.spread}</p>
  <p class="combo-guide">구조반복: 최근100 ${p.r100.sameStructure}회 · 최근300 ${p.r300.sameStructure}회 · 전체 ${p.all.sameStructure}회</p>
  <p class="combo-guide">구조평가: ${structureComment(nums)}</p>`;
}

function renderCompanion(){const data=companionAnalysis(),max=data.top.length?data.top[0].count:1,threshold=minHit();let html=`<div class="combo-card"><b>🤝 동반번호 추천</b><p class="combo-guide">${selectedNums.map(n=>n+'번').join(', ')} 기준으로, ${threshold}개 이상 함께 나온 회차에서 추가 번호를 집계했습니다.</p>`;if(data.recommend.length){html+=`<div class="combo-card" style="margin:10px 0;background:#f0f7ff"><b>AI 추천 동반번호</b><div class="combo-selected">${data.recommend.map(n=>ball(n,true)).join('')}</div><p class="combo-guide">동반번호는 아래 AI 조합 랭킹에 반영됩니다.</p></div>`;html+=renderRankedCombos(data)}else{html+=`<p class="combo-guide">현재 범위에서는 추천할 동반번호가 없습니다. 전체 회차로 바꿔보세요.</p>`}html+=data.top.length?data.top.slice(0,10).map(x=>{const w=Math.max(8,Math.round(x.count/max*100));return`<div class="companion-row"><div>${ball(x.n,true)}</div><div class="companion-bar"><i style="width:${w}%"></i></div><div class="companion-count">${x.count}회 · 지수 ${x.index}</div></div>`}).join(''):`<div class="combo-guide">동반출현 기록이 없습니다.</div>`;html+=`<p class="combo-guide">분석 기준: 조건을 만족한 ${data.rows.length}개 회차에서 추가 번호를 집계했습니다.</p></div>`;$('companion').innerHTML=html}



function injectHistoryWideStyle(){
  if(document.getElementById("historyWideStyle"))return;
  const st=document.createElement("style");
  st.id="historyWideStyle";
  st.textContent=`
    .history-head-wide,
    .combo-table-head.history-head-wide,
    .history-table-head.history-head-wide{
      display:grid !important;
      grid-template-columns:78px minmax(0,1fr) 48px 54px !important;
      gap:6px !important;
      align-items:center !important;
    }

    .combo-row.history-wide{
      display:grid !important;
      grid-template-columns:78px minmax(0,1fr) 48px 54px !important;
      gap:6px !important;
      align-items:center !important;
      min-height:58px !important;
      padding:9px 10px !important;
      overflow:visible !important;
    }

    .combo-row.history-wide .round-cell{
      min-width:0 !important;
      line-height:1.18 !important;
    }

    .combo-row.history-wide .round-cell b{
      display:block !important;
      font-size:16px !important;
      white-space:nowrap !important;
    }

    .combo-row.history-wide .round-cell span{
      display:block !important;
      font-size:12px !important;
      white-space:normal !important;
      word-break:keep-all !important;
    }

    .combo-row.history-wide .history-balls{
      min-width:0 !important;
      width:100% !important;
      display:flex !important;
      flex-direction:row !important;
      flex-wrap:nowrap !important;
      gap:3px !important;
      justify-content:flex-start !important;
      align-items:center !important;
      overflow:visible !important;
    }

    .combo-row.history-wide .history-balls .ball,
    .combo-row.history-wide .history-balls .tiny-ball,
    .combo-row.history-wide .history-balls span{
      flex:0 0 auto !important;
      display:inline-flex !important;
    }

    .combo-row.history-wide .hit-tag{
      font-size:12px !important;
      padding:5px 6px !important;
      white-space:nowrap !important;
    }

    @media(max-width:430px){
      .history-head-wide,
      .combo-table-head.history-head-wide,
      .history-table-head.history-head-wide{
        grid-template-columns:68px minmax(0,1fr) 34px 44px !important;
        gap:3px !important;
      }

      .combo-row.history-wide{
        grid-template-columns:68px minmax(0,1fr) 34px 44px !important;
        gap:3px !important;
        min-height:56px !important;
        padding:8px 7px !important;
      }

      .combo-row.history-wide .round-cell b{
        font-size:15px !important;
      }

      .combo-row.history-wide .round-cell span{
        font-size:11px !important;
      }

      .combo-row.history-wide .history-balls{
        gap:2px !important;
      }

      .combo-row.history-wide .history-balls .ball,
      .combo-row.history-wide .history-balls .tiny-ball{
        width:25px !important;
        height:25px !important;
        min-width:25px !important;
        font-size:12px !important;
        line-height:25px !important;
      }

      .combo-row.history-wide .history-balls .selected-ball{
        outline-width:3px !important;
        box-shadow:0 0 0 3px rgba(255,214,100,.55) !important;
      }

      .combo-row.history-wide .hit-tag{
        font-size:11px !important;
        padding:4px 5px !important;
      }
    }

    @media(max-width:380px){
      .history-head-wide,
      .combo-table-head.history-head-wide,
      .history-table-head.history-head-wide{
        grid-template-columns:62px minmax(0,1fr) 30px 39px !important;
        gap:2px !important;
      }

      .combo-row.history-wide{
        grid-template-columns:62px minmax(0,1fr) 30px 39px !important;
        gap:2px !important;
        padding:7px 5px !important;
      }

      .combo-row.history-wide .history-balls .ball,
      .combo-row.history-wide .history-balls .tiny-ball{
        width:22px !important;
        height:22px !important;
        min-width:22px !important;
        font-size:11px !important;
        line-height:22px !important;
      }

      .combo-row.history-wide .hit-tag{
        font-size:10px !important;
        padding:3px 4px !important;
      }
    }
  `;
  document.head.appendChild(st);
}

function renderHistory(){injectHistoryWideStyle();const matches=rangeMatches();if(!matches.length){$('history').innerHTML=`<div class="combo-card center">조건에 맞는 회차가 없습니다.</div>`;return}$('history').innerHTML=matches.map(x=>{const row=x.row,hit=x.hit,tag=`${hit.normal}${hit.bonus&&includeBonus()?'+B':''}개`,nums=row.numbers.map(n=>tinyBall(n,selectedNums.includes(n)?'selected-ball':'')).join('');return`<div class="combo-row history-wide"><div class="round-cell"><b>${row.round}회</b><span>${row.date}</span></div><div class="history-balls">${nums}</div><div>${tinyBall(row.bonus,selectedNums.includes(row.bonus)?'selected-ball':'')}</div><div><span class="hit-tag">${tag}</span></div></div>`}).join('')}
function renderAllLegacy(){renderDreamBridge();if(!selectedNums.length)return;setStatusText();renderSummary();renderCompanion();renderSavedCombos();renderHistory()}
function renderAll(){if(window.ComboUI&&typeof window.ComboUI.renderAll==='function')return window.ComboUI.renderAll();return renderAllLegacy()}
async function loadData(){try{const res=await fetch('./data/lotto.json?ts='+Date.now());const data=await res.json();if(!Array.isArray(data))throw new Error('lotto.json 배열 아님');lottoData=data.sort((a,b)=>b.round-a.round);window.LOTTO_DATA=lottoData;window.lottoData=lottoData;$('status').textContent=`전체 ${lottoData.length}개 회차 데이터를 불러왔습니다.`;setTimeout(()=>{renderDreamBridge();renderSavedCombos()},0);const saved=JSON.parse(localStorage.getItem('haengun_my_nums')||'null');if(Array.isArray(saved)&&saved.length>=2){selectedNums=saved.slice(0,6).sort((a,b)=>a-b);$('comboInput').value=selectedNums.join(' ');renderAll()}}catch(e){console.error(e);$('status').textContent='데이터 오류: data/lotto.json을 읽지 못했습니다.'}}
function addModeButtons(){const box=document.querySelector('.combo-btn-row');if(!box||document.getElementById('modePartial'))return;const wrap=document.createElement('div');wrap.className='combo-btn-row';wrap.innerHTML=`<button id="modePartial" class="active">부분일치</button><button id="modeExact">완전일치</button>`;box.insertAdjacentElement('afterend',wrap);$('modePartial').onclick=()=>{matchMode='partial';$('modePartial').classList.add('active');$('modeExact').classList.remove('active');renderAll()};$('modeExact').onclick=()=>{matchMode='exact';$('modeExact').classList.add('active');$('modePartial').classList.remove('active');renderAll()}}
function bindEvents(){setTimeout(renderDreamBridge,0);$('analyzeBtn').onclick=()=>{const nums=parseNums();if(!nums)return;selectedNums=nums;renderAll()};document.querySelectorAll('.range-btn').forEach(btn=>{btn.onclick=()=>{document.querySelectorAll('.range-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');matchRange=btn.dataset.range;renderAll()}});$('includeBonus').onchange=()=>renderAll();addModeButtons()}
injectHistoryWideStyle();bindEvents();loadData();


/* =========================================================
   Dream Chain Lab v0.2 + AI 판단
   AI Core v0.9 사전 실험 모듈
========================================================= */

function dreamChainCompanionFromSeed(seedNums, rows){
  const counts = {};
  for(let i=1;i<=45;i++) counts[i] = {n:i,count:0,bases:{}};

  rows.forEach(row=>{
    const pool = [...new Set(rowPool(row).filter(Boolean))];
    const seedHits = seedNums.filter(n=>pool.includes(n));
    if(!seedHits.length) return;

    pool.forEach(n=>{
      if(seedNums.includes(n)) return;
      counts[n].count++;
      seedHits.forEach(b=>counts[n].bases[b]=(counts[n].bases[b]||0)+1);
    });
  });

  return Object.values(counts)
    .filter(x=>x.count>0 && !seedNums.includes(x.n))
    .map(x=>({
      ...x,
      pct: rows.length ? Number(((x.count/rows.length)*100).toFixed(1)) : 0,
      linked: Object.entries(x.bases).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n])=>Number(n))
    }))
    .sort((a,b)=>b.count-a.count || a.n-b.n)
    .slice(0,8);
}

function dreamChainMakePreview(base, top){
  const addon = top.slice(0,2).map(x=>x.n);
  let final = [...base.slice(0,4), ...addon];

  [...base, ...top.map(x=>x.n)].forEach(n=>{
    if(final.length<6 && !final.includes(n)) final.push(n);
  });

  return {
    addon,
    final: [...new Set(final)].slice(0,6).sort((a,b)=>a-b)
  };
}

function dreamChainBuild(base, rows){
  const stages = [];
  let seed = [...base];

  for(let step=1; step<=3; step++){
    const top = dreamChainCompanionFromSeed(seed, rows);
    const made = dreamChainMakePreview(base, top);
    stages.push({
      step,
      seed:[...seed].sort((a,b)=>a-b),
      top,
      addon:made.addon,
      final:made.final
    });
    seed = made.final;
  }

  return stages;
}

function dreamChainStableNumbers(stages){
  if(!stages || !stages.length) return [];
  let keep = new Set(stages[0].final);
  stages.slice(1).forEach(s=>{
    keep = new Set(s.final.filter(n=>keep.has(n)));
  });
  return [...keep].sort((a,b)=>a-b);
}

function dreamChainChangedNumbers(stages){
  if(!stages || stages.length<2) return [];
  const changed = [];
  for(let i=1;i<stages.length;i++){
    const prev = new Set(stages[i-1].final);
    const curr = new Set(stages[i].final);
    const out = [...prev].filter(n=>!curr.has(n));
    const inn = [...curr].filter(n=>!prev.has(n));
    if(out.length || inn.length) changed.push({from:i,to:i+1,out,inn});
  }
  return changed;
}

function dreamChainSimilarity(a,b){
  if(!a || !b || !a.length || !b.length) return 0;
  const s = new Set(a);
  const hit = b.filter(n=>s.has(n)).length;
  return Math.round((hit / Math.max(a.length,b.length)) * 100);
}

function dreamChainScore(stages){
  if(!stages || stages.length<3) return {avg:0,stable:0,stars:'★☆☆☆☆',s12:0,s23:0};
  const s12 = dreamChainSimilarity(stages[0].final, stages[1].final);
  const s23 = dreamChainSimilarity(stages[1].final, stages[2].final);
  const stable = dreamChainStableNumbers(stages).length;
  const avg = Math.round((s12+s23)/2);
  let stars = '★☆☆☆☆';
  if(avg>=90 && stable>=5) stars='★★★★★';
  else if(avg>=75 && stable>=4) stars='★★★★☆';
  else if(avg>=60 && stable>=4) stars='★★★☆☆';
  else if(avg>=45) stars='★★☆☆☆';
  return {avg,stable,stars,s12,s23};
}

function dreamAiJudge(info){
  const chain = info.chain || [];
  const score = dreamChainScore(chain);
  const top = info.top || [];
  const upCount = top.slice(0,5).filter(x=>x.trend && x.trend.label.includes('상승')).length;
  const downCount = top.slice(0,5).filter(x=>x.trend && x.trend.label.includes('약세')).length;

  let title = '1차 보정 유지 권장';
  let desc = '2차·3차로 갈수록 결과가 흔들릴 수 있어 현재는 1차 Preview 중심으로 보는 것이 안전합니다.';
  let pick = info.final;

  if(chain.length>=3 && score.stable>=5 && score.avg>=80){
    title = '3차 Chain 관찰 가치 높음';
    desc = '3차까지 유지번호가 많고 단계 간 일치율이 높습니다. Chain 보정을 AI Core 후보로 반영할 가치가 있습니다.';
    pick = chain[2].final;
  }else if(chain.length>=2 && score.stable>=4 && score.avg>=60){
    title = '2차 보정 우선 검토';
    desc = '핵심 번호는 유지되면서 일부 후보가 교체됩니다. 3차보다 2차까지의 보정이 현실적입니다.';
    pick = chain[1].final;
  }

  if(downCount>=3 && score.avg<75){
    title = '1차 보정 유지 권장';
    desc = '상위 동반 후보에 약세가 많고 Chain 안정도가 충분하지 않습니다. 1차 Preview를 유지하는 편이 좋습니다.';
    pick = info.final;
  }

  if(upCount>=2 && score.stable>=4){
    desc += ' 특히 상승 후보가 함께 확인되어 실험 가치는 더 높습니다.';
  }

  return {
    title,
    desc,
    pick:[...new Set(pick)].slice(0,6).sort((a,b)=>a-b),
    stars:score.stars,
    stability:score.avg,
    stableCount:score.stable
  };
}

function renderDreamChainLab(info){
  if(!info || !info.chain || !info.chain.length) return '';
  const stable = dreamChainStableNumbers(info.chain);
  const changed = dreamChainChangedNumbers(info.chain);
  const score = dreamChainScore(info.chain);
  const judge = dreamAiJudge(info);

  const stageHtml = info.chain.map((s,idx)=>{
    const prev = idx===0 ? info.base : info.chain[idx-1].final;
    const sim = dreamChainSimilarity(prev,s.final);
    const added = new Set(s.final.filter(n=>!info.base.includes(n)));
    const topText = s.top.length
      ? s.top.slice(0,5).map(x=>`${ball(x.n,true)} <b>${x.count}회</b> · ${x.pct}% · 연결 ${x.linked.join(', ')}`).join('<br>')
      : '후보 부족';

    return `<div class="chain-stage">
      <div class="chain-head"><b>${s.step}차 Chain Preview</b><span>${sim}% 일치</span></div>
      <div class="combo-selected">${s.final.map(n=>ball(n,true,added.has(n)?'selected-ball':'')).join('')}</div>
      <p class="combo-guide">${topText}</p>
    </div>`;
  }).join('');

  const changedText = changed.length
    ? changed.map(c=>`${c.from}차→${c.to}차: 제외 ${c.out.join(', ')||'-'} / 추가 ${c.inn.join(', ')||'-'}`).join('<br>')
    : '단계별 교체가 거의 없습니다.';

  return `<div id="dreamChainLab" style="border-top:1px solid #d9ead3;margin-top:14px;padding-top:14px">
    <b>🧪 Dream Chain Lab v0.2</b>
    <p class="combo-guide">1차·2차·3차 동반번호 보정 결과를 비교해 어느 단계까지 의미가 있는지 검증합니다.</p>

    <div class="combo-card" style="margin:10px 0;background:#fffaf0;border-color:#f2d99b">
      <b>AI 판단 · ${judge.stars}</b>
      <p class="combo-guide"><b>${judge.title}</b></p>
      <p class="combo-guide">${judge.desc}</p>
      <p class="combo-guide">Chain 안정도 ${judge.stability}% · 3차까지 유지 ${judge.stableCount}개</p>
      <div class="combo-guide"><b>AI 최종 판단 번호</b></div>
      <div class="combo-selected">${judge.pick.map(n=>ball(n,true,'selected-ball')).join('')}</div>
    </div>

    <div class="combo-guide"><b>3차까지 유지번호</b></div>
    <div class="combo-selected">${stable.length?stable.map(n=>ball(n,true,'selected-ball')).join(''):'<span class="combo-guide">유지번호 없음</span>'}</div>

    ${stageHtml}

    <div class="combo-guide" style="margin-top:8px"><b>교체 흐름</b></div>
    <p class="combo-guide">${changedText}</p>
    <p class="combo-guide">Chain 일치율: 1차→2차 ${score.s12}% · 2차→3차 ${score.s23}%</p>
  </div>`;
}

function dreamCompanionPreview(keyword){
  const base=dreamNumberMap(keyword);
  const rows=sourceRows();
  const counts={};
  for(let i=1;i<=45;i++)counts[i]={n:i,count:0,bases:{}};
  rows.forEach(row=>{
    const pool=[...new Set(rowPool(row).filter(Boolean))];
    const baseHits=base.filter(n=>pool.includes(n));
    if(!baseHits.length)return;
    pool.forEach(n=>{
      if(base.includes(n))return;
      counts[n].count++;
      baseHits.forEach(b=>counts[n].bases[b]=(counts[n].bases[b]||0)+1);
    });
  });
  const top=Object.values(counts)
    .filter(x=>x.count>0&&!base.includes(x.n))
    .map(x=>({
      ...x,
      pct: rows.length?Number(((x.count/rows.length)*100).toFixed(1)):0,
      linked:Object.entries(x.bases).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n])=>Number(n)),
      trend:dreamTrendFor(base,x.n)
    }))
    .sort((a,b)=>b.count-a.count||a.n-b.n)
    .slice(0,8);
  const addon=top.slice(0,2).map(x=>x.n);
  let final=[...base.slice(0,4),...addon];
  [...base,...top.map(x=>x.n)].forEach(n=>{if(final.length<6&&!final.includes(n))final.push(n)});
  final=[...new Set(final)].slice(0,6).sort((a,b)=>a-b);

  const chain = dreamChainBuild(base, rows);

  return {keyword,base,top,addon,final,chain,range:matchRange==='all'?'전체':`최근 ${matchRange}회`,rows:rows.length};
}

function renderDreamPreviewResult(info){
  const box=document.getElementById('dreamPreviewResult');
  if(!box||!info)return;
  lastDreamPreviewInfo=info;
  const topText=info.top.length?info.top.slice(0,5).map(x=>`${ball(x.n,true)} <b>${x.count}회</b> · ${x.pct}% · 연결 ${x.linked.join(', ')}`).join('<br>'):'동반 보정 후보가 부족합니다.';
  const trendText=info.top.length?info.top.slice(0,5).map(x=>{
    const t=x.trend;
    return `<div class="dream-trend-row"><div>${ball(x.n,true)} <b>${t.label}</b></div><div>50회 ${t.s50.pct}% · 100회 ${t.s100.pct}% · 전체 ${t.sall.pct}%</div></div>`;
  }).join(''):'추세 분석 후보가 부족합니다.';
  const chainHtml = renderDreamChainLab(info);
  const judge = dreamAiJudge(info);

  box.innerHTML=`<div style="border-top:1px solid #d9ead3;margin-top:12px;padding-top:12px">
    <b>🌙 꿈해몽 AI Preview 결과</b>
    <p class="combo-guide">기본 꿈번호를 먼저 만들고, ${info.range} 데이터에서 1단계 동반번호를 보정했습니다. 분석번호 입력칸은 자동 변경하지 않습니다.</p>
    <div class="combo-guide"><b>기본 꿈번호</b></div>
    <div class="combo-selected">${info.base.map(n=>ball(n,true)).join('')}</div>
    <div class="combo-guide" style="margin-top:8px"><b>동반 보정 후보 TOP</b></div>
    <p class="combo-guide">${topText}</p>
    <div class="combo-guide" style="margin-top:8px"><b>Companion Trend 간단 분석</b></div>
    <div class="combo-guide">${trendText}</div>
    <div class="combo-guide" style="margin-top:8px"><b>Preview 추천번호</b></div>
    <div class="combo-selected">${info.final.map(n=>ball(n,true,info.addon.includes(n)?'selected-ball':'')).join('')}</div>

    ${chainHtml}

    <div class="combo-btn-row" style="margin-top:10px"><button id="applyDreamPreviewBtn">Preview 번호 적용</button><button id="applyDreamAiJudgeBtn">AI 판단 번호 적용</button></div>
    <div class="combo-btn-row" style="margin-top:10px"><button id="myNumberFilterBtn">내 번호 필터</button></div>
    <div id="myNumberFilterResult"></div>
    <p class="combo-guide">※ Preview와 Chain은 실험 기능입니다. 꿈의 원래 의미를 유지하기 위해 기본 꿈번호 4개 이상을 우선 보존합니다.</p>
  </div>`;

  const applyBtn=document.getElementById('applyDreamPreviewBtn');
  if(applyBtn)applyBtn.onclick=()=>applyDreamPreviewNumbers(info.final);

  const judgeBtn=document.getElementById('applyDreamAiJudgeBtn');
  if(judgeBtn)judgeBtn.onclick=()=>applyDreamPreviewNumbers(judge.pick);

  const filterBtn=document.getElementById('myNumberFilterBtn');
  if(filterBtn)filterBtn.onclick=()=>renderMyNumberFilter(info);
}

(function injectDreamChainStyle(){
  if(document.getElementById('dreamChainLabV02Style'))return;
  const st=document.createElement('style');
  st.id='dreamChainLabV02Style';
  st.textContent=`
    .chain-stage{border-top:1px solid #e5eadf;margin-top:12px;padding-top:10px}
    .chain-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px}
    .chain-head span{background:#eef2ff;color:#11366b;border-radius:999px;padding:5px 8px;font-size:12px;font-weight:900;white-space:nowrap}
  `;
  document.head.appendChild(st);
})();


(function injectAIScoreV163Style(){
  if(document.getElementById('aiScoreV163Style'))return;
  const st=document.createElement('style');
  st.id='aiScoreV163Style';
  st.textContent=`
    .ai-score-v163{padding:12px}
    .ai-core-summary{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;margin:10px 0}
    .ai-core-summary div{background:#fff;border:1px solid #f5e6bd;border-radius:14px;padding:10px;text-align:center}
    .ai-core-summary b{display:block;color:#8a5b00;font-size:18px}
    .ai-core-summary span{display:block;color:#667085;font-size:11px;margin-top:2px}
    .ai-core-title{font-size:12px;font-weight:900;color:#8a5b00;margin:12px 0 6px}
    .ai-core-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .ai-core-metric{background:#fff;border:1px solid #f5e6bd;border-radius:14px;padding:9px}
    .ai-core-metric.pending{background:#fffdf7;opacity:.86}
    .ai-core-metric-top{display:flex;justify-content:space-between;align-items:center;gap:8px}
    .ai-core-metric-top b{color:#475467;font-size:13px}
    .ai-core-metric-top span{color:#8a5b00;font-size:12px;font-weight:900}
    .ai-core-bar{height:8px;background:#f6edd3;border-radius:999px;overflow:hidden;margin:7px 0}
    .ai-core-bar i{display:block;height:100%;background:#d79b21;border-radius:999px}
    .ai-core-metric.pending .ai-core-bar i{background:#cbd5e1}
    .ai-core-metric p{margin:0;color:#667085;font-size:11px;line-height:1.35}
    @media(max-width:430px){
      .ai-core-summary{grid-template-columns:1fr}
      .ai-core-grid{grid-template-columns:1fr}
    }
  `;
  document.head.appendChild(st);
})();




/* =========================================================
   v1.6.5 Pattern Score Real Link
   목적: AI Score Card의 Pattern 점수를 실제 로또 데이터 기반으로 산출
   - 기존 AI Card 표시 구조 유지
   - LOTTO_DATA / lottoData / window.lottoData 등 다양한 데이터명 자동 탐색
   - 현재 선택 범위 버튼이 없어도 전체 데이터로 계산
   - Pattern만 우선 실제 점수화, Replay/Flow/Dream은 다음 단계용 예비값 유지
========================================================= */
(function(){
  function getLottoRowsV165(){
    const candidates = [
      window.LOTTO_DATA,
      window.lottoData,
      window.allLottoData,
      window.lottoRows,
      window.lottoList,
      window.draws,
      window.data
    ];
    for(const c of candidates){
      if(Array.isArray(c) && c.length) return normalizeRowsV165(c);
    }

    // 전역 변수 중 회차 데이터처럼 보이는 배열 자동 탐색
    for(const k of Object.keys(window)){
      try{
        const v = window[k];
        if(!Array.isArray(v) || v.length < 10) continue;
        const first = v[0] || {};
        const hasRound = ('round' in first) || ('drwNo' in first) || ('회차' in first);
        const hasNums = ('numbers' in first) || ('nums' in first) || ('drwtNo1' in first) || ('n1' in first);
        if(hasRound && hasNums) return normalizeRowsV165(v);
      }catch(e){}
    }
    return [];
  }

  function normalizeRowsV165(rows){
    return rows.map((r,idx)=>{
      const nums = Array.isArray(r.numbers) ? r.numbers :
                   Array.isArray(r.nums) ? r.nums :
                   [r.drwtNo1,r.drwtNo2,r.drwtNo3,r.drwtNo4,r.drwtNo5,r.drwtNo6].filter(Boolean).length ? [r.drwtNo1,r.drwtNo2,r.drwtNo3,r.drwtNo4,r.drwtNo5,r.drwtNo6] :
                   [r.n1,r.n2,r.n3,r.n4,r.n5,r.n6].filter(Boolean);
      return {
        raw:r,
        round:Number(r.round || r.drwNo || r["회차"] || r.no || idx+1),
        date:r.date || r.drwNoDate || r["추첨일"] || "",
        numbers:(nums||[]).map(Number).filter(n=>n>=1&&n<=45),
        bonus:Number(r.bonus || r.bnusNo || r["보너스"] || r.bonusNo || 0) || null
      };
    }).filter(r=>r.numbers.length>=6).sort((a,b)=>a.round-b.round);
  }

  function uniqV165(nums){
    return Array.from(new Set((nums||[]).map(Number).filter(n=>n>=1&&n<=45))).sort((a,b)=>a-b);
  }

  function includeBonusV165(){
    const el = document.querySelector('#includeBonus, #bonusIncluded, input[type="checkbox"][data-role="bonus"]');
    if(el) return !!el.checked;
    const txt = document.body.innerText || "";
    return txt.includes("보너스 번호 포함") || txt.includes("보너스 포함");
  }

  function selectedScopeV165(){
    const activeTexts = Array.from(document.querySelectorAll('button,.btn,.chip,.seg'))
      .filter(el=>el.classList.contains('active') || el.classList.contains('selected') || el.getAttribute('aria-pressed')==='true')
      .map(el=>el.innerText.trim());
    const joined = activeTexts.join(" ");
    if(joined.includes("최근 50")) return 50;
    if(joined.includes("최근 100")) return 100;
    if(joined.includes("전체")) return 0;
    return 0; // 기본은 전체. AI 랭킹 점수 안정성을 위해 전체 기준
  }

  function rowsInScopeV165(rows){
    const scope = selectedScopeV165();
    if(scope===50) return rows.slice(-50);
    if(scope===100) return rows.slice(-100);
    return rows.slice();
  }

  function rowNumsV165(r,bonus){
    const arr = r.numbers.slice();
    if(bonus && r.bonus) arr.push(r.bonus);
    return arr;
  }

  function hitCountV165(r, nums, bonus){
    const set = new Set(rowNumsV165(r, bonus));
    return nums.filter(n=>set.has(n)).length;
  }

  function sampleRowsV165(rows, nums, bonus){
    const need = nums.length >= 4 ? 3 : Math.max(2, nums.length);
    let matched = rows.filter(r=>hitCountV165(r, nums, bonus)>=need);
    if(matched.length < 5){
      matched = rows.filter(r=>hitCountV165(r, nums, bonus)>=Math.max(1, need-1));
    }
    return matched.slice(-50);
  }

  function prevByRoundV165(rows, round, gap){
    // 회차 번호가 연속이 아닐 가능성까지 고려해 round 기반 우선, 없으면 index 기반은 아래에서 처리
    return rows.find(r=>r.round === round-gap) || null;
  }

  function countGapPatternV165(rows, samples, gaps, nums, bonus){
    const freq = {};
    let comparisons = 0;
    let patternHits = 0;

    const indexMap = new Map(rows.map((r,i)=>[r.round,i]));

    samples.forEach(s=>{
      gaps.forEach(g=>{
        let prev = prevByRoundV165(rows, s.round, g);
        if(!prev){
          const idx = indexMap.get(s.round);
          if(typeof idx === "number" && idx-g >= 0) prev = rows[idx-g];
        }
        if(!prev) return;

        comparisons++;
        const arr = rowNumsV165(prev, bonus);
        const inputHits = nums.filter(n=>arr.includes(n)).length;
        if(inputHits>0) patternHits++;

        arr.forEach(n=>{
          if(n>=1 && n<=45) freq[n]=(freq[n]||0)+1;
        });
      });
    });

    const list = Object.entries(freq).map(([n,c])=>({n:Number(n), count:c}))
      .sort((a,b)=>b.count-a.count || a.n-b.n);

    return {comparisons, patternHits, list};
  }

  function realPatternScoreV165(nums){
    nums = uniqV165(nums);
    const rowsAll = getLottoRowsV165();
    if(!nums.length || !rowsAll.length){
      return {
        key: nums.join(','),
        pattern:0, replay:0, flow:0, dream:0,
        patternNote:"데이터 대기",
        replayNote:"0/0 재현",
        flowNote:"흐름 대기",
        dreamNote:"Dream 대기"
      };
    }

    const bonus = includeBonusV165();
    const rows = rowsInScopeV165(rowsAll);
    const samples = sampleRowsV165(rows, nums, bonus);

    const two = countGapPatternV165(rows, samples, [2,4,6,8,10,12,14,16,18,20,22,24], nums, bonus);
    const three = countGapPatternV165(rows, samples, [3,6,9,12,15], nums, bonus);

    const topTwo = two.list[0]?.count || 0;
    const topThree = three.list[0]?.count || 0;
    const maxPossible = Math.max(1, Math.max(two.comparisons, three.comparisons));

    // 입력번호가 특정 간격에서 다시 잡히는 비율
    const twoRate = two.comparisons ? two.patternHits / two.comparisons : 0;
    const threeRate = three.comparisons ? three.patternHits / three.comparisons : 0;

    // 후보 집중도: 상위 후보가 비교 횟수 대비 얼마나 반복되는지
    const concentration = Math.max(
      two.comparisons ? topTwo / two.comparisons : 0,
      three.comparisons ? topThree / three.comparisons : 0
    );

    // 입력번호 자체가 상위 패턴 후보 안에 남아있는 정도
    const topSet = new Set([...two.list.slice(0,10), ...three.list.slice(0,10)].map(x=>x.n));
    const preserved = nums.filter(n=>topSet.has(n)).length;
    const preserveRate = nums.length ? preserved / nums.length : 0;

    // Pattern 점수: 반복률 + 집중도 + 기준번호 보존율
    const pattern = Math.round(Math.min(100,
      Math.max(twoRate, threeRate) * 42 +
      concentration * 38 +
      preserveRate * 20
    ));

    // Replay 예비값: 재현 발생률 중심
    const replay = Math.round(Math.min(100, Math.max(twoRate, threeRate) * 100));

    // Flow/Dream 예비값: 아직 전문 Flow 엔진 전 단계이므로 Pattern 기반 보조값
    const flow = Math.round(Math.min(100, pattern * 0.65 + preserveRate * 25));
    const dream = Math.round(Math.min(100, pattern * 0.55 + replay * 0.25 + preserveRate * 20));

    const mode = topTwo >= topThree ? "2계열" : "3계열";
    const topA = mode === "2계열" ? topTwo : topThree;
    const compareA = mode === "2계열" ? two.comparisons : three.comparisons;

    return {
      key: nums.join(','),
      pattern,
      replay,
      flow,
      dream,
      patternNote:`${mode} 우세 · TOP ${topA}회 / 비교 ${compareA}`,
      replayNote:`2계열 ${Math.round(twoRate*100)}% · 3계열 ${Math.round(threeRate*100)}%`,
      flowNote:`보존 ${preserved}/${nums.length} · 집중 ${Math.round(concentration*100)}%`,
      dreamNote:`샘플 ${samples.length}회 · 기준 ${nums.length}개`,
      _debug:{rows:rows.length,samples:samples.length,two,three}
    };
  }

  window.readPatternScoreFor = realPatternScoreV165;
})();




/* =========================================================
   v1.6.5 Final Pattern Score + Reason Link
   - combo.js 내부 lottoData 직접 사용
   - pattern.html 저장값(pattern_engine_result) 우선 사용
   - 없으면 combo.js 내부에서 즉시 계산
   - Pattern / Replay / Flow / Dream 산출근거 표시
   - AI Score / Confidence에 Pattern Engine 반영
========================================================= */

function aiCoreClamp165(v,min=0,max=100){
  return Math.max(min,Math.min(max,Math.round(Number(v)||0)));
}

function aiCoreNums165(nums){
  return Array.from(new Set((nums||[]).map(Number).filter(n=>n>=1&&n<=45))).sort((a,b)=>a-b);
}

function aiCoreRows165(){
  const rows = Array.isArray(lottoData) ? lottoData : [];
  return rows.slice().sort((a,b)=>Number(a.round)-Number(b.round));
}

function aiCoreCurrentRows165(){
  const rows = aiCoreRows165();
  if(matchRange==='50') return rows.slice(-50);
  if(matchRange==='100') return rows.slice(-100);
  return rows;
}

function aiCorePool165(row){
  const nums = (row.numbers||[]).map(Number).filter(n=>n>=1&&n<=45);
  if(includeBonus() && row.bonus) nums.push(Number(row.bonus));
  return nums;
}

function aiCoreHitCount165(row,nums){
  const p = new Set(aiCorePool165(row));
  return nums.filter(n=>p.has(n)).length;
}

function aiCoreSampleRows165(nums){
  const rows = aiCoreCurrentRows165();
  const threshold = nums.length>=4 ? 3 : Math.max(2, nums.length);
  let samples = rows.filter(r=>aiCoreHitCount165(r,nums)>=threshold);
  if(samples.length<5){
    samples = rows.filter(r=>aiCoreHitCount165(r,nums)>=Math.max(1,threshold-1));
  }
  return samples.slice(-50);
}

function aiCorePrev165(rows,row,gap){
  const r = Number(row.round);
  let found = rows.find(x=>Number(x.round)===r-gap);
  if(found) return found;
  const idx = rows.findIndex(x=>Number(x.round)===r);
  if(idx>=gap) return rows[idx-gap];
  return null;
}

function aiCoreGapPattern165(rows,samples,gaps,nums){
  const freq = {};
  let comparisons = 0;
  let reproduced = 0;
  let preserved = 0;

  samples.forEach(row=>{
    gaps.forEach(g=>{
      const prev = aiCorePrev165(rows,row,g);
      if(!prev) return;
      comparisons++;
      const pool = aiCorePool165(prev);
      const hits = nums.filter(n=>pool.includes(n));
      if(hits.length) reproduced++;
      preserved += hits.length;
      pool.forEach(n=>freq[n]=(freq[n]||0)+1);
    });
  });

  const list = Object.entries(freq)
    .map(([n,c])=>({n:Number(n),count:c}))
    .sort((a,b)=>b.count-a.count || a.n-b.n);

  return {gaps,comparisons,reproduced,preserved,list};
}

function aiCoreReplay165(samples,candidates,mode){
  const picks = candidates.slice(0,6).map(x=>x.n);
  const gaps = mode==='3계열' ? [3,6,9,12,15] : [2,4,6,8,10,12,14,16,18,20,22,24];
  const rows = aiCoreCurrentRows165();
  let checks=0,hits=0;
  const hitNums = {};
  picks.forEach(n=>hitNums[n]=0);

  samples.forEach(row=>{
    gaps.forEach(g=>{
      const prev = aiCorePrev165(rows,row,g);
      if(!prev) return;
      checks++;
      const pool = aiCorePool165(prev);
      const local = picks.filter(n=>pool.includes(n));
      if(local.length){
        hits++;
        local.forEach(n=>hitNums[n]++);
      }
    });
  });

  const topNums = Object.entries(hitNums)
    .map(([n,c])=>({n:Number(n),count:c}))
    .filter(x=>x.count>0)
    .sort((a,b)=>b.count-a.count||a.n-b.n);

  const rate = checks ? hits/checks : 0;
  const score = aiCoreClamp165(rate*75 + Math.min(25,(topNums[0]?.count||0)*3));
  return {score,checks,hits,rate,topNums};
}

function aiCoreFlow165(samples,mode){
  const gaps = mode==='3계열' ? [3,6,9,12,15] : [2,4,6,8,10,12];
  const chains = {};
  const rows = aiCoreCurrentRows165();

  samples.forEach(row=>{
    gaps.forEach(g=>{
      const a = aiCorePrev165(rows,row,g*2);
      const b = aiCorePrev165(rows,row,g);
      if(!a || !b) return;
      const aa = aiCorePool165(a);
      const bb = aiCorePool165(b);
      const cc = aiCorePool165(row);
      aa.forEach(x=>bb.forEach(y=>cc.forEach(z=>{
        if(x===y && y===z) return;
        const k = `${x}-${y}-${z}`;
        chains[k]=(chains[k]||0)+1;
      })));
    });
  });

  const list = Object.entries(chains)
    .map(([k,c])=>({chain:k.split('-').map(Number),count:c}))
    .sort((a,b)=>b.count-a.count||a.chain[0]-b.chain[0])
    .slice(0,10);

  const max = list[0]?.count || 0;
  const score = aiCoreClamp165(max*10 + Math.min(35,list.length*3));
  return {score,list,max};
}

function aiCoreLocalPatternResult165(nums){
  nums = aiCoreNums165(nums);
  const rows = aiCoreCurrentRows165();
  const samples = aiCoreSampleRows165(nums);

  if(!rows.length || !nums.length){
    return {
      key: nums.join(','),
      pattern:0,replay:0,flow:0,dream:0,confidence:55,
      mode:'데이터 대기',
      reasons:{pattern:'데이터 대기',replay:'데이터 대기',flow:'데이터 대기',dream:'데이터 대기'},
      topNumbers:[]
    };
  }

  const p2 = aiCoreGapPattern165(rows,samples,[2,4,6,8,10,12,14,16,18,20,22,24],nums);
  const p3 = aiCoreGapPattern165(rows,samples,[3,6,9,12,15],nums);
  const top2 = p2.list[0]?.count || 0;
  const top3 = p3.list[0]?.count || 0;
  const mode = top2>=top3 ? '2계열' : '3계열';
  const main = mode==='2계열' ? p2 : p3;

  const maxCompare = Math.max(1,main.comparisons);
  const repeatRate = main.comparisons ? main.reproduced/main.comparisons : 0;
  const concentration = main.list[0]?.count ? (main.list[0].count / maxCompare) : 0;
  const topSet = new Set(main.list.slice(0,10).map(x=>x.n));
  const keepCount = nums.filter(n=>topSet.has(n)).length;
  const keepRate = nums.length ? keepCount/nums.length : 0;

  const patternScore = aiCoreClamp165(repeatRate*45 + concentration*35 + keepRate*20);

  const candidates = main.list.slice(0,10).map((x,idx)=>({
    n:x.n,
    score: aiCoreClamp165((x.count/(main.list[0]?.count||1))*70 + Math.max(0,30-idx*3)),
    count:x.count
  }));

  nums.forEach(n=>{
    if(!candidates.some(x=>x.n===n)){
      candidates.push({n,score:Math.round(keepRate*40),count:0});
    }
  });
  candidates.sort((a,b)=>b.score-a.score||a.n-b.n);

  const replayObj = aiCoreReplay165(samples,candidates,mode);
  const flowObj = aiCoreFlow165(samples,mode);
  const dreamScore = aiCoreClamp165(patternScore*0.38 + replayObj.score*0.32 + flowObj.score*0.20 + keepRate*10);
  const confidence = aiCoreClamp165(55 + patternScore*0.18 + replayObj.score*0.14 + flowObj.score*0.08 + keepRate*10,55,98);

  const topNumbers = candidates.slice(0,6).map(x=>x.n).sort((a,b)=>a-b);

  return {
    key: nums.join(','),
    pattern:patternScore,
    replay:replayObj.score,
    flow:flowObj.score,
    dream:dreamScore,
    confidence,
    mode,
    sampleCount:samples.length,
    repeatRate:Math.round(repeatRate*100),
    concentration:Math.round(concentration*100),
    keepCount,
    inputCount:nums.length,
    topNumbers,
    chains:flowObj.list.slice(0,3),
    replayTop:replayObj.topNums.slice(0,6),
    reasons:{
      pattern:`${samples.length}개 샘플 · ${mode} 우세 · 반복률 ${Math.round(repeatRate*100)}% · TOP ${main.list[0]?.n||'-'} ${main.list[0]?.count||0}회`,
      replay:`${replayObj.hits}/${replayObj.checks} 재현 · 재현율 ${Math.round(replayObj.rate*100)}%`,
      flow:flowObj.list.length ? `최고 흐름 ${flowObj.list[0].chain.join('→')} · ${flowObj.list[0].count}회` : '반복 흐름 후보 부족',
      dream:`기준번호 유지 ${keepCount}/${nums.length} · Pattern+Replay+Flow 종합`
    }
  };
}

function readPatternScoreFor(nums){
  const key = aiCoreNums165(nums).join(',');
  try{
    const raw = localStorage.getItem('pattern_engine_result');
    if(raw){
      const saved = JSON.parse(raw);
      if(saved && saved.key === key){
        return {
          ...saved,
          patternNote:saved.reasons?.pattern || saved.patternNote,
          replayNote:saved.reasons?.replay || saved.replayNote,
          flowNote:saved.reasons?.flow || saved.flowNote,
          dreamNote:saved.reasons?.dream || saved.dreamNote
        };
      }
    }
  }catch(e){}
  const local = aiCoreLocalPatternResult165(nums);
  try{ localStorage.setItem('pattern_engine_result',JSON.stringify(local)); }catch(e){}
  return {
    ...local,
    patternNote:local.reasons.pattern,
    replayNote:local.reasons.replay,
    flowNote:local.reasons.flow,
    dreamNote:local.reasons.dream
  };
}

function renderEngineReasonBlock165(patternLink){
  if(!patternLink) return '';
  const nums = patternLink.topNumbers || [];
  const chainText = (patternLink.chains||[]).length
    ? patternLink.chains.map(x=>`${x.chain.join('→')} ${x.count}회`).join(' · ')
    : '흐름 후보 부족';
  const replayText = (patternLink.replayTop||[]).length
    ? patternLink.replayTop.map(x=>`${x.n}번 ${x.count}회`).join(' · ')
    : '재현번호 부족';

  return `<div class="ai-engine-reason">
    <b>Pattern Engine 산출근거</b>
    <p class="combo-guide">우세계열: ${patternLink.mode||'-'} · 샘플 ${patternLink.sampleCount||0}회 · 기준번호 유지 ${patternLink.keepCount||0}/${patternLink.inputCount||0}</p>
    <p class="combo-guide">TOP 후보: ${nums.length ? nums.map(n=>`${n}번`).join(' · ') : '없음'}</p>
    <p class="combo-guide">재현번호: ${replayText}</p>
    <p class="combo-guide">Dream Chain 흐름: ${chainText}</p>
  </div>`;
}

function renderAIScoreCard(c,maxes){
  const companion=pctOf(c.parts.companion,maxes.companion);
  const trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend);
  const structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure);
  const longlearn=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn);

  const patternLink = readPatternScoreFor(c.nums);
  const patternScore = patternLink ? Math.round(patternLink.pattern || 0) : 0;
  const replayScore = patternLink ? Math.round(patternLink.replay || 0) : 0;
  const flowScore = patternLink ? Math.round(patternLink.flow || 0) : 0;
  const dreamScore = patternLink ? Math.round(patternLink.dream || 0) : 0;

  const baseAvg = Math.round((companion+trend+structure+longlearn)/4);
  const patternAvg = Math.round((patternScore+replayScore+flowScore+dreamScore)/4);
  const total = aiCoreClamp165(c.trust*0.62 + patternAvg*0.28 + baseAvg*0.10,55,98);
  const confidence = aiCoreClamp165((patternLink?.confidence||70)*0.55 + baseAvg*0.25 + total*0.20,55,98);
  const coreGrade = aiScoreGrade(total);
  const confidenceGrade = aiScoreGrade(confidence);

  return `<div class="ai-score-card ai-score-v163">
    <div class="ai-score-head">
      <b>AI Score Card</b>
      <span>${c.grade} · ${total}점</span>
    </div>

    <div class="ai-core-summary">
      <div><b>${coreGrade}</b><span>AI Score</span></div>
      <div><b>${confidence}%</b><span>Confidence ${confidenceGrade}</span></div>
      <div><b>${aiScoreJudge(total)}</b><span>AI 판단</span></div>
    </div>

    <div class="ai-core-title">기존 AI 엔진</div>
    <div class="ai-core-grid">
      ${renderCoreMetric('Companion',companion,'동반번호·쌍번호 강도')}
      ${renderCoreMetric('Trend',trend,'최근 흐름과 장기 출현')}
      ${renderCoreMetric('Structure',structure,'구간균형·홀짝구성')}
      ${renderCoreMetric('Learning',longlearn,'과거 적중·구조학습')}
    </div>

    <div class="ai-core-title">Pattern Engine 연동</div>
    <div class="ai-core-grid">
      ${renderCoreMetric('Pattern',patternScore,patternLink.patternNote || '패턴 후보 강도')}
      ${renderCoreMetric('Replay',replayScore,patternLink.replayNote || '패턴 재현율')}
      ${renderCoreMetric('Flow',flowScore,patternLink.flowNote || '흐름분석')}
      ${renderCoreMetric('Dream',dreamScore,patternLink.dreamNote || 'Dream Chain 반영')}
    </div>

    ${renderEngineReasonBlock165(patternLink)}

    <details class="ai-score-detail">
      <summary>AI 계산 근거 자세히 보기</summary>
      <p class="combo-guide">기존 원점수: 동반 ${Math.round(c.parts.companion)} · 균형 ${c.parts.balance} · 홀짝 ${c.parts.oddEven} · 추세 ${(c.parts.recent||0)+(c.parts.long||0)} · 장기 ${Math.round(c.parts.historical||0)} · 학습 ${Math.round(c.parts.learned||0)}</p>
      <p class="combo-guide">Pattern Engine: ${patternLink.reasons?.pattern || patternLink.patternNote}</p>
      <p class="combo-guide">Replay: ${patternLink.reasons?.replay || patternLink.replayNote}</p>
      <p class="combo-guide">Flow: ${patternLink.reasons?.flow || patternLink.flowNote}</p>
      <p class="combo-guide">Dream: ${patternLink.reasons?.dream || patternLink.dreamNote}</p>
      <p class="combo-guide">Confidence는 당첨 확률이 아니라 분석 근거의 일관성 표시입니다.</p>
    </details>
  </div>`;
}

(function injectAIScoreV165FinalStyle(){
  if(document.getElementById('aiScoreV165FinalStyle'))return;
  const st=document.createElement('style');
  st.id='aiScoreV165FinalStyle';
  st.textContent=`
    .ai-engine-reason{background:#fff;border:1px dashed #e8c875;border-radius:14px;padding:10px;margin-top:10px}
    .ai-engine-reason b{color:#8a5b00}
    .ai-engine-reason p{margin:5px 0}
  `;
  document.head.appendChild(st);
})();



/* =========================================================
   v1.6.6 Final
   - 산출근거 100% 실시간 재계산
   - Replay / Flow / Dream 근거 상세화
   - AI Score 계산식 시각화
   - Pattern Engine + Dream Chain 통합 후보 생성
   - localStorage 저장값은 참고만 하고, combo 화면에서는 현재 조건 기준 재계산
========================================================= */

function v166Clamp(v,min=0,max=100){
  return Math.max(min, Math.min(max, Math.round(Number(v)||0)));
}
function v166Nums(nums){
  return Array.from(new Set((nums||[]).map(Number).filter(n=>n>=1&&n<=45))).sort((a,b)=>a-b);
}
function v166Rows(){
  const base = Array.isArray(lottoData) ? lottoData : (Array.isArray(window.LOTTO_DATA) ? window.LOTTO_DATA : []);
  return base.slice().sort((a,b)=>Number(a.round)-Number(b.round));
}
function v166RangeRows(){
  const rows=v166Rows();
  if(matchRange==='50') return rows.slice(-50);
  if(matchRange==='100') return rows.slice(-100);
  return rows;
}
function v166Pool(row){
  if(!row)return [];
  const arr=(row.numbers||[]).map(Number).filter(n=>n>=1&&n<=45);
  if(includeBonus && includeBonus() && row.bonus) arr.push(Number(row.bonus));
  return arr;
}
function v166Hit(row,nums){
  const s=new Set(v166Pool(row));
  return nums.filter(n=>s.has(n)).length;
}
function v166SampleRows(nums){
  const rows=v166RangeRows();
  const minHit = nums.length>=4 ? 3 : Math.max(2, nums.length);
  let samples = rows.filter(r=>v166Hit(r,nums)>=minHit);
  if(samples.length<6 && minHit>1) samples = rows.filter(r=>v166Hit(r,nums)>=minHit-1);
  return samples.slice(-50);
}
function v166Prev(rows,row,gap){
  const r=Number(row.round);
  const exact=rows.find(x=>Number(x.round)===r-gap);
  if(exact)return exact;
  const idx=rows.findIndex(x=>Number(x.round)===r);
  return idx>=gap ? rows[idx-gap] : null;
}
function v166FreqByGaps(rows,samples,gaps,nums){
  const freq={}, keep={}, byGap={}, pair={}, triples={};
  let comparisons=0, reproduced=0, preserved=0;

  samples.forEach(row=>{
    gaps.forEach(g=>{
      const prev=v166Prev(rows,row,g);
      if(!prev)return;
      comparisons++;
      byGap[g]=byGap[g]||{checks:0,hits:0,freq:{}};
      byGap[g].checks++;

      const pool=v166Pool(prev);
      const hitNums=nums.filter(n=>pool.includes(n));
      if(hitNums.length){
        reproduced++;
        byGap[g].hits++;
      }
      hitNums.forEach(n=>{
        keep[n]=(keep[n]||0)+1;
        preserved++;
      });
      pool.forEach(n=>{
        freq[n]=(freq[n]||0)+1;
        byGap[g].freq[n]=(byGap[g].freq[n]||0)+1;
      });

      // pair / 3-number groups inside each previous round
      const unique=Array.from(new Set(pool)).sort((a,b)=>a-b);
      for(let i=0;i<unique.length;i++){
        for(let j=i+1;j<unique.length;j++){
          const k=`${unique[i]}-${unique[j]}`;
          pair[k]=(pair[k]||0)+1;
          for(let z=j+1;z<unique.length;z++){
            const t=`${unique[i]}-${unique[j]}-${unique[z]}`;
            triples[t]=(triples[t]||0)+1;
          }
        }
      }
    });
  });

  const list=Object.entries(freq).map(([n,c])=>({n:Number(n),count:c}))
    .sort((a,b)=>b.count-a.count||a.n-b.n);
  const keepList=Object.entries(keep).map(([n,c])=>({n:Number(n),count:c}))
    .sort((a,b)=>b.count-a.count||a.n-b.n);
  const pairList=Object.entries(pair).map(([k,c])=>({nums:k.split('-').map(Number),count:c}))
    .sort((a,b)=>b.count-a.count||a.nums[0]-b.nums[0]).slice(0,8);
  const tripleList=Object.entries(triples).map(([k,c])=>({nums:k.split('-').map(Number),count:c}))
    .sort((a,b)=>b.count-a.count||a.nums[0]-b.nums[0]).slice(0,8);

  return {gaps,comparisons,reproduced,preserved,list,keepList,pairList,tripleList,byGap};
}
function v166ReplayForCandidates(rows,samples,candidates,mode){
  const picks=candidates.slice(0,8).map(x=>x.n);
  const gaps=mode==='3계열' ? [3,6,9,12,15] : [2,4,6,8,10,12,14,16,18,20,22,24];
  let checks=0,hits=0;
  const hitMap={};
  picks.forEach(n=>hitMap[n]=0);

  samples.forEach(row=>{
    gaps.forEach(g=>{
      const prev=v166Prev(rows,row,g);
      if(!prev)return;
      checks++;
      const pool=v166Pool(prev);
      const local=picks.filter(n=>pool.includes(n));
      if(local.length){
        hits++;
        local.forEach(n=>hitMap[n]++);
      }
    });
  });

  const topNums=Object.entries(hitMap).map(([n,c])=>({n:Number(n),count:c}))
    .filter(x=>x.count>0).sort((a,b)=>b.count-a.count||a.n-b.n);
  const rate=checks?hits/checks:0;
  const score=v166Clamp(rate*78 + Math.min(22,(topNums[0]?.count||0)*2.2));
  return {score,checks,hits,rate,topNums};
}
function v166FlowChains(rows,samples,mode){
  const gaps=mode==='3계열' ? [3,6,9,12,15] : [2,4,6,8,10,12];
  const chainMap={}, preserveMap={};
  samples.forEach(row=>{
    gaps.forEach(g=>{
      const a=v166Prev(rows,row,g*2);
      const b=v166Prev(rows,row,g);
      if(!a||!b)return;
      const aa=v166Pool(a), bb=v166Pool(b), cc=v166Pool(row);
      aa.forEach(x=>bb.forEach(y=>cc.forEach(z=>{
        const key=`${x}-${y}-${z}`;
        chainMap[key]=(chainMap[key]||0)+1;
        if(x===y || y===z || x===z) preserveMap[key]=(preserveMap[key]||0)+1;
      })));
    });
  });
  const list=Object.entries(chainMap).map(([k,c])=>({
    chain:k.split('-').map(Number), count:c, preserve:preserveMap[k]||0
  })).sort((a,b)=>b.count-a.count || b.preserve-a.preserve || a.chain[0]-b.chain[0]).slice(0,12);
  const max=list[0]?.count||0;
  const density=list.length?Math.round(list.slice(0,5).reduce((s,x)=>s+x.count,0)/Math.max(1,list.length)):0;
  const score=v166Clamp(max*8 + density*2 + Math.min(20,list.length*2));
  return {score,list,max,density};
}
function v166MergeCandidateScores(nums,main,other,replay,flow){
  const scoreMap={};
  function add(n,score,tag){
    n=Number(n);
    if(n<1||n>45)return;
    scoreMap[n]=scoreMap[n]||{n,score:0,tags:new Set(),pattern:0,replay:0,flow:0,base:0};
    scoreMap[n].score+=score;
    scoreMap[n].tags.add(tag);
    if(tag==='패턴') scoreMap[n].pattern+=score;
    if(tag==='재현') scoreMap[n].replay+=score;
    if(tag==='흐름') scoreMap[n].flow+=score;
    if(tag==='기준') scoreMap[n].base+=score;
  }

  const maxMain=main.list[0]?.count||1;
  main.list.slice(0,12).forEach((x,i)=>add(x.n, Math.max(2,32*(x.count/maxMain)-i), '패턴'));
  const maxOther=other.list[0]?.count||1;
  other.list.slice(0,8).forEach((x,i)=>add(x.n, Math.max(1,14*(x.count/maxOther)-i), '보조'));

  replay.topNums.slice(0,8).forEach((x,i)=>add(x.n, Math.max(2,26*(x.count/(replay.topNums[0]?.count||1))-i), '재현'));
  flow.list.slice(0,8).forEach((x,i)=>x.chain.forEach(n=>add(n, Math.max(1,18*(x.count/(flow.list[0]?.count||1))-i), '흐름')));
  nums.forEach(n=>add(n, 10, '기준'));

  return Object.values(scoreMap).map(x=>({
    n:x.n,
    score:Math.round(x.score),
    tags:Array.from(x.tags),
    detail:x
  })).sort((a,b)=>b.score-a.score||a.n-b.n);
}
function readPatternScoreFor(nums){
  nums=v166Nums(nums);
  const rows=v166RangeRows();
  const samples=v166SampleRows(nums);

  if(!rows.length || !nums.length){
    return {
      key:nums.join(','), pattern:0,replay:0,flow:0,dream:0,confidence:55,
      mode:'데이터 대기', sampleCount:0, comparisons:0, keepCount:0, inputCount:nums.length,
      topNumbers:[], replayTop:[], chains:[], pairGroups:[], tripleGroups:[],
      reasons:{pattern:'데이터 대기',replay:'재현번호 부족',flow:'흐름 후보 부족',dream:'Dream 대기'}
    };
  }

  const p2=v166FreqByGaps(rows,samples,[2,4,6,8,10,12,14,16,18,20,22,24],nums);
  const p3=v166FreqByGaps(rows,samples,[3,6,9,12,15],nums);
  const top2=p2.list[0]?.count||0;
  const top3=p3.list[0]?.count||0;
  const mode=top2>=top3?'2계열':'3계열';
  const main=mode==='2계열'?p2:p3;
  const other=mode==='2계열'?p3:p2;

  const repeatRate=main.comparisons?main.reproduced/main.comparisons:0;
  const concentration=main.comparisons?((main.list[0]?.count||0)/main.comparisons):0;
  const topSet=new Set(main.list.slice(0,10).map(x=>x.n));
  const keepCount=nums.filter(n=>topSet.has(n)).length;
  const keepRate=nums.length?keepCount/nums.length:0;

  const preliminary=main.list.slice(0,10).map((x,i)=>({n:x.n,count:x.count,score:v166Clamp((x.count/(main.list[0]?.count||1))*80 + Math.max(0,20-i*2))}));
  nums.forEach(n=>{ if(!preliminary.some(x=>x.n===n)) preliminary.push({n,count:0,score:12}); });

  const replay=v166ReplayForCandidates(rows,samples,preliminary,mode);
  const flow=v166FlowChains(rows,samples,mode);
  const merged=v166MergeCandidateScores(nums,main,other,replay,flow);

  const finalNums=merged.slice(0,6).map(x=>x.n).sort((a,b)=>a-b);
  const dreamKeep=finalNums.filter(n=>nums.includes(n)).length;
  const dreamSupport=finalNums.filter(n=>{
    const m=merged.find(x=>x.n===n);
    return m && (m.tags.includes('재현') || m.tags.includes('흐름'));
  }).length;

  const patternScore=v166Clamp(repeatRate*34 + concentration*34 + keepRate*18 + Math.min(14,(main.list[0]?.count||0)/2));
  const replayScore=replay.score;
  const flowScore=flow.score;
  const dreamScore=v166Clamp(patternScore*0.24 + replayScore*0.28 + flowScore*0.24 + (dreamKeep/Math.max(1,nums.length))*12 + (dreamSupport/6)*12);
  const confidence=v166Clamp(58 + patternScore*0.13 + replayScore*0.15 + flowScore*0.08 + dreamScore*0.12,55,98);

  const result={
    key:nums.join(','),
    pattern:patternScore,
    replay:replayScore,
    flow:flowScore,
    dream:dreamScore,
    confidence,
    mode,
    sampleCount:samples.length,
    comparisons:main.comparisons,
    repeatRate:Math.round(repeatRate*100),
    concentration:Math.round(concentration*100),
    keepCount,
    inputCount:nums.length,
    topNumbers:finalNums,
    patternTop:main.list.slice(0,8),
    replayTop:replay.topNums.slice(0,8),
    chains:flow.list.slice(0,6),
    pairGroups:main.pairList.slice(0,5),
    tripleGroups:main.tripleList.slice(0,5),
    dreamKeep,
    dreamSupport,
    reasons:{
      pattern:`${mode} 우세 · TOP ${main.list[0]?.n||'-'} ${main.list[0]?.count||0}회 / 비교 ${main.comparisons}`,
      replay:`${replay.hits}/${replay.checks} 재현 · 재현율 ${Math.round(replay.rate*100)}% · 핵심 ${replay.topNums.slice(0,3).map(x=>x.n).join(', ')||'-'}`,
      flow:flow.list.length ? `최고 흐름 ${flow.list[0].chain.join('→')} · ${flow.list[0].count}회 · 흐름후보 ${flow.list.length}개` : '반복 흐름 후보 부족',
      dream:`최종후보 ${finalNums.join(', ')} · 기준유지 ${dreamKeep}/${nums.length} · 재현/흐름 지지 ${dreamSupport}개`
    }
  };

  try{ localStorage.setItem('pattern_engine_result', JSON.stringify(result)); }catch(e){}
  return {
    ...result,
    patternNote:result.reasons.pattern,
    replayNote:result.reasons.replay,
    flowNote:result.reasons.flow,
    dreamNote:result.reasons.dream
  };
}
function v166ReasonBlock(p){
  const top=p.topNumbers||[];
  const patternTop=(p.patternTop||[]).slice(0,5).map(x=>`${x.n}번 ${x.count}회`).join(' · ') || '없음';
  const replay=(p.replayTop||[]).slice(0,5).map(x=>`${x.n}번 ${x.count}회`).join(' · ') || '재현번호 부족';
  const flow=(p.chains||[]).slice(0,4).map(x=>`${x.chain.join('→')} ${x.count}회`).join(' · ') || '흐름 후보 부족';
  const groups2=(p.pairGroups||[]).slice(0,3).map(x=>`${x.nums.join('-')} ${x.count}회`).join(' · ') || '부족';
  const groups3=(p.tripleGroups||[]).slice(0,3).map(x=>`${x.nums.join('-')} ${x.count}회`).join(' · ') || '부족';
  return `<div class="ai-engine-reason v166-reason">
    <b>Pattern Engine 산출근거</b>
    <p class="combo-guide">우세계열: ${p.mode} · 샘플 ${p.sampleCount}회 · 비교 ${p.comparisons}회 · 기준번호 유지 ${p.keepCount}/${p.inputCount}</p>
    <p class="combo-guide">TOP 후보: ${top.length?top.map(n=>`${n}번`).join(' · '):'없음'}</p>
    <p class="combo-guide">패턴번호: ${patternTop}</p>
    <p class="combo-guide">재현번호: ${replay}</p>
    <p class="combo-guide">Dream Chain 흐름: ${flow}</p>
    <p class="combo-guide">2번호군: ${groups2}</p>
    <p class="combo-guide">3번호군: ${groups3}</p>
  </div>`;
}
function v166FormulaBlock(vals){
  return `<div class="ai-score-formula">
    <b>AI Score 계산식</b>
    <div class="formula-grid">
      <span>기존 AI</span><b>${vals.baseAvg}</b>
      <span>Pattern 평균</span><b>${vals.patternAvg}</b>
      <span>기존 반영</span><b>${Math.round(vals.rawBase)}</b>
      <span>Pattern 반영</span><b>${Math.round(vals.rawPattern)}</b>
      <span>보정 반영</span><b>${Math.round(vals.rawTrust)}</b>
      <span>최종</span><b>${vals.total}</b>
    </div>
    <p class="combo-guide">계산: 기존 AI 45% + Pattern Engine 40% + 기존 신뢰보정 15%</p>
  </div>`;
}
function renderAIScoreCard(c,maxes){
  const companion=pctOf(c.parts.companion,maxes.companion);
  const trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend);
  const structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure);
  const longlearn=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn);

  const p=readPatternScoreFor(c.nums);
  const patternScore=v166Clamp(p.pattern);
  const replayScore=v166Clamp(p.replay);
  const flowScore=v166Clamp(p.flow);
  const dreamScore=v166Clamp(p.dream);

  const baseAvg=Math.round((companion+trend+structure+longlearn)/4);
  const patternAvg=Math.round((patternScore+replayScore+flowScore+dreamScore)/4);

  const rawBase=baseAvg*0.45;
  const rawPattern=patternAvg*0.40;
  const rawTrust=(c.trust||0)*0.15;
  const total=v166Clamp(rawBase+rawPattern+rawTrust,55,98);
  const confidence=v166Clamp((p.confidence||70)*0.60 + baseAvg*0.20 + total*0.20,55,98);
  const coreGrade=aiScoreGrade(total);
  const confidenceGrade=aiScoreGrade(confidence);

  return `<div class="ai-score-card ai-score-v166">
    <div class="ai-score-head">
      <b>AI Score Card</b>
      <span>${coreGrade}등급 · ${total}점</span>
    </div>

    <div class="ai-core-summary">
      <div><b>${coreGrade}</b><span>AI Score</span></div>
      <div><b>${confidence}%</b><span>Confidence ${confidenceGrade}</span></div>
      <div><b>${aiScoreJudge(total)}</b><span>AI 판단</span></div>
    </div>

    <div class="ai-core-title">기존 AI 엔진</div>
    <div class="ai-core-grid">
      ${renderCoreMetric('Companion',companion,'동반번호·쌍번호 강도')}
      ${renderCoreMetric('Trend',trend,'최근 흐름과 장기 출현')}
      ${renderCoreMetric('Structure',structure,'구간균형·홀짝구성')}
      ${renderCoreMetric('Learning',longlearn,'과거 적중·구조학습')}
    </div>

    <div class="ai-core-title">Pattern Engine 연동</div>
    <div class="ai-core-grid">
      ${renderCoreMetric('Pattern',patternScore,p.patternNote)}
      ${renderCoreMetric('Replay',replayScore,p.replayNote)}
      ${renderCoreMetric('Flow',flowScore,p.flowNote)}
      ${renderCoreMetric('Dream',dreamScore,p.dreamNote)}
    </div>

    ${v166ReasonBlock(p)}
    ${v166FormulaBlock({baseAvg,patternAvg,rawBase,rawPattern,rawTrust,total})}

    <details class="ai-score-detail">
      <summary>AI 계산 근거 자세히 보기</summary>
      <p class="combo-guide">기존 원점수: 동반 ${Math.round(c.parts.companion)} · 균형 ${c.parts.balance} · 홀짝 ${c.parts.oddEven} · 추세 ${(c.parts.recent||0)+(c.parts.long||0)} · 장기 ${Math.round(c.parts.historical||0)} · 학습 ${Math.round(c.parts.learned||0)}</p>
      <p class="combo-guide">Pattern: ${p.reasons.pattern}</p>
      <p class="combo-guide">Replay: ${p.reasons.replay}</p>
      <p class="combo-guide">Flow: ${p.reasons.flow}</p>
      <p class="combo-guide">Dream: ${p.reasons.dream}</p>
      <p class="combo-guide">Confidence는 당첨 확률이 아니라 분석 근거의 일관성 표시입니다.</p>
    </details>
  </div>`;
}

(function injectV166Style(){
  if(document.getElementById('aiScoreV166FinalStyle'))return;
  const st=document.createElement('style');
  st.id='aiScoreV166FinalStyle';
  st.textContent=`
    .ai-score-v166 .v166-reason{background:#fffdf6;border:1px dashed #e1bd5c;border-radius:16px;padding:14px;margin-top:12px}
    .ai-score-v166 .v166-reason b{display:block;color:#8a5b00;margin-bottom:8px}
    .ai-score-v166 .v166-reason p{margin:6px 0}
    .ai-score-formula{margin-top:12px;padding:14px;border:1px solid #ead48e;border-radius:16px;background:#fffaf0}
    .ai-score-formula>b{display:block;color:#8a5b00;margin-bottom:10px}
    .formula-grid{display:grid;grid-template-columns:1fr auto;gap:8px 12px;font-size:14px}
    .formula-grid span{color:#6b7280}
    .formula-grid b{color:#123466;text-align:right}
  `;
  document.head.appendChild(st);
})();



/* =========================================================
   v1.6.7 Final Display Fix
   - AI Score Card 표시 안정화
   - renderCompanion 오류가 있어도 조합별 출현 이력은 반드시 표시
   - Pattern/Dream Chain 계산 오류 시에도 fallback Score Card 표시
========================================================= */

function v167SafeNum(v, d=0){ v=Number(v); return Number.isFinite(v)?v:d; }
function v167Clamp(v,min=0,max=100){ return Math.max(min,Math.min(max,Math.round(v167SafeNum(v)))); }

function v167SafePattern(nums){
  try{
    const p = readPatternScoreFor(nums);
    if(p && typeof p === 'object'){
      p.pattern = v167Clamp(p.pattern);
      p.replay = v167Clamp(p.replay);
      p.flow = v167Clamp(p.flow);
      p.dream = v167Clamp(p.dream);
      p.confidence = v167Clamp(p.confidence || 70,55,98);
      p.reasons = p.reasons || {};
      p.patternNote = p.patternNote || p.reasons.pattern || 'Pattern 계산 완료';
      p.replayNote = p.replayNote || p.reasons.replay || 'Replay 계산 완료';
      p.flowNote = p.flowNote || p.reasons.flow || 'Flow 계산 완료';
      p.dreamNote = p.dreamNote || p.reasons.dream || 'Dream 계산 완료';
      return p;
    }
  }catch(e){
    console.warn('v1.6.7 Pattern fallback', e);
  }
  return {
    pattern:0,replay:0,flow:0,dream:0,confidence:60,
    mode:'대기',sampleCount:0,comparisons:0,keepCount:0,inputCount:(nums||[]).length,
    topNumbers:[],patternTop:[],replayTop:[],chains:[],pairGroups:[],tripleGroups:[],
    reasons:{
      pattern:'Pattern 계산 대기',
      replay:'Replay 계산 대기',
      flow:'Flow 계산 대기',
      dream:'Dream 계산 대기'
    },
    patternNote:'Pattern 계산 대기',
    replayNote:'Replay 계산 대기',
    flowNote:'Flow 계산 대기',
    dreamNote:'Dream 계산 대기'
  };
}

function v167Metric(label,score,note){
  const safe=v167Clamp(score);
  return `<div class="ai-core-metric">
    <div class="ai-core-metric-top"><b>${label}</b><span>${safe}점</span></div>
    <div class="ai-core-bar"><i style="width:${Math.max(6,safe)}%"></i></div>
    <p>${note||''}</p>
  </div>`;
}

function v167ReasonBlock(p){
  const top=(p.topNumbers||[]).slice(0,6);
  const patternTop=(p.patternTop||[]).slice(0,5).map(x=>`${x.n}번 ${x.count}회`).join(' · ') || '표시 가능한 후보 부족';
  const replay=(p.replayTop||[]).slice(0,5).map(x=>`${x.n}번 ${x.count}회`).join(' · ') || '재현번호 부족';
  const flow=(p.chains||[]).slice(0,4).map(x=>{
    const chain = x.chain || x.nums || [];
    return `${chain.join('→')} ${x.count}회`;
  }).join(' · ') || '흐름 후보 부족';
  return `<div class="ai-engine-reason v167-reason">
    <b>Pattern Engine 산출근거</b>
    <p class="combo-guide">우세계열: ${p.mode||'-'} · 샘플 ${p.sampleCount||0}회 · 비교 ${p.comparisons||0}회 · 기준번호 유지 ${p.keepCount||0}/${p.inputCount||0}</p>
    <p class="combo-guide">TOP 후보: ${top.length ? top.map(n=>`${n}번`).join(' · ') : '없음'}</p>
    <p class="combo-guide">패턴번호: ${patternTop}</p>
    <p class="combo-guide">재현번호: ${replay}</p>
    <p class="combo-guide">Dream Chain 흐름: ${flow}</p>
  </div>`;
}

function v167AIScoreCard(c,maxes){
  const companion=pctOf(c.parts.companion,maxes.companion);
  const trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend);
  const structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure);
  const learning=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn);
  const p=v167SafePattern(c.nums);

  const patternAvg=Math.round((p.pattern+p.replay+p.flow+p.dream)/4);
  const baseAvg=Math.round((companion+trend+structure+learning)/4);
  const total=v167Clamp(baseAvg*0.45 + patternAvg*0.40 + (c.trust||0)*0.15,55,98);
  const confidence=v167Clamp((p.confidence||70)*0.60 + baseAvg*0.20 + total*0.20,55,98);
  const grade=aiScoreGrade(total);
  const confGrade=aiScoreGrade(confidence);

  return `<div class="ai-score-card ai-score-v167">
    <div class="ai-score-head"><b>AI Score Card</b><span>${grade}등급 · ${total}점</span></div>
    <div class="ai-core-summary">
      <div><b>${grade}</b><span>AI Score</span></div>
      <div><b>${confidence}%</b><span>Confidence ${confGrade}</span></div>
      <div><b>${aiScoreJudge(total)}</b><span>AI 판단</span></div>
    </div>

    <div class="ai-core-title">기존 AI 엔진</div>
    <div class="ai-core-grid">
      ${v167Metric('Companion',companion,'동반번호·쌍번호 강도')}
      ${v167Metric('Trend',trend,'최근 흐름과 장기 출현')}
      ${v167Metric('Structure',structure,'구간균형·홀짝구성')}
      ${v167Metric('Learning',learning,'과거 적중·구조학습')}
    </div>

    <div class="ai-core-title">Pattern Engine 연동</div>
    <div class="ai-core-grid">
      ${v167Metric('Pattern',p.pattern,p.patternNote)}
      ${v167Metric('Replay',p.replay,p.replayNote)}
      ${v167Metric('Flow',p.flow,p.flowNote)}
      ${v167Metric('Dream',p.dream,p.dreamNote)}
    </div>

    ${v167ReasonBlock(p)}

    <div class="ai-score-formula">
      <b>AI Score 계산식</b>
      <div class="formula-grid">
        <span>기존 AI 평균</span><b>${baseAvg}</b>
        <span>Pattern 평균</span><b>${patternAvg}</b>
        <span>기존 반영 45%</span><b>${Math.round(baseAvg*0.45)}</b>
        <span>Pattern 반영 40%</span><b>${Math.round(patternAvg*0.40)}</b>
        <span>신뢰 보정 15%</span><b>${Math.round((c.trust||0)*0.15)}</b>
        <span>최종</span><b>${total}</b>
      </div>
    </div>

    <details class="ai-score-detail">
      <summary>AI 계산 근거 자세히 보기</summary>
      <p class="combo-guide">Pattern: ${p.reasons.pattern}</p>
      <p class="combo-guide">Replay: ${p.reasons.replay}</p>
      <p class="combo-guide">Flow: ${p.reasons.flow}</p>
      <p class="combo-guide">Dream: ${p.reasons.dream}</p>
      <p class="combo-guide">Confidence는 당첨 확률이 아니라 분석 근거의 일관성 표시입니다.</p>
    </details>
  </div>`;
}

function renderAIScoreCard(c,maxes){
  try{
    return v167AIScoreCard(c,maxes);
  }catch(e){
    console.error('AI Score Card 표시 오류', e);
    return `<div class="ai-score-card"><div class="ai-score-head"><b>AI Score Card</b><span>표시 오류</span></div><p class="combo-guide">AI Score 표시 중 오류가 발생했지만 조합 분석과 출현이력은 계속 표시됩니다.</p></div>`;
  }
}

function v167FallbackRankedCombos(data){
  let combos=[];
  try{ combos=makeRankedCombos(data); }catch(e){ console.warn('makeRankedCombos fallback',e); }
  if(!combos.length){
    return `<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹 TOP 10</b><p class="combo-guide">현재 조건에서는 추천조합을 만들 만큼 동반번호가 부족합니다.</p></div>`;
  }
  const maxes={
    companion:Math.max(...combos.map(c=>c.parts.companion||0),1),
    trend:Math.max(...combos.map(c=>(c.parts.recent||0)+(c.parts.long||0)),1),
    structure:Math.max(...combos.map(c=>(c.parts.balance||0)+(c.parts.oddEven||0)),1),
    longlearn:Math.max(...combos.map(c=>(c.parts.historical||0)+(c.parts.learned||0)),1)
  };
  return `<div class="combo-card" style="margin:10px 0;background:#fff7e6">
    <b>🏆 AI 조합 랭킹 TOP 10</b>
    <p class="combo-guide">AI Score Card로 동반성·추세·구조·장기학습·Pattern Engine을 표시합니다.</p>
    ${combos.map(c=>`<div style="border-top:1px solid #f2e6c9;padding:11px 0">
      <b style="color:#8a5b00">${c.rank}위 · ${c.grade} · 종합 ${c.trust}점</b>
      <div class="combo-selected">${c.nums.map(n=>ball(n,true,selectedNums.includes(n)?'selected-ball':'')).join('')}</div>
      ${renderAIScoreCard(c,maxes)}
      ${renderComboReport(c.nums)}
      <div class="combo-btn-row" style="margin-top:8px">
        <button onclick="saveRecommendedCombo('${c.nums.join(',')}','${c.grade}',${c.trust})">저장</button>
        <button onclick="analyzeSavedCombo('${c.nums.join(',')}')">적중분석</button>
      </div>
    </div>`).join('')}
  </div>`;
}

function renderRankedCombos(data){
  return v167FallbackRankedCombos(data);
}

function renderCompanion(){
  try{
    const data=companionAnalysis();
    const max=data.top.length?data.top[0].count:1;
    const threshold=minHit();
    let html=`<div class="combo-card"><b>🤝 동반번호 추천</b><p class="combo-guide">${selectedNums.map(n=>n+'번').join(', ')} 기준으로, ${threshold}개 이상 함께 나온 회차에서 추가 번호를 집계했습니다.</p>`;
    if(data.recommend.length){
      html+=`<div class="combo-card" style="margin:10px 0;background:#f0f7ff"><b>AI 추천 동반번호</b><div class="combo-selected">${data.recommend.map(n=>ball(n,true)).join('')}</div><p class="combo-guide">동반번호는 아래 AI 조합 랭킹에 반영됩니다.</p></div>`;
      html+=renderRankedCombos(data);
    }else{
      html+=`<p class="combo-guide">현재 범위에서는 추천할 동반번호가 없습니다. 최근 100회 또는 전체 회차로 바꿔보세요.</p>`;
    }
    html+=data.top.length?data.top.slice(0,10).map(x=>{
      const w=Math.max(8,Math.round(x.count/max*100));
      return `<div class="companion-row"><div>${ball(x.n,true)}</div><div class="companion-bar"><i style="width:${w}%"></i></div><div class="companion-count">${x.count}회 · 지수 ${x.index}</div></div>`;
    }).join(''):`<div class="combo-guide">동반출현 기록이 없습니다.</div>`;
    html+=`<p class="combo-guide">분석 기준: 조건을 만족한 ${data.rows.length}개 회차에서 추가 번호를 집계했습니다.</p></div>`;
    $('companion').innerHTML=html;
  }catch(e){
    console.error('동반번호/AI Score 표시 오류', e);
    $('companion').innerHTML=`<div class="combo-card" style="background:#fff7e6"><b>AI Score 표시 오류</b><p class="combo-guide">동반번호 또는 AI Score 표시 중 오류가 발생했습니다. 아래 조합별 출현 이력은 계속 표시합니다.</p></div>`;
  }
}

function renderHistory(){
  try{
    injectHistoryWideStyle();
    const matches=rangeMatches();
    if(!matches.length){
      $('history').innerHTML=`<div class="combo-card center">조건에 맞는 회차가 없습니다.</div>`;
      return;
    }
    $('history').innerHTML=matches.map(x=>{
      const row=x.row, hit=x.hit;
      const tag=`${hit.normal}${hit.bonus&&includeBonus()?'+B':''}개`;
      const nums=row.numbers.map(n=>tinyBall(n,selectedNums.includes(n)?'selected-ball':'')).join('');
      return `<div class="combo-row history-wide">
        <div class="round-cell"><b>${row.round}회</b><span>${row.date}</span></div>
        <div class="history-balls">${nums}</div>
        <div>${tinyBall(row.bonus,selectedNums.includes(row.bonus)?'selected-ball':'')}</div>
        <div><span class="hit-tag">${tag}</span></div>
      </div>`;
    }).join('');
  }catch(e){
    console.error('조합별 출현 이력 표시 오류', e);
    $('history').innerHTML=`<div class="combo-card center">조합별 출현 이력 표시 중 오류가 발생했습니다.</div>`;
  }
}

function renderAll(){
  renderDreamBridge();
  if(!selectedNums.length)return;
  setStatusText();
  try{ renderSummary(); }catch(e){ console.error('요약 표시 오류',e); }
  try{ renderCompanion(); }catch(e){ console.error('AI Score 표시 오류',e); }
  try{ renderSavedCombos(); }catch(e){ console.error('저장조합 표시 오류',e); }
  try{ renderHistory(); }catch(e){ console.error('출현이력 표시 오류',e); }
}

(function injectV167Style(){
  if(document.getElementById('aiScoreV167FinalStyle'))return;
  const st=document.createElement('style');
  st.id='aiScoreV167FinalStyle';
  st.textContent=`
    .ai-score-v167 .v167-reason{background:#fffdf6;border:1px dashed #e1bd5c;border-radius:16px;padding:14px;margin-top:12px}
    .ai-score-v167 .v167-reason b{display:block;color:#8a5b00;margin-bottom:8px}
    .ai-score-v167 .v167-reason p{margin:6px 0}
    .ai-score-formula{margin-top:12px;padding:14px;border:1px solid #ead48e;border-radius:16px;background:#fffaf0}
    .ai-score-formula>b{display:block;color:#8a5b00;margin-bottom:10px}
    .formula-grid{display:grid;grid-template-columns:1fr auto;gap:8px 12px;font-size:14px}
    .formula-grid span{color:#6b7280}
    .formula-grid b{color:#123466;text-align:right}
  `;
  document.head.appendChild(st);
})();


/* v1.6.8 Final Stable Override */
function v168Num(v,d=0){v=Number(v);return Number.isFinite(v)?v:d}
function v168Clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Math.round(v168Num(v))))}
function v168Text(v,fallback='-'){return (v===undefined||v===null||v===''||v==='undefined'||v==='null')?fallback:String(v)}
function v168Arr(v){return Array.isArray(v)?v:[]}
function v168Nums(nums){return Array.from(new Set(v168Arr(nums).map(Number).filter(n=>n>=1&&n<=45))).sort((a,b)=>a-b)}
function v168RowsAll(){
  const base=(Array.isArray(lottoData)&&lottoData.length)?lottoData:(Array.isArray(window.LOTTO_DATA)&&window.LOTTO_DATA.length?window.LOTTO_DATA:(Array.isArray(window.lottoData)&&window.lottoData.length?window.lottoData:[]));
  return base.slice().sort((a,b)=>Number(a.round)-Number(b.round));
}
function v168RowsCurrent(){const r=v168RowsAll(); if(matchRange==='50')return r.slice(-50); if(matchRange==='100')return r.slice(-100); return r}
function v168Pool(row){if(!row)return[]; const a=v168Arr(row.numbers).map(Number).filter(n=>n>=1&&n<=45); if(typeof includeBonus==='function'&&includeBonus()&&row.bonus)a.push(Number(row.bonus)); return a}
function v168Hit(row,nums){const s=new Set(v168Pool(row)); return nums.filter(n=>s.has(n)).length}
function v168Prev(rows,row,gap){const r=Number(row.round); const e=rows.find(x=>Number(x.round)===r-gap); if(e)return e; const i=rows.findIndex(x=>Number(x.round)===r); return i>=gap?rows[i-gap]:null}
function v168NormalizePatternResult(raw){
  raw=raw||{}; const reasons=raw.reasons||{};
  const topNumbers=v168Nums(raw.topNumbers||raw.final||raw.chainPick||[]);
  const patternTop=v168Arr(raw.patternTop||raw.patternNums||raw.candidates).map(x=>({n:Number(x.n??x.num??x),count:v168Num(x.count??x.score??0)})).filter(x=>x.n>=1&&x.n<=45);
  const replayTop=v168Arr(raw.replayTop||raw.replayNums||raw.topNums).map(x=>({n:Number(x.n??x.num??x),count:v168Num(x.count??x.score??0)})).filter(x=>x.n>=1&&x.n<=45);
  const chains=v168Arr(raw.chains||raw.flows||raw.flowChains).map(x=>({chain:v168Nums(x.chain||x.nums||[]),count:v168Num(x.count)})).filter(x=>x.chain.length);
  const r={
    key:v168Text(raw.key,''),
    pattern:v168Clamp(raw.pattern??raw.patternBase??raw.patternScore),
    replay:v168Clamp(raw.replay??raw.replayScore),
    flow:v168Clamp(raw.flow??raw.flowScore),
    dream:v168Clamp(raw.dream??raw.dreamScore??raw.total),
    confidence:v168Clamp(raw.confidence??70,55,98),
    mode:v168Text(raw.mode,'참고'),
    sampleCount:v168Num(raw.sampleCount??raw.samples??0),
    comparisons:v168Num(raw.comparisons??raw.compare??0),
    keepCount:v168Num(raw.keepCount??raw.preserved??0),
    inputCount:v168Num(raw.inputCount??0),
    topNumbers, patternTop, replayTop, chains,
    pairGroups:v168Arr(raw.pairGroups||raw.pairs),
    tripleGroups:v168Arr(raw.tripleGroups||raw.triples),
    reasons:{
      pattern:v168Text(reasons.pattern||raw.patternNote,'Pattern 산출근거 대기'),
      replay:v168Text(reasons.replay||raw.replayNote,'Replay 산출근거 대기'),
      flow:v168Text(reasons.flow||raw.flowNote,'Flow 산출근거 대기'),
      dream:v168Text(reasons.dream||raw.dreamNote,'Dream 산출근거 대기')
    }
  };
  r.patternNote=r.reasons.pattern; r.replayNote=r.reasons.replay; r.flowNote=r.reasons.flow; r.dreamNote=r.reasons.dream;
  return r;
}
function v168SimplePatternCalc(nums){
  nums=v168Nums(nums); const rows=v168RowsCurrent();
  if(!rows.length||!nums.length)return v168NormalizePatternResult({key:nums.join(','),pattern:0,replay:0,flow:0,dream:0,confidence:60});
  const min=nums.length>=4?3:Math.max(2,nums.length);
  let samples=rows.filter(r=>v168Hit(r,nums)>=min);
  if(samples.length<5&&min>1)samples=rows.filter(r=>v168Hit(r,nums)>=min-1);
  samples=samples.slice(-50);
  function scan(gaps){
    const freq={},keep={},chains={}; let compare=0,hit=0;
    samples.forEach(row=>gaps.forEach(g=>{
      const prev=v168Prev(rows,row,g); if(!prev)return; compare++;
      const pool=v168Pool(prev); const local=nums.filter(n=>pool.includes(n)); if(local.length)hit++;
      local.forEach(n=>keep[n]=(keep[n]||0)+1); pool.forEach(n=>freq[n]=(freq[n]||0)+1);
      const p2=v168Prev(rows,row,g*2);
      if(p2)v168Pool(p2).forEach(a=>v168Pool(prev).forEach(b=>v168Pool(row).forEach(c=>{const k=`${a}-${b}-${c}`;chains[k]=(chains[k]||0)+1})));
    }));
    return {
      compare,hit,
      top:Object.entries(freq).map(([n,c])=>({n:Number(n),count:c})).sort((a,b)=>b.count-a.count||a.n-b.n),
      keepTop:Object.entries(keep).map(([n,c])=>({n:Number(n),count:c})).sort((a,b)=>b.count-a.count||a.n-b.n),
      chainTop:Object.entries(chains).map(([k,c])=>({chain:k.split('-').map(Number),count:c})).sort((a,b)=>b.count-a.count).slice(0,5)
    }
  }
  const s2=scan([2,4,6,8,10,12,14,16,18,20,22,24]), s3=scan([3,6,9,12,15]);
  const main=(s2.top[0]?.count||0)>=(s3.top[0]?.count||0)?s2:s3, mode=main===s2?'2계열':'3계열';
  const repeat=main.compare?main.hit/main.compare:0, conc=main.compare?(main.top[0]?.count||0)/main.compare:0;
  const topSet=new Set(main.top.slice(0,10).map(x=>x.n)); const keepCount=nums.filter(n=>topSet.has(n)).length; const keepRate=nums.length?keepCount/nums.length:0;
  const pattern=v168Clamp(repeat*38+conc*35+keepRate*22+Math.min(5,(main.top[0]?.count||0)/4));
  const replay=v168Clamp(repeat*100);
  const flow=v168Clamp((main.chainTop[0]?.count||0)*12+Math.min(35,main.chainTop.length*5));
  const dream=v168Clamp(pattern*.35+replay*.30+flow*.20+keepRate*15);
  const topNums=[]; main.top.slice(0,8).forEach(x=>{if(!topNums.includes(x.n))topNums.push(x.n)}); main.keepTop.slice(0,6).forEach(x=>{if(!topNums.includes(x.n))topNums.push(x.n)}); nums.forEach(n=>{if(!topNums.includes(n))topNums.push(n)});
  const final=topNums.slice(0,6).sort((a,b)=>a-b);
  return v168NormalizePatternResult({
    key:nums.join(','),pattern,replay,flow,dream,confidence:v168Clamp(55+pattern*.12+replay*.13+flow*.08+dream*.12,55,98),
    mode,sampleCount:samples.length,comparisons:main.compare,keepCount,inputCount:nums.length,topNumbers:final,patternTop:main.top.slice(0,8),replayTop:main.keepTop.slice(0,8),chains:main.chainTop,
    reasons:{pattern:`${mode} 우세 · TOP ${main.top[0]?.n||'-'} ${main.top[0]?.count||0}회 / 비교 ${main.compare}`,replay:`${main.hit}/${main.compare} 재현 · 재현율 ${Math.round(repeat*100)}%`,flow:main.chainTop.length?`최고 흐름 ${main.chainTop[0].chain.join('→')} · ${main.chainTop[0].count}회`:'반복 흐름 후보 부족',dream:`최종후보 ${final.join(', ')} · 기준유지 ${keepCount}/${nums.length}`}
  });
}
function v168ReadPatternReference(nums){
  const key=v168Nums(nums).join(',');
  try{const saved=JSON.parse(localStorage.getItem('pattern_engine_result')||'null'); if(saved&&(!saved.key||saved.key===key))return v168NormalizePatternResult(saved)}catch(e){}
  return v168SimplePatternCalc(nums);
}
function v168Metric(label,score,note){const safe=v168Clamp(score); return `<div class="ai-core-metric"><div class="ai-core-metric-top"><b>${label}</b><span>${safe}점</span></div><div class="ai-core-bar"><i style="width:${Math.max(6,safe)}%"></i></div><p>${v168Text(note,'')}</p></div>`}
function v168ReasonBlock(p){
  const top=(p.topNumbers||[]).slice(0,6);
  const patternTop=(p.patternTop||[]).slice(0,5).map(x=>`${x.n}번 ${x.count}회`).join(' · ')||'후보 부족';
  const replay=(p.replayTop||[]).slice(0,5).map(x=>`${x.n}번 ${x.count}회`).join(' · ')||'재현번호 부족';
  const flow=(p.chains||[]).slice(0,4).map(x=>`${x.chain.join('→')} ${x.count}회`).join(' · ')||'흐름 후보 부족';
  return `<div class="ai-engine-reason v168-reason"><b>Pattern Engine 참고 산출근거</b><p class="combo-guide">우세계열: ${v168Text(p.mode)} · 샘플 ${p.sampleCount}회 · 비교 ${p.comparisons}회 · 기준번호 유지 ${p.keepCount}/${p.inputCount}</p><p class="combo-guide">TOP 후보: ${top.length?top.map(n=>`${n}번`).join(' · '):'없음'}</p><p class="combo-guide">패턴번호: ${patternTop}</p><p class="combo-guide">재현번호: ${replay}</p><p class="combo-guide">Dream Chain 흐름: ${flow}</p></div>`;
}
function renderAIScoreCard(c,maxes){
  try{
    const companion=pctOf(c.parts.companion,maxes.companion), trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend), structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure), learning=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn), p=v168ReadPatternReference(c.nums);
    const total=v168Clamp(c.trust,55,98), grade=aiScoreGrade(total), confidence=v168Clamp(total*.70+((companion+trend+structure+learning)/4)*.30,55,98), confGrade=aiScoreGrade(confidence);
    return `<div class="ai-score-card ai-score-v168"><div class="ai-score-head"><b>AI Score Card</b><span>${c.grade} · ${total}점</span></div><div class="ai-core-summary"><div><b>${grade}</b><span>Classic AI Score</span></div><div><b>${confidence}%</b><span>Confidence ${confGrade}</span></div><div><b>${aiScoreJudge(total)}</b><span>AI 판단</span></div></div><div class="ai-core-title">기존 AI 엔진</div><div class="ai-core-grid">${v168Metric('Companion',companion,'동반번호·쌍번호 강도')}${v168Metric('Trend',trend,'최근 흐름과 장기 출현')}${v168Metric('Structure',structure,'구간균형·홀짝구성')}${v168Metric('Learning',learning,'과거 적중·구조학습')}</div><div class="ai-core-title">Pattern Engine 참고값</div><div class="ai-core-grid">${v168Metric('Pattern',p.pattern,p.patternNote)}${v168Metric('Replay',p.replay,p.replayNote)}${v168Metric('Flow',p.flow,p.flowNote)}${v168Metric('Dream',p.dream,p.dreamNote)}</div>${v168ReasonBlock(p)}<details class="ai-score-detail"><summary>AI 계산 근거 자세히 보기</summary><p class="combo-guide">기존 AI Score ${total}점은 기존 추천 알고리즘 그대로 유지됩니다.</p><p class="combo-guide">Pattern Engine은 참고 엔진으로만 표시되며, 현재 버전에서는 최종 AI Score에 영향을 주지 않습니다.</p><p class="combo-guide">Pattern: ${p.reasons.pattern}</p><p class="combo-guide">Replay: ${p.reasons.replay}</p><p class="combo-guide">Flow: ${p.reasons.flow}</p><p class="combo-guide">Dream: ${p.reasons.dream}</p></details></div>`;
  }catch(e){console.error('v1.6.8 AI Score Card 오류',e);return `<div class="ai-score-card"><div class="ai-score-head"><b>AI Score Card</b><span>안정화 모드</span></div><p class="combo-guide">AI Score Card 표시 중 오류가 있었지만 조합 분석은 계속 표시됩니다.</p></div>`}
}
function renderRankedCombos(data){
  try{const combos=makeRankedCombos(data); if(!combos.length)return`<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹</b><p class="combo-guide">추천조합을 만들 만큼 동반번호가 부족합니다. 전체 회차로 바꿔보세요.</p></div>`; const maxes={companion:Math.max(...combos.map(c=>c.parts.companion||0),1),trend:Math.max(...combos.map(c=>(c.parts.recent||0)+(c.parts.long||0)),1),structure:Math.max(...combos.map(c=>(c.parts.balance||0)+(c.parts.oddEven||0)),1),longlearn:Math.max(...combos.map(c=>(c.parts.historical||0)+(c.parts.learned||0)),1)}; return`<div class="combo-card" style="margin:10px 0;background:#fff7e6"><b>🏆 AI 조합 랭킹 TOP 10</b><p class="combo-guide">기존 AI Score는 유지하고 Pattern Engine은 참고값으로 표시합니다.</p>${combos.map(c=>`<div style="border-top:1px solid #f2e6c9;padding:11px 0"><b style="color:#8a5b00">${c.rank}위 · ${c.grade} · 종합 ${c.trust}점</b><div class="combo-selected">${c.nums.map(n=>ball(n,true,selectedNums.includes(n)?'selected-ball':'')).join('')}</div>${renderAIScoreCard(c,maxes)}${renderComboReport(c.nums)}<div class="combo-btn-row" style="margin-top:8px"><button onclick="saveRecommendedCombo('${c.nums.join(',')}','${c.grade}',${c.trust})">저장</button><button onclick="analyzeSavedCombo('${c.nums.join(',')}')">적중분석</button></div></div>`).join('')}</div>`}catch(e){console.error('v1.6.8 랭킹 표시 오류',e);return `<div class="combo-card" style="background:#fff7e6"><b>AI 랭킹 안정화 모드</b><p class="combo-guide">랭킹 표시 중 오류가 발생했습니다. 입력번호와 출현이력은 계속 표시됩니다.</p></div>`}
}
function renderCompanion(){try{const data=companionAnalysis(),max=data.top.length?data.top[0].count:1,threshold=minHit();let html=`<div class="combo-card"><b>🤝 동반번호 추천</b><p class="combo-guide">${selectedNums.map(n=>n+'번').join(', ')} 기준으로, ${threshold}개 이상 함께 나온 회차에서 추가 번호를 집계했습니다.</p>`; if(data.recommend.length){html+=`<div class="combo-card" style="margin:10px 0;background:#f0f7ff"><b>AI 추천 동반번호</b><div class="combo-selected">${data.recommend.map(n=>ball(n,true)).join('')}</div><p class="combo-guide">동반번호는 아래 AI 조합 랭킹에 반영됩니다.</p></div>`;html+=renderRankedCombos(data)}else html+=`<p class="combo-guide">현재 범위에서는 추천할 동반번호가 없습니다. 전체 회차로 바꿔보세요.</p>`; html+=data.top.length?data.top.slice(0,10).map(x=>{const w=Math.max(8,Math.round(x.count/max*100));return`<div class="companion-row"><div>${ball(x.n,true)}</div><div class="companion-bar"><i style="width:${w}%"></i></div><div class="companion-count">${x.count}회 · 지수 ${x.index}</div></div>`}).join(''):`<div class="combo-guide">동반출현 기록이 없습니다.</div>`; html+=`<p class="combo-guide">분석 기준: 조건을 만족한 ${data.rows.length}개 회차에서 추가 번호를 집계했습니다.</p></div>`;$('companion').innerHTML=html}catch(e){console.error('v1.6.8 동반번호 표시 오류',e);$('companion').innerHTML=`<div class="combo-card" style="background:#fff7e6"><b>동반번호 표시 안정화 모드</b><p class="combo-guide">동반번호 표시 중 오류가 발생했습니다. 조합별 출현 이력은 계속 표시합니다.</p></div>`}}
function renderHistory(){try{injectHistoryWideStyle();const matches=rangeMatches();if(!matches.length){$('history').innerHTML=`<div class="combo-card center">조건에 맞는 회차가 없습니다.</div>`;return}$('history').innerHTML=matches.map(x=>{const row=x.row,hit=x.hit,tag=`${hit.normal}${hit.bonus&&includeBonus()?'+B':''}개`,nums=row.numbers.map(n=>tinyBall(n,selectedNums.includes(n)?'selected-ball':'')).join('');return`<div class="combo-row history-wide"><div class="round-cell"><b>${row.round}회</b><span>${row.date}</span></div><div class="history-balls">${nums}</div><div>${tinyBall(row.bonus,selectedNums.includes(row.bonus)?'selected-ball':'')}</div><div><span class="hit-tag">${tag}</span></div></div>`}).join('')}catch(e){console.error('v1.6.8 출현이력 표시 오류',e);$('history').innerHTML=`<div class="combo-card center">조합별 출현 이력 표시 중 오류가 발생했습니다.</div>`}}
function renderAll(){renderDreamBridge();if(!selectedNums.length)return;try{window.LOTTO_DATA=lottoData;window.lottoData=lottoData}catch(e){};try{setStatusText()}catch(e){};try{renderSummary()}catch(e){console.error('요약 표시 오류',e)};try{renderCompanion()}catch(e){console.error('동반/AI 표시 오류',e)};try{renderSavedCombos()}catch(e){console.error('저장조합 표시 오류',e)};try{renderHistory()}catch(e){console.error('출현이력 표시 오류',e)}}
(function injectV168StableStyle(){if(document.getElementById('aiScoreV168StableStyle'))return;const st=document.createElement('style');st.id='aiScoreV168StableStyle';st.textContent=`.ai-score-v168 .v168-reason{background:#fffdf6;border:1px dashed #e1bd5c;border-radius:16px;padding:14px;margin-top:12px}.ai-score-v168 .v168-reason b{display:block;color:#8a5b00;margin-bottom:8px}.ai-score-v168 .v168-reason p{margin:6px 0}`;document.head.appendChild(st)})();

/* =========================================================
   v1.7 Premium UI Override
   UI only: 기존 AI 계산 로직 및 점수 산식 변경 없음
========================================================= */
function v170WeightPanel(){
  const rows=[
    ['Frequency',40],['Continuity',20],['Replay',15],
    ['Flow',10],['Pattern Quality',10],['Dream',5]
  ];
  return `<section class="ai-weight-panel" aria-label="AI Score 산출 비율">
    <div><h3>AI Score 산출 비율</h3><small>총 100%</small></div>
    ${rows.map(([label,value])=>`<div class="ai-weight-row"><span>${label}</span><div class="ai-weight-track"><i style="width:${value*2.5}%"></i></div><b>${value}%</b></div>`).join('')}
    <p class="ai-weight-note">※ 현재 AI Score는 위 6개 요소를 종합하여 계산됩니다.</p>
  </section>`;
}
function v170Accordion(label,icon,html,id){
  return `<div class="premium-accordion">
    <button type="button" class="premium-accordion-toggle" aria-expanded="false" aria-controls="${id}">
      <span class="acc-icon"><span>${icon}</span>${label}</span><span class="acc-arrow">⌄</span>
    </button>
    <div class="premium-accordion-panel" id="${id}"><div><div class="premium-accordion-content">${html}</div></div></div>
  </div>`;
}
function renderAIScoreCard(c,maxes){
  try{
    const companion=pctOf(c.parts.companion,maxes.companion), trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend), structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure), learning=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn), p=v168ReadPatternReference(c.nums);
    const total=v168Clamp(c.trust,55,98), grade=aiScoreGrade(total), confidence=v168Clamp(total*.70+((companion+trend+structure+learning)/4)*.30,55,98), confGrade=aiScoreGrade(confidence);
    const key=(c.nums||[]).join('-');
    const aiReason=`<p class="combo-guide"><b>Classic AI Score ${total}점</b> · ${grade}</p><p class="combo-guide">Companion ${companion}점 · Trend ${trend}점 · Structure ${structure}점 · Learning ${learning}점</p><p class="combo-guide">Confidence ${confidence}%는 당첨 확률이 아니라 현재 분석 근거의 일관성 표시입니다.</p><p class="combo-guide">기존 추천 알고리즘과 점수 산식은 변경하지 않았습니다.</p>`;
    const patternReason=`<p class="combo-guide"><b>우세계열:</b> ${v168Text(p.mode)} · 샘플 ${p.sampleCount}회 · 비교 ${p.comparisons}회</p><p class="combo-guide"><b>Pattern:</b> ${p.reasons.pattern}</p><p class="combo-guide"><b>Replay:</b> ${p.reasons.replay}</p><p class="combo-guide"><b>Flow:</b> ${p.reasons.flow}</p><p class="combo-guide"><b>Dream:</b> ${p.reasons.dream}</p><p class="combo-guide">Pattern Engine은 참고값이며 현재 최종 AI Score에는 영향을 주지 않습니다.</p>`;
    return `<div class="ai-score-card ai-score-v168"><div class="ai-score-head"><b>AI Score Card</b><span>${c.grade} · ${total}점</span></div><div class="ai-core-summary"><div><b>${grade}</b><span>Classic AI Score</span></div><div><b>${confidence}%</b><span>Confidence ${confGrade}</span></div><div><b>${aiScoreJudge(total)}</b><span>AI 판단</span></div></div><div class="ai-core-title">기존 AI 엔진</div><div class="ai-core-grid">${v168Metric('Companion',companion,'동반번호·쌍번호 강도')}${v168Metric('Trend',trend,'최근 흐름과 장기 출현')}${v168Metric('Structure',structure,'구간균형·홀짝구성')}${v168Metric('Learning',learning,'과거 적중·구조학습')}</div><div class="ai-core-title">Pattern Engine 참고값</div><div class="ai-core-grid">${v168Metric('Pattern',p.pattern,p.patternNote)}${v168Metric('Replay',p.replay,p.replayNote)}${v168Metric('Flow',p.flow,p.flowNote)}${v168Metric('Dream',p.dream,p.dreamNote)}</div>${v170Accordion('AI 계산 근거','🧠',aiReason,`ai-reason-${key}`)}${v170Accordion('Pattern 산출 근거','📈',patternReason,`pattern-reason-${key}`)}</div>`;
  }catch(e){console.error('v1.7 Premium AI Score Card 오류',e);return `<div class="ai-score-card"><div class="ai-score-head"><b>AI Score Card</b><span>안정화 모드</span></div><p class="combo-guide">AI Score Card 표시 중 오류가 있었지만 조합 분석은 계속 표시됩니다.</p></div>`}
}
function renderRankedCombos(data){
  try{
    const combos=makeRankedCombos(data);
    if(!combos.length)return`<div class="combo-card ai-ranking-shell"><b>🏆 AI 조합 랭킹</b><p class="combo-guide">추천조합을 만들 만큼 동반번호가 부족합니다. 전체 회차로 바꿔보세요.</p></div>`;
    const maxes={companion:Math.max(...combos.map(c=>c.parts.companion||0),1),trend:Math.max(...combos.map(c=>(c.parts.recent||0)+(c.parts.long||0)),1),structure:Math.max(...combos.map(c=>(c.parts.balance||0)+(c.parts.oddEven||0)),1),longlearn:Math.max(...combos.map(c=>(c.parts.historical||0)+(c.parts.learned||0)),1)};
    return `<div class="combo-card ai-ranking-shell"><div class="ai-ranking-title"><b>🏆 AI 조합 랭킹 TOP 10</b><span>Explainable AI</span></div><p class="combo-guide">기존 AI Score는 유지하고 Pattern Engine은 참고값으로 분리해 표시합니다.</p>${v170WeightPanel()}${combos.map(c=>`<section class="premium-rank-item"><div class="premium-rank-head"><b>${c.rank}위 · ${c.grade}</b><span>종합 ${c.trust}점</span></div><div class="combo-selected">${c.nums.map(n=>ball(n,true,selectedNums.includes(n)?'selected-ball':'')).join('')}</div>${renderAIScoreCard(c,maxes)}${renderComboReport(c.nums)}<div class="combo-btn-row" style="margin-top:8px"><button onclick="saveRecommendedCombo('${c.nums.join(',')}','${c.grade}',${c.trust})">저장</button><button onclick="analyzeSavedCombo('${c.nums.join(',')}')">적중분석</button></div></section>`).join('')}</div>`;
  }catch(e){console.error('v1.7 Premium 랭킹 표시 오류',e);return `<div class="combo-card" style="background:#fff7e6"><b>AI 랭킹 안정화 모드</b><p class="combo-guide">랭킹 표시 중 오류가 발생했습니다. 입력번호와 출현이력은 계속 표시됩니다.</p></div>`}
}
(function bindV170Accordion(){
  if(window.__v170AccordionBound)return;
  window.__v170AccordionBound=true;
  document.addEventListener('click',function(e){
    const btn=e.target.closest('.premium-accordion-toggle');
    if(!btn)return;
    const panel=document.getElementById(btn.getAttribute('aria-controls'));
    if(!panel)return;
    const open=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',String(!open));
    panel.classList.toggle('is-open',!open);
  });
})();


/* v1.9 Phase 2-1 compatibility bridge ------------------------------------
 * Exposes stable, read-only access to the legacy implementation while the
 * engines are consumed through independent modules. Existing score formulas
 * and UI output remain unchanged.
 */
window.ComboLegacy = Object.freeze({
  getState(){ return { lottoData, selectedNums, matchRange, matchMode, includeBonus:includeBonus() }; },
  setSelectedNums(nums){ selectedNums=uniqNums(nums).slice(0,6); return selectedNums.slice(); },
  sourceRows, rangeMatches, allMatches, minHit, rowPool, frequencyMap, pairScore,
  companionAnalysis, comboScoreParts, makeRankedCombos, patternSeriesScores,
  replayScoreFor, flowScoreFor, dreamScoreFor, calcPatternLinkedScoreFor,
  readPatternScoreFor, renderDreamBridge, setStatusText, renderSummary,
  renderCompanion, renderSavedCombos, renderHistory, renderAllLegacy,
  loadSavedCombos, learnedHitRate, comboStructure
});
window.dispatchEvent(new CustomEvent('combo:legacy-ready'));
