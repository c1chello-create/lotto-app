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
    $('cclSummary').innerHTML=`<b>${eng.state.size}개 조합 ${data.length.toLocaleString()}개</b><span>${eng.state.scope==='all'?'전체':`최근 ${eng.state.scope}회`} · 보너스 ${eng.state.includeBonus?'포함':'제외'}</span>`;
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
  function close(){const m=$('cclModal');if(m)m.classList.remove('open');document.body.classList.remove('ccl-lock');}
  function bind(){
    document.addEventListener('click',e=>{
      const size=e.target.closest('[data-ccl-size]');
      if(size){document.querySelectorAll('[data-ccl-size]').forEach(b=>b.classList.toggle('active',b===size));E().state.size=Number(size.dataset.cclSize);E().state.limit=100;render();}
      const row=e.target.closest('[data-ccl-key]');if(row)openDetail(row.dataset.cclKey);
      if(e.target.closest('[data-ccl-close]'))close();
      if(e.target.closest('#cclMore')){E().state.limit+=100;render();}
    });
    $('cclScope').addEventListener('change',e=>{E().state.scope=e.target.value;E().state.limit=100;render();});
    $('cclSort').addEventListener('change',e=>{E().state.sort=e.target.value;render();});
    $('cclBonus').addEventListener('change',e=>{E().state.includeBonus=e.target.checked;E().state.limit=100;render();});
  }
  function wait(){ensure();if((global.LOTTO_DATA||[]).length)render();else setTimeout(wait,250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait);else wait();
  global.CompanionCombinationUI=Object.freeze({render,openDetail,close});
})(window);
