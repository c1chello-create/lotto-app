(function (global) {
  'use strict';
  const normalize = nums => [...new Set((nums || []).map(Number).filter(n => n >= 1 && n <= 45))].sort((a,b)=>a-b);
  const api = {
    name: 'PatternEngine',
    analyze(nums) {
      const legacy = global.ComboLegacy;
      const clean = normalize(nums || (legacy && legacy.getState().selectedNums));
      if (!legacy || !clean.length) return { score: 0, series: null, linked: 0 };
      const series = legacy.patternSeriesScores(clean);
      return { score: Number(series && (series.score ?? series.total) || 0), series, linked: legacy.calcPatternLinkedScoreFor(clean) };
    },
    reference(nums) {
      const legacy = global.ComboLegacy;
      return legacy ? legacy.readPatternScoreFor(normalize(nums)) : null;
    }
  };
  global.PatternEngine = Object.freeze(api);
})(window);
