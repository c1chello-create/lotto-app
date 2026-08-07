(function(global){
  'use strict';
  const $=id=>document.getElementById(id);
  let scope='50';
  let lastResult=null;
  const esc=value=>String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const color=n=>n<=9?'yellow':n<=19?'blue':n<=29?'red':n<=39?'black':'green';
  const ball=(n,small=true,marked=false)=>`<span class="dashboard-ball ${small?'small':''} ${color(Number(n))} ${marked?'marked':''}">${Number(n)}</span>`;
  const balls=(nums,marked=[])=>`<div class="dashboard-balls">${(nums||[]).map(n=>ball(n,true,marked.includes(n))).join('')}</div>`;

  function parseCandidates(){
    return global.CandidateReductionEngine.clean(($('candidateReductionInput')?.value||'').split(/[\s,]+/));
  }
  function status(text,type=''){
    const box=$('candidateReductionStatus');
    if(!box)return;
    box.className=`candidate-reduction-status ${type}`.trim();
    box.textContent=text;
  }
  function scoreMetric(label,value,weight,note){
    const safe=Math.max(0,Math.min(100,Number(value)||0));
    return `<div class="candidate-score-metric"><div><b>${esc(label)}</b><span>${safe.toFixed(1)}점</span></div><div class="dashboard-bar"><i style="width:${Math.max(4,safe)}%"></i></div><small>${weight}% · ${esc(note)}</small></div>`;
  }
  function comboRow(item,label){
    return `<div class="candidate-alt-row"><span>${esc(label)}</span>${balls(item.nums)}<strong>${item.total.toFixed(1)}점</strong></div>`;
  }
  function frequencyRows(result){
    return result.frequencyDetails.map(item=>`<div class="candidate-frequency-row ${item.selected?'selected':''}"><div>${ball(item.n,true,item.selected)}<span>${item.n}번</span></div><div class="dashboard-bar"><i style="width:${Math.max(4,item.relative)}%"></i></div><b>${item.count}회</b><em>${item.rate.toFixed(1)}%</em></div>`).join('');
  }
  function selectedReasons(result){
    return result.selected.map(item=>{
      const link=item.strongestPartner?`${item.strongestPartner.n}번과 ${item.strongestPartner.count}회`:'연결 기록 없음';
      return `<div class="candidate-reason-row"><div>${ball(item.n,true,true)}<b>${item.n}번 선정</b></div><p>출현 ${item.frequency}회(후보 ${item.frequencyRank}위) · 최종 번호와 평균 동반 ${item.avgConnection.toFixed(1)}회 · 최고 연결 ${link}</p></div>`;
    }).join('');
  }
  function excludedReasons(result){
    return result.excluded.map(item=>{
      const link=item.strongestPartner?`${item.strongestPartner.n}번과 ${item.strongestPartner.count}회`:'연결 기록 없음';
      const gap=item.scoreGap===null?'비교 불가':`1위보다 ${item.scoreGap.toFixed(1)}점 낮음`;
      return `<div class="candidate-reason-row excluded"><div>${ball(item.n,true)}<b>${item.n}번 제외</b></div><p>출현 ${item.frequency}회(후보 ${item.frequencyRank}위) · 최종 6개와 평균 동반 ${item.avgConnectionToBest.toFixed(1)}회 · 최고 연결 ${link} · 이 번호 포함 최적안은 ${gap}</p></div>`;
    }).join('');
  }

  function render(result){
    lastResult=result;
    const box=$('candidateReductionResult');
    const best=result.best;
    const scopeText=result.scope==='all'?'전체':`최근 ${result.scope}회`;
    const links=best.strongestLinks.filter(x=>x.count>0).slice(0,5);
    box.innerHTML=`
      <div class="candidate-result-hero">
        <div class="dashboard-section-title"><b>최종 추천 6개</b><span>${result.totalCombinations}개 조합 전수 비교</span></div>
        ${balls(best.nums,result.candidates)}
        <div class="candidate-result-score"><b>${best.total.toFixed(1)}</b><span>후보 압축점수</span><em>${scopeText} · ${result.includeBonus?'보너스 포함':'보너스 제외'}</em></div>
      </div>
      <div class="candidate-score-grid">
        ${scoreMetric('출현빈도',best.frequencyScore,45,`후보 ${result.candidates.length}개 안의 상대 출현 강도`)}
        ${scoreMetric('동반출현',best.coOccurrenceScore,45,'최종 6개에서 가능한 15개 번호쌍')}
        ${scoreMetric('연결 안정성',best.stabilityScore,10,'일부 강한 쌍에만 치우치는 현상 보정')}
      </div>
      <div class="dashboard-change">
        <span class="dashboard-tag good">선정 ${best.nums.join('·')}</span>
        <span class="dashboard-tag bad">제외 ${result.excluded.map(x=>x.n).join('·')}</span>
      </div>
      <button type="button" id="candidateApplyToDashboard" class="candidate-apply-button">이 6개로 AI 종합분석</button>
      <div class="candidate-subsection">
        <div class="dashboard-section-title"><b>대안조합 TOP 5</b><span>1위 다음으로 점수가 높은 조합</span></div>
        <div class="candidate-alt-list">${result.alternatives.map((item,index)=>comboRow(item,`${index+2}위`)).join('')}</div>
      </div>
      <div class="candidate-subsection">
        <div class="dashboard-section-title"><b>후보번호 출현빈도</b><span>${result.rowCount}개 회차 기준</span></div>
        <div class="candidate-frequency-list">${frequencyRows(result)}</div>
      </div>
      <div class="candidate-subsection">
        <div class="dashboard-section-title"><b>강한 동반출현 번호쌍</b><span>후보 ${result.candidates.length}개 내부</span></div>
        <div class="candidate-link-list">${result.strongestCandidateLinks.slice(0,6).map(x=>`<span class="dashboard-tag info">${x.a}·${x.b} ${x.count}회</span>`).join('')||'<span class="dashboard-placeholder">동반출현 기록이 없습니다.</span>'}</div>
        ${links.length?`<p class="candidate-note">최종 6개 핵심 연결: ${links.map(x=>`${x.a}·${x.b} ${x.count}회`).join(' · ')}</p>`:''}
      </div>
      <details class="candidate-details">
        <summary>선정·제외 근거 자세히 보기</summary>
        <div class="candidate-reason-list">${selectedReasons(result)}${excludedReasons(result)}</div>
      </details>
      <p class="candidate-footnote">※ 점수는 입력한 후보 ${result.candidates.length}개 안에서 비교한 상대점수입니다. 당첨 확률을 뜻하지 않습니다.</p>`;

    $('candidateApplyToDashboard')?.addEventListener('click',applyBest);
    status(`분석 완료 · ${result.totalCombinations}개 조합 비교 · 최신 ${result.latestRound}회`,'success');
    localStorage.setItem('haengun_candidate_10_12',JSON.stringify(result.candidates));
  }

  function analyze(){
    const engine=global.CandidateReductionEngine;
    const candidates=parseCandidates();
    if(candidates.length<10||candidates.length>12){
      status(`후보번호는 중복 없이 10~12개를 입력하세요. 현재 ${candidates.length}개입니다.`,'error');
      $('candidateReductionResult').innerHTML='';
      return;
    }
    if(!(global.LOTTO_DATA||[]).length){
      status('로또 데이터를 불러오는 중입니다. 잠시 후 다시 실행하세요.','error');
      return;
    }
    const button=$('candidateReductionRun');
    button.disabled=true;
    const comboCount=engine.combinationCount?engine.combinationCount(candidates.length,6):engine.combinations(candidates,6).length;
    button.textContent=`${comboCount}개 조합 계산 중`;
    status('출현빈도·동반출현·연결 안정성을 계산하고 있습니다.');
    setTimeout(()=>{
      try{
        const result=engine.analyze(candidates,{scope,includeBonus:$('candidateReductionBonus').checked});
        if(result.error){status(result.error,'error');return;}
        render(result);
      }catch(error){
        console.error(error);
        status(`후보 압축 분석 오류: ${error.message}`,'error');
      }finally{
        button.disabled=false;
        button.textContent='최적 6개 찾기';
      }
    },20);
  }

  function applyBest(){
    if(!lastResult?.best?.nums)return;
    const input=$('dashComboInput');
    if(!input)return;
    input.value=lastResult.best.nums.join(' ');
    input.dispatchEvent(new Event('input',{bubbles:true}));
    const mainScope=[...document.querySelectorAll('#dashScope [data-scope]')].find(btn=>String(btn.dataset.scope)===String(lastResult.scope));
    if(mainScope)mainScope.click();
    const bonus=$('dashBonus');
    if(bonus)bonus.checked=lastResult.includeBonus;
    localStorage.setItem('haengun_my_nums',JSON.stringify(lastResult.best.nums));
    $('dashAnalyze')?.click();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function loadSaved(){
    try{
      const saved=JSON.parse(localStorage.getItem('haengun_candidate_10_12')||localStorage.getItem('haengun_candidate_10')||'null');
      if(Array.isArray(saved)&&saved.length>=10&&saved.length<=12)$('candidateReductionInput').value=saved.join(' ');
    }catch(error){}
  }

  function waitForData(){
    if((global.LOTTO_DATA||[]).length){
      status(`전체 ${global.LOTTO_DATA.length}개 회차 준비 완료 · 후보 10~12개를 입력하세요.`);
      return;
    }
    setTimeout(waitForData,180);
  }

  function bind(){
    const root=$('candidateReduction');
    if(!root||!global.CandidateReductionEngine)return;
    $('candidateReductionScope').addEventListener('click',event=>{
      const button=event.target.closest('[data-reduction-scope]');
      if(!button)return;
      scope=String(button.dataset.reductionScope);
      document.querySelectorAll('#candidateReductionScope [data-reduction-scope]').forEach(item=>item.classList.toggle('active',item===button));
    });
    $('candidateReductionRun').addEventListener('click',analyze);
    $('candidateReductionInput').addEventListener('keydown',event=>{if(event.key==='Enter')analyze();});
    $('candidateReductionLoadSaved').addEventListener('click',loadSaved);
    loadSaved();
    waitForData();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})(window);
