# Shrimply simulated farm QA — 4 September 2026

## Run result

- Account: Pilot Shrimply, `pilot@shrimply.test`; Cycle 1, DOC 15. The heartbeat timestamp is 3 September UTC, but the operating date in Melbourne and the app is 4 September.
- Added one feed entry and one daily water-quality entry for each of SIM-A1–SIM-H1. Weather and health observations are explicitly simulated in the water notes: fair weather, routine aeration, normal swimming/tray response, and zero dead shrimp observed (not an estimate of total mortality).
- Feed used: **75 kg**. Inventory: **7,056.6 → 6,981.6 kg**; cumulative use **1,018.4 kg**. All eight inventory deductions appeared once and matched the feeding total.
- Water inputs initially lost four values across two ponds. Corrected the existing records through the normal form; history showed exactly one 4 September record for each affected pond. The daily operations report then showed all eight complete water/feed rows.
- Mineral baseline **not saved**: the mineral form omits units and measurement bases. See QA-05. Do not claim lab warnings, charts, persistence, or Orson lab context passed.
- No sampling: all eight ponds show no sampling; first due DOC 30 (19 September). No harvest: no demonstrated capacity pressure justifying one. No additive application or purchase was justified; simulated mineral inventory remains **476 kg**, valued at **Rp 5,712,000**.
- Finance page loaded: 0 income records, 2 expense records, Rp 154,000,000 expenses. No new finance records created; detailed P&L/COGS or PDF calculations were not tested.
- Pond areas remain 2,500 / 2,650 / 2,800 / 2,950 / 3,100 / 3,250 / 3,400 / 3,600 m² for A–H. All eight active. No application code changed, no records deleted, and no non-SIM farm records edited.
- The browser was initially signed into a different company. Signed out and used the authorized Pilot login. This exposed the chat-isolation problem below; the browser is now signed into Pilot.

| Pond | Feed kg | Salinity ppt | pH AM / PM | DO AM / PM mg/L | Transparency cm | Alkalinity ppm | Temperature °C | TAN mg/L |
|---|---:|---:|---|---|---:|---:|---:|---:|
| SIM-A1 | 8.2 | 16.2 | 8.0 / 8.3 | 6.2 / 6.8 | 34 | 140 | 29.5 | 0.12 |
| SIM-B1 | 8.0 | 16.4 | 8.0 / 8.25 | 6.1 / 6.6 | 34 | 138 | 29.3 | 0.14 |
| SIM-C1 | 8.8 | 15.6 | 8.0 / 8.25 | 6.1 / 6.7 | 35 | 135 | 29.4 | 0.12 |
| SIM-D1 | 9.4 | 18.1 | 8.1 / 8.35 | 6.4 / 7.0 | 29 | 150 | 29.7 | 0.15 |
| SIM-E1 | 9.4 | 16.0 | 8.0 / 8.3 | 6.2 / 6.8 | 33 | 140 | 29.5 | 0.12 |
| SIM-F1 | 10.2 | 19.1 | 8.05 / 8.35 | 6.3 / 6.9 | 30 | 155 | 29.6 | 0.14 |
| SIM-G1 | 10.2 | 15.2 | 8.0 / 8.25 | 6.1 / 6.7 | 35 | 135 | 29.4 | 0.12 |
| SIM-H1 | 10.8 | 17.6 | 8.1 / 8.35 | 6.4 / 7.0 | 28 | 148 | 29.7 | 0.15 |

All water depths were 120 cm; water exchange was 0%; sludge low; no surface scum; normal shrimp behaviour. No new controlled risk event today.

## Ready-to-paste Codex repair handover

Fix the following issues with focused regression tests. Reproduce using two disposable test accounts, not real company data. Preserve SIM records, existing SR rules, ownership filters, and feeding-versus-sampling separation. Do not deploy, delete records, change Firebase rules, or migrate historical data without separate authorization. Local source references below are investigation starting points; the live deployment revision was not verified.

### QA-01 — P1: Orson conversation survives account/company switch

**Affected:** Orson web chat, Pilot login on 4 September; browser-tab session boundary.

**Reproduction:** In one tab, sign into test company A and ask about one of its ponds. Sign out, sign into test company B, then open Orson. Inspect the conversation before sending a new question.

**Expected:** Company B cannot see or reuse A's conversation. Outgoing history contains only the currently authenticated user's authorized company context.

**Actual:** After the Pilot login, the sidebar listed the eight SIM ponds, but the transcript still displayed earlier non-SIM pond questions and answers from the prior session. Those private measurements are deliberately not copied into this handover. One generic Pilot QA question was subsequently submitted before source inspection revealed that the app forwards retained messages as conversation history. No network payload was captured, so backend receipt of the old history was not independently verified.

**Source evidence:** `web/src/app/dashboard/ai/page.tsx:76` loads the unscoped `orson_messages` session-storage key; line 125 persists to the same key; line 162 passes the last ten messages as `conversationHistory`.

**Fix/acceptance:** Scope history to authenticated UID and company ID; clear in-memory history and pending persistence/streams on identity changes; do not send until identity/context is settled; do not import the legacy unscoped key into another account. Apply equivalent isolation wherever chat is persisted.

**Tests:** A→logout→B, same user/company switch, refresh, delayed persistence, and in-flight reply during logout. Assert old messages appear neither in B's DOM nor B's request body.

### QA-02 — P2: General Indonesian question becomes English pond analysis

**Affected:** Orson, Pilot, 4 September.

**Exact prompt:**

> Secara umum, bagaimana saya tahu kapan pakan udang vaname boleh dinaikkan, dan kapan harus ditahan? Jelaskan dengan bahasa sederhana untuk petambak pemula. Ini pertanyaan umum, bukan analisis kolam tertentu.

**Expected:** A simple Indonesian explanation of when to increase or hold feed, using observed tray response, shrimp condition, and water conditions. No unsolicited pond-specific analysis.

**Actual:** Orson began:

> The ponds SIM-B1, SIM-F1, SIM-A1, SIM-D1, and SIM-H1 are all showing a "watch" or "warning" risk level

It then discussed ADG, biomass-model differences, and feed-pressure ratios for five ponds. It did not provide the requested beginner-friendly general answer. Because QA-01 was present, repeat the language/scope test in a clean, isolated test session as well; history contamination may be a contributing factor.

**Fix/acceptance:** Honor general-knowledge intent and the user's language independently of default farm context. Inspect question routing, request construction, and the deployed backend version. Local `functions/orson.js` already contains an `aquaculture_knowledge` route and direct-answer instructions, so do not assume the live failure means those instructions are absent from source.

**Tests:** Indonesian and English generic feeding/nitrate questions with and without existing farm-analysis history; explicit single-pond question; explicit whole-farm question. Assert correct language and scope for each.

### QA-03 — P2: Completed Orson answer is cut off mid-sentence

**Affected:** Same request as QA-02.

**Actual ending:**

> avoid feed increases until the

The answer remained incomplete after subsequent inspection; the input was available and there was no displayed completion error.

**Expected:** A complete concise answer, or a clearly labelled interrupted response with a recovery option.

**Fix/acceptance:** Inspect provider finish reason, output budget, stream assembly, and final-message persistence. Local `functions/orson.js:597` configures a 512-token budget for most routes; this is a hypothesis to investigate, not a verified live root cause. Never silently present a truncated reply as finished.

**Tests:** Normal completion, token-limit finish, interrupted stream, and retry/continuation without duplicated text.

### QA-04 — P2: Missing growth observations described as measured slow growth

**Affected:** Same Orson response, DOC 15; SIM-B1/F1/A1/D1/H1.

**Reproduction:** Ask Orson the QA-02 question while ponds have stocking baselines and daily water/feed logs but no actual biological samplings.

**Actual:** Response said `Slow Growth (ADG = 0 g/day)` and that all listed ponds had smoothed ADG zero below the expected baseline. The pond list showed `Sampling terakhir: Belum Pernah` for all eight ponds.

**Expected:** Clearly state insufficient growth observations. Initial/fallback weight and water-only records must not masquerade as repeated weight measurements proving stalled growth.

**Fix/acceptance:** Carry growth-data provenance and availability through calculations and AI context. Do not alter the user's accepted SR formula merely because model estimates differ. Distinguish projected values, fallback values, and measured ADG.

**Tests:** No sampling; only stocking baseline; water/feed-only records; one valid sampling; two valid samplings with genuinely zero growth. Only the last appropriate case may support measured zero-growth claims.

### QA-05 — P2 / blocks mineral baseline: Lab units and analyte bases are missing

**Affected:** Water Quality → Lab Reports → Add Lab Report → Mineral Manual; all eight intended SIM baseline records, 4 September.

**Reproduction:** Open the form, enter a simulated lab name, and select SIM-A1. Inspect the bulk-entry headings and input guidance.

**Actual:** Headers include `NH4`, `NO2`, `Alk.`, `TOM`, `Ca`, `Mg`, and `Hardness` without units or measurement definitions. Header titles and input labels/placeholders did not supply them. Local code maps `Ca`/`Mg` to `hardnessCa`/`hardnessMg`, making elemental concentration versus hardness particularly ambiguous. The form enabled confirmation after merely selecting a pond, before any result was entered; no empty report was submitted.

**Expected:** State units and bases explicitly, including nitrogen-as-N versus ion mass, and elemental calcium/magnesium versus hardness expressed as CaCO3. Do not make users guess. Require a meaningful result before confirmation.

**Fix/acceptance:** Define the data contract, label fields and report outputs accordingly, validate ranges/precision and completeness, and retain source units/bases for imported reports. Do not reinterpret old results silently. Investigate `web/src/app/dashboard/water/page.tsx:1062` onward, corresponding mobile displays, extraction logic, and AI context.

**Tests:** Manual result save/read-back, missing units/basis, unit conversions if supported, blank selected pond, valid zeros, PDF extraction with differing units, report/chart/Orson consistency.

**Run action:** Cancelled the unsaved form. No mineral baseline was created. Resume all-eight baseline entry once units/bases are established; this task must remain pending rather than marked passed.

### QA-06 — P2: Water form can lose early inputs during pond selection

**Affected:** SIM-F1 and SIM-H1 daily water entries, 4 September.

**Reproduction sequence:** Water Quality → New Parameter Record → choose pond → promptly fill fields in displayed order → save. During this run, SIM-F1 was entered with salinity 19.1, pH AM 8.05, pH PM 8.35; SIM-H1 with salinity 17.6.

**Actual:** SIM-F1 saved blank salinity and both pH readings; SIM-H1 saved blank salinity. Later fields survived. History and reopened forms confirmed the missing values. Pre-submit snapshots of those first attempts were not captured, so the exact moment of loss is not proven.

**Expected:** Typed values survive asynchronous loading and pond updates. Initializing a form must not overwrite fields the user has already edited.

**Likely source to investigate:** `web/src/app/dashboard/water/page.tsx:348–442` hydrates or clears the whole form when `accessiblePonds`, pond/date, or modal state changes. Reproduce with delayed record loading or realtime updates before claiming a root cause.

**Fix/tests:** Protect dirty fields and initialize once per explicit pond/date selection; test rapid entry, delayed snapshots, background updates, and switching pond/date with unsaved edits. Ensure same-day correction updates one existing record.

**Run remediation:** Reopened the existing-day forms, restored missing values, and saved. Verified one history entry per affected pond/date and correct values in the daily report. No deletions or duplicate retries.

### QA-07 — P2: Duplicate historical risk notification is presented as fresh

**Affected:** Notifications, SIM-B1, viewed 4 September; original rain/low-DO event dated 1 September.

**Reproduction:** After today's normal water/feeding entries and the Orson QA question, open Notifications.

**Actual:** Two notifications had the same `SIM-B1 Heavy rain combined with low DO` title and the same 1 September event text, displayed with different relative creation times (about one minute and one hour). Latest SIM-B1 values were DO 6.1/6.6 and pH 8.0/8.25. Eight older field-ammonia-basis warnings also remained visible; this run did not establish whether those are intentionally retained history or unresolved current alerts.

**Expected:** Deduplicate the same event, show its source date, and distinguish historical/resolved warnings from current ones. Keep useful history without repeatedly presenting the old event as new.

**Fix/tests:** Key event alerts by company/pond/event identity; track last evaluated date and resolution state. Repeated analysis of the same event must not add another active alert; genuine new events must still alert. Test recovery readings and source-date versus creation-date display. Do not delete historical notifications during the fix without authorization.

## Follow-up verification

1. Fix account isolation first; use disposable test accounts for reproduction.
2. Retest the exact Orson question in clean and history-bearing sessions. Preserve the full prompt and response, language, scope, and finish status.
3. Clarify lab units, then enter the still-pending simulated baseline through the normal workflow and verify all downstream uses.
4. Test water-form input preservation under delayed realtime loading.
5. Continue daily SIM-only entries without duplicating 4 September. Do not sample before DOC 30. Preserve pond areas and the accepted SR calculation.

Browser CLI was unavailable, so this run used direct browser controls. Source was inspected read-only to make the handover actionable; no code tests or deployment were run.
