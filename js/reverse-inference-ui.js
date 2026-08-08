(function(global){
  'use strict';
  if(global.__reverseInferenceUI)return;global.__reverseInferenceUI=true;
  const ballHtml=n=>typeof global.ball==='function'?global.ball(n,true):`<span class="reverse-ball">${n}</span>`;
  const fmtContrib=item=>{
    const c=item?.virtual?.contributions||{};
    return `<div class="reverse-contrib"><span>Classic <b>${c.classic??'-'}</b></span><span>Pattern <b>${c.pattern??'-'}</b></span><span>동반빈도 <b>${c.frequency??'-'}</b></span><span>유지율 <b>${c.preservation??'-'}</b></span></div>`;
  };
  function style(){
    if(document.getElementById('reverseInferenceStyle'))return;
    const st=document.createElement('style');st.id='reverseInferenceStyle';st.textContent=`
      .reverse-card{margin-top:14px;padding:16px;border:1px solid #cfe1ff;border-radius:18px;background:linear-gradient(180deg,#f8fbff,#fff)}
      .reverse-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.reverse-head b{font-size:17px;color:#11366b}.reverse-head span{font-size:11px;font-weight:900;color:#1769aa;background:#eaf4ff;padding:5px 8px;border-radius:999px}
      .reverse-controls{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}.reverse-controls label{font-size:12px;color:#667085;font-weight:800}.reverse-controls select{width:100%;margin-top:4px;padding:9px;border:1px solid #d0d5dd;border-radius:10px;background:white;font-weight:800}
      .reverse-progress{padding:12px;border-radius:12px;background:#f4f7fb;color:#475467;font-size:13px;margin-top:10px}.reverse-progress.error{color:#b42318;background:#fff1f0}
      .reverse-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}.reverse-summary div{padding:10px 6px;text-align:center;border-radius:12px;background:#f2f7ff}.reverse-summary b{display:block;font-size:18px;color:#11366b}.reverse-summary span{font-size:10px;color:#667085}
      .reverse-best{padding:12px;border:1px solid #b8d5ff;border-radius:14px;background:white}.reverse-best.success{border-color:#8bd0a0;background:#f4fff7}.reverse-balls{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.reverse-change{font-size:12px;color:#475467;margin:7px 0}.reverse-change b{color:#11366b}
      .reverse-contrib{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.reverse-contrib span{padding:7px;border-radius:9px;background:#f7f9fc;font-size:11px}.reverse-contrib b{float:right;color:#11366b}
      .reverse-stage{display:grid;gap:5px;margin:10px 0}.reverse-stage div{display:flex;justify-content:space-between;font-size:12px;padding:7px 9px;background:#f8fafc;border-radius:9px}.reverse-inferred{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.reverse-inferred span{font-size:11px;background:#fff7df;border:1px solid #f0d48a;border-radius:999px;padding:5px 8px;color:#7a5200;font-weight:800}
      .reverse-top details{margin-top:10px}.reverse-top section{padding:9px 0;border-top:1px solid #eef2f7}.reverse-top section:first-child{border-top:0}.reverse-top small{color:#667085}
      @media(max-width:420px){.reverse-summary{grid-template-columns:1fr 1fr}.reverse-contrib{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(st);
  }
  function shell(){
    return `<section class="reverse-card" id="reverseInferenceCard"><div class="reverse-head"><b>🔄 +1회 가상출현 역산</b><span>Fusion AI</span></div><p class="combo-guide">후보 조합이 다음 회차에 1회 출현했다고 가정해 모든 연결 점수를 다시 계산하고 목표점수에 가장 적은 교체로 도달하는 조합을 찾습니다.</p><div class="reverse-controls"><label>목표 Fusion<select id="reverseTarget"><option>80</option><option>85</option><option selected>90</option><option>95</option></select></label><label>최대 교체<select id="reverseMax"><option>1</option><option selected>2</option><option>3</option></select></label></div><p class="combo-guide"><b>Fast Gate 80점</b> · 최고 가능점수가 80점 미만인 후보는 Pattern 정밀계산 전에 제외합니다. Fusion 계산식은 변경하지 않습니다.</p><button type="button" class="combo-btn" id="reverseRun">+1회 역산 실행</button><div id="reverseResult"><p class="combo-guide">실제 lotto.json은 변경하지 않습니다.</p></div></section>`;
  }
  function attach(){
    style();if(document.getElementById('reverseInferenceCard'))return;
    const anchor=document.getElementById('scoreOptimizerCard')||document.querySelector('.ai-ranking-shell');
    if(anchor){anchor.insertAdjacentHTML('afterend',shell());}
  }
  function progress(t,error=false){const el=document.getElementById('reverseResult');if(el)el.innerHTML=`<div class="reverse-progress ${error?'error':''}">${t}</div>`;}
  function render(r){
    const el=document.getElementById('reverseResult');if(!el)return;
    if(r.error){progress(r.error,true);return;}
    const b=r.best;
    const stages=r.stages.map(s=>`<div><span>${s.replaceCount}개 교체 · 검사 ${s.count} · 생존 ${s.kept} · 제외 ${s.pruned}${s.numberCount?` · 번호군 ${s.numberCount}`:''}</span><b>${s.best?`${s.best.after}점 · 목표달성 ${s.met}개`:'후보 없음'}</b></div>`).join('');
    const inferred=r.inferred.map(x=>`<span>${x.n}번 · ${x.count}회 · 최고 ${x.bestScore}</span>`).join('');
    const top=r.top.map((x,i)=>`<section><b>${i+1}위 · ${x.after}점 (${x.delta>=0?'+':''}${x.delta})</b><div class="reverse-balls">${x.nums.map(ballHtml).join('')}</div><small>교체 ${x.replaceCount}개 · 제외 ${x.removed.join(', ')||'-'} · 추가 ${x.added.join(', ')||'-'} · 실제점수 ${x.before}</small></section>`).join('');
    el.innerHTML=`<div class="reverse-summary"><div><b>${r.baseline?.total??'-'}</b><span>현재 Fusion</span></div><div><b>${r.sameVirtual?.total??'-'}</b><span>현재 조합 +1회</span></div><div><b>${r.target}</b><span>목표 Fusion</span></div></div><div class="reverse-stage">${stages}</div>${b?`<div class="reverse-best ${r.reached?'success':''}"><b>${r.reached?'✅ 목표 도달 최적해':'🔎 최고 역산 결과'} · ${b.after}점</b><div class="reverse-balls">${b.nums.map(ballHtml).join('')}</div><div class="reverse-change">실제 <b>${b.before}</b> → 가상 +1회 <b>${b.after}</b> (${b.delta>=0?'+':''}${b.delta}) · 교체 ${b.replaceCount}개<br>제외 ${b.removed.join(', ')||'-'} · 추가 ${b.added.join(', ')||'-'}</div>${fmtContrib(b)}<button type="button" class="combo-btn" data-reverse-apply="${b.nums.join(',')}">이 조합 적용</button></div>`:''}<div class="reverse-progress" style="margin-top:10px">Fast Gate ${r.cutoff}점 · 전체 검사 ${r.totals?.evaluated||0} · 정밀계산 ${r.totals?.kept||0} · 조기제외 ${r.totals?.pruned||0}</div><div style="margin-top:12px"><b>역산 핵심 추가번호</b><div class="reverse-inferred">${inferred||'없음'}</div></div><div class="reverse-top"><details><summary>역산 TOP ${r.top.length} 보기</summary>${top}</details></div><p class="combo-guide">※ ${r.note} 이 점수는 가상 시나리오 분석이며 당첨 확률을 의미하지 않습니다.</p>`;
  }
  async function run(){
    const btn=document.getElementById('reverseRun');if(!btn)return;
    btn.disabled=true;btn.textContent='역산 중...';
    try{const r=await global.ReverseInferenceEngine.run({target:Number(document.getElementById('reverseTarget')?.value||90),maxReplace:Number(document.getElementById('reverseMax')?.value||2),cutoff:80,onProgress:t=>progress(t)});render(r);}finally{btn.disabled=false;btn.textContent='+1회 역산 실행';}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#reverseRun'))run();
    const a=e.target.closest('[data-reverse-apply]');if(a){const nums=a.getAttribute('data-reverse-apply').split(',').map(Number);const input=document.getElementById('comboInput');if(input)input.value=nums.join(' ');document.getElementById('analyzeBtn')?.click();window.scrollTo({top:0,behavior:'smooth'});}
  });
  const mo=new MutationObserver(attach);mo.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',attach);setTimeout(attach,500);
})(window);
