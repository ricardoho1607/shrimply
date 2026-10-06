# Orson Decision Tools & Authorized Read Paths Capability Matrix

> **Document Version:** 1.0.0 — Baseline Trace  
> **Status:** Step 01 Baseline Completed (No production code modified)  
> **Date:** October 2026  
> **Scope:** Cloud Functions (`functions/`), Shared Services (`functions/shared/`), and Integration APIs

---

## 1. Executive Summary & Purpose

This capability matrix establishes the baseline architecture, traces existing authorized read routes, and catalogs capability boundaries across Shrimply's Orson AI assistant and farm data integration surfaces.

Before introducing new decision tools or modifying production routes, this document maps:
1. **Existing Implemented Read Paths:** How authorized users, Orson tool callers, and external integrations retrieve live aquaculture data.
2. **Security & Permission Boundaries:** Exact enforcement of role-based access control (RBAC), `viewFinance` isolation, enterprise technician block-scoping, and company ownership boundaries.
3. **Coverage Limits:** Hard memory, payload byte limits, date window caps, pagination sizes, and recursion guards.
4. **Read-Only Invariants:** Safeguards ensuring read tools and decision exploration cannot trigger unauthorized or unconfirmed state changes.
5. **Architectural Gaps:** Explicit gaps between current tools and full autonomous decision support.

---

## 2. Trace of Existing Authorized Read Paths

Live farm data flows through three distinct read subsystems:
1. **Orson Conversational Pipeline (`functions/orson.js` & `functions/shared/orsonAppData.js`)**: Interactive tool-calling pipeline executed during LLM generation.
2. **External Integration API (`functions/readOnlyApi.js` & `functions/shared/readOnlyFarmApi.js`)**: Structured REST/HTTP integration endpoints for external services and site MCP servers.
3. **Orson Agent Action Staging & Entity Discovery (`functions/orsonAgentTools.js` & `functions/shared/orsonEntityResolver.js`)**: Pre-draft discovery and staging inspection.

### Flow Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                          CALLER ENTRYPOINTS                                       |
+------------------------------------+--------------------------------+-----------------------------+
                                     |                                |
                                     v                                v
                        [generateOrsonResponse]                 [readOnlyApi]
                        (Callable Cloud Function)               (HTTPS API / MCP)
                                     |                                |
                        +------------+------------+                   |
                        |                         |                   |
                        v                         v                   v
             [createOrsonAppDataReader]   [createAgentTools]  [ReadOnlyFarmApi]
                        |                         |                   |
        +---------------+---------------+         |                   |
        |                               |         |                   |
        v                               v         v                   v
 (read_app_records)           (read_pond_timeline) (discover_targets) (listPonds / getPondSummary /
        |                               |         |                   getWaterQuality / getFeed)
        |                               |         |                   |
        v                               v         v                   v
+---------------------------------------------------------------------------------------------------+
|                                  AUTHORIZATION & SCOPE GUARDS                                     |
|  - Membership & Ownership Verification (users/{uid}, companies/{companyId})                       |
|  - Permission Check: viewFarm, viewFinance, viewAssets, manageFeedInventory                       |
|  - Enterprise Technician Block Scoping (companies/{companyId}/blocks where technician == uid)    |
|  - Private field & Finance field sanitization (cleanRecord)                                       |
|  - Bounded Windows (7-90 days, 24 KB per document array page, 10 docs per page)                   |
+---------------------------------------------------------------------------------------------------+
                                                |
                                                v
+---------------------------------------------------------------------------------------------------+
|                                     CLOUD FIRESTORE (READ-ONLY)                                   |
|  companies/{companyId}/ponds, blocks, cycles, feeds, additives, harvestRecords, expenses, assets  |
+---------------------------------------------------------------------------------------------------+
```

---

### Path A: Orson In-Session Tool Execution (`functions/orson.js`)

- **Primary Entrypoint:** `exports.generateOrsonResponse` (`functions/orson.js#L628`)
- **Execution Hook:** `executeOrsonTool(name, args)` (`functions/orson.js#L751-L762`)
- **Tool Initialization:**
  - `createOrsonAppDataReader({ db, company, user: userSnap.data(), uid, companyId })` (`functions/orson.js#L741`)
  - If `request.data?.agentVersion === 1`, creates `createAgentTools(...)` (`functions/orson.js#L742-L749`)
- **Execution Router:**
  ```javascript
  const executeOrsonTool = async (name, args) => {
    if (agent?.tools.some(tool => tool.name === name)) return agent.execute(name, args);
    const lookupId = orsonRequestId();
    const step = name === 'read_pond_timeline' ? 'sampling_lookup'
      : args?.dataset === 'ponds' ? 'pond_lookup'
      : ['feeds', 'additives'].includes(args?.dataset) ? 'inventory_check'
      : 'record_lookup';
    activeLookups.set(lookupId, step);
    await sendActivity(step);
    try { return await appData.execute(name, args); }
    finally {
      activeLookups.delete(lookupId);
      await sendActivity([...activeLookups.values()].at(-1) || 'answer');
    }
  };
  ```

---

### Path B: Orson App Data Reader (`functions/shared/orsonAppData.js`)

Provides structured, permission-gated read access directly to Firestore subcollections for the active company.

#### 1. `read_app_records` (`functions/shared/orsonAppData.js#L31-L43, L392-L439`)
- **Datasets & Required Permissions:**
  - `ponds`, `physicalPonds`, `blocks`, `cycles`, `feeds`, `additives`, `harvestRecords`, `labReports` $\to$ `viewFarm`
  - `expenses`, `revenues` $\to$ `viewFinance`
  - `assets` $\to$ `viewAssets`
- **Validation:**
  - Checks permission via `hasUserPermission({ company, user, uid, permission: DATASETS[dataset] })`.
  - Disallows unlisted datasets, path traversal, and malformed cursors (`validId`).
- **Data Filtering & Privacy (`cleanRecord`):**
  - **Private Fields Stripped:** `password|secret|token|credential|api.?key|email|phone|address|latitude|longitude|download.?url|file.?url|attachment|ownerId|createdBy|updatedBy|userId|bank|accountNumber`
  - **Finance Fields Stripped (if caller lacks `viewFinance`):** `cost|price|profit|revenue|expense|payment|salary|wage|financial|billing|invoice|purchase|depreciation`
- **Pagination & Coverage Limits:**
  - **List Mode:** `limit(11)` $\to$ returns up to 10 records; `complete: snap.docs.length <= 10`; omits nested objects in list preview; truncates strings $> 600$ characters.
  - **Single Document Mode:** If document $> 24\text{ KB}$ (`MAX_ARRAY_PAGE_BYTES`), responds with status `select_field`.
  - **Array Field Pagination:** Paginates arrays with `MAX_ARRAY_PAGE_ITEMS = 30` and `MAX_ARRAY_PAGE_BYTES = 24000`. Returns `nextOffset`.
- **Technician Scope:**
  - In enterprise setups (`company.businessSize === 'enterprise' && user.role === 'technician' && !isOwner`), loads assigned blocks (`companies/{companyId}/blocks.where('assignedTechnicianId', '==', uid)`).
  - Restricts `ponds`, `physicalPonds`, `blocks`, `cycles`, `feeds`, `additives`, and `harvestRecords` to ponds inside assigned blocks.

#### 2. `read_pond_timeline` (`functions/shared/orsonAppData.js#L44-L54, L108-L353, L382-L391`)
- **Required Permission:** `viewFarm`
- **Arguments:** `pondId` (string, max 160 chars), `days` (integer 7–90, defaults to 30), `endDate` (YYYY-MM-DD farm date)
- **Aggregation Logic:**
  - Loads single pond document `companies/{companyId}/ponds/{pondId}`.
  - Validates technician block access.
  - Aligns daily entries from `samplings` (water quality), `selectDailyFeedEntries` (authoritative feed vs estimates), and `mortalityRecords`.
  - Current cycle scoping: `belongsToCurrentCycle(record, pond)` validates `pondCycleId` and `cycleId`.
  - Output contains daily timeline array and line series (`mortalityCount`, `doMinimumMgL`, `phSwing`, `feedKg`, `mbwG`, `nitriteMgL`, `waterDepthCmMorning`, `waterDepthCmEvening`, `waterExchangePercent`).
  - **Strict Null Handling:** Missing dates are recorded as missing/unknown, never fabricated as zero.

---

### Path C: Read-Only Farm Integration API (`functions/shared/readOnlyFarmApi.js`)

Dedicated API layer for external read-only consumers and Site MCP tools.

#### 1. Authorization: `authorizeFarmReader` (`functions/shared/readOnlyFarmApi.js#L617-L720`)
- Validates active user in `users/{uid}`.
- Checks `founderAccessSuspended !== true`.
- Verifies membership in `companies/{companyId}.teamMembers` or `company.ownerId === uid`.
- Stale owner role defense: if `user.role === 'owner'` but `company.ownerId !== uid`, access is revoked.
- Requires `viewFarm` permission.
- Enterprise technician block resolution: loads up to 300 assigned blocks (`MAX_ASSIGNED_BLOCKS`); aborts with `resource-exhausted` if exceeded.

#### 2. Endpoints & Methods:
1. **`listPonds` (`functions/shared/readOnlyFarmApi.js#L761-L856`)**:
   - Paginates ponds ordered by `__name__`.
   - Default limit 20, max limit 100 (`MAX_PAGE_LIMIT`).
   - Supports optional `blockId` filtering.
   - For enterprise technicians, uses chunked queries (`FIRESTORE_IN_FILTER_LIMIT = 30`) across assigned block IDs.
   - Encodes opaque HMAC-signed cursor with revision, user ID, company ID, and route.
   - Transforms each document into sanitized `toPondDto`.
2. **`getPondSummary` (`functions/shared/readOnlyFarmApi.js#L858-L880`)**:
   - Fetches single pond; verifies block access.
   - Runs biological look-back for Mean Body Weight (MBW):
     - Scans backward through valid sorted samplings for positive non-zero MBW.
     - Fallback to `pond.initialWeight`.
     - Ultimate fallback to `0.5g` default.
   - Selects latest water quality observation.
   - Canonical feed determination via `selectDailyFeedEntries`.
   - Returns `toPondSummaryDto`.
3. **`getWaterQualityRecords` (`functions/shared/readOnlyFarmApi.js#L882-L1000`)**:
   - Reads `samplings` array from target pond.
   - Validates date window: `startDate` to `endDate` cannot exceed 90 days (`MAX_DATE_WINDOW_DAYS`).
   - Filters entries containing water quality observations within the window.
   - Cursoring binds SHA-256 digest of samplings array (`computeSamplingsDigest`) to detect array modifications between pages.
   - Maps to `toWaterQualityRecordDto`.
4. **`getFeedSummary` / `getFeedRecords` (`functions/shared/readOnlyFarmApi.js#L1002-L1126`)**:
   - Evaluates daily feed entries via `selectDailyFeedEntries` (ignoring biological sampling feed estimates for inventory/operational totals).
   - Computes total feed kg and explicit zero-feed days.
   - Maps to canonical feed record DTOs.

---

### Path D: Action Staging & Entity Discovery (`functions/orsonAgentTools.js`)

Read tools integrated into Orson's action toolset.

1. **`discover_farm_action_targets` (`functions/orsonAgentTools.js#L454-L464, L501-L504`)**:
   - Invokes `createAgentCatalog(auth)` (`functions/shared/orsonEntityResolver.js#L9-L184`).
   - Reads authorized ponds (filtered by enterprise technician block), feed catalog, additive catalog, and physical ponds.
   - Collects active purchases (ID, date, quantity, price, unit) for feed/additives.
   - Reads company currency for monetary validation.
2. **`read_recent_farm_action_drafts` (`functions/orsonAgentTools.js#L444-L453, L483-L500`)**:
   - Reads up to 10 recent operation drafts from `companies/{companyId}/orsonOperations` owned by the user.
   - Validates user ownership (`checkOwner`) and access permissions.
3. **`prepare_farm_actions` (`functions/orsonAgentTools.js#L466-L480, L505-L596`)**:
   - Stages a multi-row operation draft.
   - **Crucial Read-Only Invariant:** Does NOT commit any mutation to production farm records (`ponds`, `feeds`, `finances`). Returns `status: "awaiting_user_confirmation"` and requires the client to call `confirmOrsonOperation`.

---

## 3. Capability Matrix: Implemented Coverage vs Gaps

| Domain / Capability | Implemented Status | Source Paths & Functions | Scope & Enforcement Details | Identified Gaps |
| :--- | :---: | :--- | :--- | :--- |
| **Water Quality: Morning / Evening Observations** | **Implemented** | `functions/shared/readOnlyFarmApi.js#toWaterQualityRecordDto`<br>`functions/shared/orsonAppData.js#buildPondTimeline` | Supports morning/evening DO, pH, temp, transparency, depth, nitrite mg/L NO2, salinity, alkalinity, ammonia. | Nitrite basis conversion is strictly validation-only; no automatic ppm conversion tool. |
| **Water Quality: Depth & Session Parsing** | **Implemented** | `functions/orsonAgentTools.js#parseCommandDepth`<br>`functions/orsonAgentTools.js#preflightWaterDepth` | Normalizes meters/centimeters to cm. Rejects ambiguous sessions or conflicting readings. | Multi-pond natural language depth batching requires strict single-pond clause segmentation. |
| **Feeding: Canonical Daily Feed vs Sampling Estimate** | **Implemented** | `functions/shared/orsonDomain/orsonEvidence.js#selectDailyFeedEntries`<br>`functions/shared/readOnlyFarmApi.js#extractRealDailyFeed` | Strictly distinguishes authoritative daily feed totals from biological sampling feed observations. Never zero-fills missing feed days. | External read API does not expose tray clearance percentage series over time. |
| **Feeding: Trend Lookback (3–5 Days)** | **Implemented** | `functions/shared/orsonAppData.js#buildPondTimeline`<br>`functions/shared/readOnlyFarmApi.js#getFeedSummary` | Daily feed totals extracted chronologically with exact date keys and lookback windows. | No standalone analytical tool computing feed allocation trend percentages directly for Orson prompt context. |
| **Sampling: MBW Biological Look-Back** | **Implemented** | `functions/shared/readOnlyFarmApi.js#toPondSummaryDto`<br>`functions/shared/orsonAppData.js#buildPondTimeline` | Scans backward for last non-zero MBW; falls back to `initialWeight`, then `0.5g`. | Historical sampling array editing requires discovering exact existing record ID. |
| **Growth: ADG & Projections** | **Partial** | `shared/orson/metrics.ts`<br>`functions/orson.js#loadOrsonProductContext` | ADG formulas implemented in client pipeline and projection services. | No backend decision tool endpoint returning computed ADG or FCR dynamically for arbitrary date ranges. |
| **Mortality & Biomass Tracking** | **Implemented** | `functions/shared/orsonAppData.js#buildPondTimeline`<br>`functions/shared/readOnlyFarmApi.js#toPondSummaryDto` | Tracks dedicated `mortalityRecords` and legacy mortality. Preserves `none_observed` vs positive counts. | No dedicated `getMortalityRecords` paginated route in `readOnlyFarmApi.js` (only merged inside `read_pond_timeline`). |
| **Inventory: Warehouse Catalog & Purchases** | **Implemented** | `functions/shared/orsonEntityResolver.js#createAgentCatalog`<br>`functions/shared/orsonAppData.js#read_app_records` | Reads feed/additive items, active purchases, units, and reorder levels. Gated by `manageFeedInventory` / `viewFarm`. | Catalog returns purchase `price` even if user lacks `viewFinance` (see Section 4). |
| **Inventory: Atomic Deduction vs Sampling Isolation** | **Implemented** | `functions/shared/orsonOperations.js#planCommands`<br>`functions/orsonAgentTools.js#commandSchema` | Feeding deductions link `inventoryFeedId`. Sampling entries explicitly bypass inventory deduction. | Additive dosage validation requires active internet verification or grounded product labels. |
| **Finance: Expenses & Revenues** | **Implemented** | `functions/shared/orsonAppData.js#read_app_records` (`expenses`, `revenues`) | Gated strictly by `viewFinance`. Strips financial fields from non-finance roles. | No aggregated P&L, cash flow, or COGS decision summary tool; only raw ledger document pagination. |
| **Pond & Cycle Management** | **Implemented** | `functions/shared/readOnlyFarmApi.js#listPonds`<br>`functions/shared/orsonAppData.js#scopedData` | Scoped to active cycle (`belongsToCurrentCycle`). Enterprise technician block filtering enforced. | Querying historical completed cycles requires explicitly passing ended `cycleId`, which is not exposed in `readOnlyFarmApi.js`. |
| **Action Staging & Confirmation Lifecycle** | **Implemented** | `functions/shared/orsonOperations.js#createOperationService`<br>`functions/orsonAgent.js#confirmOrsonOperation` | Operations are staged as draft with expiration, idempotency token, and review receipt. Confirmation is separate. | Batch operations capped at 30 rows; large farm imports require chunked drafts. |
| **Multimodal Document Extraction** | **Implemented** | `functions/orsonAgent.js#extractFarmDocument`<br>`functions/shared/orsonDocumentExtraction.js` | Gemini multimodal extraction of clipboards, whiteboards, invoices, and CSVs into draft commands. | Document extraction results require user review before execution; no direct autonomous write. |

---

## 4. Deep-Dive: Authorization, Scope, and Isolation Rules

### 4.1 Finance Permission & Data Sanitization

1. **Permission Check:**
   - Evaluated using `hasUserPermission` from `functions/shared/permissions.js`.
   - Default roles granting `viewFinance`: `owner`, `co-owner`, `manager`, `admin`.
   - Roles denied `viewFinance`: `technician`, `mechanic`, `buyer`.
2. **Sanitization Regex (`functions/shared/orsonAppData.js#L12, L22-L30`):**
   ```javascript
   const financeField = /cost|price|profit|revenue|expense|payment|salary|wage|financial|billing|invoice|purchase|depreciation/i;
   ```
   When `canViewFinance` is false, all matching object keys are stripped recursively from any record returned to Orson via `read_app_records` or `read_pond_timeline`.
3. **Cross-Component Discrepancy (Identified Gap):**
   - In `functions/shared/orsonEntityResolver.js#createAgentCatalog`, inventory collections (`feeds`, `additives`) are read if the caller has `manageFeedInventory`.
   - `createAgentCatalog` includes `price` in `activePurchases` objects:
     ```javascript
     price: Number.isFinite(price) ? price : null
     ```
   - Technicians hold `manageFeedInventory` by default but lack `viewFinance`. When `discover_farm_action_targets` executes, the agent receives unit purchase prices.
   - **Recommendation:** `createAgentCatalog` must check `auth.allowed("viewFinance")` before exposing purchase prices in `activePurchases`.

---

### 4.2 Company, Pond, and Cycle Scoping

1. **Company Scope:**
   - Every read is anchored to `companies/{companyId}`.
   - Caller identity verified via Firebase Auth `uid`.
   - Verified that `user.companyId === companyId` and `company.teamMembers.includes(uid)` or `company.ownerId === uid`.
   - Cross-company data reads are blocked and throw `permission-denied`.
2. **Pond & Enterprise Block Scope:**
   - For enterprise tier companies (`businessSize === 'enterprise'`), technicians are strictly confined to ponds in their assigned blocks.
   - Loaded from `companies/{companyId}/blocks` where `assignedTechnicianId == uid`.
   - In `readOnlyFarmApi.js#assertPondAccess`:
     ```javascript
     if (auth.isEnterpriseScoped) {
       const blockId = pond.blockId || pond.data?.()?.blockId;
       if (!blockId || !auth.assignedBlockIds.has(blockId)) {
         throw new HttpsError('not-found', 'Pond not found.');
       }
     }
     ```
   - If a technician attempts to query a pond outside their block, the system returns `not-found` (avoiding existence disclosure).
3. **Cycle Scope:**
   - Active pond records store `pondCycleId` or `cycleId`.
   - `read_pond_timeline` uses `belongsToCurrentCycle(record, pond)`:
     ```javascript
     const belongsToCurrentCycle = (record, pond) => {
       const current = [pond.pondCycleId, pond.cycleId].filter(value => typeof value === 'string' && value);
       if (!current.length) return true;
       const recorded = [record?.pondCycleId, record?.cycleId].filter(value => typeof value === 'string' && value);
       return !recorded.length || recorded.some(value => current.includes(value));
     };
     ```
   - This ensures previous production cycles for the same physical pond do not contaminate timeline series or biological averages.

---

### 4.3 Coverage Limits & Bounded Retrieval

| Constraint | Limit | Enforced At | Behavior When Exceeded |
| :--- | :--- | :--- | :--- |
| **Pond Timeline Window** | Min 7 days, Max 90 days (default 30) | `orsonAppData.js#L384` | Throws `Error('Invalid days')` |
| **Array Page Byte Limit** | 24,000 bytes (24 KB) | `orsonAppData.js#L15, L414` | Splits array; returns `nextOffset` |
| **Array Page Item Count** | Max 30 items per request | `orsonAppData.js#L16, L412` | Returns first 30 items; supplies `nextOffset` |
| **List Page Size** | Max 10 docs (queries 11 for hasMore) | `orsonAppData.js#L430-L431` | Returns 10 items; supplies `nextCursor` |
| **External API Page Limit** | Default 20, Max 100 | `readOnlyFarmApi.js#L26, L734` | Rejects with `invalid-argument` if $> 100$ |
| **External API Date Window** | Max 90 days | `readOnlyFarmApi.js#L27, L755` | Rejects with `invalid-argument` |
| **Assigned Blocks Limit** | Max 300 blocks | `readOnlyFarmApi.js#L28, L700` | Throws `resource-exhausted` |
| **Operation Command Batch** | Min 1, Max 30 rows | `orsonOperations.js#L16, L102` | Rejects with `fail("Provide between 1 and 30 entries.")` |
| **Operation JSON Payload** | Max 100,000 bytes | `orsonOperations.js#L100` | Rejects with `fail("Provide between 1 and 30 entries.")` |
| **Draft Expiration** | 2 hours | `orsonOperations.js#L201` | Operation transitions to expired; rejected on confirm |

---

### 4.4 Read-Only Safety & Mutation Insulation

1. **Strict Separation of Read and Write:**
   - Neither `read_app_records`, `read_pond_timeline`, nor any `ReadOnlyFarmApi` function contains any `set`, `update`, `delete`, or transaction write call.
2. **Draft-Only Staging in Agent Tools:**
   - When Orson calls `prepare_farm_actions`, it writes exclusively to the temporary staging collection `companies/{companyId}/orsonOperations/{operationId}` with `state: "draft"`.
   - Production collections (`ponds`, `feeds`, `finances`, `cycles`) remain entirely untouched.
   - Confirmation requires an explicit authenticated call to `exports.confirmOrsonOperation` by the end-user via interactive UI cards.
3. **Non-Executable Prompts & Disclaimers:**
   - Any embedded hypothetical, advice, or instruction text in user messages is evaluated by `isAdviceInstructionOrHypothetical` (`functions/shared/orsonDocumentExtraction.js`).
   - If detected, `prepare_farm_actions` aborts with `status: "unauthorized"`.

---

## 5. Identified Architectural Gaps for Decision Tools

1. **Analytical Roll-Up Decision Tools:**
   - Currently, Orson must use `read_pond_timeline` or paginate raw `read_app_records` to analyze farm performance.
   - There is no unified tool that produces summarized cross-pond health, feeding anomaly detection (e.g. 3-day drop $> 20\%$), or dissolved oxygen risk scores in a single lightweight roundtrip.
2. **Financial Aggregations for Managers/Owners:**
   - Only raw `expenses` and `revenues` documents are accessible via `read_app_records`.
   - No read tool currently exists to inspect aggregated cost per kg of harvest or active feed inventory valuation without fetching and paging every raw purchase/usage record.
3. **Historical Cycle Comparison:**
   - `read_pond_timeline` is scoped to the current cycle. Comparing current DOC performance against the previous successful cycle on the same pond requires manually finding historical cycle IDs.
4. **Price Exposure in Entity Discovery:**
   - `discover_farm_action_targets` exposes purchase prices to technician roles through `activePurchases`, bypassing the `viewFinance` restriction enforced in `orsonAppData.js`.

---

---

## 6. Deterministic Baseline Fixtures & Test Verification (Step 03)

Deterministic test fixtures have been implemented across the three primary read paths and agent tools to establish baseline behavior, assert access boundaries, ensure no synthetic data is fabricated, and empirically verify architectural gaps:

### 6.1 `functions/shared/orsonAppData.test.js`
- **Finance Isolation:** Asserts that technician roles are rejected from `expenses` and `revenues` datasets (`Not permitted`). Financial fields (`feedCost`, `seedCost`, sampling `cost`) are stripped via regex sanitization, while owners retain access.
- **Cycle Scoping:** Verifies `belongsToCurrentCycle` excludes sampling records from prior cycles (`cycle-q2`) when analyzing the active cycle (`cycle-q3`).
- **Null Preservation (No Synthetic Values):**
  - Unmeasured morning DO is preserved as `null`, never coerced to `0`.
  - Unrecorded feed and mortality days are preserved as `null`, never fabricated as 0 kg or 0 mortality.
  - Explicit zeroes (`isExplicitZero: true` for feed, `none_observed` for mortality) are preserved as `0`.
- **Exposed Read-Path Gap:** In list mode, `read_app_records` omits nested array details (`documentDetailsOmitted: true`, `samplings` stripped), requiring callers to perform secondary single-document or timeline queries.

### 6.2 `functions/shared/readOnlyFarmApi.test.js`
- **Cross-Company Isolation:** Queries for ponds from foreign companies return `not-found` (derived company lookup). Explicitly spoofing another company ID throws `permission-denied` (`You do not have access to this company.`).
- **Enterprise Block Scoping:** Enterprise technicians receive `not-found` (404) for ponds in unassigned blocks, preventing existence disclosure.
- **Strict Finance Omission in DTOs:** `toPondSummaryDto`, `toWaterQualityRecordDto`, and `toFeedRecordDto` strictly strip `feedCost`, `seedCost`, `revenue`, `secretBillingToken`, `cost`, `price`, `inventoryFeedId`, and `costPerKg`.
- **Null Preservation:** Unmeasured pH and DO remain `null`. Days without feed entries are not synthesized into 0 kg entries by canonical daily feed selection.
- **MBW Look-Back Fallback:** Missing MBW in latest sampling scans backward to valid non-zero MBW (`mbwSource: 'sampling'`); ponds without sampling or initial weight fall back to `0.5g` with `mbwSource: 'default_fallback'` without creating synthetic records.
- **Exposed Read-Path Gaps:** Read-only API lacks mortality records or cumulative mortality metrics; queries exceeding 90-day windows are rejected with `invalid-argument`.

### 6.3 `functions/orsonAgentTools.test.cjs`
- **Discovery Authorization & Block Scoping:** `discover_farm_action_targets` respects enterprise block scoping (`blockIds.has(p.blockId)`) and filters out unauthorized blocks. Users lacking `manageFeedInventory` receive empty inventory lists; users lacking `viewFarm` receive empty pond lists.
- **Exposed Read-Path Gap (Price Exposure):** `createAgentCatalog` exposes unit purchase `price` in `activePurchases` and `recentPurchases` to callers holding `manageFeedInventory` even if they do not possess `viewFinance`.
- **No Synthetic Values:** Malformed inventory purchases (negative quantity, 0 price, invalid date) flag `hasMalformedPurchases: true` and `hasAmbiguousHistory: true` without synthesizing fallback quantities or valid dates.

---

## 7. Verification & Step Completion Confirmation

- [x] Baseline capability matrix established separating implemented coverage from architectural gaps.
- [x] All existing authorized read paths traced with exact source file and function citations.
- [x] Finance permission, enterprise technician block scope, company/cycle boundaries, and coverage limits documented.
- [x] Deterministic test fixtures implemented across all authorized read paths and tools.
- [x] Cross-company isolation and denied finance verified through automated test suites.
- [x] Zero synthetic business results presented as live farm data (null preservation verified).
- [x] Read-path gaps empirically proven and documented.

