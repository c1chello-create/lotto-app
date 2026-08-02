(function(global){
  'use strict';
  const E=()=>global.CompanionCombinationEngine;
  const $=id=>document.getElementById(id);
  const cls=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=n=>`<span class="ball small-ball ${cls(Number(n))}">${n}</span>`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function shell(){
    return `<section class="combo-card companion-combo-lab">
      <div class="ccl-title"><div><b>🔗 동반출현 조합</b><p>2개·3개·4개 번호가 함께 나온 과거 패턴을 집계합니다.</p></div><span>전체 통계</span></div>
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
    const data=eng.aggregate();
    const shown=data.slice(0,eng.state.limit);
    $('cclSummary').innerHTML=`<b>${eng.state.size}개 조합 ${data.length.toLocaleString()}개</b><span>${eng.state.scope==='all'?'전체':`최근 ${eng.state.scope}회`} · ${eng.state.minCount===1?'전체 출현':eng.state.minCount+'회 이상'} · 보너스 ${eng.state.includeBonus?'포함':'제외'}</span>`;
    $('cclList').innerHTML=shown.length?shown.map(item=>`<button class="ccl-row" type="button" data-ccl-key="${item.key}">
      <span class="ccl-balls">${item.nums.map(ball).join('')}</span><strong>${item.count}회</strong><span>${item.recentRound}회</span><span>${esc(item.recentDate)}</span>
    </button>`).join(''):`<div class="ccl-empty">해당 조건의 조합이 없습니다.</div>`;
    const more=$('cclMore');more.hidden=data.length<=eng.state.limit;more.textContent=`더 보기 (${eng.state.limit}/${data.length})`;
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
  function patternLine(label,item){
    if(!item||!item.key)return `<div class="acp-overview-line is-empty"><span>${label}</span><em>해당 조합 없음</em></div>`;
    return `<button type="button" class="acp-overview-line" data-ccl-key="${item.key}"><span>${label}</span><b>${item.nums.join('·')}</b><em>${item.count}회</em></button>`;
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
      <div class="acp-overview-list">${items.map(x=>`<section class="acp-overview-card">
        <div class="acp-overview-title">${ball(x.candidate)}<b>${x.candidate}번</b></div>
        ${patternLine('2조합 최고',x.two)}
        ${patternLine('3조합 최고',x.three)}
        ${patternLine('4조합 최고',x.four)}
      </section>`).join('')}</div>
      <p class="acp-overview-note">각 조합을 누르면 실제 함께 출현한 회차를 확인할 수 있습니다. 이 통계는 현재 AI Score와 추천 순위에는 반영되지 않습니다.</p>
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
      if(e.target.closest('[data-ccl-close]'))close();
      if(e.target.closest('#cclMore')){E().state.limit+=100;render();}
    });
    $('cclScope').addEventListener('change',e=>{E().state.scope=e.target.value;E().state.limit=100;render();refreshRecommendationSummary();});
    $('cclSort').addEventListener('change',e=>{E().state.sort=e.target.value;render();});
    $('cclMinCount').addEventListener('change',e=>{E().state.minCount=Number(e.target.value);E().state.limit=100;render();});
    $('cclBonus').addEventListener('change',e=>{E().state.includeBonus=e.target.checked;E().state.limit=100;render();refreshRecommendationSummary();});
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
      <div class="acp-list">${items.map(x=>`<button type="button" class="acp-row">
        <span>${ball(x.candidate)}<b>${x.candidate}번</b></span>
        <em>2조합 ${x.strength2} · 3조합 ${x.three?.count||0}회</em>
      </button>`).join('')}</div>
      <button type="button" class="acp-detail-btn" id="acpDetailBtn">동반 패턴 자세히 보기</button>
      <p>표시용 참고 통계이며 현재 AI Score와 추천 순위에는 반영되지 않습니다.</p>
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
