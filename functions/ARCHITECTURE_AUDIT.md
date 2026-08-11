# Firebase Functions architecture audit

Baseline: `ad279bd` (`v2`), after App Check/backend-abuse hardening `688907f` was accepted into `v2`.

## Exported Functions

| Export | Type | Responsibility |
| --- | --- | --- |
| `requestAndroidTesterAccess` | callable | Validates/rate-limits Android tester requests, stores them, and sends the admin email. |
| `createCompanyInvite` | callable | Creates secure company invitations after owner/co-owner authorization. |
| `revokeCompanyInvite` | callable | Revokes a pending secure invitation. |
| `listCompanyInvites` | callable | Lists invitations for an authorized owner/co-owner. |
| `acceptCompanyInvite` | callable | Accepts secure/legacy invitations and provides the backward-compatible team-operation dispatcher. |
| `createCompanyJoinRequest` | callable | Creates one transactional join request per user. |
| `processCompanyJoinRequest` | callable | Approves/rejects a join request and updates reciprocal membership. |
| `removeCompanyMember` | callable | Removes a staff member and revokes related pending access records. |
| `getOrsonMortalityContext` | callable | Returns authorized, rate-limited 14-day mortality context without an AI call. |
| `generateOrsonResponse` | callable | Enforces Orson authorization/rate/quota policy and calls Gemini. |
| `extractLabReportFromPdf` | callable | Validates a stored lab PDF, enforces extraction limits, and extracts structured results with Gemini. |
| `processConfirmedLabReport` | Firestore trigger | Produces deterministic/AI lab summaries and notifications for a confirmed report. |
| `notifyNearbyFarmsOnDiseaseReport` | Firestore trigger | Fans a new disease report out to nearby companies. |
| `orsonProactiveConsultant` | Firestore trigger | Evaluates a pond after new sampling and creates deduplicated risk notifications. |
| `orsonDailySupervisor` | scheduled | Builds daily pond, inventory, and nearby-disease notifications for every company. |
| `recordOrsonPrediction` | callable | Stores a server-reconstructed, deduplicated Orson prediction. |
| `orsonPondCycleLearning` | Firestore trigger | Records a completed pond outcome and recalibrates company learning. |
| `orsonFarmCycleLearning` | Firestore trigger | Processes a newly closed multi-pond farm cycle. |
| `getAdminMetrics` | callable | Loads platform metrics and company summaries for the founder. |
| `hardDeleteCompany` | callable | Founder-only recursive company/user deletion. |
| `searchAdminAccounts` | callable | Searches the bounded admin user/company directory. |
| `getAdminAccountIntelligence` | callable | Loads detailed account, farm, activity, billing, and security context. |
| `deleteAdminUser` | callable | Platform-owner user deletion with membership cleanup. |

## Modules and initialization

Baseline sizes were: `index.js` 121,096 bytes, `orsonLearning.js` 33,708, `adminIntelligence.js` 24,668, `adminMetrics.js` 18,152, and `orsonLearningCore.js` 11,661. The entrypoint mixed tester onboarding, team access, Orson requests, lab processing, disease fan-out, scheduled supervision, initialization, and exports.

After the split: `index.js` 509 bytes, `orson.js` approximately 88 KB, `teamAccess.js` 27 KB, `testerRequests.js` 5 KB, and `shared/companyAccess.js` 1 KB. Existing admin, metrics, learning, abuse, and policy modules remain separate.

Firebase Admin initialization is centralized in `index.js`; `firebaseAdmin.js` also guards with `getApps()`, so initialization occurs once. Firebase services are obtained through the shared wrapper. Gemini is now required lazily and one client is reused per warm process/API key instead of constructing a client for each AI call. The entrypoint still imports every exported module because Firebase discovers exports from one CommonJS entrypoint, but non-AI Functions no longer load the 612 KB Gemini SDK during module initialization.

Installed direct dependency sizes observed locally: Firebase Functions 2.0 MB, Firebase Admin 1.9 MB, Gemini SDK 612 KB, and Luxon 4.5 MB. Luxon had no runtime or test references and was removed from the manifest/lockfile.

Shared backend helpers include `firebaseAdmin.js`, `abuseProtection.js`, `teamAccessPolicy.js`, `orsonRequestPolicy.js`, `orsonLearningCore.js`, `adminIntelligenceCore.js`, and the extracted `shared/companyAccess.js`. Small date/number normalizers are duplicated between Orson and admin modules; their semantics differ enough that consolidating them now would add coupling without a supported performance benefit. Admin authorization helpers also intentionally differ: admin intelligence accepts the platform-owner claim, while admin metrics additionally restricts access to the founder email.

## Supported findings

### Critical

None proven from the current code. Security/quota ordering remains server-authoritative, and no endpoint-name incompatibility was found.

### High

- `orsonDailySupervisor` reads all companies, then all ponds, feeds, and additives per company. It also re-reads the full active `diseaseReports` result separately for each company. Cost grows with companies and inventory history, and companies are processed sequentially.
- `shouldCreateProactiveNotification` reads every notification for a company and filters type, dedupe key, and time in memory. The daily supervisor may call it once per forecast plus biosecurity/brief notifications, multiplying reads. A safe server query needs verified composite indexes before changing this path.
- `notifyNearbyFarmsOnDiseaseReport` reads every company and calculates distance in memory for each disease report. This is O(company count) and cannot be safely bounded without a location/geohash query design.
- `getAdminMetrics` reads complete user/company collections, performs collection-group AI usage reads, and loads ponds/physical ponds/cycles per company. This is an admin-only, rate-limited N+1 path but will become expensive as company count grows.
- `searchAdminAccounts` loads up to 2,000 users and companies, then issues one billing read per company concurrently. The fan-out can approach 2,000 reads in one request.
- Legacy fallback in `acceptCompanyInvite` scans the full companies collection when a secure invite hash is not found. It is rate-limited and retained for installed-client/backward compatibility.

### Medium

- Orson mortality context reads the complete additives collection and scans embedded `usageHistory` arrays. Lab summaries are bounded to 5 and harvests to 50; additives cannot be safely bounded without changing the current storage model.
- Lab PDF extraction and confirmed-report processing read every pond in a company to validate/match pond identifiers. Result writes are bounded to 200, but the pond lookup itself is not bounded.
- Orson learning queries all predictions for a pond/cycle. Calibration outcomes are bounded, but prediction history can grow without a retention/query bound.
- `hardDeleteCompany` processes top-level collections and Auth users sequentially. This favors predictable destructive behavior over speed and is not a hot path.
- `orson.js` remains the largest module because callable Orson, lab analysis, deterministic risk analysis, and proactive supervisor code share substantial helpers. A later split should first isolate deterministic risk/lab utilities with tests; doing so here would broaden the refactor.

### Low

- `toDate`, numeric normalization, and closely related formatting helpers exist in multiple domain modules. Their inputs/outputs are not identical, so they were reported rather than generalized.
- `revokeCompanyInvite` has no current direct mobile/web reference, but it is a deployed callable and may serve older/external clients. It was retained. Trigger/scheduled exports correctly have no client references.
- Production logging does not log full Orson prompts, API keys, or tokens. Lab JSON parse logs included up to 800 characters of model output; those excerpts were removed while retaining identifiers, response length, finish reason, and error message.

## Changes and practical indicators

- `functions/index.js`: 121,096 bytes to 509 bytes (99.6% reduction).
- Three unrelated entrypoint responsibilities moved: tester onboarding, team/invite access, and Orson/lab/proactive handling.
- One company-membership validator moved to a shared module and continues to serve Orson request/learning paths.
- Gemini SDK import changed from module-load to first AI use; one client is reused per warm process/API key.
- Three independent mortality-context reads now run concurrently after the pond authorization/data read.
- Pond-list loading and PDF download now run concurrently during lab extraction.
- Firestore read count was not reduced; the changes reduce sequential wait stages only. No latency claim is made without production measurements.
- No deployed Function export was renamed or added.
