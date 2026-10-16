# Shrimply Daily Farm Simulation and QA

This guide describes the recurring stress-test and website QA work for Shrimply. All farm observations created for this task are synthetic test data, not real measurements.

## Schedule and scope

- Run at **9:00 AM and 6:00 PM Australia/Melbourne time**. Use Melbourne dates for daily deduplication and daylight-saving changes.
- Work only in the verified **Pilot Shrimply test account** and on its existing SIM-labelled ponds and clearly associated simulation inventory.
- Read current website records and the QA checkpoint before acting. Preserve pond ownership, cycle IDs, stocking dates, saved history, harvests, inventory and user edits.
- Advance each pond by one calendar day per real day. Calculate its DOC from its own stocking date; do not assume every pond has the same DOC.
- Save the resume checkpoint and dated evidence under `qa-reports/`. Live website records remain authoritative.

## Farm simulation data

Maintain distinct, continuing scenarios across the eligible SIM ponds, such as healthy baseline, rain stress, low dissolved oxygen, nitrogen buildup, plankton change, molting, reduced feeding response and slow growth. Preserve existing assignments where possible and make new synthetic observations consistent with each scenario’s recent history.

Synthetic values, including feed response, may be created for these test ponds to exercise the website. Label every entry **SIMULATION ONLY** wherever the workflow allows. Do not present synthetic data as real farm measurements or write it to a non-SIM pond or another company.

### Morning run

For each active eligible pond:

- Review the existing pond, cycle, feed, water-quality, sampling, lab and inventory records.
- Save morning water quality and the morning feed allocation through the normal website forms.
- Save one chemistry/mineral lab record every day.
- Save plankton lab records on **Monday and Thursday**; also test them on other days when the scenario warrants it.
- Save available pathogen observations on **Monday** and when the scenario warrants them.
- Complete sampling if the pond is due.
- Ask Orson the day’s three questions after checking existing submissions, so retries do not create more than three.

### Evening run

- Save evening water quality and the remaining feed allocation for each eligible pond.
- Reconcile the final daily feed amount against the linked SIM inventory movement. Count only the additional amount when updating an existing day’s feed record.
- Complete any sampling due today that was not completed in the morning.
- Confirm the checkpoint and prepare one consolidated report in this chat.

## Sampling cadence

Sampling is due per pond at **DOC 30, 35, 40, 45, 50, and every five DOC days thereafter**. Check for an existing record for that pond, cycle and milestone before saving. Save MBW and feed as numbers. Sampling records support biological calculations and must not deduct inventory.

The user has authorized filling gaps with synthetic test data for SIM ponds. Mark backfilled entries **SIMULATION ONLY**, preserve the intended historical date, and verify that date in the saved history after refresh. If the site saves a different date or the result is uncertain, stop that write and report the defect; do not count it as the missed milestone or silently substitute today’s date.

Calculate growth from valid saved history. Look backward for the latest non-zero MBW; use initial weight when no sample exists, and use the project’s 0.5 g default only when initial weight is absent and that assumption is disclosed. Calculate ADG from actual sample dates. Account for cumulative mortality and harvests. Missing values are not zero, and feed allocation alone does not prove appetite or tray clearance.

## Orson AI audit

Ask **exactly three questions per Melbourne calendar day**:

1. A pond-specific question requiring saved measurements, trends or calculations.
2. An aquaculture-knowledge question.
3. A scenario diagnosis, cross-pond comparison or other relevant capability question.

Rotate ponds and topics using the checkpoint. Include the latest three to five water-quality and sampling observations where available, three to five valid daily feed totals, relevant lab history, and water-quality history since the previous sampling. State what data is missing. A feed or lab save failure does not by itself prevent the Orson audit; only authentication failure, unsafe tenant context or Orson being unavailable should block the questions. Do not ask replacements or follow-ups after three questions have been submitted.

Save each exact question and complete answer, selected pond and response time. Independently check numerical claims against saved records and check aquaculture claims against authoritative sources. Grade each answer **Pass, Partial, Fail or Unverifiable**, citing specific evidence, unit/date errors, unsupported diagnoses or missing context. Do not treat keyword matches as proof of accuracy.

## Website stress test

Use normal user workflows on desktop (about **1440×900**) and mobile (about **390×844**). Inspect pond details, water quality, feeding, sampling, labs, inventory, treatments, harvests, reports and Orson. Check validation, saves, edits, refresh persistence, navigation, repeated-click protection, loading/error states and modal behavior.

Look for broken controls, clipped or overlapping content, unreadable tables, inconsistent units, misleading success messages and calculation discrepancies. Capture reproducible evidence and distinguish a website defect from an automation failure. Do not run high-volume load tests. Do not access or modify another company, non-SIM ponds, roles or billing.

## Feed and inventory checks

- Before saving feed, verify the pond, date, existing daily total, selected inventory item and amount.
- Explicitly choose an eligible, in-scope SIM feed item; never use a zero-stock test item such as **Codex Live Removal Test 2026-09-30**.
- Verify after refresh that feed was recorded and the corresponding inventory movement happened exactly once.
- Sampling never deducts feed inventory. Do not create artificial adjustment or removal records to compensate for a mismatch.
- If the inventory link or movement is uncertain, stop dependent feed writes and report it.

## Reporting

Post the consolidated evening report in this chat, even if there were no issues. Flag critical breakages immediately, including cross-tenant access, duplicate inventory deductions, lost records, widespread save failures or authentication preventing the run.

The report accounts for every eligible pond and includes its DOC, scenario, completed/failed/skipped records, daily feed total, inventory movement, sampling status and next milestone. It also includes all three Orson questions and verdicts, website defects with severity and reproduction details, evidence links, unavailable workflows, gaps and required user action. Never claim a farm-wide pass while an eligible pond has unresolved failures.

## Limits

Use the actual website’s workflows for records and verify persistence after refresh. Do not bypass saves with direct Firestore writes or mocked submissions. This QA task reports website defects; it does not edit website code, deploy changes or claim a fix without verification. The local computer and desktop app must be running for scheduled local work.
