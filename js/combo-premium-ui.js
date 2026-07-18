'use strict';

/* =========================================================
   v1.7 Premium UI Override
   UI only: 기존 AI 계산 로직 및 점수 산식 변경 없음
========================================================= */
function v170WeightPanel(){
  const rows=[
    ['Frequency',40],['Continuity',20],['Replay',15],
    ['Flow',10],['Pattern Quality',10],['Dream',5]
  ];
  return `<section class="ai-weight-panel" aria-label="AI Score 산출 비율">
    <div><h3>AI Score 산출 비율</h3><small>총 100%</small></div>
    ${rows.map(([label,value])=>`<div class="ai-weight-row"><span>${label}</span><div class="ai-weight-track"><i style="width:${value*2.5}%"></i></div><b>${value}%</b></div>`).join('')}
    <p class="ai-weight-note">※ 현재 AI Score는 위 6개 요소를 종합하여 계산됩니다.</p>
  </section>`;
}
function v170Accordion(label,icon,html,id){
  return `<div class="premium-accordion">
    <button type="button" class="premium-accordion-toggle" aria-expanded="false" aria-controls="${id}">
      <span class="acc-icon"><span>${icon}</span>${label}</span><span class="acc-arrow">⌄</span>
    </button>
    <div class="premium-accordion-panel" id="${id}"><div><div class="premium-accordion-content">${html}</div></div></div>
  </div>`;
}
function renderAIScoreCard(c,maxes){
  try{
    const companion=pctOf(c.parts.companion,maxes.companion), trend=pctOf((c.parts.recent||0)+(c.parts.long||0),maxes.trend), structure=pctOf((c.parts.balance||0)+(c.parts.oddEven||0),maxes.structure), learning=pctOf((c.parts.historical||0)+(c.parts.learned||0),maxes.longlearn), p=v168ReadPatternReference(c.nums);
    const total=v168Clamp(c.trust,55,98), grade=aiScoreGrade(total), confidence=v168Clamp(total*.70+((companion+trend+structure+learning)/4)*.30,55,98), confGrade=aiScoreGrade(confidence);
    const key=(c.nums||[]).join('-');
    const aiReason=`<p class="combo-guide"><b>Classic AI Score ${total}점</b> · ${grade}</p><p class="combo-guide">Companion ${companion}점 · Trend ${trend}점 · Structure ${structure}점 · Learning ${learning}점</p><p class="combo-guide">Confidence ${confidence}%는 당첨 확률이 아니라 현재 분석 근거의 일관성 표시입니다.</p><p class="combo-guide">기존 추천 알고리즘과 점수 산식은 변경하지 않았습니다.</p>`;
    const patternReason=`<p class="combo-guide"><b>우세계열:</b> ${v168Text(p.mode)} · 샘플 ${p.sampleCount}회 · 비교 ${p.comparisons}회</p><p class="combo-guide"><b>Pattern:</b> ${p.reasons.pattern}</p><p class="combo-guide"><b>Replay:</b> ${p.reasons.replay}</p><p class="combo-guide"><b>Flow:</b> ${p.reasons.flow}</p><p class="combo-guide"><b>Dream:</b> ${p.reasons.dream}</p><p class="combo-guide">Pattern Engine은 참고값이며 현재 최종 AI Score에는 영향을 주지 않습니다.</p>`;
    return `<div class="ai-score-card ai-score-v168"><div class="ai-score-head"><b>AI Score Card</b><span>${c.grade} · ${total}점</span></div><div class="ai-core-summary"><div><b>${grade}</b><span>Classic AI Score</span></div><div><b>${confidence}%</b><span>Confidence ${confGrade}</span></div><div><b>${aiScoreJudge(total)}</b><span>AI 판단</span></div></div><div class="ai-core-title">기존 AI 엔진</div><div class="ai-core-grid">${v168Metric('Companion',companion,'동반번호·쌍번호 강도')}${v168Metric('Trend',trend,'최근 흐름과 장기 출현')}${v168Metric('Structure',structure,'구간균형·홀짝구성')}${v168Metric('Learning',learning,'과거 적중·구조학습')}</div><div class="ai-core-title">Pattern Engine 참고값</div><div class="ai-core-grid">${v168Metric('Pattern',p.pattern,p.patternNote)}${v168Metric('Replay',p.replay,p.replayNote)}${v168Metric('Flow',p.flow,p.flowNote)}${v168Metric('Dream',p.dream,p.dreamNote)}</div>${v170Accordion('AI 계산 근거','🧠',aiReason,`ai-reason-${key}`)}${v170Accordion('Pattern 산출 근거','📈',patternReason,`pattern-reason-${key}`)}</div>`;
  }catch(e){console.error('v1.7 Premium AI Score Card 오류',e);return `<div class="ai-score-card"><div class="ai-score-head"><b>AI Score Card</b><span>안정화 모드</span></div><p class="combo-guide">AI Score Card 표시 중 오류가 있었지만 조합 분석은 계속 표시됩니다.</p></div>`}
}
function renderRankedCombos(data){
  try{
    const combos=makeRankedCombos(data);
    if(!combos.length)return`<div class="combo-card ai-ranking-shell"><b>🏆 AI 조합 랭킹</b><p class="combo-guide">추천조합을 만들 만큼 동반번호가 부족합니다. 전체 회차로 바꿔보세요.</p></div>`;
    const maxes={companion:Math.max(...combos.map(c=>c.parts.companion||0),1),trend:Math.max(...combos.map(c=>(c.parts.recent||0)+(c.parts.long||0)),1),structure:Math.max(...combos.map(c=>(c.parts.balance||0)+(c.parts.oddEven||0)),1),longlearn:Math.max(...combos.map(c=>(c.parts.historical||0)+(c.parts.learned||0)),1)};
    return `<div class="combo-card ai-ranking-shell"><div class="ai-ranking-title"><b>🏆 AI 조합 랭킹 TOP 10</b><span>Explainable AI</span></div><p class="combo-guide">기존 AI Score는 유지하고 Pattern Engine은 참고값으로 분리해 표시합니다.</p>${v170WeightPanel()}${combos.map(c=>`<section class="premium-rank-item"><div class="premium-rank-head"><b>${c.rank}위 · ${c.grade}</b><span>종합 ${c.trust}점</span></div><div class="combo-selected">${c.nums.map(n=>ball(n,true,selectedNums.includes(n)?'selected-ball':'')).join('')}</div>${renderAIScoreCard(c,maxes)}${renderComboReport(c.nums)}<div class="combo-btn-row" style="margin-top:8px"><button onclick="saveRecommendedCombo('${c.nums.join(',')}','${c.grade}',${c.trust})">저장</button><button onclick="analyzeSavedCombo('${c.nums.join(',')}')">적중분석</button></div></section>`).join('')}</div>`;
  }catch(e){console.error('v1.7 Premium 랭킹 표시 오류',e);return `<div class="combo-card" style="background:#fff7e6"><b>AI 랭킹 안정화 모드</b><p class="combo-guide">랭킹 표시 중 오류가 발생했습니다. 입력번호와 출현이력은 계속 표시됩니다.</p></div>`}
}
(function bindV170Accordion(){
  if(window.__v170AccordionBound)return;
  window.__v170AccordionBound=true;
  document.addEventListener('click',function(e){
    const btn=e.target.closest('.premium-accordion-toggle');
    if(!btn)return;
    const panel=document.getElementById(btn.getAttribute('aria-controls'));
    if(!panel)return;
    const open=btn.getAttribute('aria-expanded')==='true';
    btn.setAttribute('aria-expanded',String(!open));
    panel.classList.toggle('is-open',!open);
  });
})();
