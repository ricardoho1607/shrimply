# Shrimply Daily Farm Simulation & QA — Scheduled Work Handover

## Schedule and scope

Create or update recurring local work in this chat for **09:00 and 18:00 Australia/Melbourne**, respecting daylight saving. Use the app’s automation tool; update a matching automation rather than duplicating it. The computer and desktop app must be running.

Follow `docs/DAILY_QA_OPERATIONS.md`, with these refinements. Verify `pilot@shrimply.test` / **Pilot Shrimply** each run. Use only existing SIM-labelled ponds and associated SIM inventory; exclude SOP-QA ponds and other tenants. Preserve ownership, cycles, stocking dates, history, harvests, and user edits. Calculate DOC per pond without changing stocking dates.

All new observations are authorized **synthetic fixtures**. Label them **SIMULATION ONLY** wherever possible; otherwise record that classification in QA evidence. Use normal website forms and refresh verification. No direct Firestore writes, mocked saves, code edits, deployment, deletion, role/billing changes, or high-volume load tests.

## Daily execution

**Morning:** Review live history; save AM water quality, AM feed, and daily chemistry/mineral results for each eligible pond. Add plankton Monday/Thursday and pathogen observations Monday where supported, plus scenario-driven observations. Complete due sampling and submit the day’s three Orson questions.

**Evening:** Save PM water quality and remaining feed; update existing combined daily records rather than duplicating them. Reconcile feed/inventory, complete outstanding sampling when safe, and post one consolidated report here. Prefilled PM fixtures do not establish evening completion.

## Resume and retry rules

- Prevent overlapping writers with a single-run lock. Reconcile interrupted work before resuming.
- Keep current state in `qa-reports/simulation-checkpoint.json`, separate from historical events. Key operations by Melbourne date, pond ID, verified cycle reference, record type, and shift/milestone. Track pending/verified/failed/blocked/uncertain, intended values, saved reference, and evidence.
- Capture existing records before saving. Refresh afterward and compare date, pond, values, units, and record count. Save the checkpoint after each verified operation.
- Reconcile before retrying. Allow one retry only when the original save is confirmed absent; never retry an uncertain write. Stop the affected workflow after repeated failure and continue independent safe work. Unsafe tenant context stops all writes.
- Track missed shifts and overdue milestones separately. Backfill only missing authorized synthetic records with verified historical dates. Live records establish persistence; stale notes cannot override current instructions.

## Simulation and verification

- Preserve scenario assignments. Define reproducible baseline → stress → recovery fixtures and expected outcomes; retain a healthy control. Synthetic feed response must be explicit, never inferred from feed allocation.
- Verify feed inventory deductions exactly once, including retries. Reconcile opening stock, net usage, other visible movements, and closing stock with units and rounding tolerance. Never create compensating adjustments.
- Sample at DOC30 and every five DOC thereafter. Save numeric MBW/feed; verify date, persistence, modal closure, and **no inventory deduction**. Check valid-MBW look-back, stocking fallback, ADG from actual dates, and population after mortality/harvests. Missing values are not zero.
- Test historical sampling on one pond before bulk backfill. An ignored date blocks that workflow; flag unintended records without deleting them or counting them as overdue milestones.

## Orson audit

Submit **exactly three questions per Melbourne day**: saved-data retrieval/trend/calculation, aquaculture knowledge, and scenario/comparison/diagnosis. Rotate ponds, language, and missing-data cases. Test retrieval without supplying all the numbers.

Independently capture relevant 3–5 WQ/sampling records, valid daily feed totals, labs, and WQ since the previous sample. State gaps. Feed/lab failures do not block Orson; unsafe context, authentication failure, or unavailable Orson may.

Save each exact question before submission and the complete answer/response time immediately afterward. Reconcile uncertain submissions across restarts; never submit replacements or a fourth question. Check arithmetic against saved records and knowledge against authoritative sources. Grade Pass/Partial/Fail/Unverifiable with evidence. Central calculation errors, invented trends, or definitive unsupported diagnoses fail. Missing transcripts make verdicts provisional.

## Coverage and reporting

Verify daily persistence/inventory for every pond. Rotate deeper checks across sampling, labs, treatments, harvests, reports, and Orson; track last-tested dates and defects. Inspect desktop 1440×900 and mobile web 390×844, including lower controls/tables. Mobile web does not verify native Expo. Destructive/fault-injection tests require separately authorized disposable fixtures.

Capture defect evidence immediately: steps, expected/actual results, date, pond/cycle, viewport, and record reference. Distinguish website defects from automation failures; disclose evidence limitations.

Save dated reports/evidence under `qa-reports/`; update `latest-report.md`. The evening report covers every pond, DOC/scenario, completed/failed/skipped work, feed/inventory, sampling gaps/next milestone, labs, three Orson verdicts, coverage gaps, and required action. Never claim a farm-wide pass with unresolved failures. Notify critical breakages immediately; otherwise keep morning work quiet. Do not message others.

## First-run reconciliation

Recheck October 12, 2026 findings against live records: missing October 9 DOC50 samples, unintended October 12 SIM-A1 sample, incomplete Orson transcripts, uncertain cross-tab history, conflicting checkpoint statuses, stale latest report, and incomplete mobile coverage. Preserve records and verify any claimed resolution.
