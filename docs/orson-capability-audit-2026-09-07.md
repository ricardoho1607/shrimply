# Orson capability audit — 7 September 2026

Scope: current workspace code, including uncommitted changes. This is not confirmation of deployed production capabilities. No production calls or new live-model evaluations were run for this audit.

## Already implemented

| Capability | Evidence | Boundary |
| --- | --- | --- |
| Current pond metrics and history | `web/src/app/dashboard/ai/page.tsx` subscribes to ponds; mobile/web `useGemini.ts` call shared `orson/pipeline.ts` | The app selects and packages records before generation. |
| Exact dated answers | `exactRecordAnswer` path in both hooks | Supported record questions can return calculated text without a model call. |
| Biological calculations | `orson/metrics.ts`, `normalizePondData.ts`, `riskEngine.ts` | Estimates depend on recorded data and explicitly bounded assumptions. |
| Cross-parameter diagnostics | `orson/diagnosticContext.ts`, knowledge rules, mortality trace | Extra backend lab/treatment/harvest retrieval is triggered specifically by mortality diagnostic selection. |
| 72-hour outlooks and harvest projections | `orson/outlook.ts`, `harvestProjection.ts` | Risk-based projections, not guaranteed forecasts. |
| Proactive alerts | `orsonProactiveConsultant`, `orsonDailySupervisor` in `functions/orson.js` | Record-triggered checks and a daily schedule already exist, including inventory exhaustion and nearby disease signals. |
| Lab-document reading | `extractLabReportFromPdf`, `processConfirmedLabReport` | Existing PDF workflow; not general photo analysis in chat. |
| Outcome-based adjustment | `functions/orsonLearning.js`, `orson/learning.ts` | Prediction calibration from outcomes, not unrestricted model training or comprehensive treatment memory. |
| Internet search and product verification | `functions/shared/metaModelApi.js`, `orsonProductVerification.js` | Newly added verification is model-assisted and capped; not a laboratory validation or guaranteed source truth. |
| Answer checks and scenario evaluation | `orsonAnswerGrounding.js`, `scripts/evaluate-orson-diagnostics.cjs` | Saved September 4 results contain 20 live-model synthetic scenarios and scores. Expert authorship is not established. |

## Priority improvements

Scores are implementation priorities, not measured intelligence or accuracy.

### 10/10 — Close dosing enforcement gaps first

- Some standard farm treatment questions remain eligible for the seven-day client answer cache. Cache keys are based on question/pond payload, not current inventory or product evidence. A cached answer can skip the new backend verification. Disable treatment-answer caching or bind it to verified stock, evidence version and validity.
- Verification routing relies on an English text pattern and the client-supplied route. Follow-ups and non-English dosing requests can miss that path. Independently classify requests on the server with conversation context, and gate any proposed chemical application before release.
- The two searches require matching citations and model-approved quotes, but source interpretation remains model-assisted. Persist auditable source evidence, independently validate product identity, and support explicit human approval of a trusted label. Do not market this as guaranteed product verification.
- Calculation inputs are extracted from the client prompt. Fetch selected pond measurements and volume server-side, preserve units and dates, and distinguish user-entered targets from verified safe targets.

### 9/10 — Extend existing record access into bounded on-demand retrieval

Add permission-checked tools for date-range records, completed cycles, lab results and treatment history. Let Orson request only the missing evidence, within time and record limits. Existing long-history handling recognizes a limited set of English 21–30-day/3–4-week requests; ended cycles are filtered from the main pipeline. This extends existing data access rather than replacing it.

### 9/10 — Add photo input to chat

Begin with product packaging and test-result photos, building on the existing PDF review pattern. Show extracted name, strength, units and confidence for user correction before saving. Then add feed-tray and visible shrimp-condition observations, with date/pond linkage. Do not diagnose pathogens from appearance or estimate water chemistry from water colour alone. Current Orson chat sends text context; general image input is a new capability.

### 9/10 — Turn existing alerts into tracked follow-ups

Link a recommendation to a selected pond, responsible person, due time, requested measurement and outcome. Extend the existing supervisor to check whether a recheck was recorded and whether conditions changed. Require approval for operational writes; do not automatically dose, deduct inventory or claim advice was carried out.

### 9/10 — Make existing evaluation scores block bad releases

The evaluation script fails on errors/incomplete generations, not on poor rubric scores or grounding fallbacks. Add explicit quality thresholds and critical-failure rules; track fallback frequency, product matching, unit errors, stale cache, translated follow-ups and latency. Add consented, anonymized real-farm cases and expert review. Existing scenario testing should be expanded, not rebuilt.

### 8/10 — Improve farm memory beyond projection calibration

Store approved farm protocols, verified equipment and pond volume, completed actions and dated outcomes. Keep beliefs, observations and confirmed facts separate. Retrieve prior similar cases without claiming that a previous treatment caused recovery.

### 7/10 — Add external weather/sensor inputs after the above

Recorded rain events already exist. External forecasts and continuous sensor ingestion would add new evidence, but require freshness, calibration and device-failure checks. Continuous camera monitoring is a later project requiring validated farm imagery, equipment and operating conditions.

## Recommended order

1. Dosing enforcement and release-quality gates.
2. Photo labels plus flexible record retrieval.
3. Tracked follow-ups and approved actions.
4. Broader farm memory and optional external sensors.
