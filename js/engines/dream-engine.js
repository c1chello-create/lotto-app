(function (global) {
  'use strict';
  global.DreamEngine = Object.freeze({
    name: 'DreamEngine',
    analyze(nums) {
      const legacy = global.ComboLegacy;
      const clean = [...new Set((nums || []).map(Number))].sort((a,b)=>a-b);
      return { score: legacy && clean.length ? legacy.dreamScoreFor(clean) : 0, numbers: clean };
    },
    renderBridge() {
      if (global.ComboLegacy) global.ComboLegacy.renderDreamBridge();
    }
  });
})(window);
