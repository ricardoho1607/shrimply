# Simulated farm QA repairs — 4 September 2026

Local implementation only. No production data, Firebase rules, survival-rate formulas, feeding inventory logic, or historical lab records were changed. The pre-existing `docs/qa/` material was left alone.

## Changes

| QA | Implementation | Main files |
| --- | --- | --- |
| 01 | Chat remounts at user/company boundaries. Storage and answer caches have an account/company namespace. Context must be ready before sending. Cleanup cancels streams and ignores late callbacks; legacy unscoped history is discarded. Mobile also checks the pond store's account. | `web/src/app/dashboard/ai/page.tsx`, `app/AIChat.tsx`, both `useGemini.ts` hooks, `orson/session.ts` |
| 02 | Explicit general questions override farm history, including the exact Indonesian reproduction. General prompts exclude farm metrics. Single-pond and whole-farm questions keep their scope. The current question controls answer language. | `orson/promptBuilder.ts`, mobile hook, `functions/orson.js` |
| 03 | The backend returns/logs provider finish reason and uses a larger output allowance. Only a nonempty STOP response is complete. Interrupted replies retain their partial text and retry option, including after refresh. Retry replaces the existing reply. Incomplete responses never enter the answer cache. | `orson/callableStream.ts`, `orson/responseCompletion.ts`, chat pages/hooks, `functions/orson.js` |
| 04 | ADG is unavailable when growth observations are absent. Context carries sample count and measured/stocking-comparison/fallback provenance. Slow-growth findings require repeated measured observations. Existing survival calculations are unchanged. | `orson/metrics.ts`, `orson/types.ts`, `orson/riskEngine.ts`, `orson/knowledge/evaluateCrossParameterRules.ts`, prompt builder |
| 05 | Each lab water result retains source unit and basis. Manual fields show selectors, empty rows cannot be confirmed, valid zeros are accepted, and numeric bounds are checked. PDF extraction retains units/bases. Web/mobile outputs show those labels. Derived metrics retain schema 2 for installed-client compatibility and add measurement metadata; only compatible source values enter new calculations. | `functions/shared/labMeasurementContract.*`, water pages, `functions/planktonOverwatchContext.js`, `functions/orson.js`, `orson/normalizePondData.ts` |
| 06 | Water forms initialize only on explicit opening/pond/date selection. Drafts survive switching within the open form. Realtime snapshots cannot overwrite typing. A transaction updates the existing daily water record and preserves unrelated records. | `web/src/app/dashboard/water/page.tsx`, `waterFormState.ts` |
| 07 | Reading/chatting no longer creates a second client alert. The existing server trigger creates event alerts atomically, keyed by company/pond/cycle/risk/source date. Recovery resolves alerts; backfilled events are historical. Notifications show source date and state. | both chat hooks, `functions/orsonAlertState.js`, `functions/orson.js`, notification pages, `shared/orsonNotification.ts` |

## Lab measurement contract

Values are stored unchanged alongside `measurementUnits[field] = { unit, basis }`. Supported automatic comparisons use mg/L of NH4 or NH3, mg/L of NO2, TAN as nitrogen, and alkalinity/hardness as CaCO3. Calcium and magnesium expressed as elemental Ca/Mg remain distinct from their CaCO3-equivalent hardness. This distinction follows [USGS measurement definitions](https://water.usgs.gov/nwc/NWC/water_quality/tables/quality.abs.html); nitrogen-as-N lab reporting is illustrated by [EPA laboratory tables](https://www.epa.gov/sites/default/files/2016-11/documents/appendixn.pdf).

This change does **not** introduce automatic unit/basis conversions. Other source units (including ppm and µg/L), nitrogen-as-N for NH4/NO2, elemental Ca/Mg, and TOM methods remain visible as reported and are excluded from incompatible automatic comparisons. TOM requires a stated method/basis and has no new automatic threshold. Historical raw reports without metadata display unknown units/bases; existing historical derived metrics carry an unverified-basis note. No historical values are relabelled or migrated.

## Verification

- 64 focused tests cover account switches, company switches, refresh, legacy storage, delayed persistence, in-flight replies, completion failures, retry replacement, question routing, missing/measured growth, lab validation/read-back, water drafts, alert repetition/concurrency/recovery, and existing UI/backend behavior.
- Account isolation tests were also run against the original component: both original-account isolation regressions failed as expected. The original routing, zero-growth, and stale-rain failures were reproduced before patching.
- 12 existing Orson self-tests passed, including metrics, normalization, risk parity, survival, prompt assembly, timeout, pipeline and intelligence-completion checks.
- Root/mobile and web TypeScript checks, changed-file lint, and the web production build passed. Backend JavaScript syntax checks passed.
- A separate existing test, `functions/labReportSecurity.test.js` → “plankton overwatch history is company-readable and client-write protected”, expects the old `isCompanyMember` read rule. The repository now uses permission-based access. Neither that rule nor that test was changed.

## Follow-up

- Live model language/finish-status verification, actual-device testing, real Firebase concurrency, and original PDF extraction require an integration run with disposable accounts. Local tests use synthetic identities and controlled snapshots; they do not claim a production-account test.
- Backend changes need a separately authorized Firebase deployment. Deploying only the new clients against the old backend will show unverified completion as interrupted rather than silently trusting it. No deployment was performed.
- The eight simulated mineral baselines remain pending; this implementation did not enter farm records. Resolve any unsupported lab bases before claiming automated charts/Orson checks for those values.
