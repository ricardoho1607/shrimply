---
name: shrimply-firebase-data-guardian
description: Use this skill when auditing, fixing, or building Firestore logic, Firebase Auth logic, company ownership checks, role permissions, data access, collection paths, real-time listeners, buyer privacy, or missing-data handling in Shrimply.
---

# Shrimply Firebase Data Guardian

## Purpose

Use this skill to protect Shrimply's Firebase and Firestore logic.

The goal is to prevent:
1. Wrong collection paths
2. Missing company filtering
3. Broken role permissions
4. Buyer-facing privacy leaks
5. Accidental broad reads
6. Unsafe writes
7. Missing-data crashes
8. Incorrect finance, pond, inventory, or report data

## Core Rule

Never treat Firebase changes as simple UI work.

Any Firebase-related change must check:
- collection path
- document shape
- company ownership
- role access
- read/write safety
- missing field handling
- timestamp handling
- privacy impact
- listener restore behavior after app refresh/reopen
- fallback behavior when optional documents are missing but related documents still exist

## Company Ownership Rules

Most Shrimply data must be scoped to a company.

Always verify:
- reads are filtered by the correct companyId
- writes include the correct companyId
- updates cannot target another company's document
- buyer-facing data does not expose private company fields
- users cannot access data before company approval unless intentionally allowed

## Lifecycle Data Rules

For pond/cycle/harvest/inventory flows:
- Do not assume one collection is the only source of truth if the app has legacy or fallback fields.
- Check whether UI state is reconstructed from Firestore after refresh, not only from local store state.
- If adding a new parent document such as a cycle, confirm child documents still contain enough IDs/names to recover gracefully.
- Closing or ending a lifecycle must update both the parent status and any active child records that should no longer be active.

## Buyer Privacy Rules

Buyer-facing features must not expose private farm data unless intentionally made public.

Protect:
- internal finance data
- detailed disease reports
- private maintenance logs
- staff names
- internal notes
- exact sensitive operational details
- non-public inventory data
- private pond-level records unless approved for buyer view

## Inventory Safety Rules

Feeding deducts inventory.

Sampling does not deduct inventory.

Check:
- feed deduction happens only from feeding actions
- sampling feed amount is only for FCR/projection
- deductions use the correct inventory item ID
- deductions are atomic when stock quantity changes
- stock cannot accidentally become negative unless intentionally allowed

## Final Response Format

Return:
1. Firebase/data issue reviewed
2. Collections or paths inspected
3. Ownership and role checks
4. Privacy risks found
5. Files changed
6. What changed
7. Verification run
8. Remaining risk or manual testing required
