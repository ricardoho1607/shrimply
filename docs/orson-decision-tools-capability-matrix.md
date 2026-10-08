# Orson Decision Tools & Authorized Read Paths Capability Matrix

> **Document Version:** 2.1.0 — Decision Tool Reliability and Scenario Extensions
> **Status:** Local implementation verified; Firebase deployed and localhost smoke passed; emulator and targeted live decision-tool validation pending
> **Date:** October 2026  
> **Scope:** Cloud Functions (`functions/`), Shared Calculation Engines (`shared/`, `functions/shared/`), and Integration APIs


The October 8 follow-up fixes the v4 audit findings. See [verification and limits](orson-decision-tools-fix-verification.md) for measured fixture results and outstanding environment checks. The plan and handover are requirements, not evidence that every acceptance gate has passed.

---

## 1. Executive Summary & Purpose

This capability matrix describes the implemented architecture, authorized read paths, and decision scenario tools across Shrimply's Orson AI assistant and farm data integration surfaces.

It establishes:
1. **Implemented Read Paths & Decision Tools:** How authorized users, Orson conversational agents, and external integrations retrieve live aquaculture data and evaluate advisory scenarios.
2. **Security & Permission Boundaries:** Role-based access control (RBAC), strict `viewFinance` isolation, enterprise technician block-scoping, and cross-company boundary enforcement.
3. **Coverage Limits & Bounded Retrieval:** Hard memory limits, payload byte caps, calendar window restrictions, pagination controls, and recursion guards.
4. **Read-Only Invariants:** Inviolable guarantees ensuring analytical and scenario exploration tools cannot trigger unintended state changes, procurement transactions, or harvest records.
5. **Grounding & Evidence Invariants:** Strict rules ensuring missing data is never misconstrued as adequate stock, and decision scenarios are never presented as guaranteed outcomes.

---

## 2. Architecture of Authorized Read Paths & Decision Tools

Live farm data and analytical evaluations flow through four distinct subsystems:
1. **Orson Conversational Pipeline (`functions/orson.js` & `functions/shared/orsonAppData.js`)**: Interactive tool-calling pipeline executed during LLM generation.
2. **Orson Decision Scenario Engine (`functions/shared/orsonDecisionTools.js` & `functions/shared/orsonInventoryPolicy.js`)**: Canonical read-only scenario modeling (feed rollups, cycle benchmarking, inventory replenishment, harvest scenarios).
3. **External Integration API (`functions/readOnlyApi.js` & `functions/shared/readOnlyFarmApi.js`)**: Structured REST/HTTP integration endpoints for external services and site MCP servers.
4. **Orson Agent Action Staging & Entity Discovery (`functions/orsonAgentTools.js` & `functions/shared/orsonEntityResolver.js`)**: Pre-draft entity discovery and two-phase draft staging inspection.

### Flow Diagram

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                                  CALLER ENTRYPOINTS                                                   |
+------------------------------------+------------------------------------+---------------------------------------------+
                                     |                                    |
                                     v                                    v
                        [generateOrsonResponse]                     [readOnlyApi]
                        (Callable Cloud Function)                   (HTTPS API / MCP)
                                     |                                    |
                        +------------+------------+                       |
                        |                         |                       |
                        v                         v                       v
             [createOrsonAppDataReader]   [createAgentTools]      [ReadOnlyFarmApi]
                        |                         |                       |
         +--------------+---------------+         |                       |
         |                              |         |                       |
         v                              v         v                       v
  (read_app_records)          (read_pond_timeline) (discover_targets) (listPonds / getPondSummary /
         |                              |         (prepare_actions)   getWaterQuality / getFeed)
         |                              |                                 |
         +------------------------------+                                 |
         |                                                                |
         v                                                                |
 [executeDecisionTool] (orsonDecisionTools.js)                            |
         |                                                                |
         +----------------------------------+-----------------------------+
         |                                  |                             |
         v                                  v                             v
  (summarize_period_feed_and_cost)   (compare_pond_cycles)   (evaluate_inventory_replenishment)
  (evaluate_harvest_scenario)                                             |
         |                                                                |
         +----------------------------------+-----------------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------------------------------------------+
|                                              AUTHORIZATION & SCOPE GUARDS                                             |
|  - Membership & Ownership Verification (users/{uid}, companies/{companyId})                                           |
|  - Permission Checks: viewFarm, viewFinance, viewAssets, manageFeedInventory                                          |
|  - Enterprise Technician Block Scoping (companies/{companyId}/blocks where technician == uid)                        |
|  - Private field & Finance field sanitization (cleanRecord, financeAllowed flag)                                      |
|  - Bounded Windows (7-90 days, 24 KB per document array page, 10 docs per page)                                       |
+-----------------------------------------------------------------------------------------------------------------------+
                                            |
                                            v
+-----------------------------------------------------------------------------------------------------------------------+
|                                                 CLOUD FIRESTORE (READ-ONLY)                                           |
|  companies/{companyId}/ponds, blocks, cycles, feeds, additives, harvestRecords, expenses, revenues, assets            |
+-----------------------------------------------------------------------------------------------------------------------+
```

---

## 3. Implemented Orson Decision Tools Suite

All decision scenario tools are strictly read-only, execute deterministically before/during Orson responses, reuse canonical shared business calculations, and enforce robust permission isolation.

### 3.1 `summarize_period_feed_and_cost`

- **Route:** `generateOrsonResponse` -> `createOrsonAppDataReader.execute` -> `executeDecisionTool` -> `summarizePeriodFeedAndCost`.
- **Implementation:** `functions/shared/orsonDecisionTools.js`; answer guidance is in `functions/orson.js`.
- **Schema & Name:** `summarize_period_feed_and_cost`
- **Purpose:** Summarizes recorded daily feed allocation and coverage, recorded consumed-feed valuation, and recorded operating-expense entries separately for one pond or all accessible ponds.
- **Required Permission:** `viewFarm` (base execution). Financial source reads and derived financial values require `viewFinance`; for other callers, the result omits `finance` and `farmTotal`.
- **Inputs:**
  - `startDate` (string YYYY-MM-DD, optional; defaults to 29 calendar days before `endDate`)
  - `endDate` (string YYYY-MM-DD, optional; defaults to farm-local today and is returned as the captured as-of date)
  - `pondId` (string, optional; aggregates all accessible ponds if omitted or `all`)
  - `cycleId` (optional; requires an exact pond; historical cycles require saved baselines)
- **Output Model:**
  - `status`: `complete`, `partial`, or `unavailable`; `writesPerformed: 0`.
  - `scope`: company or assigned-pond boundary and returned pond count; `period`: inclusive farm-local dates, timezone, and captured as-of date.
  - `ponds[]`: readable pond name, cycle only when unambiguous, recorded feed allocation and pond-day coverage, explicit-zero and unrecorded days, evidence, and retrieval warnings.
  - `ponds[].finance` and top-level `finance` (only with `viewFinance`): recorded usage-cost evidence, recorded operating-expense subtotal and entries, currency status, missing evidence, and completeness. Inventory stock-in and voided rows are excluded; no catalog-price fallback is used.
  - `farmTotal`: emitted only to finance-authorized callers and marked available only when the full company scope, currency, and every required source support it.
- **Enterprise Scoping:** Accessible pond rows are filtered through the existing enterprise scope. An explicit unassigned pond request is rejected. Assigned-pond results are labeled `assigned_ponds`; they are not represented as a company-wide total.
- **Null & Coverage Preservation:** No feed usage is unavailable, an explicit zero stays distinct from a missing record, and unpriced rows make consumed cost partial. No expense entries means a recorded-entry subtotal of zero with actual spend unknown; no daily average is returned. Mixed currencies and incomplete bounded reads cannot produce complete totals.
- **Current Pilot gap before this implementation:** The prior live one-day, single-pond response separated feed-use cost from operating expenses but rendered `[company currency]`, returned an expense average of zero without entries, and did not satisfy the 30-day per-pond target. It was a route smoke test only; the target answer requires deterministic multi-pond, permission, currency, missing-data, and paging checks before live acceptance.

### 3.2 `compare_pond_cycles`

- **Implementation:** `functions/shared/orsonDecisionTools.js` (Pure Functions-Local CommonJS)
- **Schema & Name:** `compare_pond_cycles`
- **Purpose:** Performs a side-by-side comparative analysis of two cycles: either comparing two active ponds concurrently, or comparing an active cycle against a historical benchmark cycle on the same pond, optionally aligned at an exact biological age (`asOfDoc`).
- **Required Permission:** `viewFarm` (base comparison). Financial delta metrics (`primaryFeedCost`, `secondaryFeedCost`, `feedCostDiff`) require `viewFinance`.
- **Inputs:**
  - `pondId` (string, required)
  - `comparePondId` (string, optional; defaults to `pondId` for cycle-to-cycle comparison)
  - `cycleId` (string, optional; defaults to active cycle)
  - `compareCycleId` (string, optional; for historical cycle comparison)
  - `asOfDoc` (integer 1–200, optional Day of Culture cutoff)
  - `startDate` / `endDate` (inclusive calendar period)
  - `startDoc` / `endDoc` (inclusive DOC range, separately aligned to each cycle start)
  - Calendar dates, DOC ranges, and DOC cutoffs are mutually exclusive. Period feed and costs share the selected bounds; cumulative biology retains earlier mortality and partial harvests.
- **Sanitized Public Output Model:**
  - `primary`: `{ pondId, pondName, cycleId, metrics, coverage }` (internal `effectivePond` strictly omitted)
  - `secondary`: `{ pondId, pondName, cycleId, metrics, coverage }` (internal `effectivePond` strictly omitted)
  - `deltas`: Exact differences (`mbwDiffG`, `adgDiffGPerDay`, `survivalRateDiffPercent`, `fcrDiff`, `biomassDiff`, `biomassDiffKg`, `feedConsumedDiffKg`)
  - `insights`: Performance ranking is withheld when observation coverage, sampling dates, age, or lifecycle differ. Deltas remain descriptive.
  - `finance`: `{ financeAllowed, primaryFeedCost, secondaryFeedCost, feedCostDiff }` (withheld if `!viewFinance`)
- **Deterministic Historical Cycle Resolution:**
  - Explicit cycle document lookup verifies company membership and pond association.
  - Restricted callers receive the same generic denial for missing and inaccessible pond/cycle IDs. Missing historical baselines withhold the comparison.
- **DOC Cutoff Invariant:**
  - When `asOfDoc` is provided, samplings, daily mortalities, and harvest records occurring after the cutoff DOC are filtered out.
  - Historical harvests on or before the cutoff are aggregated into `totalHarvestedPopulation` and `totalHarvestedBiomass` to maintain post-harvest population integrity.

### 3.3 `evaluate_inventory_replenishment`

- **Implementation:** `functions/shared/orsonInventoryPolicy.js` & `functions/shared/orsonDecisionTools.js`
- **Schema & Name:** `evaluate_inventory_replenishment`
- **Purpose:** Models feed and additive inventory replenishment needs, calculating daily burn rates, remaining stock runway (days), projected shortfall against upcoming dose requirements, and procurement urgency.
- **Required Permission:** `viewFarm`. Unit purchase price and projected replenishment cost require `viewFinance`.
- **Inputs:**
  - `itemId` (string, optional; evaluates single feed/additive or all items)
  - `itemType` (string: `'feed'`, `'additive'`, or `'all'`, default `'all'`)
  - `lookbackDays` (integer 3–60, default 14, server-capped)
  - `plannedDays` (integer 1–90, default 7, server-capped)
  - `leadTimeDays` (0–90, optional; omitted means unknown)
  - `safetyStock` (non-negative quantity in item units; a default zero allowance is disclosed)
  - `incomingQuantity` / `incomingArrivalDays` (explicit user scenario assumptions; omitted supply remains unknown)
  - `requiredQuantity` (number, optional maintenance or dosing requirement)
  - `unit` (string, optional unit for verification)
- **Output Model:**
  - `items`: Array of evaluated inventory items:
    - `itemId`, `itemName`, `itemType`, `unit` (unspecified units remain `null`, never defaulted to `'kg'`)
    - `stockStatus`: `{ status: 'in_stock' | 'low_stock' | 'zero_stock' | 'negative_stock' | 'unknown_stock', availableStock, reorderLevel }`
    - `burnRate`: `{ kgPerDay, isZeroUsage, isUnknown, lookbackDays, window: { startDate, endDate } }`
    - `runway`: `{ daysOfSupply, runwayStatus, reason }`
    - `shortfall`: `{ shortfall, surplus, hasSufficientStock, severity, unitMismatch }`
    - `reorderAssessment`: `{ isReorderNeeded, urgency, plannedHorizonDays, recommendedReorderQuantity }`
    - `finance`: `{ financeAllowed, unitCost, estimatedReplenishmentCost }`
  - `guardrails`: `{ advisoryOnly: true, noProcurementExecuted: true, requiresUserConfirmation: true }`
- **Strict Farm-Calendar Bounding & Unit Invariants:**
  - Burn rate lookback is strictly bounded between `windowStartKey <= dateKey <= todayKey`.
  - Undated, stale (`< windowStartKey`), and future (`> todayKey`) records are excluded.
  - Incompatible usage units withhold demand and runway until conversion evidence exists; items with unknown units never default to `'kg'`.
  - Coverage reports recorded and missing observation days. The recorded-day mean is conditional, and sparse observations cannot produce an adequate/stable runway conclusion. Stock timestamps remain unknown if not saved.
  - Shared company stock remains accessible according to permissions. Assigned-pond usage cannot establish company demand or a company replenishment recommendation.
  - Net purchase quantity is `max(0, horizon demand + safety stock - usable stock - qualifying incoming)`. Supply beyond the horizon is excluded; shortages before arrival are disclosed. Unknown supply yields a provisional gross requirement and no net purchase quantity.
  - Recorded feeding restorations and explicit returns/corrections adjust usage; unidentified negative rows are excluded and counted.
  - Empty history produces `burnRate: null` (`isUnknown: true`), distinctly separated from verified zero usage (`burnRate: 0`).
- **Strict Read-Only Guarantee:**
  - Purely advisory evaluation. Guaranteed zero procurement actions executed (`noProcurementExecuted: true`). No Firestore writes, no purchase orders created, no inventory deducted.

### 3.4 `evaluate_harvest_scenario`

- **Implementation:** `functions/shared/orsonDecisionTools.js` (Pure Functions-Local CommonJS)
- **Schema & Name:** `evaluate_harvest_scenario`
- **Purpose:** Evaluates read-only harvest scenarios comparing harvesting today versus continuing grow-out to target market sizes or dates.
- **Required Permission:** `viewFarm`. Revenue projections, incurred costs, feed unit costs, and operating profit margins strictly require `viewFinance`.
- **Inputs:**
  - `pondId` (string, required)
  - `cycleId` (string, optional, defaults to active cycle)
  - `targetMbwG` (number, optional target MBW)
  - `targetSizeCountPerKg` (number, optional target shrimp size count)
  - `daysToHarvest` (integer 1–120, optional cap on reachable size-tier projections)
  - `exactDaysFromNow` (integer 1–120, optional exact harvest date offset)
  - `pricePerKg` (number, optional flat price in farm currency)
  - `priceLadder` (array of `{ sizeCountPerKg, pricePerKg }`, optional tiered market ladder)
- **Output Model:**
  - `today`: Current DOC, MBW, population, survival rate, projected biomass (kg), and financial revenue/operating profit (if authorized).
  - `targets`: Reachable size targets plus an exact-day scenario when requested, with projected MBW (via von Bertalanffy growth taper), surviving population, projected biomass, incremental feed required, and operating profit.
  - `bestScenario`: The scenario yielding maximum operating profit (or operational recommendation for non-finance callers).
  - `assumptions`: Modeling parameters (`growthModel`, `assumedAdgGPerDay`, `mortalityBasis`, `mortalityDailyRatePercent`, `feedCostUnitPerKg` [stripped for non-finance callers], `maxProjectionDays`).
  - `missingEvidence`: Array of missing parameter names (e.g., `missing_historical_feed_unit_cost`, `missing_market_price`).
  - `finance`: `{ financeAllowed, incurredCostsToDate, feedUnitCostPerKg, marginBasis }`.
- **Full Cycle Pond Cohort Allocation:**
  - Shared cycle-level expenses are divided across the full active pond cohort for that cycle (`allCycleCohortPonds`), preventing 100% of cycle expenses from being mistakenly attributed to a single pond.
- **Zero Cost Fabrication Invariant:**
  - Feed unit cost is derived exclusively from verified consumed feed records (`totalCost / quantity`).
  - It NEVER falls back to catalog price averages or `pond.feedCost`.
  - When feed unit cost is missing or zero, projected operating profit and margins are withheld (`null`) and the recommendation is set to `'review_data'`.
- **Strict Role-Based DTO Sanitization:**
  - Non-finance callers receive complete biological and biomass projections with `revenue`, `operatingProfit`, `futureCosts`, `totalCosts`, `pricePerKg`, and `assumptions.feedCostUnitPerKg` completely stripped from the output.
- **Strict Read-Only Guarantee:**
  - 0 harvest records created, 0 pond statuses modified, 0 Firestore writes. Purely advisory evaluation.

---

## 4. Security, Scope, and Permission Boundaries

### 4.1 Role-Based Access Control (RBAC) Matrix

| Dataset / Decision Tool | `viewFarm` | `viewFinance` | `manageFeedInventory` | `viewAssets` | Behavior When Unauthorized |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`read_app_records` (ponds, cycles, samplings)** | **Required** | Optional | Optional | Optional | Throws `Not permitted` |
| **`read_app_records` (expenses, revenues)** | Optional | **Required** | Optional | Optional | Throws `Not permitted` |
| **`read_app_records` (assets)** | Optional | Optional | Optional | **Required** | Throws `Not permitted` |
| **`read_pond_timeline`** | **Required** | Optional | Optional | Optional | Throws `Not permitted` |
| **`summarize_period_feed_and_cost` (Operational)** | **Required** | Optional | Optional | Optional | Throws `Not permitted` |
| **`summarize_period_feed_and_cost` (Financial)** | **Required** | **Required** | Optional | Optional | Operational metrics returned; `finance` and `farmTotal` omitted |
| **`compare_pond_cycles` (Biological)** | **Required** | Optional | Optional | Optional | Throws `Not permitted` |
| **`compare_pond_cycles` (Cost DTO)** | **Required** | **Required** | Optional | Optional | Biological deltas returned; financial fields omitted |
| **`evaluate_inventory_replenishment` (Stock/Runway)** | **Required** | Optional | Optional | Optional | Throws `Not permitted` |
| **`evaluate_inventory_replenishment` (Valuation/Cost)** | **Required** | **Required** | Optional | Optional | Stock & runway returned; estimated costs withheld |
| **`evaluate_harvest_scenario` (Biomass/Growth)** | **Required** | Optional | Optional | Optional | Throws `Not permitted` |
| **`evaluate_harvest_scenario` (Revenue/Margin)** | **Required** | **Required** | Optional | Optional | Biomass/feed returned; margin withheld (`financialMarginWithheld: true`) |
| **`discover_farm_action_targets`** | Optional | Optional | Optional | Optional | Restricts catalog based on caller permissions |
| **`prepare_farm_actions`** | **Required** | Optional | Optional | Optional | Stages draft operations in `orsonOperations` only |

---

### 4.2 Multi-Tenant and Scope Isolation

1. **Company Ownership Boundary:**
   - Every Firestore query prepends `companies/{companyId}/`.
   - Any query attempting to specify a foreign company ID is rejected with `permission-denied` (`You do not have access to this company.`).
   - Cross-company pond or cycle lookups return `not-found` without confirming the existence of foreign assets.
2. **Enterprise Technician Block Scoping:**
   - For enterprise companies (`company.businessSize === 'enterprise' && user.role === 'technician' && !isOwner`), technicians are restricted exclusively to their assigned blocks (`blocks.where('assignedTechnicianId', '==', uid)`).
   - If a technician queries a pond outside their assigned blocks, the system returns `not_found`.
   - Multi-pond summaries and whole-farm inventory usage evaluations filter records to assigned blocks only.
3. **Cycle Boundary Scoping:**
   - Active pond records maintain `pondCycleId` and `cycleId`.
   - Sampling and feed records are strictly scoped using `belongsToCurrentCycle(record, pond)` to prevent historical cycles from distorting active cycle metrics.

---

### 4.3 Coverage Limits & Bounded Retrieval

| Constraint | Limit | Enforced At | Behavior When Exceeded |
| :--- | :--- | :--- | :--- |
| **Pond Timeline Window** | Min 7 days, Max 90 days (default 30) | `orsonAppData.js#L390` | Throws `Error('Invalid days')` |
| **Period Feed Summary Window** | Min 1 day, Max 366 inclusive days | `orsonDecisionTools.js` | Rejects invalid or oversized windows |
| **Harvest Horizon** | Min 1 day, Max 120 days | `orsonDecisionTools.js#L202` | Clamped / Rejected if out of bounds |
| **Inventory Planning Horizon** | Min 1 day, Max 90 days | `orsonInventoryPolicy.js` | Defaults to 7 days; usage lookback defaults to 14 |
| **Array Page Byte Limit** | 24,000 bytes (24 KB) | `orsonAppData.js#L21` | Splits array; returns `nextOffset` |
| **Array Page Item Count** | Max 30 items per request | `orsonAppData.js#L22` | Returns first 30 items; supplies `nextOffset` |
| **List Page Size** | Max 10 docs (queries 11 for hasMore) | `orsonAppData.js#L449` | Returns 10 items; supplies `nextCursor` |
| **External API Page Limit** | Default 20, Max 100 | `readOnlyFarmApi.js#L26` | Rejects with `invalid-argument` if $> 100$ |
| **External API Date Window** | Max 90 days | `readOnlyFarmApi.js#L27` | Rejects with `invalid-argument` |
| **Assigned Blocks Limit** | Max 300 blocks | `readOnlyFarmApi.js#L28` | Throws `resource-exhausted` |
| **Operation Command Batch** | Min 1, Max 30 rows | `orsonOperations.js#L16` | Rejects with `fail("Provide between 1 and 30 entries.")` |
| **Operation Draft Expiration**| 2 hours | `orsonOperations.js#L201` | Operation transitions to expired; rejected on confirm |

---

All four production tools route through the app-data reader and return common runtime-validated metadata: `version`, `kind`, `resultStatus`, `writesPerformed`, observation/retrieval coverage, `asOf`, formula version, and source digest. Legacy payload statuses are retained; callers should use `resultStatus` for common completeness.

Decision source reads share request limits of 12,000 returned documents, 160 reads, four concurrent reads, and 16 MiB of read data. Each evaluation has a 20-second deadline and 64 KiB output cap. Assigned-scope discovery has its existing separate bounded block/pond limits. Source pages are re-read before delivery; changed evidence withholds all amounts and recommendations. This is a bounded consistency check, not a transactional Firestore snapshot. A fresh evaluation never reuses a prior evaluation's data cache.

### 4.4 Read-Only Safety & Mutation Insulation

1. **Zero Database Writes in Decision Tools:**
   - None of `summarize_period_feed_and_cost`, `compare_pond_cycles`, `evaluate_inventory_replenishment`, or `evaluate_harvest_scenario` contain any `set`, `update`, `delete`, or transaction write calls.
   - Guaranteed read-only execution.
2. **Draft-Only Staging in Agent Tools:**
   - When Orson stages actions via `prepare_farm_actions`, it writes exclusively to the temporary staging collection `companies/{companyId}/orsonOperations/{operationId}` with `state: "draft"`.
   - Production collections (`ponds`, `feeds`, `harvestRecords`, `cycles`) remain untouched until explicit authenticated user confirmation.
3. **No Autonomous Harvests or Procurements:**
   - Orson cannot execute a harvest or deduct feed inventory from an advisory scenario evaluation.
   - Separate execution pathways guarantee decoupling between decision tools and write operations.

---

## 5. Orson Grounding & Model Instruction Enforcement

Orson's server-side system instructions (`functions/orson.js#L383-L500`) enforce strict grounding constraints:

### 5.1 No Calling Missing Data Adequate Stock
- **Rule:** `"Never call missing, unrecorded, or partial inventory data adequate stock. If current stock, burn rate, or supply runway is missing or unrecorded, explicitly state that stock levels are unknown and require farm verification; never claim stock is sufficient, adequate, or safe without verified positive balance and burn rate evidence."`
- **Enforcement:**
  - Evaluator sets `status: 'unknown_stock'`, `runwayDays: null`, and `isStockSufficient: false`.
  - Orson prompt instructions strictly prohibit treating `null` as 0 or assuming warehouse stock is adequate when unrecorded.

### 5.2 No Presenting Scenarios as Guaranteed Outcomes
- **Rule:** `"Never present decision scenarios, growth projections, harvest schedules, feed replenishment forecasts, or financial returns as guaranteed outcomes. All scenario evaluations, harvest projections, and replenishment models are advisory, hypothesis-based estimates subject to environmental variability, disease risks, feeding behavior, and market price fluctuations. Always state governing assumptions, missing evidence, scope, and the advisory nature of any scenario projection."`
- **Enforcement:**
  - Harvest scenarios output explicit `assumptions`, `missingEvidence`, and `isAdvisory: true`.
  - Financial projections clearly state margin basis and disclaim market price fluctuations.
  - Model instructions forbid deterministic promises.

---

## 6. Resolution of Previously Identified Gaps

| Identified Gap | Resolution Status | Implementing Source |
| :--- | :---: | :--- |
| **1. Analytical Feed/Cost Rollups** | **LOCAL CHECKS PASSED; EMULATOR PENDING** | The callable targets the 30-day per-pond result contract and passes the Orson-focused suite. Emulator-backed verification remains pending because the configured Java executable fails with an incompatible-architecture error on this host. |
| **2. Historical Cycle Comparison** | **RESOLVED** | Implemented `compare_pond_cycles` in `functions/shared/orsonDecisionTools.js` enabling side-by-side active pond comparisons and completed cycle benchmarking reusing canonical `shared/pondCalculations.ts`. |
| **3. Inventory Replenishment Runway** | **RESOLVED** | Implemented `evaluate_inventory_replenishment` in `functions/shared/orsonInventoryPolicy.js` and `orsonDecisionTools.js` with burn rate modeling, runway estimation, and zero procurement writes. |
| **4. Read-Only Harvest Scenarios** | **RESOLVED** | Implemented `evaluate_harvest_scenario` in `functions/shared/orsonDecisionTools.js` and `evaluateHarvestDecisionForPond` in `shared/harvestProfitability.ts` with growth tapering, market ladders, and advisory disclaimers. |
| **5. Entity Discovery Price Exposure** | **Documented Gap** | Documented in `functions/orsonAgentTools.test.cjs`. `discover_farm_action_targets` is restricted to agent drafting workflows; conversational tools use sanitized `read_app_records` and `orsonDecisionTools.js`. |

---

## 7. Deterministic Fixtures & Test Verification Matrix

All capabilities, security boundaries, and grounding invariants are validated by comprehensive deterministic test suites:

| Test Suite | File Path | Focus & Assertions |
| :--- | :--- | :--- |
| **App Data Access & Privacy** | `functions/shared/orsonAppData.test.js` | RBAC validation, `viewFinance` field stripping, cycle scoping, null preservation, array pagination. |
| **Farm Integration API** | `functions/shared/readOnlyFarmApi.test.js` | Cross-company isolation, enterprise technician 404 scoping, DTO finance omission, MBW fallback without synthetic data. |
| **Agent Action Staging** | `functions/orsonAgentTools.test.cjs` | Draft-only staging, enterprise block scoping, catalog price exposure gap documented, no autonomous writers. |
| **Decision Tools Suite** | `functions/shared/orsonDecisionTools.test.js` | Feed/cost rollups, cycle benchmarking, inventory replenishment, harvest scenarios, finance isolation, cross-company rejection. |
| **Inventory Replenishment Policy**| `functions/shared/orsonInventoryPolicy.test.js` | Burn rate calculation, zero stock shortfall, unknown stock handling, unit mismatches, finance isolation, zero mutations. |
| **Harvest Engine & Scenarios** | `shared/harvestProfitability.test.ts` | Biomass projection, growth tapering, market price ladders, margin calculations, missing evidence handling. |
| **Orson Grounding & Instructions**| `functions/orsonConversation.test.js` | Instruction assertions: never calling missing data adequate stock, never presenting scenarios as guarantees, tool routing. |

---

## 8. Verification & Step Completion Confirmation

- [x] Baseline capability matrix established separating implemented coverage from architectural gaps.
- [x] All existing authorized read paths traced with exact source file and function citations.
- [x] Finance permission, enterprise technician block scope, company/cycle boundaries, and coverage limits documented.
- [x] Deterministic test fixtures implemented across all authorized read paths and tools.
- [x] Cross-company isolation and denied finance verified through automated test suites.
- [x] Zero synthetic business results presented as live farm data (null preservation verified).
- [x] Period feed/cost aggregation and cycle comparison implemented and verified (Step 04).
- [x] Inventory replenishment evaluation implemented with zero procurement writes (Step 05).
- [x] Read-only harvest scenario engine implemented with explicit assumptions and margin basis (Step 06).
- [x] Orson grounded against calling missing data adequate stock or presenting scenarios as guaranteed outcomes (Step 07).
- [x] Final matrix completely synchronized with implemented behavior, schemas, and permissions.
