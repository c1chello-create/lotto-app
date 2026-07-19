(function (global) {
  'use strict';
  const api = {
    name: 'CompanionEngine',
    analyze() {
      const legacy = global.ComboLegacy;
      if (!legacy) return { rows: [], top: [], recommend: [], counts: {}, max: 1 };
      return legacy.companionAnalysis();
    },
    rankedCombos(data) {
      const legacy = global.ComboLegacy;
      return legacy ? legacy.makeRankedCombos(data || api.analyze()) : [];
    }
  };
  global.CompanionEngine = Object.freeze(api);
})(window);
