/*
 * AI Core v0.9 Phase 2 Bridge
 * Safe integration layer for combo.html.
 *
 * Principles:
 * - Keeps the existing Classic AI Score unchanged.
 * - Uses IntervalPatternEngine only as a reference engine.
 * - Normalizes LOTTO_DATA / lottoData without rewriting combo.js.
 * - Adds sample warning and Pattern Purity to the Pattern explanation.
 */
(function (global) {
  'use strict';

  const VERSION = '0.9-phase2';
  const CACHE = new Map();

  function numbers(values) {
    return Array.from(new Set((values || [])
      .map(Number)
      .filter(n => Number.isInteger(n) && n >= 1 && n <= 45)))
      .sort((a, b) => a - b);
  }

  function rows() {
    const candidates = [global.LOTTO_DATA, global.lottoData];
    for (const value of candidates) {
      if (Array.isArray(value) && value.length) return value;
    }
    return [];
  }

  function includeBonus() {
    const checkbox = document.getElementById('includeBonus');
    return checkbox ? checkbox.checked : true;
  }

  function activeSampleSize() {
    const active = document.querySelector('.range-btn.active');
    const value = active?.dataset?.range;
    if (value === '20' || value === '30' || value === '50') return Number(value);
    return 50;
  }

  function warningText(warning) {
    if (!warning) return '샘플 상태 확인 불가';
    return `${warning.label} · ${warning.message}`;
  }

  function normalize(result, selected) {
    const main = result.interval.dominantSeries === '2-series'
      ? result.interval.twoSeries
      : result.interval.threeSeries;
    const top = (main.candidates || []).slice(0, 8);
    const replayTop = top.filter(item => selected.includes(item.number));
    const mode = result.interval.dominantSeries === '2-series' ? '2계열' : '3계열';
    const warning = result.sample.warning;

    return {
      key: selected.join(','),
      pattern: result.patternScore,
      replay: main.score,
      flow: result.patternPurity,
      dream: Math.round(Math.min(100,
        result.patternScore * 0.40 +
        main.score * 0.30 +
        result.patternPurity * 0.20 +
        Math.min(10, result.nextRound.validCases)
      )),
      confidence: Math.round(Math.min(98,
        50 + result.patternPurity * 0.25 + Math.min(23, result.sample.used * 1.5)
      )),
      mode,
      sampleCount: result.sample.used,
      comparisons: main.comparisons,
      keepCount: main.preserved,
      inputCount: selected.length,
      topNumbers: result.topNumbers || [],
      patternTop: top.map(item => ({ n: item.number, count: item.count })),
      replayTop: replayTop.map(item => ({ n: item.number, count: item.count })),
      chains: [],
      patternNote: `${mode} 우세 · Purity ${result.patternPurity}점`,
      replayNote: `${main.replayHits}/${main.comparisons} 재현 · ${main.replayRate}%`,
      flowNote: `샘플 ${result.sample.used}개 · ${warning.label}`,
      dreamNote: `다음 회차 유효 ${result.nextRound.validCases}건`,
      reasons: {
        pattern: `${result.reasons.pattern} · Pattern Purity ${result.patternPurity}점`,
        replay: `${main.replayHits}/${main.comparisons} 재현 · 재현율 ${main.replayRate}%`,
        flow: warningText(warning),
        dream: `${result.reasons.nextRound} · 참고 결합값`
      },
      warning,
      engineResult: result
    };
  }

  function calculate(selectedValues) {
    const selected = numbers(selectedValues);
    const data = rows();
    const engine = global.IntervalPatternEngine;
    if (!engine || typeof engine.analyze !== 'function' || !data.length || selected.length < 2) {
      return null;
    }

    const key = [selected.join(','), includeBonus(), activeSampleSize(), data.length].join('|');
    if (CACHE.has(key)) return CACHE.get(key);

    try {
      const result = engine.analyze({
        rows: data,
        selectedNumbers: selected,
        includeBonus: includeBonus(),
        sampleSize: activeSampleSize()
      });
      const normalized = normalize(result, selected);
      CACHE.set(key, normalized);
      return normalized;
    } catch (error) {
      console.warn('[AI Core v0.9] Interval Pattern Engine fallback:', error);
      return null;
    }
  }

  const previousReader = typeof global.v168ReadPatternReference === 'function'
    ? global.v168ReadPatternReference
    : null;

  global.v168ReadPatternReference = function (selectedValues) {
    return calculate(selectedValues) || (previousReader ? previousReader(selectedValues) : null);
  };

  global.AICoreV09 = Object.freeze({
    version: VERSION,
    clearCache() { CACHE.clear(); },
    analyzePattern: calculate,
    diagnostics() {
      return {
        version: VERSION,
        rows: rows().length,
        intervalPatternEngine: Boolean(global.IntervalPatternEngine),
        classicScorePreserved: true,
        patternScoreMode: 'reference-only'
      };
    }
  });

  document.addEventListener('change', event => {
    if (event.target?.id === 'includeBonus' || event.target?.classList?.contains('range-btn')) {
      CACHE.clear();
    }
  });

  console.info('[AI Core v0.9] Phase 2 bridge loaded.', global.AICoreV09.diagnostics());
})(window);
