# Orson handover implementation audit — 4 September 2026

Reference: `shrimply_luna_diagnostic_reasoning_handover.md` supplied by the user. This audit checks the document's requirements against the shared mobile/web pipeline and server prompt. The later user instruction to use **Muse Spark 1.3 Contributor** supersedes the document's Luna recommendation.

## Scope and status

The prompting and structured-data requirements are implemented locally. No production deployment, new data-entry screens, database migration or more expensive model escalation is included. Fields the farm has never recorded remain unavailable; supporting an optional field does not create historical measurements.

| Handover sections | Implementation |
| --- | --- |
| 1, 3, 21: interconnected diagnosis and pipeline | `pipeline.ts` normalizes saved data, calculates metrics, selects relevant knowledge and builds evidence-labelled prompts shared by mobile/web. |
| 2, 10, 11: model and reasoning | `metaModelApi.js` uses the user-requested Muse model; routine requests use low reasoning and both diagnostic modes use high. Diagnostic output allowance is 10,000 tokens, including reasoning. Draft deadline 90 seconds, bounded factual review 45 seconds, function 150 seconds, client 155 seconds including the Firebase SDK timeout. |
| 4: diagnostic routing | Causal questions, short low-ADG/high-FCR/unstable-growth phrases and multi-variable questions select diagnostic mode. The original typed handover example now selects diagnostics even without a saved pond. Explicit general questions and exact lookups retain their existing behaviour. |
| 5, 12–16: reasoning and answer format | Shared server/client policy requires assessment, dated evidence, supported cause ranking, focused checks and conditional actions. It distinguishes missing data, estimates, direct observations and possible causes. Existing mortality investigation retains its detailed timeline format. |
| 6–7: current/previous/changes | Dated ADG interval, actual daily feed, morning DO, pH swing, salinity and alkalinity comparisons include units, source IDs, methods, differences and percentages. Explicit user-typed “from X to Y” pairs are calculated separately, with unverified source labels. Missing endpoints are not invented. |
| 8: sampling history | Last six valid dated samples; separate ADG intervals; recorded population/survival/biomass estimates and sampling method when available. Biomass may be calculated from a same-record population estimate and measured weight, with its basis labelled. |
| 8: feeding history | Fourteen farm-calendar days of actual feed, direct response and source IDs. Sampling estimates remain separate. Feed type, inventory ID, frequency and recorded feed index are retained when present. Current feed index is calculated only with current-day actual feed, DOC and a population estimate. |
| 8: water history | Fourteen days of DO, pH and paired swing, salinity, temperature, transparency and pond events. Supplemental records retain alkalinity, TAN, nitrite and AM/PM temperature, with source identity and available timing/basis. |
| 8: longer windows | Explicit last/past/previous 21–30 days or 3–4 weeks requests include up to 30 daily records. The latest measured growth interval separately includes up to 30 days of operational context. Standard comparisons keep their labelled 14-day/last-five-feed windows. |
| 9: knowledge modules | Existing DO, pH, alkalinity, salinity, ammonia, nitrite, plankton, feed and growth guidance plus new temperature, FCR, feed index, biomass, carrying capacity, mortality, disease-warning and N:P guidance. Equivalent topics are grouped in TypeScript modules rather than duplicate Markdown files. |
| 9: retrieval and sources | Selector ranks question relevance and the selected pond's measured trends. Only relevant modules enter the prompt. New guidance includes source IDs and direct FAO references or explicit Shrimply calculation contracts. |
| 17–18: deterministic signals | Descriptive changes are calculated before inference. FCR comparisons require a matching declared basis; biomass comparisons include compatible dated estimates even without a same-day MBW. Current FCR explicitly notes available-feed coverage and biomass uncertainty. Signals do not establish a cause. Farm replies also receive a server-side factual review before publication. |
| 19: MVP stages | Prompt/routing, history, knowledge and trend-signal stages are present. Stronger-model escalation remains optional and disabled, consistent with the user's Muse selection. |
| 20: evaluation | Twenty synthetic pond scenarios, a repeatable local/live runner, saved responses and an eight-part review rubric. Context tests check routing, question retention, knowledge retention and pond evidence under the prompt budget. |

## Gaps closed during this audit

- Diagnostics previously used medium reasoning. High reasoning now has enough reply and timeout allowance; two live cases exhausted the initial 6,000-token allowance before it was raised.
- The original typed example was classified as general knowledge. Short diagnostic phrases also missed the router.
- Optional chemistry, feed and sampling fields were dropped before prompting. Alkalinity and compatible FCR/biomass comparisons were missing.
- The old prompt budget could remove the entire knowledge block once a full history was included. It now permits 16,000 estimated tokens, below the server's 60,000-character request limit. Extended history avoids duplicating the same 14 daily rows.
- Relevant knowledge was selected mostly from question words. It now also responds to the focused pond's trends; missing topic modules and attributable references were added.
- A retrieved feed example suggested an automatic 5% increase. It now requires direct response, water evidence and the farm protocol.
- Nitrite without a verified NO2/NO2-N basis now creates an explicit data conflict and removes numeric nitrite threshold guidance from that request.
- Duplicate copies of one latest lab report no longer count as two chemistry observations.

## Files

Core changes: `orson/types.ts`, `normalizePondData.ts`, `metrics.ts`, `diagnosticContext.ts`, `pipeline.ts`, `promptBuilder.ts`, `userReportedMeasurements.ts`.

Knowledge: `orson/knowledge/diagnosticKnowledge.ts`, `knowledgeSelector.ts`, `knowledgeTypes.ts`, `sources.ts`, `feedKnowledge.ts`.

Server: `functions/orson.js`, `functions/shared/metaModelApi.js`, `functions/shared/orsonPromptPolicy.js`, `functions/shared/orsonAnswerGrounding.js`.

Regression/evaluation: `orson/diagnosticContext.test.cjs`, `functions/shared/metaModelApi.test.js`, `orson/fixtures/diagnosticEvaluation.cjs`, `scripts/evaluate-orson-diagnostics.cjs`, `docs/orson-diagnostic-evaluation-results.json`.

## Repeatable evaluation

From the repository root:

```sh
node --test orson/diagnosticContext.test.cjs functions/shared/metaModelApi.test.js
node scripts/evaluate-orson-diagnostics.cjs
node scripts/evaluate-orson-diagnostics.cjs --live
node scripts/evaluate-orson-diagnostics.cjs --live --retry-failed
node scripts/evaluate-orson-diagnostics.cjs --live --case=03,12,14,20
```

Live mode reads `MODEL_API_KEY` from the environment or the ignored local secret file, sends only the synthetic fixtures, and saves results without credentials. Targeted reruns preserve the other results. `STOP` means the reply completed, not that every claim is correct.

Review each answer against its scenario-specific expectation and score the eight dimensions: relationships, factual grounding, cause ranking, uncertainty, useful checks, conditional actions, avoiding overdiagnosis and correlation versus causation. Each dimension uses 0 = fails, 1 = partial, 2 = meets. The review is an engineering assessment, not validation against real farm outcomes.

## Verification results

- 117 focused JavaScript regression tests and 17 Orson TypeScript self-tests pass.
- Root and web TypeScript checks and changed-TypeScript lint pass.
- Final web production build passes (113 pages); the output includes the final shared prompt policy. `git diff --check` passes.
- All 20 synthetic context checks pass. Every case has a completed live Muse reply after targeted retests; the initial truncated cases and the nitrite-unit failure are recorded in the audit above.
- The original prompt-only live evaluation found invented biomass growth, incorrect estimate-direction claims and overstated causal confidence. These failures led to the response-review fix documented in `orson-claim-grounding-fix-2026-09-04.md`; final replies and rubric notes are saved in `orson-diagnostic-evaluation-results.json`.

The code checklist and demonstrated claim guards are implemented. The semantic evaluation is **not an all-pass accuracy certification**: cause ranking and answer length still vary, and automated review cannot guarantee every future statement. Production rollout remains separate.
