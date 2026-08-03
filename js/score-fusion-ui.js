(function(global){
  'use strict';
  const $=id=>document.getElementById(id);
  const cls=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=(n,extra='')=>`<span class="ball small-ball ${cls(Number(n))} ${extra}">${n}</span>`;
  const pct=v=>Math.max(0,Math.min(100,Math.round(Number(v)||0)));

  function shell(){
    return `<section id="scoreFusionCard" class="combo-card fusion-card">
      <div class="fusion-head"><div><b>🧠 Fusion AI 분석</b><p>기존 조합 AI·동반패턴·동반출현 빈도를 독립적으로 읽어 통합합니다.</p></div><span>독립 엔진</span></div>
      <div id="fusionResult" class="fusion-result"><p>번호 6개 분석 후 Fusion AI를 실행하세요.</p></div>
      <button type="button" id="fusionRun" class="fusion-run">Fusion AI 분석 실행</button>
      <p class="fusion-note">기존 AI Score와 Companion 계산식은 변경하지 않습니다. Fusion 점수는 비교용 분석지수이며 당첨 확률이 아닙니다.</p>
    </section>`;
  }
  function ensure(){
    if($('scoreFusionCard'))return;
    const optimizer=$('companionPatternOptimizer');
    const pattern=$('aiCompanionPatternBox');
    const companion=$('companion');
    const root=document.createElement('div');root.innerHTML=shell();
    const card=root.firstElementChild;
    if(optimizer)optimizer.insertAdjacentElement('beforebegin',card);
    else if(pattern)pattern.insertAdjacentElement('afterend',card);
    else if(companion)companion.insertAdjacentElement('afterend',card);
    else document.querySelector('.combo-wrap')?.appendChild(card);
    $('fusionRun')?.addEventListener('click',run);
  }
  function metric(label,value,sub){
    return `<span><b>${value}</b>${label}<small>${sub||''}</small></span>`;
  }
  function contributionRow(label,value,weight){
    const width=pct(weight?value/weight*100:0);
    return `<div class="fusion-contrib-row"><span>${label}</span><i><em style="width:${width}%"></em></i><b>${value>0?'+':''}${value}</b></div>`;
  }
  function comboBlock(title,item,isBest){
    return `<section class="fusion-combo ${isBest?'is-best':''}">
      <div class="fusion-combo-head"><b>${title}</b><span>Fusion ${item.total}</span></div>
      <div class="fusion-balls">${item.nums.map(n=>ball(n,item.added.includes(n)?'fusion-added':item.removed.includes(n)?'fusion-removed':'' )).join('')}</div>
      <div class="fusion-metrics">
        ${metric('기존 AI',item.classic,'60%')}${metric('패턴 보정',item.pattern.adjusted,'20%')}
        ${metric('동반빈도',item.frequency.score,'15%')}${metric('번호 유지',item.preservation,'5%')}
      </div>
    </section>`;
  }
  function numberContribution(item){
    return `<details class="fusion-number-details"><summary>번호별 동반 기여도 보기</summary>
      <div>${item.frequency.numberContributions.map(x=>`<div class="fusion-number-row">${ball(x.n)}<b>${x.n}번</b><span>빈도 ${x.score}</span><em>${x.links.map(l=>`${l.n}(${l.count})`).join(' · ')||'연결 없음'}</em></div>`).join('')}</div>
    </details>`;
  }
  function render(data){
    const box=$('fusionResult');
    if(data.error){box.innerHTML=`<div class="fusion-error">${data.error}</div>`;return;}
    const current=data.current,best=data.best,delta=best.total-current.total;
    const same=best.source==='current';
    box.innerHTML=`
      <div class="fusion-formula"><b>통합 배점</b><span>기존 AI 60% · 패턴 20% · 동반빈도 15% · 유지율 5%</span></div>
      <div class="fusion-compare">${comboBlock('현재 조합',current,false)}${same?'':`<div class="fusion-arrow">↓</div>${comboBlock('통합 추천조합',best,true)}`}</div>
      <div class="fusion-judgement"><b>${same?'현재 조합 유지 권장':`통합 개선 ${delta>=0?'+':''}${delta}점`}</b><span>${same?'교체 후보보다 현재 조합의 Fusion 점수가 높습니다.':`${best.replaceCount}개 교체 후보 · 기존 AI와 동반관계를 함께 비교했습니다.`}</span></div>
      ${same?'':`<div class="fusion-change"><span>유지 ${best.kept.join('·')||'-'}</span><span>제외 ${best.removed.join('·')||'-'}</span><span>추가 ${best.added.join('·')||'-'}</span></div>`}
      <div class="fusion-contributions"><b>최종 조합 점수 구성</b>
        ${contributionRow('기존 AI',best.contributions.classic,60)}
        ${contributionRow('동반패턴',best.contributions.pattern,20)}
        ${contributionRow('동반출현 빈도',best.contributions.frequency,15)}
        ${contributionRow('번호 유지율',best.contributions.preservation,5)}
      </div>
      <div class="fusion-reasons"><b>AI 판단</b>${data.reasons.map(x=>`<p>✓ ${x}</p>`).join('')}</div>
      ${numberContribution(best)}
      ${same?'':`<button type="button" class="fusion-apply" data-fusion-apply="${best.nums.join(',')}">통합 추천조합 적용</button>`}
      <details class="fusion-alternatives"><summary>대안조합 ${data.alternatives.length}개 보기</summary>${data.alternatives.map((x,i)=>`<button type="button" data-fusion-apply="${x.nums.join(',')}"><span>${i+1}</span><div>${x.nums.map(n=>ball(n)).join('')}</div><em>Fusion ${x.total} · 교체 ${x.replaceCount}</em></button>`).join('')}</details>`;
  }
  function run(){
    const eng=global.ScoreFusionEngine,btn=$('fusionRun');
    if(!eng)return;
    btn.disabled=true;btn.textContent='Fusion 계산 중...';
    setTimeout(()=>{
      try{render(eng.analyze());}
      catch(e){$('fusionResult').innerHTML=`<div class="fusion-error">Fusion 분석 중 오류가 발생했습니다.</div>`;console.error(e);}
      finally{btn.disabled=false;btn.textContent='Fusion AI 다시 분석';}
    },20);
  }
  document.addEventListener('click',e=>{
    const apply=e.target.closest('[data-fusion-apply]');
    if(apply){
      const nums=apply.dataset.fusionApply.split(',').map(Number);
      if($('comboInput'))$('comboInput').value=nums.join(' ');
      $('analyzeBtn')?.click();
      setTimeout(()=>{ensure();run();$('scoreFusionCard')?.scrollIntoView({behavior:'smooth',block:'center'});},80);
    }
  });
  const observer=new MutationObserver(()=>ensure());
  document.addEventListener('DOMContentLoaded',()=>{ensure();observer.observe(document.body,{childList:true,subtree:true});});
  $('analyzeBtn')?.addEventListener('click',()=>setTimeout(()=>{ensure();const box=$('fusionResult');if(box)box.innerHTML='<p>새 분석번호가 적용되었습니다. Fusion AI를 실행하세요.</p>';},60));
})(window);
