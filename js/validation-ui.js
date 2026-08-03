(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const cls=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=n=>`<span class="ball small-ball ${cls(Number(n))}">${n}</span>`;
  let DATA=[];

  function cleanNums(raw){
    return [...new Set(String(raw||'').split(/[\s,]+/).map(Number).filter(n=>n>=1&&n<=45))].sort((a,b)=>a-b);
  }
  function defaultBase(round){
    const prev=DATA.find(x=>Number(x.round)===Number(round)-1);
    return prev?.numbers||[];
  }
  function setRoundOptions(){
    const select=$('valRound');
    const rounds=DATA.filter(x=>Number(x.round)>150).slice().sort((a,b)=>Number(b.round)-Number(a.round));
    select.innerHTML=rounds.map(x=>`<option value="${x.round}">${x.round}회 · ${x.date||''}</option>`).join('');
    if(rounds[0]){
      $('valBase').value=defaultBase(rounds[0].round).join(' ');
      renderActual(rounds[0]);
    }
  }
  function renderActual(row){
    $('valActual').innerHTML=`<div><b>${row.round}회 실제 당첨번호</b><span>${row.date||''}</span></div><div class="val-balls">${row.numbers.map(ball).join('')}<i>+</i>${ball(row.bonus)}</div>`;
  }
  function hitLabel(hit){
    return hit.bonus?`${hit.normal}+B`:`${hit.normal}개`;
  }
  function renderSingle(result){
    if(result.error){$('valSingleResult').innerHTML=`<div class="val-error">${result.error}</div>`;return;}
    const p=result.actualPattern||{};
    $('valSingleResult').innerHTML=`
      <section class="val-summary-card">
        <div><b>사용 데이터</b><span>1회~${result.target.round-1}회 · ${result.trainingCount}개 회차</span></div>
        <div class="val-metric-grid">
          <span><b>${Math.round(p.strength??p.score??0)}</b>실제 Pattern</span>
          <span><b>${Math.round(p.confidence??0)}%</b>실제 Confidence</span>
          <span><b>${Math.round(p.adjusted??p.score??0)}</b>보정 점수</span>
          <span><b>${result.bestHit?hitLabel(result.bestHit.hit):'-'}</b>TOP10 최고 적중</span>
        </div>
      </section>
      <section class="val-evolution">
        <b>AI Evolution · 1위 추천조합</b>
        <div><span>기존 AI</span><strong>${result.evolution.classic}</strong><i>→</i><span>Companion</span><strong>${result.evolution.companion}</strong><i>→</i><span>AI 연동</span><strong>${result.evolution.linked}</strong></div>
      </section>
      <section class="val-top10">
        <div class="val-table-head"><span>순위</span><span>추천번호</span><span>AI</span><span>P/C</span><span>적중</span></div>
        ${result.ranked.map(x=>`<div class="val-rank-row ${x.rank===1?'is-first':''}">
          <b>${x.rank}</b><div class="val-balls">${x.nums.map(ball).join('')}</div>
          <span>${x.aiLinked}</span><span>${x.adjusted}/${x.confidence}%</span><strong>${hitLabel(x.hit)}</strong>
        </div>`).join('')||'<div class="val-empty">추천 조합을 만들지 못했습니다.</div>'}
      </section>`;
  }
  function thresholdTable(title,rows,suffix='%'){
    return `<section class="val-threshold-card"><b>${title}</b>
      <div class="val-th-head"><span>구간</span><span>회차수</span><span>평균백분위</span><span>상위25%</span><span>상위50%</span></div>
      ${rows.map(x=>`<div class="val-th-row"><strong>${x.threshold}${suffix}+</strong><span>${x.count}</span><span>${x.avgPercentile}</span><span>${x.top25}%</span><span>${x.top50}%</span></div>`).join('')}
    </section>`;
  }
  function renderReport(r){
    $('valReportResult').innerHTML=`
      <section class="val-overall">
        <div><b>${r.count}</b><span>검증 회차</span></div>
        <div><b>${r.avgPercentile}</b><span>평균 백분위</span></div>
        <div><b>${r.top25}%</b><span>상위 25%</span></div>
        <div><b>${r.top50}%</b><span>상위 50%</span></div>
      </section>
      ${thresholdTable('Confidence 구간별 성능',r.confidence)}
      ${thresholdTable('Pattern Strength 구간별 성능',r.strength,'점')}
      ${thresholdTable('Confidence 보정점수 구간별 성능',r.adjusted,'점')}
      <section class="val-round-table"><b>회차별 검증 테이블</b>
        <div class="val-round-head"><span>회차</span><span>P</span><span>C</span><span>보정</span><span>백분위</span></div>
        ${r.records.map(x=>`<button type="button" data-round="${x.round}"><span>${x.round}</span><span>${x.patternStrength}</span><span>${x.confidence}%</span><span>${x.adjusted}</span><strong>${x.percentile}</strong></button>`).join('')}
      </section>`;
  }
  async function init(){
    try{
      const res=await fetch('./data/lotto.json?ts='+Date.now());
      DATA=(await res.json()).slice().sort((a,b)=>Number(b.round)-Number(a.round));
      window.LOTTO_DATA=DATA;window.lottoData=DATA;
      setRoundOptions();
      $('valStatus').textContent=`전체 ${DATA.length}개 회차 로드 완료`;
    }catch(e){$('valStatus').textContent='lotto.json을 불러오지 못했습니다.';}
  }

  document.addEventListener('click',e=>{
    const rr=e.target.closest('[data-round]');
    if(rr){
      $('valRound').value=rr.dataset.round;
      $('valBase').value=defaultBase(rr.dataset.round).join(' ');
      renderActual(DATA.find(x=>Number(x.round)===Number(rr.dataset.round)));
      window.scrollTo({top:0,behavior:'smooth'});
    }
  });

  $('valRound').addEventListener('change',e=>{
    const round=Number(e.target.value);
    $('valBase').value=defaultBase(round).join(' ');
    renderActual(DATA.find(x=>Number(x.round)===round));
  });
  $('valSingleRun').addEventListener('click',()=>{
    const round=Number($('valRound').value),base=cleanNums($('valBase').value);
    $('valSingleRun').disabled=true;$('valSingleRun').textContent='회차별 백테스트 계산 중...';
    setTimeout(()=>{
      try{renderSingle(window.ValidationEngine.singleRound(DATA,round,base,{range:50,includeBonus:$('valBonus').checked}));}
      finally{$('valSingleRun').disabled=false;$('valSingleRun').textContent='선택 회차 백테스트 실행';}
    },20);
  });
  $('valReportRun').addEventListener('click',()=>{
    $('valReportRun').disabled=true;$('valReportRun').textContent='구간별 검증 계산 중...';
    setTimeout(()=>{
      try{renderReport(window.ValidationEngine.validationReport(DATA,{testCount:Number($('valCount').value),includeBonus:$('valBonus').checked}));}
      finally{$('valReportRun').disabled=false;$('valReportRun').textContent='구간별 백테스트 실행';}
    },20);
  });
  init();
})();