# Orson Farm Agent: Full Access Control & Operations Implementation Plan

> **Status:** Architecture Proposal / Ready for Review (No implementation until approved)
> **Scope:** Full Farm Copilot (Water Quality, Feeding, Sampling, Mortality, Inventory, Harvest, Ponds)
> **Platforms:** Shrimply Mobile (React Native / Expo) & Web (Next.js App Router)
> **Backend:** Firebase Cloud Functions (Node.js) + Cloud Firestore + Firebase Storage
> **Model Stack:** `gemini-2.5-flash` (Multimodal Extraction & Tool Calling) + `muse-spark-1.3-contributor` (Conversational Reasoning)

---

## 1. Executive Vision

Transform **Orson AI** from an advisory assistant into Shrimply’s **Full Autonomous Farm Agent**.

Farm technicians, managers, and owners should be able to converse with Orson naturally—via text, voice, or file/photo uploads—to **read, write, and edit data across all operational modules**:

- 💧 **Water Quality:** Log morning/evening DO, pH, salinity, temperature, transparency, alkalinity, ammonia; upload logbook photos.
- 🦐 **Sampling & Growth:** Log MBW, calculate ADG, update populations, edit historical sampling records with look-back validation.
- 🍽️ **Feeding & Trays:** Log daily feed amounts, tray clearance percentages, and deduct stock from warehouse inventory atomically.
- ⚠️ **Mortality:** Record dead shrimp counts, adjust live biomass, and update survival rates.
- 📦 **Inventory & Additives:** Stock in supplies from invoice photos, record chemical/probiotic pond treatments, track reorder levels.
- 🚜 **Assets & Maintenance:** Log pump/aerator repairs, schedule preventive maintenance, attach photos.
- 🎣 **Harvest:** Record partial or final harvest weights, counts, and buyer revenues.

---

## 2. Access Control & Permission Matrix (RBAC)

Because aquaculture operations impact biological health and financial reporting, Orson operates under a strict **Role-Based Access Control (RBAC)** policy matching Shrimply's [`shared/permissions.ts`](file:///Users/ricardoho/Desktop/Shrimply/shared/permissions.ts):

| Operational Domain | Technician | Manager | Owner / Co-Owner |
| :--- | :---: | :---: | :---: |
| **Water Quality** (Log & Edit) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Feeding & Trays** (Log) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Sampling & Mortality** (Log & Edit) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Inventory Usage** (Pond Application) | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Inventory Stock-In & Price Changes** | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **Cycle Start & Cycle End** | ❌ Blocked | ⚠️ Requires Confirmation | ✅ Allowed |
| **Financial Expenses & Revenues** | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| **Delete Ponds or Historical Logs** | ❌ Blocked | ❌ Blocked | ⚠️ Owner Confirmation |

> [!NOTE]
> If a Technician asks Orson: *"Stock in 50 bags of feed at $25/bag"* or *"End cycle for Pond 3"*, Orson will respond politely:
> *"I can prepare this draft for you, but ending cycles or editing purchase costs requires Manager or Owner approval. Would you like me to save it as a pending request?"*

---

## 3. Two Operational Agent Modes

To make Orson both fast for daily routines and safe for bulk operations, Orson supports two execution modes:

### Mode A: Quick Operational Actions (Instant Execution with 10s Undo)
*Ideal for single-pond, real-time field logging.*
- **User says/types:** *"Orson, log morning DO 5.2, pH 7.9, and salinity 20 for Pond B1."*
- **Orson action:**
  1. Validates values against biological ranges (flags warnings if DO < 3.5 or pH > 9.0).
  2. Writes directly to Firestore `companies/{companyId}/ponds/{pondId}` in the today's `samplings` array.
  3. Responds immediately with a confirmation badge and an **[Undo]** button active for 10 seconds:
     > ✅ **Logged Morning WQ for Pond B1**
     > • DO: 5.2 ppm • pH: 7.9 • Salinity: 20 ppt
     > `[Undo within 10s]`

### Mode B: Bulk / Document Upload / High-Impact Actions (Interactive Draft Card)
*Ideal for clipboard photos, multi-pond log sheets, CSV exports, or historical edits.*
- **User uploads:** Photo of handwritten daily farm clipboard or delivery note.
- **Orson action:**
  1. `gemini-2.5-flash` extracts all rows, ponds, dates, and parameters.
  2. Server matches pond names and feed brands to existing Firestore documents.
  3. Displays an **Interactive Preview Card** in the chat.
  4. User can tap to edit any misread digit or unassigned pond.
  5. User taps **[Confirm & Apply to All Ponds]**.

---

## 4. Domain-by-Domain Capabilities (Read, Write, Edit)

```
                            ┌─────────────────────────────────────────────────────────┐
                            │                      ORSON AGENT                        │
                            │             Natural Language / Voice / Files            │
                            └────────────────────────────┬────────────────────────────┘
                                                         │
         ┌───────────────────┬───────────────────────────┼───────────────────────────┬───────────────────┐
         ▼                   ▼                           ▼                           ▼                   ▼
  💧 Water Quality    🦐 Sampling & MBW           🍽️ Feeding & Trays          ⚠️ Mortality        📦 Inventory
  • Log DO / pH       • Log MBW / count           • Log daily feed (kg)       • Log daily count   • Stock-in invoices
  • Edit past logs    • Calculate ADG             • Deduct stock atomically   • Update biomass    • Deduct treatments
  • Photo clipboard   • Historical look-back      • Record tray clearance %   • Survival curve    • Reorder alerts
```

### 1. Water Quality (`companies/{companyId}/ponds/{pondId}/samplings`)
- **Read:** *"What was the average DO in Pond 2 this week?"*, *"Which ponds had high ammonia yesterday?"*
- **Write:** Natural language or voice: *"Log morning DO 4.8 and evening pH 8.1 for Pond 3"*.
- **Edit:** *"Change yesterday's transparency for Pond 4 to 35 cm"*.
- **Bulk / OCR:** Upload a photo of the farm's morning water test whiteboard $\to$ Orson maps readings to each pond's daily record.

### 2. Feeding & Trays
- **Read:** *"How much feed has Pond 1 consumed this cycle?"*, *"Compare feed intake between Pond A and B."*
- **Write:** *"Pond 2 fed 80 kg of Grobest #2 across 4 meals today"*.
- **Stock Deduction:** Atomically deducts 80 kg from the warehouse feed item (Shrimply Rule 4).
- **Edit:** *"Pond 2 only ate 60 kg, not 80 kg, please adjust"*. $\to$ Orson restores 20 kg to inventory and updates the feeding log.

### 3. Sampling & Growth Calculations
- **Read:** *"What's the current MBW and estimated biomass for Pond 5?"*
- **Write:** *"Sampled 60 shrimp in Pond 1 today, average weight is 14.2 grams"*.
- **Biological Rules:** Enforces Shrimply's MBW look-back fallback and ADG calculation (`(latestMBW - prevMBW) / daysDiff`).
- **Edit:** *"Correct sampling date from Sept 15 to Sept 14"*.

### 4. Mortality & Survival
- **Read:** *"Total mortality across all active ponds this month."*
- **Write:** *"Found 25 dead shrimp in Pond 4 during morning cleaning"*.
- **Biomass Impact:** Automatically updates population equation:
  $$\text{Population} = (\text{InitialStock} - \text{TotalMortality}) - \text{TotalHarvested}$$

### 5. Inventory & Warehouse
- **Read:** *"Which feed items are below reorder level?"*, *"What is our remaining probiotic stock?"*
- **Write:** *"Deduct 10 kg of Zeolite for Pond 1 treatment"* or upload a delivery invoice to stock in 100 bags of feed with unit prices.
- **Financial Sync:** Updates COGS and expense ledgers via `financeSync.ts`.

---

## 5. Technical Architecture & Agent Tools

### A. Gemini Agent Tools Specification (`functions/orsonAgentTools.js`)

Orson is equipped with typed tools (Gemini Function Declarations):

```javascript
const orsonAgentTools = [
  // 1. Water Quality
  {
    name: "logWaterQuality",
    description: "Logs or updates water quality parameters for a specific pond on a given date.",
    parameters: {
      type: "object",
      properties: {
        pondId: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        doMorning: { type: "number" },
        doEvening: { type: "number" },
        phMorning: { type: "number" },
        phEvening: { type: "number" },
        salinity: { type: "number" },
        temperature: { type: "number" },
        transparencyCm: { type: "number" },
        ammonia: { type: "number" },
        alkalinity: { type: "number" }
      },
      required: ["pondId", "date"]
    }
  },

  // 2. Feeding
  {
    name: "recordFeeding",
    description: "Records daily feed for a pond and deducts from warehouse inventory.",
    parameters: {
      type: "object",
      properties: {
        pondId: { type: "string" },
        date: { type: "string" },
        feedAmountKg: { type: "number" },
        inventoryFeedId: { type: "string" },
        feedTrayClearancePercent: { type: "number" }
      },
      required: ["pondId", "date", "feedAmountKg"]
    }
  },

  // 3. Sampling
  {
    name: "recordSampling",
    description: "Records biological sampling (MBW) without deducting inventory.",
    parameters: {
      type: "object",
      properties: {
        pondId: { type: "string" },
        date: { type: "string" },
        mbw: { type: "number", description: "Mean Body Weight in grams" },
        sampleCount: { type: "number" }
      },
      required: ["pondId", "date", "mbw"]
    }
  },

  // 4. Mortality
  {
    name: "recordMortality",
    description: "Logs dead shrimp count and updates estimated population.",
    parameters: {
      type: "object",
      properties: {
        pondId: { type: "string" },
        date: { type: "string" },
        mortalityCount: { type: "number" },
        causeNotes: { type: "string" }
      },
      required: ["pondId", "date", "mortalityCount"]
    }
  },

  // 5. Document / Image Bulk Extraction
  {
    name: "extractFarmDocument",
    description: "Parses an uploaded image or PDF and produces an interactive multi-domain draft card.",
    parameters: {
      type: "object",
      properties: {
        fileStoragePath: { type: "string" },
        documentDomain: {
          type: "string",
          enum: ["water_quality", "feeding", "inventory_invoice", "sampling"]
        }
      },
      required: ["fileStoragePath", "documentDomain"]
    }
  }
];
```

---

## 6. Audit Trail & Reversibility (Undo / History)

Every write performed by Orson appends an audit object to preserve farm data integrity:

```typescript
export interface AgentAuditMetadata {
  modifiedBy: 'orson_agent';
  authorUid: string;
  authorName: string;
  authorRole: 'owner' | 'manager' | 'technician';
  timestamp: string; // ISO 8601
  sourceType: 'chat_prompt' | 'voice_note' | 'document_upload';
  sourceFileUrl?: string;
  previousValueSnapshot?: any; // For 1-click rollback
}
```

If a user makes a mistake:
- User: *"Orson, undo that last water quality entry for Pond 2"*
- Orson checks the `previousValueSnapshot` and reverts the document to its prior state.

---

## 7. Phased Implementation Roadmap

### Phase 1: Shared Agent Tools & Security Guardrails
- Define `functions/orsonAgentTools.js` with full schemas for WQ, Feeding, Sampling, Mortality, and Inventory.
- Integrate role-based permission verification (`shared/permissions.ts`) into each tool handler.
- Write unit tests for tool validation, range guards, and error messages.

### Phase 2: Core Data Handlers (Atomic Transactions & Biological Rules)
- Implement atomic writes for feeding deductions and financial sync.
- Implement biological calculation updates (ADG, population, biomass look-back).
- Add undo/rollback mechanism for recent agent mutations.

### Phase 3: Multimodal Vision Engine (Gemini 2.5 Flash)
- Expand document parsing beyond lab PDFs to include:
  - Handwritten daily water test logs / clipboards.
  - Paper feed usage logs.
  - Supplier purchase invoices.
- Build server-side entity resolution (fuzzy matching pond names and feed brands).

### Phase 4: Mobile & Web UI Parity
- **Mobile (`AIChat.tsx`):**
  - Add camera & file attachment button to Orson chat.
  - Add interactive Action/Receipt cards with inline edit & Undo buttons.
- **Web:**
  - Mirror the identical chat interface and draft cards on the Next.js dashboard.

---

## 8. Verification & Test Plan

1. **Permission Test:**
   - Verify that a `technician` can log water quality and feeding, but is blocked from ending a cycle or altering inventory purchase prices.
2. **Biological Parity Test:**
   - Verify that logging sampling via Orson updates ADG and MBW without deducting inventory.
   - Verify that logging feeding via Orson atomically deducts inventory and syncs finance expenses.
3. **OCR & Handwriting Test:**
   - Test photo of a physical pond clipboard with 8 ponds $\to$ verify all 8 pond records update correctly in Firestore.
4. **Real-Time Parity Test:**
   - Log water quality via Orson chat on mobile $\to$ verify the web dashboard updates instantly via Firestore `onSnapshot`.
