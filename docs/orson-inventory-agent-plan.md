# Orson Inventory Agent Implementation Plan

> **Status:** Proposal / Ready for Review
> **Target:** Shrimply Mobile (Expo/React Native) & Web (Next.js)
> **Backend:** Firebase Cloud Functions (Node.js) + Firestore
> **Models:** `gemini-2.5-flash` (Multimodal Extraction) + `muse-spark-1.3-contributor` (Orson Conversation)

---

## 1. Executive Summary

Transform **Orson AI** from an advisory/diagnostic assistant into an **action-capable agent** that can:
1. Accept uploaded photos, PDFs, CSVs, or Excel files representing warehouse inventory logs, feed slips, or delivery invoices.
2. Accurately extract dates, feed/additive names, pond assignments, and quantities.
3. Automatically match raw names to live Firestore items (`inventory`) and ponds (`ponds`).
4. Present an **interactive draft confirmation card** in the chat (Human-in-the-Loop).
5. Upon user confirmation, atomically commit deductions or stock additions to Firestore while maintaining full compliance with Shrimply's biological, financial (COGS), and permission rules.

---

## 2. Architecture & Model Strategy

Shrimply will use a **Hybrid Model Pattern**:

```
                              ┌───────────────────────────────────┐
                              │ User uploads image / PDF / sheet  │
                              └─────────────────┬─────────────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────────┐
                               │     Firebase Cloud Storage      │
                               └────────────────┬────────────────┘
                                                │
                                                ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Cloud Function: extractInventoryDocument                                                    │
 │                                                                                             │
 │   1. Ingestion: Download file buffer.                                                       │
 │   2. Multimodal OCR: Calls `gemini-2.5-flash` with structured JSON schema response.         │
 │   3. Entity Resolution: Fuzzy-matches raw text to Firestore active ponds and inventory.    │
 │   4. Returns structured draft payload with confidence scores & warnings.                   │
 └──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                │
                                                ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Orson Chat UI (AIChat.tsx & Web Chat) via `muse-spark-1.3-contributor`                      │
 │                                                                                             │
 │   • Conversational explanation: "I reviewed your feed sheet. Here is what I found..."      │
 │   • Interactive Draft Card: Shows table of parsed rows with editable fields.                │
 │   • User clicks [Confirm & Save to Firestore] or [Discard / Modify].                        │
 └──────────────────────────────────────────────┬──────────────────────────────────────────────┘
                                                │
                                                ▼
 ┌─────────────────────────────────────────────────────────────────────────────────────────────┐
 │ Cloud Function: commitOrsonInventoryAction                                                  │
 │                                                                                             │
 │   • Role Check: Verifies `manageInventory` farm permission.                                 │
 │   • Atomic Transaction: Deducts stock, creates `UsageHistory`, updates batch costs.         │
 │   • Financial Sync: Automatically logs expense to `finance` collection for COGS.            │
 │   • Audit Trail: Adds `source: 'orson_agent'`, `authorUid`, and `sourceFileUrl`.           │
 └─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Why this model split?
- **`gemini-2.5-flash` (The "Eyes"):** Proven in Shrimply's `extractLabReportFromPdf`. Native high-resolution multimodal vision, robust table and handwriting extraction, and zero-hallucination JSON schema enforcement.
- **`muse-spark-1.3-contributor` (The "Voice"):** Continues handling Orson's conversational chat, reasoning, and diagnostic explanations without disrupting existing prompt policies.

---

## 3. Strict Shrimply Domain & Safety Guardrails

### A. Human-in-the-Loop (Zero Silent Corruption)
- The agent **must never** silently mutate live inventory without explicit user confirmation.
- Misinterpreting a handwritten `10` as `70` or assigning feed to the wrong pond can corrupt Feed Conversion Ratio (FCR), biomass estimates, and Cost of Goods Sold (COGS).
- Every extraction produces a **Draft** first. The user must review and tap **Confirm**.

### B. Rule 4 Parity (Feeding vs. Sampling)
- Feeding records deduct Firestore inventory once via atomic transactions.
- Sampling records are biological observations only and must **never** trigger inventory deductions.

### C. Financial & FIFO Integrity
- Inventory deductions must calculate unit costs and update expense ledgers via [`financeSync.ts`](file:///Users/ricardoho/Desktop/Shrimply/shared/financeSync.ts) and [`treatmentMix.ts`](file:///Users/ricardoho/Desktop/Shrimply/shared/treatmentMix.ts).
- Stock counts must never drop below zero without explicit warning and user override.

### D. Role-Based Permissions (RBAC)
- Only users with `manageInventory` or `companyOwner` status can commit inventory edits.
- Technicians can upload and preview drafts, but if their role lacks permission, Orson notifies them: *"You can view this preview, but an Owner or Manager must approve this deduction."*

---

## 4. Data Contracts & Schemas

### A. Extraction Request & Response Contract

```typescript
export interface InventoryDocumentExtractionRequest {
  companyId: string;
  fileStoragePath: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'text/csv';
  actionType: 'usage' | 'stock_in'; // Deduct usage or add new stock
}

export interface ExtractedInventoryRow {
  rowId: string;
  date: string; // YYYY-MM-DD
  rawItemName: string;
  matchedItemId: string | null;
  matchedItemName: string | null;
  rawPondName?: string;
  matchedPondId?: string | null;
  matchedPondName?: string | null;
  quantity: number;
  unit: string; // 'kg', 'bag', 'liter', etc.
  unitPrice?: number; // For stock_in / invoices
  totalCost?: number;
  confidence: number; // 0.0 to 1.0
  needsReview: boolean;
  notes?: string;
}

export interface InventoryDraftPayload {
  draftId: string;
  status: 'draft' | 'committed' | 'discarded';
  actionType: 'usage' | 'stock_in';
  sourceFileUrl: string;
  createdAt: string;
  warnings: string[];
  items: ExtractedInventoryRow[];
}
```

---

## 5. Implementation Roadmap (Phases)

### Phase 1: Backend Extraction Engine (Cloud Functions)
- [ ] Create `extractInventoryFromDocument` in `functions/orson.js` (or a dedicated `functions/orsonAgent.js`).
- [ ] Configure `gemini-2.5-flash` with a system prompt and JSON schema specifically tuned for shrimp farm feed logs, handwritten warehouse sheets, and supplier invoices.
- [ ] Implement entity resolution algorithm to map `rawItemName` ➔ `company.inventory` items and `rawPondName` ➔ `company.ponds`.
- [ ] Add unit tests verifying parsing of sample receipts, delivery notes, and CSV logs.

### Phase 2: Atomic Commit & Mutation Handler
- [ ] Create `commitOrsonInventoryDraft` callable Cloud Function.
- [ ] Implement atomic `runTransaction` that:
  - Deducts/adds stock to `companies/{companyId}/inventory/{itemId}`.
  - Inserts record into `usageHistory` or `stockInHistory`.
  - Generates expense sync record via `financeSyncDocumentId`.
- [ ] Write integration tests verifying FIFO calculation, negative stock prevention, and idempotency (avoiding double-clicks).

### Phase 3: Chat UI & Interactive Draft Card (Mobile & Web Parity)
- [ ] **Mobile (`AIChat.tsx`):**
  - Add attachment icon (ImagePicker & DocumentPicker) to chat input.
  - Upload file to `companies/{companyId}/orsonUploads/`.
  - Render new message type: `<OrsonInventoryDraftCard />`.
  - Allow user to tap and fix unmatched ponds or items directly in the card.
  - Add `[Confirm & Record]` and `[Discard]` buttons.
- [ ] **Web (`web/src/app/dashboard/...`):**
  - Provide identical upload and interactive confirmation card in the web Orson interface.

### Phase 4: Chat Edit Commands ("Natural Language Editing")
- [ ] Enable conversational follow-ups in Orson chat:
  - *"Change row 2 to Pond B3 instead of B2"* ➔ Orson updates the draft card before committing.
  - *"Actually, we only fed 3 bags of Grobest, not 4"* ➔ Orson recalculates quantity and remaining stock.

---

## 6. Verification & Test Plan

1. **OCR Accuracy Verification:**
   - Test against 5 diverse samples:
     - Clear supplier PDF invoice.
     - Smartphone photo of a crumpled paper feeding slip.
     - Low-light warehouse whiteboard photo.
     - Exported CSV/Excel sheet.
     - Ambiguous unit entry (e.g. "4 sak" / Indonesian for bags).
2. **Safety & Permission Checks:**
   - Attempt commit with an unauthorized role (technician without inventory rights) ➔ must block gracefully.
   - Attempt to deduct more stock than available ➔ must prompt warning and require explicit manager override.
3. **Parity Check:**
   - Verify that committing via mobile immediately updates web inventory tables via Firestore `onSnapshot`.
