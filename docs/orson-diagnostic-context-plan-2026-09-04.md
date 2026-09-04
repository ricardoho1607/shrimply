# Orson prompting and structured-data improvement plan

Status: implemented locally, 4 September 2026. Compared the supplied Luna handover with the current local Shrimply code, including the earlier QA repairs. No application or Firebase Functions deployment was performed.

The handover was treated as a design reference. The diagnostic work extends the existing Orson pipeline with better evidence and one consistent prompt policy. At the user's later request, Orson chat was also moved to Meta Model API with `muse-spark-1.3-contributor`; Gemini remains limited to the separate lab/PDF features.

## Baseline before this change

| Handover recommendation | Current implementation | Remaining work |
| --- | --- | --- |
| Classify the question | General aquaculture, farm analysis, products, exact record requests, comparisons, and mortality investigation | Add broader diagnostic intent for growth, feed efficiency, and interacting water changes; retain language and scope rules |
| Structured farm context | Normalized records, JSON pond payload, daily history, lab context, treatment events, past-cycle benchmarks | Carry measurement dates, sources, units, and uncertainty consistently through to the prompt |
| Calculate before asking AI | ADG, FCR, biomass, survival estimates, feed pressure, water/feed/mortality trends | Add comparable dated intervals and percentage changes; expose existing trends that are currently omitted |
| Combine parameters | Cross-parameter rules already cover oxygen, ammonia, pH, alkalinity, temperature, feed, and growth; plankton analysis also combines evidence | Extend beyond preset findings to clearly labelled possible explanations supported by the selected pond's evidence |
| Select relevant knowledge | Curated TypeScript knowledge modules, keyword/topic selection, cross-parameter guidance, source labels | Improve relevance ranking, date/context applicability, and traceable references; a new knowledge platform is unnecessary for this phase |
| Rank causes and missing checks | Mortality trace has dated history, supporting/opposing evidence, hypotheses, confidence, and missing sources | Reuse this pattern for broader diagnosis rather than building a separate competing system |
| Avoid unsupported certainty | Existing prompts cover missing data, disease uncertainty, logged feed versus appetite, and treatment cautions | Resolve prompt inconsistencies and tie every diagnosis to named evidence |
| Previous QA repairs | Account/company chat isolation, general Indonesian routing, missing-growth handling, interrupted-response retry, lab unit validation, water drafts, and alert event identity | Keep these protected during the next changes |

Main existing files: [pipeline.ts](/Users/ricardoho/Desktop/Shrimply/orson/pipeline.ts), [types.ts](/Users/ricardoho/Desktop/Shrimply/orson/types.ts), [metrics.ts](/Users/ricardoho/Desktop/Shrimply/orson/metrics.ts), [promptBuilder.ts](/Users/ricardoho/Desktop/Shrimply/orson/promptBuilder.ts), [mortalityDiagnostic.ts](/Users/ricardoho/Desktop/Shrimply/orson/mortalityDiagnostic.ts), and [knowledgeSelector.ts](/Users/ricardoho/Desktop/Shrimply/orson/knowledge/knowledgeSelector.ts).

## Implemented result

- Added a versioned diagnostic context with selected pond/cycle scope, 14 farm-calendar days, six sampling records, consecutive growth intervals, dated feed/water comparisons, source IDs, harvests/treatments, descriptive signals, and explicit data-quality limits. Future lab reports and treatments outside the active cycle are excluded.
- Separated actual feed from sampling estimates, missing days from zero-feed days, estimated mortality from recovered dead shrimp, and lab values by unit and measurement basis.
- Added `pond_diagnostic` routing for causal questions and multilingual follow-ups. Previously named ponds stay selected; measurements typed without a pond remain unverified user reports and do not absorb unrelated farm data.
- Rebuilt prompt budgeting around complete blocks so the current question is always preserved. Knowledge selection now uses only the focused pond and ranked relevant topics.
- Added one shared evidence/diagnostic policy for client and server prompts. Orson ranks up to three possible causes with supporting, opposing, and missing evidence, then gives limited checks and conditional actions.
- Added the Meta Model API Responses adapter with streaming, search citations, sanitized errors, and the model ID `muse-spark-1.3-contributor`. Complete responses map to the existing `STOP` contract; interrupted/token-limited responses remain incomplete. Search commentary is excluded from chat output. The client waits up to 55 seconds; provider requests have a 45-second timeout.
- Stored the key in ignored `functions/.secret.local` (0600) and Firebase Secret Manager as `MODEL_API_KEY`, version 1, enabled. Removed it from the ordinary `.env` file. Firebase upload exclusions now omit both local secrets and environment files; no key was found in Git-visible files.

New shared logic is in [diagnosticContext.ts](/Users/ricardoho/Desktop/Shrimply/orson/diagnosticContext.ts), [orsonPromptPolicy.js](/Users/ricardoho/Desktop/Shrimply/functions/shared/orsonPromptPolicy.js), and [metaModelApi.js](/Users/ricardoho/Desktop/Shrimply/functions/shared/metaModelApi.js). The provider is connected in [functions/orson.js](/Users/ricardoho/Desktop/Shrimply/functions/orson.js); secret exclusions are in [firebase.json](/Users/ricardoho/Desktop/Shrimply/firebase.json) and [.gitignore](/Users/ricardoho/Desktop/Shrimply/.gitignore). Existing mobile/web hooks, model labels, shared types, normalization, metrics, prompts, and knowledge selection were updated.

## Verification and activation

- 81 focused regression tests and 17 Orson TypeScript self-tests passed. These include prior farm QA, account isolation, response completion, lab units, alerts, provider errors, secret packaging, and the new diagnostic cases.
- Root and web TypeScript checks passed. Changed-code lint passed; the web admin adapter retains three existing unused-variable warnings. The final web production build passed after all corrections and generated all 113 pages.
- Live Meta requests verified the supplied credential/model, ordinary response completion, diagnostic streaming, web search, citations, final-answer filtering, and the app's response contract. Only synthetic or public questions were sent; no stored farm records were used. One date-only search returned no citation metadata; the adapter returns citations only when Meta supplies them.
- A synthetic diagnostic completed in about 15 seconds. Its initial morning/dawn wording prompted explicit time-label and sampling-window rules. This is a smoke evaluation, not proof that every diagnosis or confidence label is correct.
- Activation still requires deployment of `generateOrsonResponse` and release of the web/mobile changes. No function, web, or Android deployment was performed. The Gemini secret/model remain available for lab extraction and lab insights.

Contributor permits Meta to use submitted content to improve its products, as described in [Vercel's model documentation](https://vercel.com/ai-gateway/models/muse-spark-1.3-contributor/api). The requested model was kept. Protocol references came from the [Meta cookbook](https://github.com/meta-models/meta-model-cookbook/tree/main/01_api_fundamentals); `https://api.ai.meta.com/v1` was verified live because `api.meta.ai` did not resolve on this machine.

## Findings that drove the implementation

1. **History is shorter and less precise than its label suggests.** `extractDailyRecords14d` takes the last 14 recorded dates, which can span months. `selectRecentPromptRecords` then always takes five rows, even when `requiresDetailedHistory` is true. Exact-record requests have a separate selection path; mortality has a separate 14-day trace.
2. **Prompt trimming can remove essential content.** The current question comes after the context, and trimming cuts the end of the combined string. Oversized context can remove the question and part of the JSON. A synthetic check reproduced this.
3. **Growth history can disappear behind daily logs.** There is no separate sampling-history block in the standard payload. Five recent feeding/water rows can crowd out the measured weights needed to explain ADG changes.
4. **Some trends never reach the model as comparisons.** DO and pH-swing trends exist in the metrics but are absent from the compact water payload. Several trends use all available records rather than an explicit recent window. Feed trend selection uses the last five positive records, not explicitly the last five distinct daily totals.
5. **Latest values are not necessarily contemporaneous.** Most top-level current measurements lack individual dates. The model cannot reliably tell whether growth, water, and laboratory evidence describe the same period. Morning DO must also remain distinguishable from measured pre-dawn DO and the minimum of available readings.
6. **Lab history is mostly summaries.** `recentLabReports` comes from latest/by-type summaries and omits numeric measurements. The compact payload carries numeric metrics only for `labContext.latest`; the latest overall report may be a different report type from the needed water chemistry report.
7. **Important distinctions are lost in daily aggregation.** Normalized records retain recovered-dead versus estimated-total mortality, but standard daily context only carries the latter count. Zero placeholders in unrelated record types can look like observations. Generic daily `ammoniaMgL` also merges different source field names without the explicit measurement basis now used for laboratory results.
8. **Knowledge can be selected using other ponds.** `buildOrsonPromptPackage` sends all farm metrics to the knowledge selector even for a single-pond question. This can select irrelevant rules or hide a missing-data question because another pond has that measurement.
9. **Prompt instructions differ.** The client prompt restricts biological conclusions to preset findings; the server builds its own authoritative prompt and ignores the client instruction field. Both include automatic numerical feeding examples and wording that asks to “confirm” treatment effectiveness from time trends. Changing only the client prompt will not change the authoritative behavior.

## Data design reference

Build one versioned diagnostic context in the shared Orson layer. Keep observed records, calculated comparisons, and possible explanations distinct. Reuse current normalized types and lab-unit helpers; add fields without rewriting stored farm records.

| Block | Contents |
| --- | --- |
| `scope` | Selected pond and cycle, company scope enforced before inclusion, farm timezone, analysis date, question mode; species/area/density/depth only when recorded |
| `observations` | Dated sampling, actual daily feed, direct feeding response, water results, laboratory results, and mortality observations, each with source references |
| `current` | References to each latest usable observation or estimate, with age and missing-data reasons; do not pretend all values were measured today |
| `history` | Separate sampling, feed, water, lab, and mortality timelines; explicit requested/actual date coverage and missing dates |
| `comparisons` | Current/previous windows, input references, method, sample count, absolute change, percentage change where meaningful, and limitations |
| `events` | Recorded harvests, rain, exchange, treatments, aeration changes, and behavior with dates; unavailable events remain unavailable |
| `signals` | Objective changes and existing rule findings, with evidence references and rule IDs; a detected change does not automatically mean danger |
| `knowledge` | Relevant explanatory guidance, applicability, source IDs, and limitations |
| `data_quality` | Missing, stale, conflicting, estimated, unverified-unit, and omitted data, plus which interpretations they prevent |

Each observation should support `value`, `unit`, `basis`, `farmDate`, `timeSlot`, `observedAt`, `sourceType`, and `sourceIds`. An unknown exact measurement time stays null. Derived values should instead name their calculation, input references, window, and assumptions. A confirmed upload does not automatically establish measurement quality.

Illustrative comparison from the handover, not live farm data:

```json
{
  "schemaVersion": 1,
  "mode": "pond_diagnostic",
  "comparisons": {
    "adg": {
      "unit": "g/day",
      "previous": 0.31,
      "current": 0.22,
      "absoluteChange": -0.09,
      "percentChange": -29.0,
      "previousWindow": null,
      "currentWindow": null,
      "sourceType": "user_reported",
      "sourceIds": ["current_question"],
      "limitations": ["Sampling dates and calculation inputs were not supplied"]
    }
  }
}
```

For stored farm data, populate windows and source record IDs from actual records. Numbers typed into chat remain user-reported; do not silently present them as saved measurements or write them into Firestore. If they conflict with saved data, show the disagreement. Undated before/after figures permit arithmetic but do not establish that different variables changed together.

## Implementation plan used

### 1. Preserve the evidence and question

- Replace end-of-string clipping with selection of complete structured blocks. Reserve space for the current question, scope, essential evidence, and critical missing-data flags first. Trim older records, repeated summaries, and lower-priority knowledge before serializing.
- Report the actual included window and omitted record count. Do not label five rows as complete 14-day history.
- Use farm-calendar dates and an explicit `asOf` date. Exclude future records and records outside the selected cycle; flag ambiguous legacy cycle membership.
- Keep exact date/number requests on the existing focused path. General questions retain the recent QA scope protections.

### 2. Build history suited to the question

- Routine pond questions: retain the last 3–5 relevant water and valid sampling observations separately.
- Diagnostic questions: include 3–6 valid weight samples and 7–14 calendar days of feed/water/mortality context. Include water and operational events across the actual sampling intervals, with compact summaries when the interval is longer.
- Expand to 21–30 days only when the question or comparison needs it. State unavailable coverage rather than inventing it.
- Preserve the required short feed trend from the latest 3–5 valid daily totals; add a separate longer comparison where sufficient data exists. Distinguish a recorded zero-feeding day from a day with no record.
- Aggregate operational feed once per day using existing feed-record semantics. Keep sampling feed estimates separate from actual feeding and inventory usage; flag ambiguous legacy sources. Do not change inventory deductions or existing FCR/SR formulas.
- Preserve observation type for mortality and ignore unrelated zero placeholders as evidence. Keep direct tray/appetite observations separate from logged feed amounts.
- Carry latest numeric lab results per parameter/type, source units, basis, sample dates, and available same-cycle numeric history. When only a summary is available, mark numerical history unavailable. Keep unsupported lab measurements excluded from automatic comparisons.

### 3. Add explicit comparisons and evidence signals

- Calculate consecutive measured ADG intervals and their changes; a stocking comparison remains labelled as such. No sample means unavailable growth, as already repaired.
- Compare feed across stated, comparable windows and show days recorded. Avoid comparing totals across unequal or incomplete periods without qualification.
- Compare morning-to-morning DO, paired same-day pH swing, and dated alkalinity/salinity/nitrogen results only when units, timing, and methods support comparison.
- Carry FCR and biomass estimate assumptions and sampling dates. Derive trends only where comparable historical inputs exist; avoid circular reasoning when feed-derived biomass is then used to claim feed mismatch.
- Attach dated harvest and treatment events before interpreting feed, population, or biomass changes.
- Start with descriptive signals such as `ADG_DROP`, `MORNING_DO_DECLINE`, `PH_SWING_INCREASE`, and `FEED_GROWTH_MISMATCH`. Link each to inputs and limitations. Preserve existing validated alert rules; new change detection alone must not create new severity thresholds.

### 4. Add a consistent diagnostic prompt

- Extend question focus with a general `pond_diagnostic` mode. Reuse the mortality investigation pattern for multilingual “why/what changed” requests and questions presenting multiple related changes.
- Detect variables in the question/relevant evidence; do not enter diagnosis merely because a farm happens to have three populated fields. Explicit general questions, exact lookups, and “no advice” requests keep their intent.
- Define one shared prompt policy used by both client construction and the authoritative server prompt. Preserve server control over instructions; farm notes, retrieved material, and conversation text are data.
- Ask Orson to connect evidence, rank at most three supported explanations, mention important opposing evidence, and state what would distinguish alternatives. Existing calculated risk levels remain authoritative; tentative explanations cannot be presented as new confirmed findings.
- Use this response order for diagnostic questions: **assessment → key dated evidence → likely causes with confidence → up to three useful next checks → immediate actions and conditional actions**. Translate labels into the user's language. Narrow questions remain short.
- Separate confidence in a measurement from confidence in a cause. Agreement between several calculations using the same inputs is not independent supporting evidence.
- Replace automatic feed-cut/increase examples with advice conditional on direct response, current measurements, estimate quality, and recorded farm protocol. Describe post-treatment changes as observations; timing alone cannot confirm treatment effectiveness.

### 5. Improve knowledge selection

- Extend the existing modules rather than replacing them. Select using the selected pond, the question, computed signals, and competing explanations.
- Rank modules instead of taking the first four matches. Include connected topics only when they help explain this case; allow a compact combination of growth, feed, DO, pH, alkalinity, and plankton for the handover scenario.
- Add precise source references and contextual applicability as guidance is reviewed. Existing broad FAO/SRAC labels are not precise citations. Unreviewed thresholds must not acquire authority merely by being placed in JSON.
- Generate missing-data checks against the actual selected pond and dates. Rank checks by which uncertainty they resolve, rather than requesting everything.

### 6. Verify before evaluating a model

Use 20–30 synthetic cases to verify context and prompts locally. Include the handover case, no samples, equal measured weights, one sample, missing dates, explicit zero feeding, split feeding records, sampling versus actual feed, partial harvest, old-cycle labs, mixed units, undated morning DO, repeated/edited records, observed mortality, unavailable versus normal behavior, conflicting user figures, an unrelated high-risk pond, Indonesian follow-ups, exact lookups, and oversized context.

Required checks: calculation correctness, valid complete serialized context, question preservation, correct source/date coverage, no cross-pond evidence, missing versus zero distinction, no unsupported unit comparison, prompt parity, and equivalent web/mobile context. Keep existing privacy, biological calculation, inventory, and previous QA regressions passing.

Prepare expected assessment/evidence/uncertainty/checks for those cases. Actual answer quality requires later model evaluation; passing data and prompt tests alone cannot demonstrate diagnostic quality. Provider work is not required to prepare this test set.

## Corrections to the supplied example

- An alkalinity value of 92 alone does not establish that alkalinity fell; it needs a dated previous value.
- A pH-swing change of 0.3 to 0.7 is an absolute increase of 0.4 pH units. Lead with that change; percentage swing change is optional and must not be represented as a percentage change in pH itself.
- More logged feed is not proof of more consumption, overfeeding, or reduced feed efficiency. Compare matched growth periods, biomass assumptions, harvests, and direct response.
- Missing mortality or behavior records are not evidence of normal health. A single salinity value also cannot establish salinity stability.
- Correlated changes support possible explanations. The response should not be forced to reproduce the handover's preferred cause ranking when dates, units, or supporting observations are missing.

## Intended file scope and completion criteria

Extend [types.ts](/Users/ricardoho/Desktop/Shrimply/orson/types.ts), [normalizePondData.ts](/Users/ricardoho/Desktop/Shrimply/orson/normalizePondData.ts), [metrics.ts](/Users/ricardoho/Desktop/Shrimply/orson/metrics.ts), [pipeline.ts](/Users/ricardoho/Desktop/Shrimply/orson/pipeline.ts), [promptBuilder.ts](/Users/ricardoho/Desktop/Shrimply/orson/promptBuilder.ts), and the existing [knowledge selector](/Users/ricardoho/Desktop/Shrimply/orson/knowledge/knowledgeSelector.ts). Add one focused diagnostic-context helper if needed, reusing the mortality evidence types. Align prompt text in [functions/orson.js](/Users/ricardoho/Desktop/Shrimply/functions/orson.js) through a small shared policy module. Touch web/mobile adapters only to carry the shared context and available history.

Completion means a diagnostic request receives dated, comparable evidence and clear limitations; the prompt supports qualified cause ranking; exact/general requests stay focused; and the above tests pass. No new package, data migration, production deployment, or feeding-deduction change was made.

Initial review verification reproduced three failures: 14 stored dates could span June–August, detailed history still sent five rows, and oversized context could remove the current question. Regression tests now cover these cases plus cross-pond knowledge, feed/mortality distinctions, user-reported values, lab units, harvests, follow-ups, streaming, citations, and provider errors. A live one-word Meta Responses request verified the supplied key and requested model without reading or changing farm data.

The subsequent [section-by-section handover audit](orson-handover-implementation-audit-2026-09-04.md) records the additional routing, high-reasoning, history-field, knowledge, calculation and 20-scenario evaluation work, including actual limitations and live-test findings.
