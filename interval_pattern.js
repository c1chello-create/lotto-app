
/* =========================================================
   Interval Pattern Engine v1.4 AI Score
   독립 모듈
   - 직전 10 / 30 / 50회
   - 2계열: 2↔4, 4↔6, 6↔8 ...
   - 3계열: 3↔6, 6↔9, 9↔12 ...
   - 4계열: 4↔8, 8↔12, 12↔16 ...
   - 반복번호 / 강세 / 초강세 / 동반번호 / 해당회차
   - Dream Chain / Classic AI Score 미연동
========================================================= */
(function(){
  if(window.__intervalPatternV14)return;
  window.__intervalPatternV14=true;

  function ensureStyle(){
    if(document.getElementById('intervalPatternPhase2Style'))return;
    const s=document.createElement('style');
    s.id='intervalPatternPhase2Style';
    s.textContent=`
      .interval-root{margin-top:18px}
      .interval-card{background:#fff;border:1px solid #dce6f2;border-radius:18px;padding:14px;margin:12px;box-shadow:0 2px 10px rgba(0,0,0,.04)}
      .interval-card h3{margin:0 0 8px;color:#11366b}
      .interval-window{background:#fffdf6;border:1px solid #ead38d;border-radius:16px;padding:12px;margin-top:12px}
      .interval-window-title{display:flex;justify-content:space-between;gap:8px;align-items:center}
      .interval-window-title b{color:#8a5b00}
      .interval-series{border-top:1px solid #efe5c7;padding:12px 0}
      .interval-series:first-of-type{border-top:0}
      .interval-series-head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px}
      .interval-series-head b{color:#11366b}
      .interval-badge{font-size:12px;font-weight:900;color:#11366b;background:#eef4ff;border-radius:999px;padding:5px 9px}
      .interval-number-row{display:grid;grid-template-columns:42px 1fr 66px;gap:8px;align-items:center;padding:8px 0;border-top:1px solid #eef2f7}
      .interval-number-row:first-child{border-top:0}
      .interval-bar{height:9px;background:#edf2f7;border-radius:999px;overflow:hidden}
      .interval-bar i{display:block;height:100%;background:#2d8cff;border-radius:999px}
      .interval-meta{font-size:11px;color:#667085;margin-top:4px;line-height:1.4}
      .interval-strength{text-align:right;font-size:12px;font-weight:900}
      .interval-strength.super{color:#b42318}
      .interval-strength.strong{color:#a15c00}
      .interval-strength.watch{color:#667085}
      .interval-strength.distributed{color:#7a5b00}
      .interval-companion{background:#f7fff4;border:1px solid #d9ead3;border-radius:14px;padding:10px;margin-top:10px}
      .interval-companion-row{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-top:1px solid #e5eadf}
      .interval-companion-row:first-child{border-top:0}
      .interval-rounds{background:#f8fafc;border:1px solid #eef2f7;border-radius:14px;padding:10px;margin-top:10px}
      .interval-round-item{border-top:1px solid #eef2f7;padding:8px 0}
      .interval-round-item:first-child{border-top:0}
      .interval-round-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}
      .interval-round-head b{color:#11366b}
      .interval-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
      .interval-summary-grid div{background:#f8fafc;border:1px solid #eef2f7;border-radius:12px;padding:9px;text-align:center}
      .interval-summary-grid b{display:block;color:#11366b}
      .interval-summary-grid span{font-size:11px;color:#667085}
      @media(max-width:430px){
        .interval-summary-grid{grid-template-columns:1fr}
        .interval-number-row{grid-template-columns:38px 1fr 58px}
      }
    `;
    document.head.appendChild(s);
  }

  function rowsDesc(){
    try{
      if(typeof lottoData!=='undefined' && Array.isArray(lottoData)){
        return lottoData.slice().sort((a,b)=>Number(b.round)-Number(a.round));
      }
    }catch(e){}
    const fallback=Array.isArray(window.LOTTO_DATA)
      ? window.LOTTO_DATA
      : (Array.isArray(window.lottoData)?window.lottoData:[]);
    return fallback.slice().sort((a,b)=>Number(b.round)-Number(a.round));
  }


  function targetRound(){
    const rows=rowsDesc();
    const latest=Number(rows[0]?.round||0);
    const el=document.getElementById('targetRoundPattern');
    const manual=Number(el?.value||0);
    return manual>0 ? manual : latest+1;
  }

  function baseRound(){return targetRound()-2;}
  function baseRow(){return rowByRound(baseRound());}

  function rowByRound(round){
    return rowsDesc().find(r=>Number(r.round)===Number(round))||null;
  }

  function pool(row){
    const out=(row?.numbers||[]).map(Number).filter(n=>n>=1&&n<=45);
    try{
      if(typeof includeBonus==='function' && includeBonus() && row?.bonus)out.push(Number(row.bonus));
    }catch(e){}
    return [...new Set(out)];
  }

  function intersection(a,b){
    const bs=new Set(b);
    return [...new Set(a.filter(n=>bs.has(n)))].sort((x,y)=>x-y);
  }

  function pairKey(nums){return nums.slice().sort((a,b)=>a-b).join('-')}
  function combinations(items,size){
    const out=[];
    function walk(start,pick){
      if(pick.length===size){out.push(pick.slice());return}
      for(let i=start;i<items.length;i++){
        pick.push(items[i]);walk(i+1,pick);pick.pop();
      }
    }
    walk(0,[]);
    return out;
  }

  function sampleWarning(count){
    if(count<=4)return {label:'매우 부족',cls:'strong'};
    if(count<=8)return {label:'부족',cls:'warn'};
    if(count<=15)return {label:'주의',cls:'caution'};
    return {label:'정상',cls:'normal'};
  }

  function continuityInfo(offsets,step){
    const sorted=[...new Set((offsets||[]).map(Number))].sort((a,b)=>a-b);
    if(!sorted.length)return {adjacentLinks:0,longestChain:0,score:0,segments:[],distributed:false};
    let adjacentLinks=0,currentChain=1,longestChain=1;
    const segments=[];
    for(let i=1;i<sorted.length;i++){
      if(sorted[i]-sorted[i-1]===step){
        adjacentLinks++;currentChain++;segments.push(`${sorted[i-1]}↔${sorted[i]}`);
        longestChain=Math.max(longestChain,currentChain);
      }else currentChain=1;
    }
    let score=0;
    if(adjacentLinks===1)score=40;
    else if(adjacentLinks===2)score=70;
    else if(adjacentLinks===3)score=85;
    else if(adjacentLinks>=4)score=100;
    return {adjacentLinks,longestChain,score,segments,distributed:sorted.length>=3&&adjacentLinks===0};
  }
  function classifyStrength(hitCount,c){
    if(hitCount<=1)return '관찰';
    if(hitCount>=3&&c.adjacentLinks>=2&&c.longestChain>=3)return '초강세';
    if(hitCount>=2&&c.adjacentLinks>=1)return '강세';
    if(hitCount>=3&&c.adjacentLinks===0)return '분산 강세';
    return '관찰';
  }
  function groupContinuityInfo(pairs,step){
    const starts=(pairs||[]).map(x=>Number(String(x).split('↔')[0])).filter(Number.isFinite).sort((a,b)=>a-b);
    const info=continuityInfo(starts,step);
    let strength='관찰 번호군';
    if(starts.length>=3&&info.adjacentLinks>=2&&info.longestChain>=3)strength='초강세 번호군';
    else if(starts.length>=2&&info.adjacentLinks>=1)strength='강세 번호군';
    else if(starts.length>=3&&info.adjacentLinks===0)strength='분산 번호군';
    return {...info,strength};
  }

  function analyzeSeries(windowSize,step){
    const target=targetRound();
    const checkpoints=[];
    for(let offset=step;offset<=windowSize;offset+=step){
      const round=target-offset;
      const row=rowByRound(round);
      if(row)checkpoints.push({offset,round,row,numbers:pool(row)});
    }

    const pairComparisons=[];
    const numberStats={};
    const pairGroupStats={};
    const tripleGroupStats={};

    checkpoints.forEach(cp=>{
      cp.numbers.forEach(n=>{
        if(!numberStats[n])numberStats[n]={n,checkpointHits:0,pairHits:0,offsets:[],rounds:[],companions:{}};
        numberStats[n].checkpointHits++;
        numberStats[n].offsets.push(cp.offset);
        numberStats[n].rounds.push(cp.row.round);
      });
    });

    for(let i=0;i<checkpoints.length-1;i++){
      const a=checkpoints[i], b=checkpoints[i+1];
      const common=intersection(a.numbers,b.numbers);
      pairComparisons.push({
        from:a.offset,to:b.offset,
        fromRound:a.row.round,toRound:b.row.round,
        common
      });

      common.forEach(n=>{
        if(!numberStats[n])numberStats[n]={n,checkpointHits:0,pairHits:0,offsets:[],rounds:[],companions:{}};
        numberStats[n].pairHits++;
        common.filter(x=>x!==n).forEach(x=>{
          numberStats[n].companions[x]=(numberStats[n].companions[x]||0)+1;
        });
      });

      combinations(common,2).forEach(nums=>{
        const k=pairKey(nums);
        if(!pairGroupStats[k])pairGroupStats[k]={nums,count:0,pairs:[]};
        pairGroupStats[k].count++;
        pairGroupStats[k].pairs.push(`${a.offset}↔${b.offset}`);
      });
      combinations(common,3).forEach(nums=>{
        const k=pairKey(nums);
        if(!tripleGroupStats[k])tripleGroupStats[k]={nums,count:0,pairs:[]};
        tripleGroupStats[k].count++;
        tripleGroupStats[k].pairs.push(`${a.offset}↔${b.offset}`);
      });
    }

    const numbers=Object.values(numberStats).map(x=>{
      const continuity=continuityInfo(x.offsets,step);
      const strength=classifyStrength(x.checkpointHits,continuity);
      const companionTop=Object.entries(x.companions)
        .map(([n,c])=>({n:Number(n),count:c}))
        .sort((a,b)=>b.count-a.count||a.n-b.n)
        .slice(0,5);
      const occurrenceScore=Math.min(30,Math.round((x.checkpointHits/Math.max(1,checkpoints.length))*30));
      const continuityScore=Math.round(continuity.score*0.40);
      const companionScore=Math.min(15,(companionTop[0]?.count||0)*5);
      const patternQuality=Math.min(15,Math.round((x.pairHits/Math.max(1,pairComparisons.length))*15));
      const score=Math.min(100,occurrenceScore+continuityScore+companionScore+patternQuality);
      return {...x,strength,continuity,companionTop,occurrenceScore,continuityScore,companionScore,patternQuality,score};
    }).filter(x=>x.checkpointHits>=1 || x.pairHits>=1)
      .sort((a,b)=>b.score-a.score||b.pairHits-a.pairHits||b.checkpointHits-a.checkpointHits||a.n-b.n);

    const pairGroups=Object.values(pairGroupStats)
      .map(g=>({...g,continuity:groupContinuityInfo(g.pairs,step)}))
      .sort((a,b)=>b.continuity.score-a.continuity.score||b.count-a.count||a.nums[0]-b.nums[0])
      .slice(0,12);
    const tripleGroups=Object.values(tripleGroupStats)
      .map(g=>({...g,continuity:groupContinuityInfo(g.pairs,step)}))
      .sort((a,b)=>b.continuity.score-a.continuity.score||b.count-a.count||a.nums[0]-b.nums[0])
      .slice(0,12);

    return {
      windowSize,step,checkpoints,pairComparisons,numbers,pairGroups,tripleGroups,
      comparisons:pairComparisons.length
    };
  }


  window.getIntervalContinuityScore=function(number){
    const n=Number(number);
    const scores=[2,3,4].map(step=>{
      const r=analyzeSeries(50,step);
      const item=r.numbers.find(x=>Number(x.n)===n);
      return Number(item?.continuity?.score||0);
    }).filter(Number.isFinite);
    return scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
  };

  function renderNumber(n,maxScore){
    const cls=n.strength==='초강세'?'super':n.strength==='강세'?'strong':n.strength==='분산 강세'?'distributed':'watch';
    const companions=n.companionTop.length?n.companionTop.map(x=>`${x.n}번 ${x.count}회`).join(' · '):'동반번호 없음';
    return `<div class="interval-number-row">
      ${typeof ball==='function'?ball(n.n,true):`<b>${n.n}</b>`}
      <div>
        <div class="interval-bar"><i style="width:${Math.max(7,Math.round(n.score/(maxScore||1)*100))}%"></i></div>
        <div class="interval-meta">
          체크포인트 ${n.checkpointHits}회 · 공통구간 ${n.pairHits}회 · Continuity ${n.continuity.score}점<br>
          최장 연속 ${n.continuity.longestChain}개 · 연속구간 ${n.continuity.adjacentLinks}회 · 동반 ${companions}<br>
          점수: 출현 ${n.occurrenceScore} + 연속 ${n.continuityScore} + 동반 ${n.companionScore} + Quality ${n.patternQuality}
        </div>
      </div>
      <div class="interval-strength ${cls}">${n.strength}<br>${n.score}</div>
    </div>`;
  }

  function renderCompanions(groups){
    if(!groups.length)return `<p class="muted">반복 동반번호군이 없습니다.</p>`;
    return groups.slice(0,6).map(g=>{
      const c=g.continuity||{score:0,adjacentLinks:0,longestChain:0,strength:'관찰 번호군'};
      return `<div class="interval-companion-row">
        <div>
          <div class="balls">${g.nums.map(n=>typeof ball==='function'?ball(n,true):`<b>${n}</b>`).join('')}</div>
          <div class="interval-meta">${c.strength} · Continuity ${c.score}점<br>연속구간 ${c.adjacentLinks}회 · 최장 연속 ${c.longestChain}개</div>
        </div>
        <div class="count">${g.count}회<br><span class="muted">${g.pairs.join(', ')}</span></div>
      </div>`;
    }).join('');
  }

  function renderPairRounds(pairs){
    const useful=pairs.filter(p=>p.common.length);
    if(!useful.length)return `<p class="muted">공통번호가 발견된 비교구간이 없습니다.</p>`;
    return useful.slice(0,12).map(p=>`
      <div class="interval-round-item">
        <div class="interval-round-head">
          <b>직전 ${p.from} ↔ ${p.to}</b>
          <span class="muted">${p.fromRound}회 ↔ ${p.toRound}회</span>
        </div>
        <div class="balls">${p.common.map(n=>typeof ball==='function'?ball(n,true,'selected-ball'):`<b>${n}</b>`).join('')}</div>
      </div>`).join('');
  }

  function renderSeries(result){
    const max=result.numbers[0]?.score||1;
    const warning=sampleWarning(result.checkpoints.length);
    const strongCount=result.numbers.filter(x=>x.strength==='강세').length;
    const superCount=result.numbers.filter(x=>x.strength==='초강세').length;
    return `<div class="interval-series">
      <div class="interval-series-head">
        <b>${result.step}계열 · 직전 ${result.step}·${result.step*2}·${result.step*3}…</b>
        <span class="interval-badge">비교 ${result.comparisons}회</span>
      </div>
      <div class="interval-summary-grid">
        <div><b>${result.checkpoints.length}</b><span>체크포인트</span></div>
        <div><b>${strongCount}</b><span>강세 번호</span></div>
        <div><b>${superCount}</b><span>초강세 번호</span></div>
      </div>
      <div class="sample-warning ${warning.cls}" style="margin-top:8px">
        표본 ${warning.label} · 체크포인트 ${result.checkpoints.length}개
      </div>
      <div style="margin-top:10px">
        ${result.numbers.length?result.numbers.slice(0,12).map(n=>renderNumber(n,max)).join(''):'<p class="muted">반복번호가 부족합니다.</p>'}
      </div>
      <div class="interval-companion">
        <b>2개 동반번호군 · 출현빈도</b>
        ${renderCompanions(result.pairGroups)}
      </div>
      <div class="interval-companion">
        <b>3개 동반번호군 · 출현빈도</b>
        ${renderCompanions(result.tripleGroups)}
      </div>
      <details class="interval-rounds">
        <summary><b>공통번호 해당 회차 보기</b></summary>
        ${renderPairRounds(result.pairComparisons)}
      </details>
    </div>`;
  }

  function renderReferenceCard(windowSize,step){
    const target=targetRound(),base=baseRound(),baseData=baseRow(),links=[];
    for(let offset=step;offset<=windowSize;offset+=step){const round=base-offset,row=rowByRound(round);if(row)links.push({offset,round,row});}
    return `<div class="reference-card"><div class="reference-head"><b>${target}회 예측 기준</b><span class="interval-badge">기준 ${base}회</span></div><div class="reference-link"><strong>기준 회차</strong><div><b>${base}회</b><div class="balls" style="margin-top:5px">${baseData?(baseData.numbers||[]).map(n=>ball(n,true)).join(''):'<span class="muted">데이터 없음</span>'}${baseData?.bonus?ball(baseData.bonus,true):''}</div></div></div>${links.slice(0,12).map(x=>`<div class="reference-link"><strong>직전 ${x.offset}</strong><div><b>${x.round}회</b><div class="balls" style="margin-top:5px">${(x.row.numbers||[]).map(n=>ball(n,true)).join('')}${x.row.bonus?ball(x.row.bonus,true):''}</div></div></div>`).join('')}</div>`;
  }

  function renderWindow(windowSize){
    const results=[2,3,4].map(step=>analyzeSeries(windowSize,step));
    const allNums=[];
    results.forEach(r=>r.numbers.forEach(n=>allNums.push({series:r.step,...n})));
    const best=allNums.sort((a,b)=>b.score-a.score||b.pairHits-a.pairHits)[0];

    return `<div class="interval-window">
      <div class="interval-window-title">
        <b>추첨 대상 ${targetRound()}회 · 기준 ${baseRound()}회 · 직전 ${windowSize}회</b>
        <span class="interval-badge">2·3·4계열</span>
      </div>
      <p class="guide">
        ${targetRound()}회를 예측하기 위해 ${baseRound()}회를 기준 회차로 먼저 표시하고, 그 기준에서 직전 간격 회차를 연결해 분석합니다.
        ${best?`현재 최고 반복번호는 ${best.n}번 · ${best.series}계열 · ${best.strength}입니다.`:''}
      </p>
      ${results.map(r=>renderReferenceCard(windowSize,r.step)+renderSeries(r)).join('')}
    </div>`;
  }

  function renderRoot(){
    return `<div class="interval-root">
      <div class="title">Interval Pattern Engine v1.4 AI Score</div>
      <div class="interval-card">
        <h3>시간축 반복패턴 독립 분석</h3>
        <p class="guide">
          직전 10·30·50회 범위에서 2·3·4계열 실제 체크포인트를 만들고,
          인접 체크포인트의 공통번호를 누적하여 강세·초강세·분산 강세와 동반번호군의 연속성을 판정합니다.
        </p>
        <p class="muted">Dream Chain과 Classic AI Score에는 아직 연결하지 않습니다.</p>
      </div>
      ${[10,30,50].map(renderWindow).join('')}
    </div>`;
  }

  ensureStyle();

  const previous=window.renderResult;
  if(typeof previous==='function'){
    window.renderResult=renderResult=function(nums){
      previous(nums);
      try{
        const box=document.getElementById('patternResult');
        if(box)box.insertAdjacentHTML('beforeend',renderRoot());
      }catch(e){
        console.error('Interval Pattern Engine v1.4 AI Score 오류',e);
      }
    };
  }
})();
