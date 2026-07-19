(function (global) {
  'use strict';
  global.ReplayEngine = Object.freeze({
    name: 'ReplayEngine',
    analyze(nums) {
      const legacy = global.ComboLegacy;
      const clean = [...new Set((nums || []).map(Number))].sort((a,b)=>a-b);
      return { score: legacy && clean.length ? legacy.replayScoreFor(clean) : 0, numbers: clean };
    }
  });
})(window);
