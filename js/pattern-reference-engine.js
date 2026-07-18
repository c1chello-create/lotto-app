'use strict';

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
