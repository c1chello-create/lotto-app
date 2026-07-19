# 행운로또 v1.9 Phase 2-1 아키텍처

## 목표
기존 AI Score와 화면 결과를 변경하지 않으면서, 분석 기능을 독립 엔진과 공통 AI Core 수명주기로 분리한다.

## 실행 흐름

1. `js/combo.js`가 검증된 기존 계산식과 화면 함수를 로드한다.
2. `ComboLegacy`가 필요한 기능만 안정적인 호환 API로 공개한다.
3. `CompanionEngine`, `PatternEngine`, `ReplayEngine`, `FlowEngine`, `DreamEngine`, `AIScoreEngine`이 호환 API를 통해 실행된다.
4. `AICore.analyze()`가 엔진 결과를 하나의 결과 객체로 통합한다.
5. `ComboUI.renderAll()`이 공통 파이프라인을 실행한 뒤 기존 화면 렌더러에 표시를 위임한다.

## Phase 2-1 원칙

- 기존 AI Score 계산식 변경 없음
- 추천조합 순위와 신뢰도 계산식 변경 없음
- Dream Preview, Dream AI, Dream Chain 결과 변경 없음
- Pattern Engine은 기존과 같이 참고값으로 유지
- GitHub Pages에서 번들러 없이 `<script>` 방식으로 실행
- `.github/workflows`와 자동 업데이트 파일은 수정하지 않음

## 신규 파일

- `js/ai-core.js`
- `js/combo-ui.js`
- `js/engines/companion-engine.js`
- `js/engines/pattern-engine.js`
- `js/engines/replay-engine.js`
- `js/engines/flow-engine.js`
- `js/engines/dream-engine.js`
- `js/engines/ai-score-engine.js`

## 다음 단계
Phase 2-2에서는 검증이 끝난 계산식부터 `combo.js` 밖으로 물리적으로 이동하고, Consensus AI와 Confidence Engine을 `AICore`에 연결할 수 있다.
