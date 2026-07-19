(function (global) {
  'use strict';
  global.AIScoreEngine = Object.freeze({
    name: 'AIScoreEngine',
    score(nums, companionData) {
      const legacy = global.ComboLegacy;
      if (!legacy) return null;
      const state = legacy.getState();
      const allFreq = legacy.frequencyMap(state.lottoData);
      return legacy.comboScoreParts(nums, companionData || global.CompanionEngine.analyze(), allFreq);
    }
  });
})(window);
