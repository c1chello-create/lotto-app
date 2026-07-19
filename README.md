# 행운로또 v1.8 Clean Core

기존 v1.7 Premium UI의 정상 작동 기능을 유지하면서 GitHub Pages 배포에 필요한 파일만 남긴 정리본입니다.

## 유지된 기능
- 회차 조회 및 번호 통계
- 조합분석 Premium UI
- 꿈해몽 Preview 및 Dream Chain 1·2·3차
- 동반번호 분석
- AI 조합 랭킹 TOP 10 및 Explainable AI
- Interval Pattern 분석
- `data/lotto.json` 자동 갱신 GitHub Actions

## 기준 데이터
`data/lotto.json` 하나만 사용합니다.

## GitHub에 올릴 파일
압축을 풀었을 때 보이는 파일과 폴더를 저장소 루트에 그대로 업로드합니다.

## 삭제된 중복·불필요 파일
- 루트 `lotto.json`
- 루트 `update_lotto.py`
- `app.py`, `lotto.py`, `requirements.txt`
- `lotto-pwa`
- `.github/workflows/app.js`
- `.github/workflows/index.html`
- `.github/workflows/style.css`
- `data/index.html`
- `README.txt`
- `ui_patch_append_to_style.css`
- `ai_core_v09_bridge.js`

## 주의
GitHub Pages가 정상 갱신되기 전까지 기존 저장소를 삭제하지 말고, 먼저 별도 브랜치나 테스트 저장소에서 확인하는 것이 안전합니다.

## v1.9 Phase 2-1

조합분석 페이지는 기존 계산 결과를 유지하면서 AI Core 기반 모듈 구조를 사용합니다.

- `js/ai-core.js`: 엔진 실행 통합
- `js/combo-ui.js`: 화면 실행 순서 관리
- `js/engines/`: Companion, Pattern, Replay, Flow, Dream, AI Score 엔진
- `js/combo.js`: 검증된 기존 계산식과 호환 브리지

GitHub Pages에서는 별도의 빌드 과정 없이 기존과 동일하게 사용할 수 있습니다.
자세한 구조는 `ARCHITECTURE.md`를 참고하세요.
