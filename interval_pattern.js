
/* =========================================================
   Interval Pattern Engine v1.1
   독립 모듈
   - 직전 10 / 30 / 50회
   - 2계열: 2↔4, 4↔6, 6↔8 ...
   - 3계열: 3↔6, 6↔9, 9↔12 ...
   - 4계열: 4↔8, 8↔12, 12↔16 ...
   - 반복번호 / 강세 / 초강세 / 동반번호 / 해당회차
   - Dream Chain / Classic AI Score 미연동
========================================================= */
(function(){
  if(window.__intervalPatternV11)return;
  window.__intervalPatternV11=true;

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

  function analyzeSeries(windowSize,step){
    const rows=rowsDesc().slice(0,windowSize);
    const checkpoints=[];
    for(let offset=step;offset<=windowSize;offset+=step){
      const row=rows[offset-1];
      if(row)checkpoints.push({offset,row,numbers:pool(row)});
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
      let strength='관찰';
      if(x.checkpointHits>=3)strength='초강세';
      else if(x.checkpointHits>=2)strength='강세';

      const companionTop=Object.entries(x.companions)
        .map(([n,c])=>({n:Number(n),count:c}))
        .sort((a,b)=>b.count-a.count||a.n-b.n)
        .slice(0,5);

      const score=Math.min(100,Math.round(
        Math.min(55,x.checkpointHits*15) +
        Math.min(35,x.pairHits*18) +
        Math.min(10,(companionTop[0]?.count||0)*5)
      ));
      return {...x,strength,companionTop,score};
    }).filter(x=>x.checkpointHits>=2 || x.pairHits>=1)
      .sort((a,b)=>b.score-a.score||b.pairHits-a.pairHits||b.checkpointHits-a.checkpointHits||a.n-b.n);

    const pairGroups=Object.values(pairGroupStats)
      .sort((a,b)=>b.count-a.count||a.nums[0]-b.nums[0])
      .slice(0,12);
    const tripleGroups=Object.values(tripleGroupStats)
      .sort((a,b)=>b.count-a.count||a.nums[0]-b.nums[0])
      .slice(0,12);

    return {
      windowSize,step,checkpoints,pairComparisons,numbers,pairGroups,tripleGroups,
      comparisons:pairComparisons.length
    };
  }

  function renderNumber(n,maxScore){
    const cls=n.strength==='초강세'?'super':n.strength==='강세'?'strong':'watch';
    const companions=n.companionTop.length
      ? n.companionTop.map(x=>`${x.n}번 ${x.count}회`).join(' · ')
      : '동반번호 없음';
    return `<div class="interval-number-row">
      ${typeof ball==='function'?ball(n.n,true):`<b>${n.n}</b>`}
      <div>
        <div class="interval-bar"><i style="width:${Math.max(7,Math.round(n.score/(maxScore||1)*100))}%"></i></div>
        <div class="interval-meta">
          체크포인트 출현 ${n.checkpointHits}회 · 공통구간 ${n.pairHits}회<br>
          직전 ${n.offsets.join('·')} · 동반 ${companions}
        </div>
      </div>
      <div class="interval-strength ${cls}">${n.strength}<br>${n.score}</div>
    </div>`;
  }

  function renderCompanions(groups){
    if(!groups.length)return `<p class="muted">반복 동반번호군이 없습니다.</p>`;
    return groups.slice(0,6).map(g=>`
      <div class="interval-companion-row">
        <div class="balls">${g.nums.map(n=>typeof ball==='function'?ball(n,true):`<b>${n}</b>`).join('')}</div>
        <div class="count">${g.count}회<br><span class="muted">${g.pairs.join(', ')}</span></div>
      </div>`).join('');
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

  function renderWindow(windowSize){
    const results=[2,3,4].map(step=>analyzeSeries(windowSize,step));
    const allNums=[];
    results.forEach(r=>r.numbers.forEach(n=>allNums.push({series:r.step,...n})));
    const best=allNums.sort((a,b)=>b.score-a.score||b.pairHits-a.pairHits)[0];

    return `<div class="interval-window">
      <div class="interval-window-title">
        <b>직전 ${windowSize}회 샘플링</b>
        <span class="interval-badge">2·3·4계열</span>
      </div>
      <p class="guide">
        최신 회차를 기준으로 직전 간격 회차끼리 비교하여 반복번호와 동반번호를 추출합니다.
        ${best?`현재 최고 반복번호는 ${best.n}번 · ${best.series}계열 · ${best.strength}입니다.`:''}
      </p>
      ${results.map(renderSeries).join('')}
    </div>`;
  }

  function renderRoot(){
    return `<div class="interval-root">
      <div class="title">Interval Pattern Engine v1.1</div>
      <div class="interval-card">
        <h3>시간축 반복패턴 독립 분석</h3>
        <p class="guide">
          직전 10·30·50회 범위에서 2·3·4계열 실제 체크포인트를 만들고,
          인접 체크포인트의 공통번호를 누적하여 강세·초강세와 동반번호군 출현빈도를 찾습니다.
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
        console.error('Interval Pattern Engine v1.1 오류',e);
      }
    };
  }
})();
