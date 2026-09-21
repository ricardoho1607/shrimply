# Orson Farm Agent: Approved Implementation Plan

> **Status:** Product decisions captured; ready for engineering implementation
> **Supersedes for implementation:** `docs/orson-farm-agent-plan.md`
> **Platforms:** Shrimply Mobile (React Native / Expo) and Web (Next.js App Router)
> **Backend:** Firebase Cloud Functions (Node.js), Cloud Firestore, temporary Firebase Storage uploads
> **Models:** `muse-spark-1.3-contributor` for conversation and tool orchestration; `gemini-2.5-flash` for document/image extraction
> **Agent level:** User-directed multi-step farm operator. Orson does not perform unsolicited writes.

---

## 1. Approved Product Direction

Orson will become an action-capable farm agent that can inspect authorized Shrimply records, understand an explicit user request, perform one or more permitted operations, and return a verified receipt.

Orson may:

- Read authorized farm records and explain them.
- Execute actions explicitly requested by the signed-in user.
- Resolve ponds, cycles, inventory items, dates, and units before writing.
- Execute several related actions from one request.
- Show one combined confirmation card when any action requires confirmation.
- Update a document-extraction draft through natural-language corrections.
- Perform the requested action first and then answer any analysis question using the updated data.

Orson may not:

- Perform a write merely because it detected a problem.
- Automatically adjust feeding, treatments, inventory, cycles, or finance without an explicit user request.
- Bypass the user's Shrimply permissions or assigned-block scope.
- Write raw model-generated Firestore paths or arbitrary update payloads.
- Continue with a multi-action request when any target is ambiguous or any requested write is unauthorized.
- Delete operational history through chat.
- Undo or roll back a completed Orson action. Corrections are new, audited actions.
- Accept action requests while the device is offline.
- Accept voice input in this implementation.

The feature targets all of the following outcomes:

- Faster daily farm data entry.
- Fewer recording errors.
- Better accountability and operational traceability.
- Better farm analysis after newly recorded data is available.
- Reduced manager workload.
- Easier technician onboarding.
- Less dependence on manual forms.

It is not initially positioned as a premium-only subscription feature.

---

## 2. Scope

### 2.1 Included

- Water-quality reads, new entries, and historical corrections.
- Sampling and growth reads, new entries, and historical corrections.
- Mortality reads, new entries, and historical corrections.
- Daily feeding reads, entries, and corrections with atomic inventory reconciliation.
- Multiple feed items allocated to one pond on one day.
- Additive and treatment inventory usage tied to a pond-treatment record.
- Inventory stock-in and price data.
- Supplier invoice, delivery note, clipboard, whiteboard, CSV, and PDF extraction.
- Inventory-linked finance entries for purchases.
- Harvest entries and their revenue effects.
- Cycle start and cycle end.
- Multi-action requests.
- Central but bounded conversation persistence.
- Compact immutable action receipts.
- Mobile and web action cards.

### 2.2 Deferred

- Asset creation, transfer, and maintenance tools.
- Voice input and voice confirmation.
- Proactive autonomous writes.
- Approval inboxes or manager approval queues.
- Undo and rollback.
- Cross-platform live chat synchronization.
- Permanent retention of uploaded source documents.

Asset and maintenance tools can be added after the core farm-operation commands are stable.

---

## 3. Corrections to the Original Proposal

The implementation must correct these assumptions from the original proposal:

1. Current water, sampling, feed, and some harvest data are embedded in the pond document's `samplings` array. `companies/{companyId}/ponds/{pondId}/samplings` is not currently a Firestore subcollection.
2. The current Orson conversation model already calls read tools through the Meta Responses-compatible API. Gemini is the extraction model, not the main conversational orchestrator.
3. Existing role defaults do not match the proposed access matrix. Permission defaults and Firestore rules must be reorganized before agent writes are enabled.
4. `manageFeedInventory` currently combines several authorities that the approved policy treats differently. Daily feeding, pond treatment usage, and inventory purchasing need distinct permissions.
5. A model must never write directly to Firestore. It selects a typed command; trusted server code performs authorization, validation, transaction execution, verification, and audit creation.
6. A full-document previous-value snapshot is not used. There is no undo feature.

---

## 4. Target Architecture

```text
User text or file
        |
        v
Mobile/Web Orson chat
        |
        v
generateOrsonResponse callable
        |
        +------------------------------+
        | Muse conversational agent    |
        | - interprets explicit intent |
        | - calls authorized read tools|
        | - selects typed action tools |
        +---------------+--------------+
                        |
                        v
              Orson action command layer
              - authenticate user
              - resolve effective permissions
              - enforce technician block scope
              - resolve IDs and active cycles
              - normalize dates/units
              - validate current Firestore state
              - decide instant vs confirmation
              - execute idempotent transaction
              - recompute derived data
              - verify committed state
              - write compact audit receipt
                        |
                        v
                Firestore source of truth
                        |
                        v
          Receipt card + concise chat message
```

Document extraction uses a separate path:

```text
Temporary upload -> Gemini structured extraction -> server entity resolution
       -> editable structured draft -> explicit confirmation -> command layer
       -> delete temporary upload
```

### 4.1 Model responsibilities

`muse-spark-1.3-contributor` is responsible for:

- Conversation.
- Reading relevant authorized data.
- Determining whether the user explicitly requested an action.
- Selecting typed read and action tools.
- Asking for missing or ambiguous information.
- Explaining completed actions and analysis results.

`gemini-2.5-flash` is responsible for:

- Extracting structured rows from supported images and documents.
- Returning values, raw labels, inferred units, and confidence indicators.
- Never committing records.

Deterministic server code is responsible for:

- Identity, company membership, permissions, and block scope.
- Entity resolution and validation.
- Confirmation requirements.
- Transactions, idempotency, financial synchronization, and record verification.
- Audit receipts.

### 4.2 One command layer for Orson and normal forms

The normal mobile/web forms and Orson must converge on the same backend commands. A feeding entry created through Orson must have exactly the same inventory, cost, finance, and pond effects as a feeding entry created through the existing feeding form.

Client-side domain mutation logic should be moved behind callable server commands in stages. Pure calculation functions remain shared and are covered by parity tests.

---

## 5. Conversation Storage Without Firestore or Storage Bloat

Central conversation storage is required, but mobile and web do not need to share the same live conversation.

### 5.1 Firestore layout

```text
companies/{companyId}/orsonConversations/{conversationId}
  ownerUid
  clientScope: "mobile" | "web"
  status: "active" | "cleared"
  createdAt
  updatedAt
  expiresAt

companies/{companyId}/orsonConversations/{conversationId}/messages/{messageId}
  role: "user" | "assistant"
  text
  actionReceiptId?
  createdAt
  expiresAt
```

### 5.2 Storage rules

- Store conversation text in Firestore, not Firebase Storage.
- Give mobile and web independent active conversation IDs.
- Do not use `onSnapshot` to synchronize chat across platforms.
- Load only the latest 20 messages into the model, matching the current context behavior.
- Load a maximum of 50 recent messages into the visible chat.
- Give disposable conversation and message documents a Firestore TTL field.
- Clear-chat marks the conversation cleared and removes it from the client immediately; TTL performs final cleanup.
- Do not store full generated prompts, pond payloads, tool outputs, reasoning traces, streaming deltas, or repeated copies of farm records.
- Store final user and assistant messages only.
- Store operational audits outside the conversation so clearing chat never removes the record of a farm mutation.

### 5.3 Temporary uploads

- Upload files to `companies/{companyId}/orsonTemp/{uid}/{uploadId}`.
- Validate MIME type, extension, byte size, authenticated user, and company membership.
- Gemini extracts the file into a structured draft.
- Delete the source object after extraction succeeds or fails.
- Do not store a download URL in the farm record, conversation, or action receipt.
- Retain only the extracted structured draft until it is confirmed, discarded, or TTL-expired.

This keeps Firebase Storage temporary and prevents documents, photos, and duplicate chat context from accumulating.

---

## 6. Authorization and Reorganized Permissions

Every write requires:

1. Valid Firebase Authentication.
2. Active membership in the supplied company.
3. `useOrson` permission.
4. The relevant domain permission.
5. Access to the target pond's block when the user is a technician.

No separate `executeOrsonActions` permission is added.

### 6.1 Permission split

Add or reorganize these permission keys:

| Permission | Authority |
|---|---|
| `recordPondData` | Water quality, sampling, mortality, and pond observations |
| `recordFeeding` | Record or correct daily feeding |
| `recordInventoryUsage` | Consume additives/feed for a specific pond operation or treatment |
| `manageInventoryStock` | Create items, stock in, edit price/reorder information |
| `manageHarvests` | Create and correct harvests |
| `manageCycles` | Start and end production cycles |
| `manageFinance` | Create and correct finance records |
| `managePonds` | Create and edit pond identities/configuration |
| `useOrson` | Use Orson's read and action interface |

`manageFeedInventory` becomes a legacy compatibility permission during migration. Existing overrides must be migrated deliberately:

- Existing `manageFeedInventory: true` maps to `recordFeeding`, `recordInventoryUsage`, and `manageInventoryStock` only where the user's role should retain those authorities.
- New checks must use the split permissions.
- Remove legacy checks only after mobile, web, Cloud Functions, and Firestore rules use the new keys.

### 6.2 Default role policy

| Capability | Technician | Manager | Admin | Owner / Co-owner |
|---|:---:|:---:|:---:|:---:|
| Ask Orson/read authorized farm data | Yes, assigned block only | Yes | Yes | Yes |
| Water quality | Yes, assigned block only | Yes | Yes | Yes |
| Sampling | Yes, assigned block only | Yes | Yes | Yes |
| Mortality | Yes, assigned block only | Yes | Yes | Yes |
| Daily feeding | Yes, assigned block only | Yes | Yes | Yes |
| Pond treatment inventory usage | Yes, assigned block only | Yes | Yes | Yes |
| Inventory stock-in and prices | No | Yes | Yes | Yes |
| Harvests and revenue sync | No | Yes | Yes | Yes |
| Cycle start/end | No | Yes | Yes | Yes |
| Finance | No | Yes | Yes | Yes |
| Permanent delete through Orson | No | No | No | No |

Mechanics and buyers do not receive Orson access in this implementation.

### 6.3 Technician block scope

Technicians may read and write only ponds in their assigned enterprise block.

The server must:

- Load the target pond.
- Read its `blockId`.
- Read `companies/{companyId}/blocks/{blockId}`.
- Require `assignedTechnicianId === uid` for technicians.
- Reject ponds without a valid assigned block when the user is a technician.
- Apply the same filter to Orson read tools, prompt context, entity search, document extraction matching, and action tools.

Managers, admins, owners, and co-owners retain company-wide access where their effective permissions allow it.

Firestore read rules and client pond queries must also be updated so block scoping is not enforced only inside Orson.

### 6.4 Unauthorized requests

There is no pending approval workflow. Orson returns a direct message such as:

> You do not have write access for inventory stock-in. Ask a manager, admin, owner, or co-owner with inventory permission to record it.

Orson must not save an approval request or imply that the action will run later.

---

## 7. Action Lifecycle

### 7.1 Standard lifecycle

Every action follows these steps:

1. **Interpret:** Muse identifies one or more explicit requested commands.
2. **Resolve:** The server resolves company-owned IDs for ponds, cycles, feeds, additives, and records.
3. **Authorize:** The server checks `useOrson`, domain permission, and block scope.
4. **Normalize:** Convert supported user units and dates into canonical units and farm-local date keys.
5. **Read current state:** Load the authoritative record inside or immediately before the transaction.
6. **Validate:** Check required values, active cycle, current inventory, duplicate records, and conflicts.
7. **Classify:** Decide whether the action can execute immediately or needs confirmation.
8. **Execute:** Run an idempotent transaction or return a confirmation card.
9. **Recalculate:** Update required derived sampling, population, survival, biomass, inventory cost, and finance data.
10. **Verify:** Re-read the affected records and confirm the intended values were committed.
11. **Audit:** Write a compact receipt.
12. **Respond:** Return a receipt card and a short natural-language message.
13. **Analyze:** If the same request contained a question, answer it using the newly committed state.

### 7.2 Idempotency

Every command has a server-validated `operationId`.

- Repeating the same operation ID returns the original result.
- Double taps, callable retries, reconnects, and model retries must not create duplicate records.
- The operation ID is written in the same transaction as the mutation wherever Firestore transaction limits allow.
- Existing feed-operation receipts should be generalized rather than creating an unrelated duplicate mechanism.

### 7.3 Multi-action requests

Orson can execute several actions from one user message.

- Resolve and validate every action before the first write.
- Show one combined card if any action requires confirmation.
- If any target is ambiguous, ask the user to resolve it and execute nothing.
- If any requested action is unauthorized, reject the combined write and identify the unauthorized portion.
- After all ambiguities are resolved, execute each domain command through its own transaction boundary unless several writes must be atomic for financial or inventory integrity.
- Return one parent receipt card with one row per command.
- If an unexpected server failure happens after some independent commands complete, report a partial result accurately. Never claim that completed writes were rolled back.

### 7.4 Conflicts

When a record changes after Orson prepared a confirmation card:

- Merge non-conflicting fields.
- Reject a same-field conflict.
- Refresh the card with the current value and the user's proposed value.
- Require confirmation again for a refreshed high-impact action.

### 7.5 No undo

- Do not show an Undo button.
- Do not store rollback snapshots.
- A correction is a new command referencing the original record or operation.
- Corrections retain the original operation and write a new compact change receipt.
- Financial and inventory corrections use reconciliation logic and the original recorded cost basis.

---

## 8. Confirmation Policy

### 8.1 Instant actions

The following may execute immediately when all inputs are explicit, the target is unambiguous, the record is within the active cycle, and no validation warning exists:

- Current-day morning or evening water-quality entry for one pond.
- Current-day sampling entry for one pond.
- Current-day mortality entry for one pond.
- A direct correction to an unambiguous current-day low-impact pond field.

The response still includes a receipt card and confirmation message.

### 8.2 Actions that always require confirmation

- Any historical entry or edit.
- Any out-of-range biological value.
- Feeding and feeding corrections.
- Any inventory deduction.
- Any pond treatment.
- Inventory stock-in.
- Price changes.
- Finance writes.
- Harvest entries or corrections.
- Cycle start or end.
- Any bulk or document-extracted action.
- Any multi-action request containing at least one high-impact action.
- Any action where the server normalized a non-obvious unit.

### 8.3 Biological warnings

Biologically unusual values do not become impossible solely because they are unusual. Orson must:

- Display the value, unit, expected context, and warning.
- Ask the user to confirm it.
- Permit the write after confirmation if the value is structurally valid.
- Never silently change the value to a more plausible number.

Structurally invalid input—such as a missing unit where the unit changes meaning, a negative mortality count, an impossible date, `NaN`, or an unresolved pond—must be corrected before confirmation.

---

## 9. Compact Audit Receipt

Each successful or failed write attempt creates one compact operation record:

```typescript
interface OrsonOperationReceipt {
  operationId: string;
  command: OrsonCommandName;
  status: 'completed' | 'failed' | 'partially_completed';
  actorUid: string;
  actorRole: 'owner' | 'co-owner' | 'manager' | 'admin' | 'technician';
  targetIds: {
    pondId?: string;
    cycleId?: string;
    recordId?: string;
    inventoryItemIds?: string[];
  };
  actionDate: string;
  changes: Record<string, { from?: unknown; to: unknown }>;
  warningCodes?: string[];
  relatedRecordIds?: string[];
  createdAt: FirebaseFirestore.Timestamp;
}
```

Do not include:

- Full pond or company snapshots.
- The entire conversation.
- Hidden reasoning or model traces.
- Repeated permission matrices.
- User display names that can be resolved from `actorUid`.
- Source document URLs.
- Uploaded document content.
- A rollback snapshot.

Audit visibility follows the underlying domain permission. Owners and co-owners can view all receipts. Other users see only receipts for records they are permitted to view, including block scope.

---

## 10. Domain Data Contracts and Behavior

### 10.1 Water quality: separate morning and evening records

Morning and evening readings are separate source records, not one indistinguishable daily measurement.

```text
companies/{companyId}/ponds/{pondId}/waterQualityRecords/{date}_{session}
```

```typescript
interface WaterQualityRecord {
  id: string;
  date: string; // farm-local YYYY-MM-DD
  session: 'morning' | 'evening';
  doMgL?: number;
  ph?: number;
  salinityPpt?: number;
  temperatureC?: number;
  transparencyCm?: number;
  waterDepthCm?: number;
  alkalinityMgL?: number;
  ammoniaMgL?: number;
  waterAppearance?: string;
  operationalNotes?: string;
  weatherEvent?: 'rain' | 'heavy_rain' | 'sudden_cloud';
  waterExchangePercent?: number;
  sludgeLoad?: 'low' | 'moderate' | 'high';
  surfaceScum?: boolean;
  shrimpBehaviour?: 'normal' | 'abnormal';
  pondCycleId: string;
  cycleId?: string;
  recordedBy: string;
  recordedAt: FirebaseFirestore.Timestamp;
  updatedBy?: string;
  updatedAt?: FirebaseFirestore.Timestamp;
  operationId: string;
}
```

Rules:

- The document ID makes one morning and one evening source record per pond/date deterministic.
- Patch only fields explicitly supplied by the user.
- Missing values remain missing; never write missing measurements as zero.
- A same-field change is treated as a correction and audited with `from` and `to`.
- During migration, update the corresponding `doMorning`, `doEvening`, `phMorning`, `phEvening`, and related compatibility fields in the pond's daily `samplings` projection transactionally.
- Migrate readers to `waterQualityRecords` before removing the embedded compatibility projection.
- `onSnapshot` listeners must keep mobile and web dashboards live after either a normal form or Orson writes a record.

Suggested tool:

```typescript
upsertWaterQuality({
  pondId,
  date,
  session,
  values,
  operationId,
});
```

### 10.2 Sampling and growth

Sampling remains a biological observation and never deducts inventory.

Required source fields:

- Pond and active cycle.
- Farm-local date.
- MBW as a positive numeric value in grams.
- Sample count when supplied.
- Optional sampling notes.

The command stores the source observation and recalculates/stores a versioned derived snapshot containing:

- Actual ADG.
- Estimated population.
- Estimated survival rate.
- Estimated biomass.
- Cumulative feed to date.
- Calculation version.

Derived values are rebuildable. Shared source records remain authoritative.

Calculation rules:

- Search backward for the latest valid non-zero MBW.
- With two or more valid samples: `(latestMBW - previousMBW) / daysDiff`.
- With one valid sample: `(latestMBW - initialWeight) / days since stocking`.
- Use `initialWeight`, falling back to `0.5 g` when no valid sampling exists.
- Account for cumulative mortality and harvested population.
- A historical correction recalculates that record and every later affected derived snapshot.
- Store `mbw` and legacy-compatible numeric fields as numbers.

Suggested tool:

```typescript
recordSampling({
  pondId,
  date,
  mbwG,
  sampleCount?,
  notes?,
  operationId,
});
```

### 10.3 Mortality: canonical record decision

Shrimply currently has two mortality representations:

1. Legacy `sampling.mortality` values inside the `samplings` array.
2. Structured `pond.mortalityRecords` entries with observation type, count, date, cycle, recorder, and notes.

New Orson mortality writes use `mortalityRecords` as the canonical format because it preserves the event's meaning and author. Legacy `sampling.mortality` values remain readable for historical calculations but Orson must not create new legacy mortality values.

Mappings:

- “Found 25 dead shrimp” -> `observed_recovered`, count `25`.
- “Estimated 500 mortalities” -> `estimated_total`, count `500`.
- “No mortality observed” -> `none_observed`, count `0`.

After a mortality write or correction:

```text
currentPopulation = (initialStock - cumulativeMortality) - totalHarvestedPopulation
```

- Recompute current population from source records; do not blindly decrement a stored number.
- Recompute survival and biomass snapshots that depend on population.
- Reject a negative mortality count.
- Warn and confirm when the resulting population is negative or the count is abnormally large; do not silently clamp the user's recorded observation.
- Store cycle identifiers and `mbwAtRecord` when available.

Suggested tool:

```typescript
recordMortality({
  pondId,
  date,
  observationType,
  count,
  notes?,
  operationId,
});
```

### 10.4 Daily feeding

Feeding records the total amount used for the pond on a date. The first implementation does not create individual meal records.

Rules:

- Support one or more feed allocations per pond/date.
- Require an exact inventory item ID for every allocation before execution.
- Sum allocations into `feedData.totalDailyFeed`.
- Preserve `feedAllocations[]`; populate legacy `inventoryFeedId` only when one item is used.
- Reuse the authoritative daily feed reconciliation behavior.
- Deduct inventory exactly once.
- Reject the entire feeding command when any inventory item has insufficient stock.
- Never allow negative stock.
- A correction reconciles the desired daily total against authoritative prior usage.
- Quantity returned during a correction uses the original recorded usage cost basis.
- Sampling `feed` remains observational context and must never independently deduct inventory.
- Do not infer appetite, consumption, or tray clearance from a change in daily feed quantity.

Suggested tool:

```typescript
reconcileDailyFeeding({
  pondId,
  date,
  allocations: Array<{ inventoryFeedId: string; quantityKg: number }>,
  operationId,
});
```

### 10.5 Pond treatments and additive usage

An inventory deduction for a pond treatment must also create a pond treatment record.

```text
companies/{companyId}/ponds/{pondId}/treatmentRecords/{recordId}
```

Minimum record:

```typescript
interface PondTreatmentRecord {
  id: string;
  pondId: string;
  date: string;
  inventoryItemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  purpose?: string;
  notes?: string;
  pondCycleId: string;
  cycleId?: string;
  inventoryUsageId: string;
  recordedBy: string;
  recordedAt: FirebaseFirestore.Timestamp;
  operationId: string;
}
```

Rules:

- Treatment advice alone never authorizes a deduction.
- The user must explicitly ask Orson to record/apply the treatment.
- The selected product and amount must be explicit.
- The transaction writes the treatment record and inventory usage together.
- Reject insufficient stock.
- If the request originated from a recommendation, retain the existing product-verification and dosing-safety protections before showing an executable draft.

### 10.6 Inventory stock-in and supplier invoices

Stock-in and price actions require `manageInventoryStock` and confirmation.

Invoice behavior:

- Extract the rows first.
- If the user clearly says what to create, prepare that exact action.
- If the user only uploads an invoice without an instruction, ask whether they want to stock the items and create the related unconfirmed finance payable/expense.
- Never infer the user's intended accounting action from the presence of an invoice alone.
- After confirmation, stock-in creates inventory history and the existing finance-sync record with `paymentType: 'Unconfirmed'`.
- This uses the current unconfirmed finance entry as the payable state; it does not introduce a separate accounts-payable subsystem in this implementation.
- Preserve purchase date, quantity, unit, unit price, batch/expiry when present, supplier notes, and source line identity.
- Prevent duplicate invoice-line import through deterministic operation and row IDs.

Suggested tools:

```typescript
stockInInventory({
  itemId,
  itemType: 'feed' | 'additive',
  quantity,
  unit,
  unitPrice,
  date,
  batch?,
  expiry?,
  notes?,
  operationId,
});

updateInventoryDetails({
  itemId,
  itemType,
  changes,
  operationId,
});
```

### 10.7 Harvest

Harvest actions require `manageHarvests` and confirmation.

- Reuse the existing partial/final harvest calculations.
- Preserve cycle, pond, reference sampling, MBW, biomass, count/size, price, and partial-harvest number.
- Atomically update the pond harvest impact and harvest record.
- Synchronize revenue through `buildHarvestRevenue` and stable finance document IDs.
- A correction voids/reconciles the old finance effect and writes the corrected effect.
- Do not hard-delete harvests through Orson.
- A final harvest must satisfy the existing cycle guards before a harvested cycle can close.

### 10.8 Cycle start and end

Cycle actions require `manageCycles` and confirmation.

- Reuse the physical-pond identity and enterprise-cycle rules.
- Cycle start must collect all required stocking data rather than inventing defaults.
- Cycle end must collect date and end reason.
- Ending as harvested must satisfy the final-harvest requirement.
- A technician receives an unauthorized response; no approval draft is created.
- Do not delete or detach historical cycle records.

---

## 11. Document and Bulk Workflow

### 11.1 Supported sources

- Handwritten water-quality sheets.
- Whiteboard photos.
- Daily feed sheets.
- Sampling sheets.
- Mortality logs.
- Supplier delivery notes and invoices.
- CSV files.
- PDFs.

Voice is excluded.

### 11.2 Extraction result

Gemini returns structured values with raw source labels. Server code then resolves company-owned entities.

```typescript
interface OrsonExtractedRow {
  rowId: string;
  domain: 'water_quality' | 'sampling' | 'mortality' | 'feeding' | 'inventory_stock_in';
  date?: string;
  session?: 'morning' | 'evening';
  rawPondName?: string;
  pondId?: string;
  rawItemName?: string;
  inventoryItemId?: string;
  values: Record<string, string | number | boolean | null>;
  units: Record<string, string>;
  confidence: Record<string, number>;
  warningCodes: string[];
  needsReview: boolean;
}
```

### 11.3 Mandatory review conditions

A row needs user resolution when it has:

- An uncertain digit.
- An unrecognized or ambiguous pond.
- An unrecognized or ambiguous inventory item.
- A missing unit whose meaning cannot be determined safely.
- A date outside the active cycle.
- A duplicate candidate.
- A biologically unusual value.
- An inventory shortage.
- A permission or assigned-block conflict.

Orson must ask the user to confirm an ambiguous pond. It must not select the nearest fuzzy match automatically.

### 11.4 Conversational correction

The user may correct the draft by talking to Orson:

> Change row 2 to Pond B3 and make the quantity 30 kg.

Muse calls a typed draft-update tool. The server patches only the referenced row and re-runs entity resolution, permissions, normalization, duplicate detection, and validation.

### 11.5 Multi-domain documents

One upload may create several domain sections. Each section is displayed separately inside one draft card because permissions and confirmation summaries differ by domain.

### 11.6 Bulk execution policy

- Validate all rows before execution.
- Any unresolved ambiguity or unauthorized row blocks the entire draft.
- The user may correct or explicitly remove blocked rows.
- Once every remaining row is valid, the user confirms the combined card.
- Execute each independent row with its own idempotent transaction and child receipt.
- Return a parent result summarizing completed and failed rows.
- An unexpected failure may produce a truthful partial result; never report uncommitted rows as saved.
- Delete the source upload after extraction; retain only the structured draft until completion/discard/TTL.

---

## 12. Tool and API Design

### 12.1 Read tools

Retain and extend:

- `read_app_records`
- `read_pond_timeline`

Required changes:

- Filter all datasets by effective permission.
- Filter pond-related data by assigned block for technicians.
- Add canonical water-quality session records and treatment records.
- Never expose finance fields without `viewFinance`.
- Do not expose other blocks through list results, tool evidence, or prompt summaries.

### 12.2 Action tools exposed to Muse

- `upsert_water_quality`
- `record_sampling`
- `record_mortality`
- `reconcile_daily_feeding`
- `record_pond_treatment`
- `stock_in_inventory`
- `update_inventory_details`
- `record_harvest`
- `start_pond_cycle`
- `end_pond_cycle`
- `extract_farm_document`
- `update_farm_document_draft`

Each tool accepts domain values and stable entity IDs. It never accepts a raw Firestore path.

Each action tool returns one of:

```typescript
type OrsonActionToolResult =
  | { status: 'completed'; receipt: OrsonOperationReceipt }
  | { status: 'awaiting_confirmation'; operationId: string; card: OrsonActionCard }
  | { status: 'needs_input'; questions: OrsonResolutionQuestion[] }
  | { status: 'unauthorized'; permission: string; message: string }
  | { status: 'failed'; code: string; message: string };
```

### 12.3 Confirmation callable

Confirmation is a direct client-to-server callable, not a second natural-language model interpretation.

```typescript
confirmOrsonOperation({
  companyId,
  operationId,
  confirmationToken,
});
```

The server:

- Reloads the operation.
- Reauthenticates the user.
- Rechecks membership, permission, role, block scope, inventory, cycle state, and conflict version.
- Rejects expired or already completed operations.
- Executes the exact reviewed normalized payload.
- Does not require Muse or Gemini to be online.

### 12.4 Confirmation token

The token binds confirmation to:

- User ID.
- Company ID.
- Operation ID.
- Normalized command hash.
- Expiration time.

Editing a draft changes the command hash and invalidates the previous token.

---

## 13. UI Requirements

### 13.1 Message types

Extend chat messages beyond plain text:

```typescript
type OrsonMessage =
  | OrsonTextMessage
  | OrsonConfirmationCardMessage
  | OrsonReceiptCardMessage
  | OrsonDocumentDraftMessage
  | OrsonErrorMessage;
```

### 13.2 Confirmation card

Show:

- Action name.
- Pond/item/cycle name.
- Date and morning/evening session where applicable.
- Exact normalized values and units.
- Inventory and finance effects.
- Warning text.
- A clear Confirm button.
- A Cancel button.

There is no Undo button.

### 13.3 Receipt card

Show only the most useful result:

- Completed/failed status.
- What changed.
- Pond/item/date.
- Inventory or finance effect where applicable.
- Links to the affected Shrimply screen.
- Operation ID in a secondary details area.

Also return a concise chat message, for example:

> Recorded 80 kg of feed for Pond B1 on 19 September and deducted 50 kg from Feed A and 30 kg from Feed B.

### 13.4 Units and language

- Accept the unit supplied by the user when supported.
- Normalize to the application's canonical unit in server code.
- Display the normalized value and unit in the confirmation/receipt.
- Ask when the input is ambiguous rather than guessing.
- Muse responds in the user's language without a separate language-selection workflow.
- Tool enum values, dates, and units remain canonical and language-independent.

### 13.5 Offline

- Disable Orson action submission while offline.
- Do not queue Orson actions in the mobile offline workspace.
- Explain that the device must reconnect so current permissions, cycles, records, and inventory can be revalidated.
- Normal non-Orson offline features remain unchanged.

---

## 14. Firestore Collections

New or formalized collections:

```text
companies/{companyId}/orsonConversations/{conversationId}
companies/{companyId}/orsonConversations/{conversationId}/messages/{messageId}
companies/{companyId}/orsonOperations/{operationId}
companies/{companyId}/orsonDocumentDrafts/{draftId}
companies/{companyId}/ponds/{pondId}/waterQualityRecords/{date}_{session}
companies/{companyId}/ponds/{pondId}/treatmentRecords/{recordId}
```

Existing authoritative collections/documents remain in use for:

- Ponds and embedded compatibility samplings.
- Structured mortality records during the first implementation.
- Feed and additive stock/history.
- Harvest records.
- Cycles and physical ponds.
- Expenses and revenues.

### 14.1 Rule requirements

- Conversation read/write is limited to the conversation owner and current company.
- Clients cannot directly create completed operation receipts.
- Draft confirmation is performed through callable functions.
- Water-quality and treatment records enforce domain permissions and block scope.
- Technician pond reads and writes enforce assigned-block scope.
- Operations and draft payloads cannot be moved between companies.
- Temporary Storage paths are writable/readable only by the authenticated uploader until extraction.
- Completed/failed extraction always deletes the source object through Admin SDK cleanup.

Because Cloud Functions use the Admin SDK, every callable must independently enforce the same policy. Firestore rules are not a substitute for server authorization.

---

## 15. Recommended Backend Structure

```text
functions/
  orson.js                         # Existing conversation callable and proactive features
  orsonAgent.js                    # Action/draft/confirmation callables
  orsonAgentTools.js               # Muse tool declarations
  shared/
    orsonActionAuth.js             # Membership, permissions, block scope
    orsonActionContracts.js        # Runtime schema validation
    orsonActionResolver.js         # Pond/item/cycle entity resolution
    orsonActionPolicy.js           # Confirmation classification
    orsonOperations.js             # Idempotency, operation state, receipts
    orsonDocumentExtraction.js     # Temporary upload + Gemini extraction
    pondCommandService.js          # WQ, sampling, mortality commands
    inventoryCommandService.js     # Feed, usage, stock-in commands
    harvestCommandService.js       # Harvest and revenue command
    cycleCommandService.js         # Cycle lifecycle command

shared/
  orsonActions.ts                  # Cross-platform TypeScript contracts
  permissions.ts                   # Updated permission definitions/defaults
  pondCalculations.ts              # Existing shared biological calculations
  dailyFeedTransaction.ts          # Existing pure feed reconciliation logic
  financeSync.ts                   # Existing stable finance mappings
```

Do not place all handlers into the already large `functions/orson.js` file.

---

## 16. Implementation Phases

### Phase 0: Permission and block-scope foundation

- Add split feeding/inventory permission keys.
- Reorganize defaults for technician, manager, admin, owner, and co-owner.
- Migrate permission overrides safely.
- Update mobile, web, server permission mirrors, and Firestore rules.
- Enforce assigned-block scope for technician reads and writes.
- Add emulator tests for role, override, company, and block isolation.

**Exit condition:** No Orson action code is enabled until server and rules agree on authorization.

### Phase 1: Shared server command layer

- Define command contracts and runtime validation.
- Add `operationId` idempotency and compact receipts.
- Implement conflict/version checks.
- Move or wrap normal form mutations behind the same server command layer.
- Implement WQ session, sampling, mortality, feeding, and treatment commands.
- Add derived sampling/population recomputation.
- Verify mobile/web parity for normal form writes.

### Phase 2: Orson action tools

- Register typed action tools with the existing Muse agent loop.
- Add explicit-action intent constraints.
- Add combined multi-action planning.
- Add instant-action and confirmation policy.
- Add direct unauthorized responses without approval drafts.
- Re-read and verify every completed action before responding.

### Phase 3: Conversation and action UI

- Add bounded central Firestore conversation persistence.
- Add TTL fields and cleanup behavior.
- Add structured confirmation, receipt, error, and document-draft message types.
- Implement mobile and web cards with the same contracts.
- Disable action submission offline.
- Keep mobile and web conversations separate.

### Phase 4: Document extraction

- Add temporary attachment upload.
- Add Gemini structured extraction schemas by domain.
- Add pond/item entity resolution and confidence warnings.
- Add natural-language draft updates.
- Add multi-domain grouped cards.
- Delete source uploads after extraction.
- Add bulk validation and row-level execution receipts.

### Phase 5: Inventory purchasing, harvest, and cycles

- Implement stock-in plus unconfirmed finance entry.
- Add price/details corrections.
- Add harvest plus revenue reconciliation.
- Add cycle start/end commands and lifecycle guards.
- Add historical corrections for all supported domains.

### Phase 6: Deferred domain expansion

- Add assets and maintenance after the farm-operation command layer is stable.

---

## 17. Verification Plan

### 17.1 Authorization

- `useOrson` without the domain permission cannot write.
- Domain permission without `useOrson` cannot write through Orson.
- Technician can read/write an assigned-block pond.
- Technician cannot discover, read, resolve, or write another block's pond.
- Manager/admin/owner behavior matches effective overrides.
- Mechanics and buyers cannot use Orson.
- A forged `companyId`, `pondId`, inventory ID, or operation ID is rejected.

### 17.2 Action semantics

- Only explicit user requests invoke action tools.
- Advice and hypothetical examples never mutate data.
- Mixed action/question requests write first and analyze the committed state.
- Ambiguous multi-action requests perform no writes.
- Unauthorized combined requests perform no writes.
- Confirmation tokens cannot be replayed with changed payloads.
- Callable retries do not duplicate operations.

### 17.3 Water quality

- Morning and evening create distinct canonical records.
- Updating morning does not overwrite evening.
- Partial patches preserve unspecified fields.
- Missing measurements remain missing.
- Compatibility projection matches canonical records during migration.
- Historical and unusual values require confirmation.

### 17.4 Sampling and mortality

- Sampling stores numeric MBW and does not deduct inventory.
- MBW look-back skips missing/zero values.
- ADG uses the correct one-sample and multi-sample rules.
- Historical corrections recalculate later snapshots.
- New mortality writes only use `mortalityRecords`.
- Legacy mortality remains included once in calculations.
- Population equals initial stock minus cumulative mortality minus harvested population.

### 17.5 Feeding, treatment, and finance

- Multi-feed allocation writes the correct daily total.
- Inventory is deducted exactly once.
- Insufficient inventory rejects the whole command.
- Feed corrections reconcile against authoritative usage.
- Returned quantity uses the original usage cost basis.
- Treatment writes inventory usage and pond treatment together.
- Stock-in creates a stable unconfirmed finance entry once.
- Harvest revenue uses stable finance references and reconciles corrections.

### 17.6 Documents and cleanup

- Uncertain digits, units, ponds, items, and dates require review.
- Ambiguous ponds are never automatically selected.
- Conversational draft corrections patch the intended row only.
- Multi-domain documents group actions by domain.
- Duplicate rows do not create duplicate records.
- Temporary files are deleted on success, extraction failure, discard, and timeout cleanup.
- Expired drafts and conversations are removed through TTL.

### 17.7 UI parity

- Mobile and web render the same normalized command and receipt data.
- Confirmation executes without another model call.
- Receipt links open the affected record.
- No Undo control appears.
- Offline action submission is disabled.
- A write from one platform appears in normal Firestore-backed operational views on the other platform.

---

## 18. Definition of Done

The Orson farm agent is complete when:

- The user can explicitly request every in-scope action in natural language.
- Muse can resolve and call the appropriate typed tool without generating Firestore payloads.
- Gemini can create editable structured drafts from supported documents.
- Every action is authorized by `useOrson`, domain permission, company membership, and block scope.
- Low-impact actions execute immediately only under the approved policy.
- High-impact, bulk, historical, warning, inventory, finance, harvest, and cycle actions require confirmation.
- Feeding, treatments, stock-in, harvest, and finance remain transactionally consistent and idempotent.
- Sampling never deducts inventory.
- Mortality uses structured records and correctly reduces calculated population.
- Derived sampling and population fields are recomputed after corrections.
- Conversations are centrally available within their client scope without retaining large prompts or files.
- Temporary uploads are deleted.
- Every action returns a concise message and structured receipt card.
- All permission, block isolation, transaction, biological parity, document cleanup, and mobile/web tests pass.
