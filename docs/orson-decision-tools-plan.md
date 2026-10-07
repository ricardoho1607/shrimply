# Orson comparison and decision tools — product plan

Date: 6 October 2026
Scope: recommendation **7** — strengthen existing comparisons and planning
Status: implementation completed under separate user instruction; release authorized by subsequent PUSHALL request

## Goal

Make Orson's comparisons, period totals, inventory planning, and harvest scenarios consistently calculated, permission-scoped, and clear about missing evidence. Keep the existing chat experience and reuse existing calculations.

Orson already reads relevant saved records and answers these kinds of questions. This work must begin with verification of those capabilities. Do not build a replacement tool when a routing, coverage, or result-label improvement solves the demonstrated problem.

## Before and after

| Question | Current capability | Intended improvement |
| --- | --- | --- |
| “Compare Pond A and B over the last month.” | Record tools and existing biological metrics support comparison. | Comparable periods, deterministic metrics, source dates, and coverage in one bounded result. |
| “Compare this cycle with the previous one.” | Saved cycles/history and historical benchmarks support analysis. | Explicit cycle identity and calendar/DOC alignment; completed outcomes separated from active estimates. |
| “What did each pond's feeding cost over 30 days?” | Orson can retrieve feeding, stock usage, and authorized finance. | Canonical daily quantities and reconciled consumption cost, without duplicate counting or incomplete totals presented as complete. |
| “What feed should we plan to buy?” | Inventory exhaustion forecasts already exist. | Conditional quantities using explicit lead time, planning horizon, safety stock, and known incoming supply. |
| “Should we harvest now or wait seven days?” | Harvest projections and profitability calculations already exist. | Side-by-side scenarios using the same inputs, evidenced prices/costs, and explicit assumptions. |

The proposed improvement is reliability and efficient access to existing logic. Current production performance has not been measured in this planning task.

## Existing foundations to reuse

- `functions/shared/orsonAppData.js`: authorized records and pond timelines; current lists/arrays are paginated.
- `functions/shared/readOnlyFarmApi.js`: authorized pond/feed readers, canonical feed extraction, period feed summary, and cursor consistency checks.
- `shared/orsonEvidence.ts` and its generated server mirror: canonical daily feed selection. Inspect current exports before reuse.
- `shared/pondCalculations.ts`, `orson/metrics.ts`: biological calculations and partial-harvest handling.
- `shared/financeIntegrity.ts`, `financeReconciliation.ts`, `financeCycleAllocation.ts`: money, source reconciliation, and cost allocation policies.
- `shared/harvestProfitability.ts`: recorded cost snapshots, price tiers, and harvest profitability scenarios already used by the mobile/web projection screens.
- `orson/harvestProjection.ts`: biological projection and risk/calibration context.
- `functions/orson.js`: inventory forecasts and conversational tool wiring.

## Delivery order

1. **Baseline and gap report.** Test representative questions with deterministic datasets and independent expected results. Classify each as already sufficient, routing/metadata issue, or missing calculation/tool access.
2. **Period feed and cost totals.** Deliver the smallest high-value gap first; quantities and costs must have separate authorization and completeness.
3. **Pond and cycle comparisons.** Reuse period totals and biological calculations; agree comparison alignment before presenting rankings.
4. **Inventory scenarios.** Extend forecast arithmetic only where needed; do not turn low-stock alert absence into proof of adequate stock.
5. **Harvest scenarios.** Expose the existing profitability engine safely rather than introducing a separate profit formula.

Every phase can be skipped if baseline verification shows the existing capability meets its acceptance criteria. Do not make one large release dependent on all five phases.

## Product rules

- Server code calculates totals and scenario deltas. The model selects bounded tools and explains their results.
- “All pages read” and “all measurements recorded” are different facts. Show both retrieval completion and observation coverage.
- Preserve zero versus missing, measurement dates, cycle identity, units, currencies, and recorded cost basis.
- State whether a result covers the whole company or only authorized assigned ponds. Scope is applied before aggregation.
- Farm read access does not grant finance access. Derived costs, prices, revenue, and margins require the existing finance permission.
- Separate feed allocation, consumption cost, stock purchases, cash payments, COGS, and profit. Do not label a partial margin as full profit.
- Missing inputs produce an incomplete comparison or a request for the specific assumption; never an invented price, survival rate, supplier lead time, or unrecorded zero expense.
- Scenario assumptions may be supplied by the user, but must be explicitly returned. Approved existing model defaults must remain labeled assumptions.
- Use existing chat/table rendering. No separate dashboard or new PDF report service is needed initially.
- All proposed tools are read-only. A later explicit recording request may use existing action tools and confirmation, but this feature does not place orders, save forecasts, start harvests, or deduct inventory automatically.

## Acceptance

- Independent calculations match returned totals and scenario differences.
- Page size and record ordering do not change results.
- Missing, stale, ambiguous, and partial evidence cannot produce definitive whole-farm conclusions.
- Company/role/assignment boundaries protect raw records and derived aggregates equally.
- Existing answers, streaming, action confirmations, and both clients remain compatible.
- Representative scale tests record Firestore reads, response size, tool/model rounds, latency, and cost estimates. Set justified limits from measured results, not an untested “instant” promise.

## Boundaries

No new forecasting provider, model replacement, weather/sensor integration, intervention task system, memory feature, schema migration, or unrelated finance repair. Do not change biological policy just to complete a scenario. This plan alone does not authorize production release, Git push, live farm writes, or paid live evaluation; those actions were separately authorized by the user's later PUSHALL request.

Detailed implementation steps and handback requirements: [implementation handover](orson-decision-tools-implementation-handover.md).
