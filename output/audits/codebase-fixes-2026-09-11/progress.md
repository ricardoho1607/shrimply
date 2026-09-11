# Audit fixes — 11 September 2026

Application fixes for findings 01–14 are implemented and verified locally. Finding 15 is partially resolved: production dependencies are clean, but native tooling checks and development CLI advisories remain. Nothing has been committed, pushed, deployed, or migrated in production.

| Finding | Local correction | Main files |
| --- | --- | --- |
| 01 — Self-granted permissions | Protect added, changed, and deleted authorization fields; reject preseeded membership/overrides. | `firestore.rules` |
| 02 — Disease privacy | Company-scoped private reports; server-owned public projections with approximate 1° coordinates; remove private notification fanout and sanitize historical notifications through an explicit migration. | `firestore.rules`, `functions/diseasePrivacy.js`, `functions/shared/publicDiseaseAlert.js`, both disease screens and notification services |
| 03 — Storage permissions | Require reciprocal company membership and honor feature overrides; preserve authorized asset/lab operations. | `storage.rules` |
| 04 — Duplicate feeding | Reconcile desired daily totals against authoritative stock in one transaction; immutable operation receipts prevent retries from replaying older intent. Sampling never deducts inventory. | `shared/dailyFeedTransaction.ts`, `app/services/dailyFeedTransaction.ts`, both mobile stores |
| 05 — Mobile uploads | Correct profile/asset/lab paths and metadata to match Storage rules. | `app/utils/imageUpload.ts`, asset inventory and water-quality screens |
| 06 — Stalled queue | Acknowledge each successful operation; retain failures and their dependents while allowing unrelated ponds to progress; preserve work added during acknowledgement. | `app/hooks/useFirebaseSync.ts`, `app/components/SyncStatusIndicator.tsx` |
| 07 — Offline logout | Remove the network write from the critical sign-out path; retain encrypted pending work while clearing readable account caches. | `context/AuthContext.tsx`, `app/services/protectedStorage.ts`, cache services |
| 08 — Ledger divergence | Require matching harvest/revenue and stock/expense writes; immutable stock history and void/replacement corrections; preserve finance metadata on new inventory. | `firestore.rules`, `app/store/feedAdditiveStore.ts`, web harvest screen |
| 09 — Renewal/expiry race | Re-read entitlement and grant within the expiry transaction so a newer renewal or lifetime entitlement wins. | `functions/billing.js` |
| 10 — Notification order | Order before limiting; add composite index and normalize/backfill legacy timestamps without changing their chronology. | `web/src/hooks/useDashboardData.ts`, `firestore.indexes.json`, `functions/diseasePrivacy.js`, migration script |
| 11 — Rejected onboarding request | Subscribe to pending requests and clear rejected/removed requests; scope state to the signed-in user. | `app/companysearch.tsx` |
| 12 — Cosmetic settings | Replace nonfunctional notification/backup switches with truthful information; retain actual working settings. | `app/settings.tsx` |
| 13 — Dialog accessibility | Native modal semantics, field labels, explicit forward/backward Tab containment, Escape and focus restoration. | `web/src/components/AccessibleDialog.tsx`, confirmation and pond dialogs |
| 14 — Verification debt | Restore runnable root/web test discovery, TypeScript test support, fix lint errors without disabling correctness rules, repair stale source assertions. | `scripts/run-tests.cjs`, test helpers, root/web lint configuration and affected components |
| 15 — Dependencies/tooling | Compatible Expo/Next/transitive updates; patched CommonJS URI decoding and Xcode UUID compatibility. Production audit clean. Native and dev-tool limits below. | package manifests/locks, `vendor/decode-uri-component` |

Additional UX corrections preserve harvest drafts across live pond measurements, prevent account changes from showing stale scoped state, and keep nested UI components from remounting unexpectedly.

## Verification

- Full suites: **401/401** root mobile/shared/backend tests and **257/257** web tests.
- Firestore emulator: **21/21** authorization, source/ledger and team-access tests.
- Storage emulator: **4/4**; reused passing result because Storage rules did not change afterward.
- Privacy migration emulator regression: **1/1**, covering non-mutating dry-run, sanitized apply, preserved timestamp chronology and repeat application.
- Final focused behavior/dependency run: **10/10**, including feed transactions, independent queue progress, encrypted pending-work retention, timestamp normalization, public projection and dependency compatibility.
- Mobile TypeScript: passed. Web TypeScript and final Next production export: passed.
- Mobile `npm run lint`: **0 errors, 75 warnings**. Web broad lint: **0 errors, 119 warnings**; final dialog check: **0 errors, 0 warnings**. Warnings remain and are not described as a warning-free codebase.
- Browser on the fresh production export using the authorized signed-in session: pond page loaded; add-pond labels and modal background exclusion verified; Shift-Tab wraps to the last control, Tab wraps to Close, Escape closes and restores focus. No records were saved during this check.
- Mobile production audit after the final install: **0 vulnerabilities**. Web and Functions audits were also clean after their compatible updates.
- Android release integrity: passed. Expo doctor: **19/21**.

Final logs and a compact verification summary are under `evidence/`. Earlier logs in that directory are historical and may contain intermediate failures that were subsequently fixed.

## Remaining limits and rollout work

1. **Native verification:** CocoaPods and full Xcode are unavailable. Expo doctor also flags native folders plus app configuration that EAS does not automatically sync. Android integrity passed, but a native iOS build and device checks for uploads, offline logout/relaunch, feeding synchronization and rejected onboarding still require the native toolchain. Native projects were not regenerated blindly.
2. **Development dependencies:** eight moderate advisories remain in the Firebase CLI tree (`@opentelemetry/core`, `csv-parse`, `qs`, `stream-json`, `uuid` and their affected parents). A non-forced audit fix was attempted. The proposed full automated fix downgrades Firebase CLI to 10.1.1 and is incompatible with the current workflow. These dependencies are excluded from the clean mobile production audit; no incompatible override or forced downgrade was applied.
3. **Production rollout:** the code changes do not secure or repair the deployed system until the Firebase rules/functions/indexes and coordinated web/mobile clients are released. `scripts/migrate-audit-privacy.cjs` requires an explicit project and defaults to dry-run; production application has not been authorized or run. Review counts and perform the privacy/timestamp backfill during that coordinated rollout. Older clients may encounter permission errors under the hardened rules.
4. **Historical finance:** enforcement prevents new detached source/ledger writes; it does not invent corrections for historical inconsistencies. Reconcile any existing mismatches against source records before applying financial corrections.

Unrelated starting changes, including project instructions, Metro configuration and the existing finance chart work, were preserved. No release actions were performed.
