# v4 adaptive SOP integration — 14 October 2026

Production base: `codex/v4-data-refactor` at `61f1a63`. Adaptive source: `codex/adaptive-sops` at `00a8381`, plus the tested Firebase efficiency changes. This merge retains v4's refactored pond, water, dashboard and mobile sync implementation and the existing native version/identity. No Android or iOS update is published by this rollout.

## Availability

- Web: `NEXT_PUBLIC_ADAPTIVE_SOPS_ENABLED=true` explicitly enables SOP navigation, pages and pond-stage/scope checks. The default is disabled.
- Main `www.shrimplytech.com`: disabled. Postbuild removes SOP/To-do static route artifacts, so direct URLs receive an actual host 404. Disabled pond checks return before any Firebase read or call.
- SOP test alias: `out-git-codex-adaptive-sops-ricardoho1607s-projects.vercel.app`. Its separate build explicitly enables the flag. It uses the real Firebase project, existing sign-in and farm permissions; this is not an isolated test database.
- Mobile: `EXPO_PUBLIC_ADAPTIVE_SOPS_ENABLED` defaults off. Routes redirect, menus remain hidden and SOP push navigation stays off until a separately enabled mobile release.

SOP observation-time controls and evidence persistence are integrated into the refactored web water form for the enabled test build. The main build does not show those controls or add SOP timestamp/basis fields to its ordinary water payload.

## Backend

Firebase project `investashrimp-5d9e5`, existing default database and function regions are retained. All 40 indexes are ready; 22 were added and all existing indexes retained. Routine adoption processing uses the fixed 30-minute policy, with minute safety/wake/continuation checks. Notification and withdrawal retry sweeps use five minutes.

Task deltas use the existing guarded `getSopWorkspace` callable with `taskUpdates:true`, because the account lacks the Cloud Run IAM permission needed to publish a new public callable. The unused new service was removed. Authentication and farm/assignment permissions remain required.

The deployed scheduler completed its initial work successfully (198.5s then 94.1s). A subsequent settled dispatcher request completed in 0.35s, versus recent old runs around 355s. This is sample runtime evidence, not a measured daily read or billing reduction. Compare equivalent production quota days before claiming overall savings.

## Verification

Backend: 102 prior unit/logic tests and 38 disposable-emulator integration tests passed. Existing function regions and unrelated function hashes were checked; unauthenticated task-delta requests return 401.

Integration: SOP logic tests, rollout/route checks, authentication/cache checks and targeted v4 persistence tests passed. Web/mobile type checks passed. Both enabled and disabled web builds passed. Targeted lint has no new errors. Three source-assertion water UI tests also fail on the untouched production v4 base; this integration preserves that layout rather than changing it to satisfy those existing assertions.

The rollout must verify the main domain remains on the disabled build, the SOP test alias points to the enabled build, and normal dashboard/auth URLs remain available. A production user session and native-device check are separate from these automated checks.

## Confirmed release

- GitHub `v4`: `2212140e24e8bdcfd492416a45ff7acae4b97d5b`.
- Main deployment: `dpl_2KsTr5UCtxasE7Dw2ZhFYPZ5iZ2Y`, https://out-rfy9x6io9-ricardoho1607s-projects.vercel.app. Both shrimplytech.com and www.shrimplytech.com point to this ready deployment. Main SOP and To-do routes return 404; homepage, auth and dashboard return 200.
- Enabled SOP test deployment: `dpl_4yyPQ6KuEbxDgiMNjEbygpZKt6ub`, https://out-90a5wuojk-ricardoho1607s-projects.vercel.app. The existing adaptive SOP alias points here. Its auth, SOP and To-do routes return 200.
- Firebase: 18 affected existing SOP functions are ACTIVE, the total function count remains 86, and all 40 indexes are READY. Unrelated function hashes remain unchanged.
- No mobile OTA or store release. No Firestore/Storage security rules deployed.

Refresh the SOP test tab to load the new client. Test normal pond saves and SOP completion/review there; it shares the real database. Compare the next complete Firebase quota day before estimating total savings. Use merged v4 source for future deployments so older adaptive source does not overwrite the deployed backend improvements.
