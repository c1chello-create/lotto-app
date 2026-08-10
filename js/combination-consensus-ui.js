(function(global){
  'use strict';
  if(global.__combinationConsensusUI)return;global.__combinationConsensusUI=true;
  const $=id=>document.getElementById(id);
  const cls=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=n=>`<span class="ball small-ball ${cls(Number(n))}">${n}</span>`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function injectStyle(){
    if($('combinationConsensusStyle'))return;
    const st=document.createElement('style');st.id='combinationConsensusStyle';st.textContent=`
      .ccs-card{margin:14px 12px;background:#fff;border:1px solid #cbdcf5;border-radius:18px;padding:16px;box-shadow:0 2px 10px rgba(15,45,85,.05)}
      .ccs-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.ccs-head b{font-size:18px;color:#112f5d}.ccs-head p{margin:5px 0 0;color:#667085;font-size:12px;line-height:1.45}.ccs-head>span{white-space:nowrap;background:#edf5ff;color:#1769aa;font-size:11px;font-weight:900;padding:6px 9px;border-radius:999px}
      .ccs-run{width:100%;border:0;border-radius:14px;padding:13px;margin-top:12px;background:#163b74;color:#fff;font-size:16px;font-weight:900}.ccs-run:disabled{opacity:.55}
      .ccs-progress{margin-top:10px;padding:11px 12px;border-radius:12px;background:#f4f7fb;color:#475467;font-size:13px}.ccs-progress.error{background:#fff1f0;color:#b42318}
      .ccs-source-list{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.ccs-source{font-size:11px;font-weight:850;padding:6px 8px;border-radius:999px;background:#f2f4f7;color:#667085}.ccs-source.on{background:#e9f7ef;color:#267a49;border:1px solid #c9ead7}
      .ccs-pool{border:1px solid #d7e4f6;background:#f8fbff;border-radius:15px;padding:12px;margin-top:10px}.ccs-pool-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.ccs-pool-head b{color:#11366b}.ccs-pool-head span{font-size:11px;color:#667085}
      .ccs-group{margin-top:9px}.ccs-group>span{display:block;font-size:11px;font-weight:900;color:#667085;margin-bottom:5px}.ccs-balls{display:flex;gap:5px;flex-wrap:wrap}.ccs-empty{font-size:12px;color:#98a2b3}
      .ccs-best{margin-top:12px;border:1px solid #e8c76c;background:#fffaf0;border-radius:16px;padding:13px}.ccs-best-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.ccs-best-head b{font-size:16px;color:#7b5700}.ccs-best-head span{font-size:11px;font-weight:900;color:#8a5b00;background:#fff1bc;padding:5px 8px;border-radius:999px}.ccs-best .ccs-balls{margin:9px 0}
      .ccs-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px}.ccs-metrics span{background:#fff;border:1px solid #e7edf5;border-radius:10px;padding:8px 4px;text-align:center;font-size:10px;color:#667085}.ccs-metrics b{display:block;font-size:15px;color:#173b70;margin-bottom:2px}
      .ccs-change{margin-top:7px;font-size:12px;color:#475467}.ccs-note{font-size:11px;color:#667085;line-height:1.55;margin:10px 0 0}
      .ccs-top{margin-top:14px}.ccs-top-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:7px}.ccs-top-title b{font-size:16px;color:#101828}.ccs-top-title span{font-size:11px;color:#667085}
      .ccs-row{width:100%;display:grid;grid-template-columns:30px minmax(0,1fr) auto;gap:7px;align-items:center;border:1px solid #e6edf7;background:#fff;border-radius:13px;padding:9px;margin-top:7px;text-align:left}.ccs-row:first-of-type{border-color:#e8c76c;background:#fffdf5}.ccs-rank{font-weight:900;color:#8a5b00}.ccs-row-main .ccs-balls{gap:3px}.ccs-row-main small{display:block;color:#667085;margin-top:5px;font-size:10px}.ccs-score{text-align:right;font-size:11px;color:#667085;white-space:nowrap}.ccs-score b{display:block;color:#11366b;font-size:14px}
      .ccs-details{margin-top:12px;border-top:1px dashed #dbe5f2;padding-top:10px}.ccs-details summary{cursor:pointer;font-weight:900;color:#11366b}.ccs-number{display:grid;grid-template-columns:46px 55px 1fr;gap:6px;align-items:start;padding:8px 0;border-top:1px solid #eef2f7}.ccs-number:first-child{border-top:0}.ccs-number>span{font-size:11px;color:#667085}.ccs-number>em{font-style:normal;font-size:11px;color:#475467;line-height:1.45}.ccs-number strong{color:#11366b}
      .ccs-apply{border:0;background:#eaf3ff;color:#1769aa;font-weight:900;border-radius:10px;padding:8px 9px}
      @media(max-width:420px){.ccs-metrics{grid-template-columns:repeat(2,1fr)}.ccs-row{grid-template-columns:26px minmax(0,1fr) 54px}.ccs-row .ball.small-ball{transform:scale(.92);transform-origin:center}}
    `;document.head.appendChild(st);
  }

  function shell(){
    return `<section id="combinationConsensusCard" class="ccs-card">
      <div class="ccs-head"><div><b>🧩 Combination Consensus</b><p>각 엔진이 이미 골라낸 번호를 먼저 결집한 뒤 8~12개 후보군 안에서 최종 6개 조합을 다시 구성합니다.</p></div><span>독립 엔진 v0.1</span></div>
      <button type="button" id="combinationConsensusRun" class="ccs-run">조합 결집 분석 실행</button>
      <div id="combinationConsensusResult" class="ccs-progress">번호 6개를 분석한 뒤 실행하세요. AI 최적해·+1 역산·Dream Chain을 먼저 실행했다면 그 결과도 자동으로 참고합니다.</div>
    </section>`;
  }
  function ensure(){
    injectStyle();if($('combinationConsensusCard'))return;
    const companion=$('companion');
    if(companion)companion.insertAdjacentHTML('afterend',shell());
    else document.querySelector('.combo-wrap')?.insertAdjacentHTML('beforeend',shell());
  }
  function progress(text,error=false){const box=$('combinationConsensusResult');if(box){box.className=`ccs-progress${error?' error':''}`;box.textContent=text;}}
  function groupBalls(nums){return nums?.length?`<div class="ccs-balls">${nums.map(ball).join('')}</div>`:`<span class="ccs-empty">해당 없음</span>`;}
  function sourceChips(r){
    return Object.values(r.sources||{}).map(x=>`<span class="ccs-source ${x.used?'on':''}">${x.used?'✓':'–'} ${esc(x.label)}</span>`).join('');
  }
  function changed(base,nums){
    const out=base.filter(n=>!nums.includes(n)),inn=nums.filter(n=>!base.includes(n));
    return {out,inn};
  }
  function metrics(x){
    const active=Math.max(1,global.CombinationConsensusEngine?.getState?.().last?.activeSources?.length||1);
    const numberVotes=Math.round((x.voteSum||0)/6*10)/10;
    return `<div class="ccs-metrics">
      <span><b>${x.coreCount||0}</b>Core 포함</span><span><b>${numberVotes}</b>평균 엔진표</span>
      <span><b>${x.patternScore||0}</b>Pattern</span><span><b>${x.fusionScore||0}</b>Fusion</span>
    </div>`;
  }
  function render(r){
    const box=$('combinationConsensusResult');if(!box)return;
    if(r.error){progress(r.error,true);return;}
    box.className='';
    const best=r.best;const ch=best?changed(r.base,best.nums):{out:[],inn:[]};
    const benchmark=r.benchmark;
    const detailRows=(r.poolEntries||[]).slice().sort((a,b)=>b.sourceCount-a.sourceCount||b.strength-a.strength||a.n-b.n).map(x=>{
      const src=(x.sourceList||[]).filter(s=>s.score>0).map(s=>`${r.sources[s.id]?.label||s.id} ${s.score}`).join(' · ')||'엔진 직접 지지 없음(입력번호 후보 보존)';
      return `<div class="ccs-number"><div>${ball(x.n)}</div><span><strong>${x.group==='core'?'Core':x.group==='strong'?'Strong':'Support'}</strong><br>${x.sourceCount}/${r.activeSources.length}엔진</span><em>${esc(src)}</em></div>`;
    }).join('');
    const topRows=(r.top||[]).map(x=>{
      const c=changed(r.base,x.nums);
      return `<button type="button" class="ccs-row" data-consensus-apply="${x.nums.join(',')}"><span class="ccs-rank">${x.rank}</span><span class="ccs-row-main"><span class="ccs-balls">${x.nums.map(ball).join('')}</span><small>교체 ${x.replaceCount} · 제외 ${c.out.join('·')||'-'} / 추가 ${c.inn.join('·')||'-'} · 원순위 ${x.rawRank}</small></span><span class="ccs-score"><b>F ${x.fusionScore}</b>P ${x.patternScore}</span></button>`;
    }).join('');
    box.innerHTML=`
      <div class="ccs-source-list">${sourceChips(r)}</div>
      <div class="ccs-pool"><div class="ccs-pool-head"><b>압축 후보번호 ${r.pool.length}개</b><span>${r.combinations.toLocaleString()}개 6번호 조합 1차 비교</span></div>
        <div class="ccs-group"><span>Core · ${r.coreThreshold}개 이상 엔진 지지</span>${groupBalls(r.groups.core)}</div>
        <div class="ccs-group"><span>Strong · 2개 엔진 지지</span>${groupBalls(r.groups.strong)}</div>
        <div class="ccs-group"><span>Support · 입력 보존/단일 엔진 지지</span>${groupBalls(r.groups.support)}</div>
      </div>
      ${best?`<div class="ccs-best"><div class="ccs-best-head"><b>🏆 대표 결집조합</b><span>순위합 ${best.rankSum}</span></div><div class="ccs-balls">${best.nums.map(ball).join('')}</div>${metrics(best)}<div class="ccs-change">유지 ${best.kept}개 · 제외 ${ch.out.join('·')||'-'} · 추가 ${ch.inn.join('·')||'-'}</div><button type="button" class="ccs-run" data-consensus-apply="${best.nums.join(',')}">대표 결집조합 적용</button></div>`:''}
      ${benchmark?`<p class="ccs-note">현재 입력조합 기준: Fusion ${benchmark.fusionScore} · Pattern ${benchmark.patternScore} · 결집 원순위 ${benchmark.rawRank}. 원본 조합도 후보군에 포함해 비교했습니다.</p>`:''}
      <div class="ccs-top"><div class="ccs-top-title"><b>Consensus TOP 10</b><span>같은 5개 번호만 반복되는 조합은 가능한 범위에서 분산</span></div>${topRows}</div>
      <details class="ccs-details"><summary>번호별 엔진 지지 근거 보기</summary>${detailRows}</details>
      <p class="ccs-note">${esc(r.note)}<br>정밀평가 ${r.evaluated}개만 실행해 iPhone 계산 부담을 줄였습니다. 모든 점수는 비교지수이며 당첨 확률을 뜻하지 않습니다.</p>`;
  }

  async function run(){
    const eng=global.CombinationConsensusEngine,btn=$('combinationConsensusRun');if(!eng)return;
    if(btn){btn.disabled=true;btn.textContent='결집 계산 중...';}
    try{const r=await eng.analyze({onProgress:t=>progress(t)});render(r);}
    catch(e){console.error(e);progress(`결집 분석 중 오류: ${e.message||e}`,true);}
    finally{if(btn){btn.disabled=false;btn.textContent='조합 결집 다시 실행';}}
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('#combinationConsensusRun'))run();
    const apply=e.target.closest('[data-consensus-apply]');
    if(apply){
      const nums=String(apply.getAttribute('data-consensus-apply')||'').split(',').map(Number).filter(Boolean);
      const input=$('comboInput');if(input)input.value=nums.join(' ');
      $('analyzeBtn')?.click();window.scrollTo({top:0,behavior:'smooth'});
    }
  });
  const observer=new MutationObserver(()=>ensure());
  function bind(){ensure();observer.observe(document.body,{childList:true,subtree:true});$('analyzeBtn')?.addEventListener('click',()=>setTimeout(()=>{ensure();const box=$('combinationConsensusResult');if(box){box.className='ccs-progress';box.textContent='새 분석번호가 적용되었습니다. 필요하면 AI 최적해·역산 등을 실행한 뒤 조합 결집 분석을 실행하세요.';}},80));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  global.CombinationConsensusUI=Object.freeze({run,render,ensure});
})(window);
