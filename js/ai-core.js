(function (global) {
  'use strict';
  const engines = () => ({
    companion: global.CompanionEngine,
    pattern: global.PatternEngine,
    replay: global.ReplayEngine,
    flow: global.FlowEngine,
    dream: global.DreamEngine,
    score: global.AIScoreEngine,
    consensus: global.ConsensusEngine
  });
  const api = {
    version: '1.9.0-phase3.1',
    analyze(nums) {
      const legacy = global.ComboLegacy;
      const selected = nums || (legacy ? legacy.getState().selectedNums : []);
      const e = engines();
      const companion = e.companion.analyze();
      return {
        selected: selected.slice(),
        companion,
        rankedCombos: e.companion.rankedCombos(companion),
        pattern: e.pattern.analyze(selected),
        replay: e.replay.analyze(selected),
        flow: e.flow.analyze(selected),
        dream: e.dream.analyze(selected),
        consensus: e.consensus ? e.consensus.scoreCombo(selected, companion) : null,
        generatedAt: new Date().toISOString()
      };
    },
    engines
  };
  global.AICore = Object.freeze(api);
})(window);
