# Orson decision tools: v4 audit fixes

Implemented on October 8, 2026, from v4 commit `16f8dc0`. The user authorized deployment of `generateOrsonResponse` to `investashrimp-5d9e5`, which completed successfully. This records the fixes and verification limits; it does not certify completion of every gate in the original handover.

## Implemented

- Production routes all four tools through the same authorized app-data reader. Technician scope is bounded and cached within the request, then assignments are checked again. Current membership and permissions are read before analysis and included in source verification. Missing and inaccessible pond/cycle IDs produce the same denial for restricted users.
- Explicit cycle selection is available for period totals. Calendar and DOC-range comparisons use matching period consumption valuation and operating-expense allocation. Saved whole-cycle `feedCost` is never substituted for period cost. Earlier mortality and partial harvests remain in cumulative biology. Measurement dates, estimated population/biomass basis, missing observation coverage, and lifecycle are disclosed; incomparable cycles are not ranked.
- Replenishment separates demand horizon, supplier lead time, safety stock, and incoming supply timing. Incoming supply is unknown unless explicitly provided as a scenario assumption. Gross requirement remains provisional; net purchase quantity requires incoming-supply evidence. Sparse usage cannot claim adequate or stable stock runway. Stock timestamps, recorded/missing observation days, units, and excluded rows are returned. Shared company stock access is retained, but assigned-pond usage cannot generate a company-demand recommendation.
- `exactDaysFromNow` adds today-versus-exact-day harvest projections using the existing shared tapered-growth, mortality, feed, and profitability calculations. The old `daysToHarvest` cap is retained and truthfully reported. An explicit flat price applies to both scenarios. Missing measured biology cannot produce a harvest recommendation for a non-finance caller.
- Partially priced feed/additive consumption and operating expenses with missing amounts cannot become complete costs or financial superiority. Known feed-cost subtotals remain separate. Missing feed quantities cannot produce a unit price. Recorded feeding restorations reverse their recorded consumption cost; unidentified negative rows remain incomplete evidence.
- All tools return runtime-validated common metadata, coverage, formula version, source digest and warnings, preserving existing payload shapes. Decision sources are re-read before delivery. Detected changes discard amounts and recommendations; this does not claim a transactional snapshot.
- Request decision-source budgets: 12,000 returned documents, 160 reads, four concurrent reads, 16 MiB of returned read data. Each evaluation has a 20-second deadline and 64 KiB output cap. Existing assigned-scope discovery has separate bounded block/pond limits. Each new evaluation reads fresh evidence; only identical reads within one evaluation share a cache.
- Existing web/mobile reply rendering receives the same tool evidence and answer instructions. No new report service, schema migration, procurement, harvest write, or deployment was introduced.

## Local scale measurement

The same synthetic September period fixture was run through the original v4 router and the updated router. The fixture contains one authoritative feeding day per pond in a 30-day period. It does not represent real farms or network/model latency. Authentication and assigned-scope setup are excluded from these direct tool measurements.

| Ponds | v4 source reads / documents | Updated reads / documents | v4 output bytes | Updated output bytes | Updated outcome |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 / 1 | 2 / 2 | 3,628 | 4,266 | Partial observation coverage |
| 10 | 1 / 10 | 2 / 20 | 27,030 | 27,673 | Partial observation coverage |
| 100 | 2 / 100 | 4 / 200 | 261,761 | 1,025 | Output withheld; narrow request |

The extra reads provide bounded source verification. These are measured fixture results, not a claim that Firestore cost or latency improved. The existing six-round model tool limit is unchanged. Provider token use, end-to-end latency, answer selection, and monetary cost require separate live evaluation.

The scale test is in `functions/shared/orsonDecisionTools.test.js`. An optional `ORSON_DECISION_BASELINE_DIR` points to an extracted v4 checkout for before/after measurement; ordinary test runs require no baseline checkout.

## Verification and remaining limits

The agent suite passed 114 tests, and the supporting finance, biology, evidence, conversation, and read-only API run passed 96 tests. TypeScript, lint, backend syntax, and generated-domain consistency checks passed. The local checks cover permission revocation, changed assignments, source edits/inserts/deletes, paging and output/read/deadline budgets, period/DOC financial alignment, signed recorded returns, sparse observations, exact-day and plateau projections, flat prices, mixed currencies, missing quantities/valuations, finance redaction, and zero writes. The agent suite explicitly invokes the exported TypeScript finance/harvest assertion batches; merely loading those modules would not run them.

An authorized localhost browser smoke test reached the deployed callable and returned an Orson answer. The general farm-status prompt disclosed missing water, sampling and feed observations, labeled fallback biology, and did not infer appetite from logged feed. It did not establish selection or acceptance of all four decision tools; targeted comparison, cost, replenishment and harvest prompts remain to be evaluated. Real Firestore read cost and provider cost were not measured.

Firestore emulator integration remains unavailable because the installed Java runtime fails with `Bad CPU type in executable`. Android device answer presentation remains unverified. Incoming supply is a disclosed user scenario input because there is no authoritative incoming-order dataset in this implementation. No pack-size rounding or procurement workflow is added. The harvest adapter retains the shared profitability engine's current biology; it does not add a new company learning/calibration pipeline or save predictions into learning.
