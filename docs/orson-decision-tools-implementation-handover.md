# Orson comparison and decision tools — implementation handover

Date: 6 October 2026
Scope: recommendation **7**
Status: implementation completed under direct user instruction; emulator validation unavailable on this host

Read the [product plan](orson-decision-tools-plan.md) first. Preserve current application architecture and unrelated work. Recheck the working tree and current instructions; older audit findings may already have been fixed.

## Execution workflow

Preserve current application architecture and unrelated work. The user explicitly excluded the `hybrid-coding-router` workflow for this implementation. The coordinator owns Git, checks, patch integration, and cleanup.

This handover did not itself authorize deployment, pushes, production writes, or paid provider evaluations. The user subsequently authorized implementation and PUSHALL. Local deterministic fixtures pass; emulator validation could not start because the configured Java runtime has the wrong architecture for this host.

## Phase 0 — Baseline before adding tools

Create a capability matrix: question → current tool route → existing calculator → expected result → observed result → gap → smallest change.

Use fixtures with more than one record page and more than one cycle. Include:

1. Pond A versus B over 30 farm-local days.
2. Active cycle versus previous completed cycle, aligned by DOC and separately by calendar period.
3. Pond-level feed quantities and recorded usage cost, including a feed hold and missing dates.
4. Inventory at zero stock, signed returns/corrections, and items with more than seven days' cover.
5. Harvest today versus seven days later using known price tiers and costs.
6. The same requests as an owner, finance-restricted manager, assigned technician, and revoked member.

Start with reader/calculator/tool-integration fixtures, not a paid model run. They establish calculation and routing behavior, not live model answer quality. A separately authorized multi-turn evaluation can assess actual conversational tool selection later.

**Gate:** if a current capability passes, preserve it. If only its metadata or tool exposure is missing, add an adapter or improve its contract. Do not add duplicate arithmetic. Resolve unclear cost source/cycle attribution before reporting complete financial results; unresolved rows can be excluded with explicit partial status where safe.

## Phase 1 — Shared result contract and bounded reads

Introduce only the minimum shared contract needed. Proposed fields:

```ts
type DecisionStatus = 'complete' | 'partial' | 'insufficient_data';
type DecisionKind = 'comparison' | 'period_totals'
  | 'replenishment' | 'harvest_scenarios';

interface DecisionResult {
  version: 1;
  kind: DecisionKind;
  status: DecisionStatus;
  writesPerformed: 0;
  scope: {
    boundary: 'company' | 'assigned_ponds';
    pondIds: string[];
    cycleIds: string[];
  };
  period: { startDate: string; endDate: string; timeZone: string };
  coverage: {
    retrievalComplete: boolean;
    recordsRead: number;
    expectedObservationDays: number | null;
    recordedObservationDays: number | null;
    missingFields: string[];
    excludedRecordCount: number;
  };
  assumptions: string[];
  warnings: string[];
  asOf: string;
  formulaVersion: string;
  // Add a discriminated payload for the selected kind.
}
```

Runtime validation must match TypeScript. Metrics need nullable values, units/currency, recorded/derived/assumed basis, and bounded source references. Distinguish actual subtotal, partial subtotal, and scenario estimate. Define DOC alignment separately from calendar alignment. Unknown coverage cannot be encoded as complete observations.

Resolve company membership and scope from authenticated server context; do not trust submitted company, pond, or cycle labels. Preserve existing `viewFarm`, `viewFinance`, and relevant asset permissions and overrides. Out-of-scope requests must not disclose IDs, names, counts, or existence through errors or metadata.

Apply authorization before aggregation and redact derived finance fields too. Never use a technician's partial usage history with company-wide stock to claim a whole-company replenishment recommendation. Preserve legitimate shared-inventory access according to current policy.

Set explicit date-window, pond-count, record-count, read/concurrency, deadline, and output-byte budgets after baseline measurements. Paginate internally with bounded work where practical; otherwise return explicit partial status/cursor and no definitive total. Do not merely raise the model's six-round limit or attach all raw records to the prompt.

For changing data, use existing record digests/version evidence and a bounded restart or return a partial/changed-data result. Do not claim a coherent Firestore snapshot merely because reads completed at similar times. Cache only with scope and evidence/version invalidation; fresh reads are the initial default.

## Phase 2 — Period quantities and recorded costs

Reuse `selectDailyFeedEntries`, `getFeedSummary`, `getFeedRecords`, and canonical feed extraction where appropriate. Verify each reader's period/cycle semantics before adapting it.

- Count authoritative daily feeding once. Exclude biological sampling feed/baseline estimates from operational allocation totals.
- Preserve explicit zero and missing days. A zero subtotal with no recorded days does not prove zero feeding.
- `getFeedSummary` computes its period total before paginating detail rows: do not sum that repeated period total across pages.
- Attribute records to the reviewed pond/cycle, respecting partial harvests and legacy ambiguity.
- Use recorded usage valuation and existing reconciliation/allocation helpers. Do not value historical usage at today's inventory price.
- Do not count inventory purchase expenses and corresponding feed consumption as the same production cost twice. Preserve voids, returns, settled source constraints, and stable source IDs.
- Label cash spending, inventory purchase value, recorded consumption cost, and allocated production cost separately.
- Reject mixed currencies/units unless a supported explicit conversion exists. Missing costs remain unavailable; quantity-only results can still be returned without finance access.

Initial deliverable: permission-checked recorded feed and cost summaries by selected pond/cycle/period, with retrieval completion and recording coverage.

## Phase 3 — Pond/cycle comparison

Reuse the period service and `shared/pondCalculations.ts`/`orson/metrics.ts` biological helpers. Return deterministic comparison rows rather than having the model calculate rankings from raw pages.

Require comparable alignment: selected calendar dates or matching DOC ranges. Preserve measured versus estimated MBW/ADG, valid-MBW look-back, initial-weight fallback, mortality semantics, and population after cumulative harvests.

Compare a completed cycle's outcomes against an active cycle's current/projection metrics with clear labels. Missing mortality is not proof of perfect survival. FCR denominators and financial allocation must follow the existing platform policy. Explain unavailable metrics rather than substituting zero or ranking incomparable ponds as “best.”

## Phase 4 — Replenishment scenarios

Inspect `getRecentUsageForecast` and `getCompanyInventoryForecasts` in `functions/orson.js`. They currently support recent-usage low-stock alerts, filtering out zero stock and items beyond seven days' cover. A missing alert is not an adequate-stock verdict.

Extract a pure helper only if needed; do not import the Functions entrypoint just to run arithmetic. Extend existing behavior without changing supervisor alerts unintentionally.

For an explicitly assumed constant demand rate:

```txt
planning demand = daily demand × explicit coverage horizon
suggested purchase = max(0, planning demand + explicit safety stock
                           - usable stock - qualifying incoming supply)
```

Return where the demand rate comes from, observed history coverage, units, assumptions, and stock timestamp. Lead time determines arrival timing and possible shortage before delivery; do not silently treat it as the coverage horizon. Only count incoming supply if authoritative records actually exist and delivery is relevant to the scenario. An absent incoming-supply dataset is unknown, not confirmed zero.

Handle future-dated movements, returns, transfers, incomplete history, and item-specific units. Keep optional pack-size rounding separate and explicit. Do not create a purchase order or stock-in record.

## Phase 5 — Harvest scenarios

Use the same authorized pond snapshot, calibration, price tiers, and costs for both scenarios. Inspect `calculateHarvestProfitability`, `buildPondProfitabilityCostSnapshot`, and related helpers in `shared/harvestProfitability.ts`, plus existing mobile/web projection callers. Prefer those existing profitability policies over a second formula.

`calculateOrsonHarvestProjection` provides biological/risk context, but its `projectedProfit` is not automatically a full-cost P&L measure. Audit included costs and zero fallbacks before exposing financial labels.

- Scenario A: harvest at the current date/size.
- Scenario B: wait the user-selected supported horizon. Reuse growth tapering, survival retention, and calibration; do not assume growth continues linearly without limit.
- Return projected biomass/size, evidence-based price or explicit price assumption, incremental feed/other supported costs, comparable margin basis, and risk warnings.
- Missing price/cost/biomass may permit a biological-only comparison; block financial superiority claims until their required inputs are available.
- If the existing engine supports target-size scenarios rather than arbitrary day horizons, adapt or extend its pure calculation deliberately and verify both callers; do not fake a seven-day scenario by changing labels.
- Treat uncertainty honestly. No invented confidence percentages, market-price predictions, or guaranteed profit.

## Phase 6 — Tool integration and presentation

Proposed names, only if baseline confirms a gap: `compare_ponds_or_cycles`, `summarize_recorded_feed_costs`, `plan_inventory_replenishment`, `compare_harvest_scenarios`. Prefer fewer cohesive adapters over redundant tools.

Register schemas and execution through existing `functions/shared/orsonAppData.js`/`functions/orson.js` wiring, using a focused module if justified. Preserve `metaModelApi.js` execution limits, evidence grounding, quota, streaming, and cache safeguards. Add real activity events only at actual work boundaries.

The prompt must explain returned results, preserve partial/unknown status, cover the requested metrics, and ask only for missing inputs that change the decision. Use ordinary readable comparison tables in both clients. Do not add mandatory structured UI unless existing rendering cannot communicate coverage/assumptions adequately.

## Suggested implementation packets

These are responsibilities, not permission to edit all listed areas at once. The implementation coordinator chooses exact files after Phase 0. Each delegated step must list at most five allowed paths and explicit dependencies.

| Packet | Responsibility | Depends on |
| --- | --- | --- |
| A | Baseline fixtures, expected results, capability/gap matrix | Current source inspection |
| B | Shared result contract, runtime validation, scoped read adapter | A |
| C | Period feed/cost service and independent regressions | B |
| D | Comparable pond/cycle rows | C |
| E | Inventory scenario adapter and regressions | B; C where required |
| F | Existing profitability adapter and scenario regressions | B; C |
| G | Tool exposure, grounding/presentation checks, compatibility | Passing relevant C–F packets |

## Verification and handback

Use hand-calculated expected values or an independent reference implementation, not expected results generated by the production helper under test. Cover:

- More than one page, altered page sizes/order, budget exhaustion, stale cursors, and concurrently changing sources.
- Explicit zero, absent days, invalid amounts, sampling-versus-feeding separation, duplicate records, and cycle/date boundaries.
- Returns/voids, duplicate source-linked expenses, recorded cost basis, allocation conservation, and currency conflicts.
- Cross-company requests, expired membership, permission overrides, assigned/unassigned enterprise scope, and derived financial leakage.
- Inventory at zero, incomplete usage, units, lead time/arrival shortages, and unknown incoming supply.
- Harvest day zero, partial harvests, tapered growth, missing market prices/costs, and scenario delta independently checked.
- No operational writes from queries or scenarios; existing confirmation paths still work.

Run affected app-data, read-only API, finance/reconciliation/allocation, harvest profitability/projection, biological, grounding, and tool-adapter tests. Run `npm run check:orson-domain`, `npm run test:orson-agent`, relevant TypeScript/lint and backend syntax checks. Use emulator integration for authorization and multi-source reads. Broaden builds only when changed components/configuration justify it.

Record baseline versus final read counts, response bytes, model/tool rounds and latency at representative scale. No arbitrary performance promises. Live model/OCR or production validation remains separately authorized.

Deliver a concise **Done** handback: gaps actually fixed, existing helpers reused, changed files, passing checks, result limits, assumptions, and remaining live acceptance. Do not claim new tools were needed or production behavior verified solely from source inspection.

## Out of scope

New report services, autonomous orders/harvests, inventory deductions, saving scenario outputs into learning by default, weather/sensors, farm memory, unrelated finance cleanup, operational schema migration, model/provider changes, and release work. Preserve existing forecast learning unless a later explicit scope includes it.
