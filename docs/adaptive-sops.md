# Adaptive SOPs and To-do

Implemented on `codex/adaptive-sops`. This document is the handoff for verification and rollout, not authorization to deploy.

## Product and data boundaries

Mobile `/sops` and `/todo` match web `/dashboard/sops` and `/dashboard/todo`. Existing pond dashboard layout is preserved. Existing operational records remain authoritative; SOP evaluation never operates equipment, records a treatment, or deducts inventory.

Staff draft procedures. Current company owners and managers approve immutable versions, publish selected guidance, activate attributed private copies, review changes, approve exceptions, and sign off critical recovery. Company execution records, attachments, evidence and notifications stay private. Community publications require approved farm access, contain selected guidance only, and count distinct adopting companies. Retirement/unlisting preserves versions and history.

DOC schedules use pond scope because different ponds have different stocking dates. Shared work uses a calendar schedule or a recorded event; ambiguous shared DOC schedules are rejected. Step cards cover schedule/event/stage triggers, scope, targets, evidence, dependencies, pass/fail branches, bounded rechecks, escalation and stage prerequisites. Workflow preview is generated from the same structured definition. Water targets are deliberately unset in starter templates and must be approved by the farm. Narrative conflict detection is not exhaustive: only structured overlaps, competing steps and contradictory structured requirements are reported.

Adoption supports selected physical ponds, dynamic blocks and shared company work. Standing adoption follows new production cycles; current-cycle adoption retains cycle bindings. Adoption begins with a baseline and future applicable work. Updates keep existing task rules; the explicit migration preview lists affected unresolved instructions/checks and archives prior task versions. Preview/activation use expected revisions and approved version identifiers.

Adherence, target results, missing evidence, exemptions and open corrective episodes remain separate. An out-of-range reading creates one continuing issue; further failures update that episode. Recovery requires qualifying source evidence and action evidence. Critical closure requires an owner/manager review. “Not applicable” is an exemption, not a pass. Actual production events remain recordable and reconcile stages; a partial harvest alone never finishes grow-out.

Navigation and principal builder/task controls share English, Indonesian, Vietnamese, Thai and Chinese interface copy. Original guidance stays authoritative. On-demand translations are labelled and cached against the source revision; translations cannot modify approved rules.

## Implementation map

| Area | Files |
| --- | --- |
| Contracts, registry, validation, deterministic evaluation and scheduling | `shared/sop/` |
| Commands, authorizations, immutable versions, adoption and migrations | `functions/sop/service.js`, `versions.js`, `guards.js` |
| Due-work scheduling, projections, revision checks and corrective episodes | `functions/sop/runtime.js`, `evidence.js`, `currentEvidence.js` |
| Draft/import/translation and constrained narrative evaluations | `functions/sop/ai.js`, `narrative.js` |
| Private/public guidance copies and paginated withdrawal fan-out | `functions/sop/guidanceFiles.js`, `withdrawal.js` |
| Recipient delivery leases, receipts, retries and quiet hours | `functions/sop/push.js` |
| Mobile pages, scoped realtime/offline workspace and native push | `app/components/SopScreen.tsx`, `app/hooks/useSopWorkspace.ts`, `useSopPush.ts` |
| Web pages, scoped realtime workspace and IndexedDB files | `web/src/app/dashboard/sops/`, `todo/`, `web/src/hooks/useSopWorkspace.ts`, `web/src/lib/sopOfflineFiles.ts` |
| Rules, protected indexes and private attachment access | `firestore.rules`, `firestore.indexes.json`, `storage.rules` |

Commands are server-authoritative and idempotent. Clients cannot write compliance results. Occurrence identity excludes rules version so future rule edits do not duplicate an existing occurrence. Task migrations preserve explicit replacement/cancellation history. Projection revisions, evaluations, issue pointers, audit events and notification identities survive retries.

The scheduler queries active adoptions by `nextDueAt` and catches up in bounded pages. Reconciliation repairs missed projections every six hours. Source revision checks prevent a stale projection from establishing a pass. Out-of-order source events cannot replace a newer projection. Scheduler failures remain visible with a retry due time.

Supported evidence includes water quality, sampling, daily feeding totals, mortality, confirmed lab results, treatments, inventory, maintenance, harvest and lifecycle records. Historical date-only data stays date-only. Daily feed cannot prove feeding times or appetite; maintenance records cannot prove equipment actually operated. Exact observation time is explicitly captured, not inferred from receipt time. Compatible mass/concentration/length units normalize; ammonia/nitrite analytical bases stay distinct, and ppm is not assumed equivalent to mg/L.

New `waterObservations` are committed atomically with the existing daily water record. A new measurement time creates a separate real observation; a same-time edit revises that reading. Previous failed readings therefore remain available after same-day recovery. Firestore rules verify each observation against its committed parent, scope, cycle, value, unit and basis. Date-only recorded harvest/treatment events may schedule work from recording time, labelled separately from exact observed events.

The existing offline queue is reused on mobile. Web evidence and local attachments use identity-scoped durable storage. Evidence retains a stable submission ID and explicit performed time. Server receipt remains separate. Uploads are acknowledged before local files are removed; retries cannot duplicate a submission. Activation, migration, exceptions and authoritative closure remain online-only. Historical escalations are retained when delayed evidence arrives. Farms that have never activated an SOP skip the additional online guidance gates.

Bounded limits are explicit: an adoption has at most 200 targets; migrations preview/process at most 150 unresolved tasks per batch and report remaining work. Large task/library histories have protected pagination. Capacity errors reject work rather than silently omitting it.

## Reproducible checks

Install root, web and functions dependencies. Use a compatible Node runtime and Java 21+ for Firebase emulators. Web build also needs the repository's existing Firebase public environment configuration. Never commit local environment or credentials.

```sh
npm run test:sop
npm run check:orson-domain
npm run test:sop:emulator
npm run test:sop:browser
npx tsc --noEmit
npx tsc --noEmit --project web/tsconfig.json
cd web && npm run build
```

`test:sop:browser` prepares a gitignored SOP-only emulator wrapper, launches isolated Auth/Firestore/Storage/Functions and the web app, seeds a synthetic approved owner, and exercises the real builder, approval, block adoption, existing water form, corrective submission, one-minute recheck, recovery and critical sign-off. It asserts committed records and checks desktop/mobile-width rendering. It uses installed Chrome by default; `SOP_TEST_BROWSER` selects another installed Playwright browser channel. Test targets are fixed demo projects, never production. Stop other test servers on ports 3017/5001/8187/9099/9297 first.

The integration suite verifies private files, sanitized publication/withdrawal, denied cross-company/forged writes, idempotent offline replay, revoked assignments, corrected source revisions, shared event work, preparation without stocking, future updates/migration history, stage gates, one-episode correction and recipient push retry/quiet-hour policy.

## Release checks still requiring external access

1. **Physical device push and native build.** `expo-notifications` and Android/iOS configuration are prepared with app/runtime `3.3.0` / `3.3.0-sdk57`. Android signing protections are preserved. This workspace has no Android SDK/adb or CocoaPods, so no native build or physical device delivery was verified. Build compatible native binaries, configure provider credentials, then verify permission denial, normal/critical channels, foreground/background/killed app, quiet hours, company-safe deep links and invalid-token receipts. An OTA to the old runtime cannot supply the module.
2. **Narrative release configuration.** SOP drafting, PDF/DOCX/text authoring, translation and narrative evaluation use the same Meta Muse Spark adapter and `MODEL_API_KEY` as Orson chat. `SOP_NARRATIVE_CALIBRATED` defaults to false, and automatic approvals additionally require `SOP_NARRATIVE_CALIBRATION_ID=muse-spark-1.3-contributor:v2`. The actual evaluator/model prompt is shared with the labelled fixture runner:

   ```sh
   SOP_CALIBRATION_ENV=/path/to/authorized/local/key-file npm run test:sop:calibration
   ```

   The fixture report goes to gitignored `artifacts/sop/narrative-calibration.json`. Muse Spark passed all 10 live labelled fixtures using the existing authorized Meta key. The previous Gemini secret-access blocker is resolved. Set the matching calibration ID and enable the calibration boolean only as part of the controlled deployment. Recalibrate after model/evaluator changes; earlier calibration cannot enable a different evaluator. Only complete low-severity narrative passes with validated citations, explanation and confidence >= 0.90 can be automatic. Photos, failures, uncertainty, unsupported claims, higher severity and provider failures require human review.
3. **Native/offline acceptance.** Verify actual mobile sampling saves, offline evidence/attachment replay, company switching, revoked scope on reconnect, and the full corrective loop on Android and iOS devices. Browser emulators and TypeScript do not replace these checks.

Expo Doctor currently passes 18/21 checks. The remaining checks include pre-existing Expo SDK patch-version drift, missing CocoaPods and the project's existing native/non-CNG configuration warning. Unrelated dependencies were not upgraded. A pre-existing offline harvest rollback test returns 72 instead of 720; it was reproduced in the untouched primary checkout and is not fixed by this feature.

## Controlled rollout

No production deployment or Git push is part of this implementation. Deploy additive rules/indexes and the new SOP callable/event/scheduled functions before distributing the clients. Preserve existing functions. Confirm indexes are ready and function secrets/runtime parameters are available; keep automatic narrative decisions disabled until calibration passes. Prepare and verify native builds before release. Existing farms opt in through adoption and no historical compliance is fabricated.

Monitor adoption `nextDueAt` lag, `lastSchedulerError`, pending source verifications, oldest offline submissions, open/repeated episodes, projection failures, AI human-review rate and `sopPushDeliveries` retry/receipt errors. Failed evaluation must remain pending/needs-review. Audit/source retention must survive retirement and unlisting. Avoid deleting SOP runtime services while client guidance gates are active.

Release acceptance is incomplete until the device and mobile/offline checks above are verified and the calibrated evaluator configuration is applied during deployment.

## Verified checkpoint

Initial implementation checks passed: 23 SOP/evidence tests, 19 Firebase emulator integration tests, 41 affected regression tests, mobile/web TypeScript, new feature ESLint, shared-domain mirror consistency, Android signing/release integrity and the web production build. The final browser rerun passed the complete committed-record water-quality corrective loop, including the critical review action and responsive To-do page. The primary `v3` checkout stayed unchanged. Native/device acceptance remains outstanding. Live model verification is recorded below.

## Meta provider correction

SOP functions now share Orson's `muse-spark-1.3-contributor` model, `MODEL_API_KEY`, and Responses adapter. The adapter's default endpoint matches [Meta's documented base URL](https://dev.meta.ai/docs/overview). Its optional `text.format` schema leaves normal Orson chat requests unchanged. Strict [structured output](https://dev.meta.ai/docs/structured-output), complete-response checks and runtime narrative validation prevent malformed or truncated output becoming a pass. PDFs use private inline `input_file` data as described by [Meta file handling](https://dev.meta.ai/docs/file-handling); they are not published or uploaded to a reusable provider file store. Existing non-SOP OCR handlers keep their current provider.

To rerun the live synthetic provider checks:

```sh
SOP_CALIBRATION_ENV=/path/to/authorized/local/key-file npm run test:sop:meta
SOP_CALIBRATION_ENV=/path/to/authorized/local/key-file npm run test:sop:calibration
```

Keys are read locally and never printed or written to reports. Live tests use synthetic guidelines and evidence only. Reports are gitignored under `artifacts/sop/`. No production functions, flags, farm data, or secrets were deployed or changed by this correction.

Provider correction verification passed: 28 SOP/model tests, 36 Meta/Orson response tests, 19 Firebase emulator integration tests, 10 live narrative fixtures and the three live draft/PDF/translation checks. The full browser water-quality corrective loop also passed with the Meta-backed function codebase.
