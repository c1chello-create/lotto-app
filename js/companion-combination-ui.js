(function(global){
  'use strict';
  const E=()=>global.CompanionCombinationEngine;
  const $=id=>document.getElementById(id);
  const cls=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=n=>`<span class="ball small-ball ${cls(Number(n))}">${n}</span>`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function shell(){
    return `<section class="combo-card companion-combo-lab">
      <div class="ccl-title"><div><b>🔗 선택번호 연관 동반조합</b><p>입력번호끼리의 조합과 입력번호에 연결된 동반번호 출현 이력만 집계합니다.</p></div><span>선택번호 기준</span></div>
      <div class="ccl-size-tabs" role="tablist">
        <button data-ccl-size="2" class="active">2개 조합</button><button data-ccl-size="3">3개 조합</button><button data-ccl-size="4">4개 조합</button>
      </div>
      <div class="ccl-controls">
        <label>분석 범위<select id="cclScope"><option value="50">최근 50회</option><option value="100">최근 100회</option><option value="all" selected>전체</option></select></label>
        <label>정렬<select id="cclSort"><option value="count">출현횟수순</option><option value="latest">최근회차순</option><option value="number">번호순</option></select></label>
        <label>최소 출현<select id="cclMinCount"><option value="1">전체</option><option value="2">2회+</option><option value="3" selected>3회+</option><option value="5">5회+</option></select></label>
      </div>
      <label class="checkline ccl-bonus"><input id="cclBonus" type="checkbox" checked> 보너스 번호 포함</label>
      <div class="ccl-summary" id="cclSummary">데이터를 준비하고 있습니다.</div>
      <div class="ccl-head"><span>번호 조합</span><span>횟수</span><span>최근회차</span><span>최근출현일</span></div>
      <div id="cclList"></div>
      <button id="cclMore" class="ccl-more" type="button" hidden>더 보기</button>
      <p class="combo-guide">조합을 누르면 함께 출현한 모든 회차를 확인할 수 있습니다. 출현 통계이며 당첨 확률을 의미하지 않습니다.</p>
    </section>`;
  }
  function ensure(){
    let root=$('companionComboLab');
    if(!root){
      root=document.createElement('div');root.id='companionComboLab';
      const status=$('status');
      if(status)status.insertAdjacentElement('afterend',root);else document.querySelector('.combo-wrap')?.appendChild(root);
    }
    if(!root.dataset.ready){root.innerHTML=shell();root.dataset.ready='1';bind();}
    return root;
  }
  function render(){
    const eng=E();if(!eng)return;
    const selected=currentSelection();
    const required=eng.requiredSelectedCount(eng.state.size);
    const data=eng.aggregate({selectedNums:selected});
    const shown=data.slice(0,eng.state.limit);
    const summary=$('cclSummary'),list=$('cclList'),more=$('cclMore');

    if(selected.length<required){
      summary.innerHTML=`<b>입력번호가 필요합니다</b><span>${eng.state.size}개 조합 분석에는 입력번호 ${required}개 이상이 필요합니다.</span>`;
      list.innerHTML=`<div class="ccl-empty">위의 ‘분석할 번호 입력’에서 번호를 입력하고 조합 분석하기를 눌러주세요.</div>`;
      more.hidden=true;
      return;
    }

    summary.innerHTML=`<b>${eng.state.size}개 연관조합 ${data.length.toLocaleString()}개</b><span>기준 ${selected.join('·')} · ${eng.state.scope==='all'?'전체':`최근 ${eng.state.scope}회`} · ${eng.state.minCount===1?'전체 출현':eng.state.minCount+'회 이상'}</span>`;
    list.innerHTML=shown.length?shown.map(item=>`<button class="ccl-row" type="button" data-ccl-key="${item.key}">
      <span class="ccl-balls">${item.nums.map(n=>`<span class="ball small-ball ${cls(Number(n))} ${selected.includes(Number(n))?'selected-ball':''}">${n}</span>`).join('')}</span>
      <strong>${item.count}회</strong><span>${item.recentRound}회</span><span>${esc(item.recentDate)}</span>
    </button>`).join(''):`<div class="ccl-empty">선택번호와 연결되고 현재 최소 출현 조건을 만족하는 조합이 없습니다.</div>`;
    more.hidden=data.length<=eng.state.limit;more.textContent=`더 보기 (${eng.state.limit}/${data.length})`;
  }
  function openDetail(key){
    const eng=E(),nums=key.split(',').map(Number),items=eng.details(key);
    let wrap=$('cclModal');
    if(!wrap){wrap=document.createElement('div');wrap.id='cclModal';wrap.className='ccl-modal';document.body.appendChild(wrap);}
    wrap.innerHTML=`<div class="ccl-backdrop" data-ccl-close></div><section class="ccl-sheet" role="dialog" aria-modal="true">
      <div class="ccl-handle"></div><div class="ccl-sheet-head"><div><b>${nums.map(n=>`${n}번`).join(' · ')}</b><p>총 출현횟수 <strong>${items.length}회</strong> · 보너스 ${eng.state.includeBonus?'포함':'제외'}</p></div><button type="button" data-ccl-close>✕</button></div>
      <div class="ccl-detail-list">${items.map(row=>{
        const normal=(row.numbers||[]).map(Number),bonus=Number(row.bonus);
        return `<div class="ccl-detail-row"><div><b>${row.round}회</b><small>${esc(row.date||'')}</small></div><div class="ccl-detail-balls">${normal.map(n=>`<span class="ball tiny-ball ${nums.includes(n)?cls(n):'ccl-muted'}">${n}</span>`).join('')}<i>+</i><span class="ball tiny-ball ${nums.includes(bonus)?cls(bonus):'ccl-muted'}">${bonus}</span></div></div>`;
      }).join('')}</div><button class="ccl-close-bottom" type="button" data-ccl-close>닫기</button>
    </section>`;
    wrap.classList.add('open');document.body.classList.add('ccl-lock');
  }
  function patternLine(label,item,index,usage){
    if(!item||!item.key)return `<div class="acp-overview-line is-empty"><span>${label}</span><em>해당 조합 없음</em></div>`;
    const badge=usage?.used?`<i class="acp-ai-badge is-used">AI 반영${usage.bestRank?` · ${usage.bestRank}위`:''}</i>`:`<i class="acp-ai-badge">참고</i>`;
    return `<button type="button" class="acp-overview-line" data-ccl-key="${item.key}">
      <span>${label}</span><b>${item.nums.join('·')}</b><em>${item.count}회 · 지수 ${index}</em>${badge}
    </button>`;
  }
  function openRecommendationDetail(){
    const eng=E(),base=currentSelection(),recs=currentRecommendations();
    if(!eng||base.length<2||!recs.length)return;
    const items=eng.recommendationPatterns(base,recs,{scope:eng.state.scope,includeBonus:eng.state.includeBonus});
    let wrap=$('cclModal');
    if(!wrap){wrap=document.createElement('div');wrap.id='cclModal';wrap.className='ccl-modal';document.body.appendChild(wrap);}
    wrap.innerHTML=`<div class="ccl-backdrop" data-ccl-close></div><section class="ccl-sheet acp-overview-sheet" role="dialog" aria-modal="true">
      <div class="ccl-handle"></div>
      <div class="ccl-sheet-head"><div><b>추천번호별 동반 패턴</b><p>${eng.state.scope==='all'?'전체':`최근 ${eng.state.scope}회`} · 보너스 ${eng.state.includeBonus?'포함':'제외'}</p></div><button type="button" data-ccl-close>✕</button></div>
      <div class="acp-overview-list">${items.map((x,i)=>`<section class="acp-overview-card">
        <div class="acp-overview-title">${ball(x.candidate)}<b>${x.candidate}번</b>
          <span class="acp-index-pill">Companion Index ${x.index.score} · ${E().gradeForScore(x.index.score).grade}</span>
          ${i===0?'<span class="acp-best-badge">AI 추천 패턴</span>':''}
        </div>
        <div class="acp-index-parts">2조합 ${x.index.two} · 3조합 ${x.index.three} · 4조합 ${x.index.four} · 최근성 ${x.index.recent}</div>
        ${patternLine('2조합 최고',x.two,x.index.two,x.aiUsage)}
        ${patternLine('3조합 최고',x.three,x.index.three,x.aiUsage)}
        ${patternLine('4조합 최고',x.four,x.index.four,x.aiUsage)}
      </section>`).join('')}</div>
      <p class="acp-overview-note">Companion Index는 2조합 45%·3조합 30%·4조합 15%·최근성 10%의 Preview 지수입니다. 각 조합을 누르면 실제 출현 회차를 확인할 수 있습니다. 기존 AI Score 산식은 변경하지 않았습니다.</p>
      <button class="ccl-close-bottom" type="button" data-ccl-close>닫기</button>
    </section>`;
    wrap.classList.add('open');document.body.classList.add('ccl-lock');
  }
  function close(){const m=$('cclModal');if(m)m.classList.remove('open');document.body.classList.remove('ccl-lock');}
  function bind(){
    document.addEventListener('click',e=>{
      const size=e.target.closest('[data-ccl-size]');
      if(size){
        document.querySelectorAll('[data-ccl-size]').forEach(b=>b.classList.toggle('active',b===size));
        const n=Number(size.dataset.cclSize);E().state.size=n;E().state.minCount=E().defaults[n];E().state.limit=100;
        if($('cclMinCount'))$('cclMinCount').value=String(E().state.minCount);
        render();
      }
      const row=e.target.closest('[data-ccl-key]');if(row)openDetail(row.dataset.cclKey);
      if(e.target.closest('[data-open-rec-pattern]'))openRecommendationDetail();
      const apply=e.target.closest('[data-cpo-apply]');
      if(apply){
        const nums=apply.dataset.cpoApply.split(',').map(Number);
        if($('comboInput'))$('comboInput').value=nums.join(' ');
        $('analyzeBtn')?.click();
        document.querySelector('#companionPatternOptimizer')?.scrollIntoView({behavior:'smooth',block:'center'});
      }
      if(e.target.closest('[data-ccl-close]'))close();
      if(e.target.closest('#cclMore')){E().state.limit+=100;render();}
    });
    $('cclScope').addEventListener('change',e=>{E().state.scope=e.target.value;E().state.limit=100;render();refreshRecommendationSummary();});
    $('cclSort').addEventListener('change',e=>{E().state.sort=e.target.value;render();});
    $('cclMinCount').addEventListener('change',e=>{E().state.minCount=Number(e.target.value);E().state.limit=100;render();});
    $('cclBonus').addEventListener('change',e=>{E().state.includeBonus=e.target.checked;E().state.limit=100;render();refreshRecommendationSummary();});
    $('analyzeBtn')?.addEventListener('click',()=>setTimeout(()=>{E().state.limit=100;render();refreshRecommendationSummary();},0));
    $('comboInput')?.addEventListener('change',()=>{E().state.limit=100;render();});

  }

  function currentSelection(){
    const raw=($('comboInput')?.value||'').trim();
    return [...new Set(raw.split(/[\s,]+/).map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=45))].sort((a,b)=>a-b);
  }
  function currentRecommendations(){
    try{
      if(typeof global.companionAnalysis==='function')return global.companionAnalysis().recommend||[];
    }catch(e){}
    return [];
  }
  function summaryHtml(){
    const eng=E(),base=currentSelection(),recs=currentRecommendations();
    if(!eng||base.length<2||!recs.length)return'';
    const items=eng.recommendationPatterns(base,recs,{scope:eng.state.scope,includeBonus:eng.state.includeBonus});
    return `<div id="aiCompanionPatternBox" class="ai-companion-pattern">
      <div class="acp-recommend-head"><b>Companion Pattern AI</b><span>Preview</span></div>
      <div class="acp-list">${items.map((x,i)=>`<button type="button" class="acp-row" data-open-rec-pattern>
        <span>${ball(x.candidate)}<b>${x.candidate}번</b>${i===0?'<i class="acp-best-mini">추천</i>':''}</span>
        <em><strong>지수 ${x.index.score} · ${E().gradeForScore(x.index.score).grade}</strong> · 2조합 ${x.strength2} · 3조합 ${x.three?.count||0}회 · ${x.aiUsage.label}</em>
      </button>`).join('')}</div>
      <button type="button" class="acp-detail-btn" id="acpDetailBtn">추천번호별 최고 2·3·4조합 보기</button>
      <p>Companion Index와 AI 반영 배지는 설명용 Preview입니다. 기존 AI Score와 추천 순위 산식은 변경하지 않습니다.</p>
    </div>`;
  }
  function refreshRecommendationSummary(){
    const card=[...document.querySelectorAll('#companion .combo-card')].find(x=>x.textContent.includes('AI 추천 동반번호'));
    if(!card)return;
    card.querySelector('#aiCompanionPatternBox')?.remove();
    const html=summaryHtml();
    if(html)card.insertAdjacentHTML('beforeend',html);
    const btn=$('acpDetailBtn');
    if(btn)btn.onclick=openRecommendationDetail;
    ensureOptimizer();
  }

  function optimizerShell(){
    return `<section id="companionPatternOptimizer" class="companion-pattern-optimizer">
      <div class="cpo-head"><div><b>🧩 Companion Pattern Optimizer</b><p>현재 번호를 최대한 유지하면서 Pattern Score가 높은 조합을 탐색합니다.</p></div><span>v1.9.2</span></div>
      <div class="cpo-controls">
        <label>최대 교체<select id="cpoMaxReplace"><option value="1">1개</option><option value="2">2개</option><option value="3" selected>3개</option></select></label>
        <button type="button" id="cpoRun">패턴 최적화 실행</button>
      </div>
      <div id="cpoResult" class="cpo-result"><p>번호 6개를 분석한 뒤 실행할 수 있습니다.</p></div>
    </section>`;
  }
  function ensureOptimizer(){
    const patternBox=$('aiCompanionPatternBox');
    if(!patternBox||$('companionPatternOptimizer'))return;
    patternBox.insertAdjacentHTML('afterend',optimizerShell());
    $('cpoRun')?.addEventListener('click',runOptimizer);
  }
  function scoreCard(title,item,isBest){
    if(!item)return'';
    const p=item.pattern||item;
    return `<section class="cpo-score-card ${isBest?'is-best':''}">
      <div class="cpo-score-head"><b>${title}</b><span>${p.grade.grade}등급 · ${p.score}점</span></div>
      <div class="cpo-balls">${p.nums.map(ball).join('')}</div>
      <div class="cpo-parts"><span>2조합 ${p.pair.avg}</span><span>3조합 ${p.triple.avg}</span><span>4조합 ${p.quad.avg}</span><span>최근성 ${p.recent}</span></div>
    </section>`;
  }
  function runOptimizer(){
    const eng=E(),result=$('cpoResult'),base=currentSelection();
    if(!eng||base.length!==6){result.innerHTML='<div class="cpo-warning">분석번호 6개를 입력해 주세요.</div>';return;}
    const btn=$('cpoRun');btn.disabled=true;btn.textContent='탐색 중...';
    setTimeout(()=>{
      try{
        const data=eng.optimizePattern(base,{
          maxReplace:Number($('cpoMaxReplace')?.value||3),
          scope:eng.state.scope,
          includeBonus:eng.state.includeBonus
        });
        if(data.error){result.innerHTML=`<div class="cpo-warning">${data.error}</div>`;return;}
        if(!data.best){result.innerHTML=scoreCard('현재 조합',data.current,false)+'<p class="cpo-note">더 높은 Pattern Score 조합을 찾지 못했습니다.</p>';return;}
        const removed=data.best.removed.join('·'),added=data.best.added.join('·');
        result.innerHTML=`
          <div class="cpo-compare">${scoreCard('현재 조합',data.current,false)}<div class="cpo-arrow">↓</div>${scoreCard('대표 최적해',data.best,true)}</div>
          <div class="cpo-change">교체 ${removed||'-'} → ${added||'-'} · <strong>+${data.best.pattern.score-data.current.score}점</strong></div>
          <div class="cpo-reasons"><b>AI 추천 이유</b>${data.reasons.map(x=>`<p>✓ ${x}</p>`).join('')}</div>
          <button type="button" class="cpo-apply" data-cpo-apply="${data.best.nums.join(',')}">대표 최적해 적용</button>
          ${data.coOptimal.length>1?`<div class="cpo-co"><b>공동 최적해 ${data.coOptimal.length}개</b>${data.coOptimal.map((x,i)=>`<button type="button" data-cpo-apply="${x.nums.join(',')}"><span>${i+1}</span>${x.nums.map(ball).join('')}<em>${x.pattern.grade.grade} · ${x.pattern.score}점</em></button>`).join('')}</div>`:''}
          <p class="cpo-note">총 ${data.tested.toLocaleString()}개 후보를 단계형 탐색했습니다. Pattern Score는 과거 패턴 강도 지수이며 당첨 확률이 아닙니다.</p>`;
      }finally{btn.disabled=false;btn.textContent='패턴 최적화 실행';}
    },30);
  }
  function patchRenderCompanion(){
    if(global.__CCL_RENDER_PATCHED__)return;
    const original=global.renderCompanion;
    if(typeof original!=='function'){setTimeout(patchRenderCompanion,100);return;}
    global.renderCompanion=function(){
      const result=original.apply(this,arguments);
      setTimeout(refreshRecommendationSummary,0);
      return result;
    };
    global.__CCL_RENDER_PATCHED__=true;
  }
  function wait(){
    ensure();patchRenderCompanion();
    if((global.LOTTO_DATA||[]).length){render();refreshRecommendationSummary();}
    else setTimeout(wait,250);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
  global.CompanionCombinationUI=Object.freeze({render,openDetail,close,refreshRecommendationSummary});
})(window);
