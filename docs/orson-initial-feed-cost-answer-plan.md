# Orson initial targeted answer plan: 30-day feed cost by pond

Date: 7 October 2026
Status: implemented; Orson focused checks pass. Firebase emulator verification and live Pilot smoke were unavailable because the configured Java runtime cannot execute on this host. Release was separately authorized by the user's PUSHALL request.

## Goal

Make Orson's first decision-tools answer reliable for the initial question in the product plan:

> “What did each pond's feeding cost over the last 30 days? Separate consumed feed cost from operating expenses and identify missing cost evidence.”

The initial result is one row per pond the caller is authorized to see, over the last 30 **farm-local calendar days**. The server must calculate each row and its completeness. Orson should explain those results without turning missing records into zero spend, presenting feed allocation as consumption, or inventing a currency. This is the initial period-totals deliverable from the [decision-tools plan](orson-decision-tools-plan.md), not a plan for all comparison, inventory, or harvest tools.

The one-pond, one-day Pilot query already tried is a narrow smoke test of the same calculation path. It does not meet the plan's 30-day, per-pond target.

## Baseline to reconcile first

The [capability matrix](orson-decision-tools-capability-matrix.md) describes an older result shape with fields such as `totalFeedCost` and `currency`, and says its implementation is complete. The current `summarize_period_feed_and_cost` implementation instead returns `consumedFeedCost` and does not return a currency field. The live answer also rendered `[company currency]` literally.

Before changing code, update the capability matrix's baseline row for this question with the current route, calculator, tool result, live answer, and observed gap. Treat the prior matrix's completion claim as something to verify against the current branch and deployed function. Keep the existing tool and calculations if they pass; add only the missing contract or answer guidance.

## Target answer

For the initial 30-day, per-pond result, the response should communicate these items in this order:

1. **Scope and period:** say whether rows cover the whole company or only the caller's assigned ponds; give the farm-local date range and timezone. Identify ponds by readable name. Include cycle only where attribution is unambiguous.
2. **Per-pond feed recorded:** quantity and units; recorded pond-days / expected pond-days; explicit zero-feed days and unrecorded days. Call this logged feed allocation. State that it does not prove feed was consumed or that trays were cleared.
3. **Per-pond recorded consumed-feed cost:** amount and currency, matched usage-record count, cost-evidence status, and valuation basis. Use recorded usage valuation only; do not substitute today's catalog price. Exclude stock-in purchases so the purchase and later consumption are not double-counted.
4. **Per-pond recorded operating expenses:** recorded subtotal and entry count, separate from feed usage. Exclude inventory purchases and voided entries; apply the existing cycle-allocation policy where needed. Do not allocate company-wide rows to ponds without an approved attribution rule.
5. **Farm total, only when the scope and every included row support it:** sum the complete authorized pond rows using the same currency and basis. Never call an assigned-pond subtotal a whole-company total.
6. **Missing evidence:** identify unpriced usage, absent usage records, absent expense entries, or incomplete retrieval separately. Do not claim that no expense records means no money was spent.
7. **Retrieval status:** state complete or partial only from the bounded source reads. If a source was truncated, failed, stale, or ambiguous, identify the affected pond/amount as partial or unavailable and avoid presenting it as a complete total.

Use an inclusive farm-local calendar window: `endDate` is the farm-local as-of date and `startDate` is 29 calendar days earlier. Do not approximate this as 30 × 24 hours across daylight-saving transitions.

A compact table is preferred:

| Pond | Feed recorded | Coverage | Consumed-feed cost | Recorded operating expenses | Evidence |
| --- | ---: | --- | ---: | ---: | --- |
| Pond name | kg | recorded / expected pond-days | currency + amount, or partial/unavailable | recorded subtotal + entry count | missing fields / retrieval status |

### Currency and zero/missing rules

- Use the company's configured currency code when present.
- If the company has no configured currency, say “company currency is not configured; amounts use the stored company monetary units.” Never emit a template such as `[company currency]`.
- If there are no operating-expense entries, say: “No operating-expense entries were recorded for this period. The recorded-entry subtotal is 0; actual spend is unknown.” Do not show a daily expense average; it is not meaningful with zero entries.
- If no feed usage records are found, say that no usage cost was recorded; do not infer zero consumption or zero cost.
- If some usage rows lack a valid recorded cost, label any sum as a **partial recorded-cost subtotal**, give the number of unpriced rows, and keep the complete cost null/unavailable.
- Preserve an explicit recorded zero separately from an absent record. Do not call an unobserved day a zero-feed day.
- If finance permission is absent, omit all cost values and cost-derived conclusions from both the tool result supplied to the model and the answer.

## Minimal result contract

Reuse `summarize_period_feed_and_cost` and existing canonical feed, valuation, and allocation helpers. Do not add a second cost formula. Ensure its result and the prompt expose enough typed evidence for the answer above:

```ts
type EvidenceStatus = 'complete' | 'partial' | 'unavailable';

interface PeriodFeedCostResult {
  status: EvidenceStatus;
  scope: { boundary: 'company' | 'assigned_ponds'; pondCount: number };
  period: { startDate: string; endDate: string; timeZone: string; asOf: string };
  ponds: Array<{
    pondName: string;
    cycleId: string | null;
    feed: {
      totalKg: number | null;
      recordedPondDays: number;
      expectedPondDays: number;
      explicitZeroDays: number;
      unrecordedDays: number;
      completeness: EvidenceStatus;
      basis: 'recorded_daily_allocation';
    };
    finance?: {
      financeAllowed: true;
      currency: string | null;
      currencyStatus: 'configured' | 'unspecified';
      consumedFeedCost: number | null;
      feedUsageRecordCount: number;
      feedUsageRecordsMissingCost: number;
      consumedFeedCostStatus: EvidenceStatus;
      recordedOperatingExpenseSubtotal: number | null;
      operatingExpenseEntryCount: number | null;
      operatingExpenseEvidence: 'entries_found' | 'no_entries_found' | 'unavailable';
      operatingExpenseReadStatus: EvidenceStatus;
      missingEvidence: string[];
    };
    retrieval: { complete: boolean; recordsRead: number; warnings: string[] };
  };
  farmTotal?: { available: boolean; reason?: string; currency?: string; consumedFeedCost?: number };
  writesPerformed: 0;
}
```

This is a proposed minimum, not a mandate to duplicate existing fields. Map existing names into it if safe. For an unauthorized caller, omit `finance` entirely. Represent unavailable values as `null` with a reason; do not encode unknown as zero. Use bounded source dates/counts for auditability without exposing raw Firestore IDs in the chat.

## Work sequence

1. **Verify the route and baseline.** Trace both a one-pond request and an all-authorized-ponds request through `generateOrsonResponse`, `createOrsonAppDataReader`, and `summarize_period_feed_and_cost`. Record tool input/result, permissions, expected hand calculation, and actual model wording. Reconcile the capability matrix's field names with current source.
2. **Add independent deterministic fixtures.** Hand-calculate expected values outside the production helper. At minimum cover:
   - two ponds over 30 farm-local days, including one fully covered row and one with missing feed days;
   - complete daily feed and fully priced usage;
   - no feed record versus explicit zero feed;
   - no expense rows, including the correct “actual spend unknown” wording;
   - an expense row that is explicitly zero, if the schema permits it;
   - one or more usage rows with missing costs and one with a recorded cost;
   - inventory stock-in, linked/duplicate, voided, stale-cycle, and shared-cycle expenses;
   - mixed or unspecified currency;
   - finance-authorized and finance-restricted users, plus assigned and unassigned technician scope; confirm all-pond results include only accessible ponds and label that boundary;
   - results beyond one page, reordered pages, and bounded-read exhaustion.
3. **Fix the narrowest gap.** Keep deterministic arithmetic on the server. Add or repair only the result metadata, currency propagation, zero-versus-missing semantics, and model instructions required by failing fixtures. Keep existing streaming, evidence grounding, permissions, and read-only behavior.
4. **Verify locally.** Run affected period-tool/app-data tests, independent expected-value checks, domain mirror checks, and relevant backend syntax/type checks. Use the Firebase emulator for authorization and multi-source retrieval. Record fixture read counts, response bytes, model/tool rounds, and latency rather than promising unmeasured performance.
5. **Run a live smoke test only after fixture gates pass.** Ask the 30-day, per-pond Pilot question and compare every displayed row and any farm total to the captured server result. Treat the earlier one-day Pilot query as a narrow route smoke test, not as target acceptance. Do not perform farm writes.

## Acceptance gates

- Server totals match hand-calculated fixture values regardless of page size/order.
- Feed quantities use authoritative daily feed allocation records once; sampling estimates are excluded.
- Feed allocation is never described as proof of consumption, appetite, or tray clearance.
- Consumption valuation uses recorded usage costs, with inventory stock-in excluded and no current-price fallback.
- Expense totals are labeled as recorded ledger entries, not cash paid or complete farm spend.
- Zero, missing, partial, and unavailable values remain distinct in both the tool result and answer.
- Currency is explicit or explicitly unspecified; mixed currencies are not combined.
- `viewFinance` and assigned-pond boundaries protect both source records and derived amounts.
- Incomplete retrieval cannot produce a complete-total claim.
- Query performs no writes; existing answers and streaming continue to work.
- A live response is called a smoke test unless all deterministic and authorization gates above also pass.

## How this differs from the current Pilot answer

The current one-day, single-pond answer already has the right basic structure: it separates feed usage cost from operating expenses, calls feed logs allocations rather than proof of consumption, reports daily feed coverage, and says absent expense/additive evidence is not confirmed zero spend. It does not answer the initial 30-day, per-pond question.

The target changes the wording and evidence contract in these specific ways:

| Current answer | Target answer |
| --- | --- |
| Shows the literal `[company currency]` placeholder. | Shows the configured currency code, or explicitly says the company currency is unspecified. |
| Reports operating expenses and average expense per day as `0`, then adds a caveat that no entries exist. | Leads with “no entries recorded”; identifies 0 only as the recorded-entry subtotal; says actual spend is unknown; omits the average. |
| Reports a generic “complete” result and says no sources were truncated. | Ties completeness to the feed and finance evidence separately, with record counts, expected/recorded days, timezone, and a partial reason when needed. |
| Lists additive cost as unavailable even though the question is about feed and operating expenses. | Mentions additive cost only if it is relevant to the requested total or needed to explain missing evidence; otherwise keeps the answer focused. |
| Covers one pond for one day. | Covers each authorized pond over the inclusive last 30 farm-local calendar days, with row-level evidence and an aggregate only when justified. |
| Demonstrates one live one-day request. | Passes independent fixtures for missing/zero/partial data, paging, authorization, and cost reconciliation before the 30-day live smoke test is treated as acceptance. |

The numeric values in the single-day answer do not need to change if its source records and calculation are correct. Meeting the initial target additionally requires a correct 30-day window and a result row for every authorized pond. Currency, valuation basis, scope, and completeness must be explicit and proven independently.

## Boundaries

This plan covers the first period feed/cost answer only. Pond/cycle comparisons, inventory replenishment, harvest scenarios, UI redesign, new report services, production deployment, and data writes are outside this plan. The existing decision-tools documents remain the broader product plan and implementation handover.
