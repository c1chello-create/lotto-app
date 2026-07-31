(function (global) {
  'use strict';
  if (global.__consecutivePatternUiV2) return;
  global.__consecutivePatternUiV2 = true;

  const state = { range: '100', category: 'three', analysis: null };
  const labels = { two: '2연속', three: '3연속', four: '4연속', fivePlus: '5연속 이상' };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  }

  function ballHtml(n, small, extra) {
    if (typeof global.ball === 'function') return global.ball(n, !!small, extra || '');
    const c = n <= 9 ? 'yellow' : n <= 19 ? 'blue' : n <= 29 ? 'red' : n <= 39 ? 'black' : 'green';
    return `<span class="ball ${small ? 'small-ball' : ''} ${extra || ''} ${c}">${n}</span>`;
  }

  function rowsData() {
    try { return typeof lottoData !== 'undefined' && Array.isArray(lottoData) ? lottoData : []; }
    catch (_) { return []; }
  }

  function currentTrend() {
    return state.analysis.trends[state.range] || state.analysis.trends.all;
  }

  function percent(count, total) {
    return total ? (count / total * 100).toFixed(1) : '0.0';
  }

  function summaryText() {
    const trend = currentTrend();
    const count = trend.counts[state.category] || 0;
    const label = labels[state.category];
    if (!count) return `최근 ${trend.actualSize}회 ${label} 발생 없음 · 희소 패턴`;
    return `최근 ${trend.actualSize}회 ${label} 발생 ${count}회 · ${percent(count, trend.actualSize)}%`;
  }

  function metricCards() {
    const trend = currentTrend();
    return ['two', 'three', 'four', 'fivePlus'].map(key => `
      <button class="cp-metric ${state.category === key ? 'active' : ''}" data-cp-category="${key}" type="button">
        <b>${trend.counts[key]}</b><span>${labels[key]}</span><small>${percent(trend.counts[key], trend.actualSize)}%</small>
      </button>`).join('');
  }

  function positionBars() {
    const trendItems = state.range === 'all' ? state.analysis.items : state.analysis.items.slice(0, Number(state.range));
    const histogram = global.ConsecutivePatternEngine.analyze(trendItems).positionHistogram.slice(0, 8);
    const max = histogram[0] ? histogram[0].count : 1;
    if (!histogram.length) return '<p class="muted">연속번호 위치 기록이 없습니다.</p>';
    return histogram.map(item => `<div class="cp-bar-row"><span>${item.key}번째</span><div class="cp-bar"><i style="width:${Math.max(5, Math.round(item.count / max * 100))}%"></i></div><b>${item.count}회</b></div>`).join('');
  }

  function longestCard() {
    const longest = state.analysis.longest;
    if (!longest.first) return '<p class="muted">2연속 이상 기록이 없습니다.</p>';
    const item = longest.first;
    const run = item.longestRuns[0];
    return `<div class="cp-longest"><div><strong>${longest.length}연속</strong><span>역대 최장</span></div><button type="button" data-cp-round="${item.round}"><b>${item.round}회</b><span>${esc(item.date)}</span></button><div class="balls">${run.values.map(n => ballHtml(n, true)).join('')}</div></div>${longest.items.length > 1 ? `<p class="muted">동일 최장 기록 ${longest.items.length}개 회차</p>` : ''}`;
  }

  function categoryList() {
    const limit = state.range === 'all' ? Infinity : Number(state.range);
    const allowedRounds = new Set(state.analysis.items.slice(0, limit).map(item => item.round));
    const items = state.analysis.categories[state.category].filter(item => allowedRounds.has(item.round));
    if (!items.length) return `<p class="muted">선택 범위에서 ${labels[state.category]} 회차가 없습니다.</p>`;
    return items.slice(0, 40).map(item => {
      const run = item.longestRuns[0];
      return `<button class="cp-round-row" type="button" data-cp-round="${item.round}"><span><b>${item.round}회</b><small>${esc(item.date)}</small></span><span class="balls">${run.values.map(n => ballHtml(n, true)).join('')}</span><strong>${item.longestLength}연속</strong></button>`;
    }).join('') + (items.length > 40 ? `<p class="muted">최근 40개만 표시 · 전체 ${items.length}개 회차</p>` : '');
  }

  function render() {
    const root = document.getElementById('consecutivePatternAnalyzer');
    if (!root || !state.analysis) return;
    const trend = currentTrend();
    root.innerHTML = `
      <div class="title">연속번호 패턴 분석</div>
      <section class="card cp-card">
        <div class="cp-head"><div><b>📊 Consecutive Pattern Analyzer</b><p class="guide">각 회차의 최장 연속번호를 2·3·4·5연속 이상으로 분류합니다.</p></div><span class="badge">분석 ${state.analysis.totalRounds}회</span></div>
        <div class="rowbtn cp-range">${['50','100','all'].map(r => `<button type="button" data-cp-range="${r}" class="${state.range === r ? 'active' : ''}">${r === 'all' ? '전체' : `최근 ${r}회`}</button>`).join('')}</div>
        <div class="cp-metrics">${metricCards()}</div>
        <div class="cp-summary"><b>Pattern Summary</b><p>${summaryText()}</p><small>분석 대상 ${trend.actualSize}개 회차 · 추천 점수에는 반영하지 않음</small></div>
      </section>
      <section class="card cp-card"><div class="cp-section-head"><b>역대 최장 연속번호</b><span class="badge">Historical Max</span></div>${longestCard()}</section>
      <section class="card cp-card"><div class="cp-section-head"><b>연속 시작 위치 TOP</b><span class="badge">당첨번호 정렬 위치</span></div><p class="guide">정렬된 6개 당첨번호에서 연속 구간이 시작하고 끝나는 위치입니다.</p>${positionBars()}</section>
      <section class="card cp-card"><div class="cp-section-head"><b>${labels[state.category]} 발생 회차</b><span class="badge">${currentTrend().counts[state.category]}회</span></div><div class="cp-round-list">${categoryList()}</div></section>`;
  }

  function detailHtml(item) {
    const highlighted = new Set(item.longestRuns.flatMap(run => run.values));
    const runs = item.runs.length ? item.runs.map(run => `<div class="cp-detail-run"><span>${run.length}연속</span><div class="balls">${run.values.map(n => ballHtml(n, true)).join('')}</div><small>${run.startPosition}~${run.endPosition}번째 위치</small></div>`).join('') : '<p class="muted">연속번호 없음</p>';
    return `<div class="cp-sheet-handle"></div><div class="cp-sheet-head"><div><b>${item.round}회</b><span>${esc(item.date)}</span></div><button type="button" data-cp-close>×</button></div><div class="cp-sheet-body"><h3>당첨번호</h3><div class="balls cp-winning">${item.numbers.map(n => ballHtml(n, false, highlighted.has(n) ? 'selected-ball' : '')).join('')}</div><h3>연속번호 구간</h3>${runs}<h3>최장 길이</h3><div class="cp-detail-value">${item.longestLength >= 2 ? `${item.longestLength}연속` : '연속번호 없음'}</div><h3>나머지 번호</h3><div class="balls">${item.remainingNumbers.length ? item.remainingNumbers.map(n => ballHtml(n, true)).join('') : '<span class="muted">없음</span>'}</div></div>`;
  }

  function openSheet(round) {
    const item = state.analysis.items.find(x => Number(x.round) === Number(round));
    if (!item) return;
    let overlay = document.getElementById('cpSheetOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'cpSheetOverlay';
      overlay.className = 'cp-sheet-overlay';
      overlay.innerHTML = '<div class="cp-sheet" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('.cp-sheet').innerHTML = detailHtml(item);
    overlay.classList.add('open');
    document.body.classList.add('cp-no-scroll');
  }

  function closeSheet() {
    document.getElementById('cpSheetOverlay')?.classList.remove('open');
    document.body.classList.remove('cp-no-scroll');
  }

  function appendAnalyzer() {
    const result = document.getElementById('patternResult');
    if (!result || !global.ConsecutivePatternEngine) return;
    state.analysis = global.ConsecutivePatternEngine.analyze(rowsData());
    let root = document.getElementById('consecutivePatternAnalyzer');
    if (!root) {
      root = document.createElement('div');
      root.id = 'consecutivePatternAnalyzer';
      result.appendChild(root);
    }
    render();
  }

  const previous = global.renderResult;
  if (typeof previous === 'function') {
    global.renderResult = function (nums) {
      previous(nums);
      appendAnalyzer();
    };
  }

  document.addEventListener('click', event => {
    const range = event.target.closest('[data-cp-range]');
    if (range) { state.range = range.dataset.cpRange; render(); return; }
    const category = event.target.closest('[data-cp-category]');
    if (category) { state.category = category.dataset.cpCategory; render(); return; }
    const round = event.target.closest('[data-cp-round]');
    if (round) { openSheet(round.dataset.cpRound); return; }
    if (event.target.closest('[data-cp-close]') || event.target.id === 'cpSheetOverlay') closeSheet();
  });

  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSheet(); });
})(window);
