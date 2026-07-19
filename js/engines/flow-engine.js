(function (global) {
  'use strict';
  global.FlowEngine = Object.freeze({
    name: 'FlowEngine',
    analyze(nums) {
      const legacy = global.ComboLegacy;
      const clean = [...new Set((nums || []).map(Number))].sort((a,b)=>a-b);
      return { score: legacy && clean.length ? legacy.flowScoreFor(clean) : 0, numbers: clean };
    }
  });
})(window);
