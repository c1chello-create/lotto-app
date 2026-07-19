(function (global) {
  'use strict';
  let rendering = false;
  const api = {
    name: 'ComboUI',
    renderAll() {
      if (rendering || !global.ComboLegacy) return;
      rendering = true;
      try {
        const state = global.ComboLegacy.getState();
        global.DreamEngine && global.DreamEngine.renderBridge();
        if (!state.selectedNums.length) return;
        // Run the modular pipeline once so every engine has a common lifecycle.
        // Rendering remains delegated to the proven legacy views in Phase 2-1.
        global.__LAST_AI_CORE_RESULT__ = global.AICore ? global.AICore.analyze(state.selectedNums) : null;
        global.ComboLegacy.setStatusText();
        global.ComboLegacy.renderSummary();
        global.ComboLegacy.renderCompanion();
        global.ComboLegacy.renderSavedCombos();
        global.ComboLegacy.renderHistory();
      } finally {
        rendering = false;
      }
    }
  };
  global.ComboUI = Object.freeze(api);
})(window);
