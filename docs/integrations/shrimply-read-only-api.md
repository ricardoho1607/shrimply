# Shrimply Read-Only Farm API and Sites MCP

> [!IMPORTANT]
> **Website Linking UI Hidden**
> - **Website linking UI hidden**: The routed linking page (`/dashboard/settings/sites-mcp`) and Settings navigation card have been removed from the web client. The component is retained as an unexposed, dormant component in `components/integrations/SitesMcpSettings.tsx`.
> - **APIs, private Site, and existing grants unchanged**: The Firebase read-only API (`readOnlyApi`), the private Site (`shrimply-admin`), and all existing account grants/link mappings remain completely unchanged and operational.
> - **New website linking unavailable**: Initiating new website account linking is unavailable while the user interface is hidden.

## Architecture

ChatGPT/Codex connects to the private Sites MCP server **Shrimply Admin** (`shrimply-admin`). The Site calls the HTTPS Firebase Function `readOnlyApi` in `us-central1`; Firestore remains the source of truth. The web app formerly offered an authenticated account-link page at `/dashboard/settings/sites-mcp` (now hidden; component retained dormant in `components/integrations/SitesMcpSettings.tsx`).

The Firebase API supports the ordinary Shrimply Firebase ID-token path and a separate Site delegation path. Farm data operations remain read-only. Link management writes only short-lived challenge state and the server-side identity link.

## Read authorization

For Firebase callers, the Function verifies ID tokens with revocation checking and derives the UID from the token. It loads the user's current company record, checks reciprocal membership and `viewFarm`, and rechecks the current role, owner and team membership for every read. Enterprise technicians are restricted to currently assigned blocks. Inaccessible ponds return the same `404` as nonexistent ponds.

Site login is not Firebase login. The Site reads `oai-authenticated-user-id` only at the Sites-managed Worker boundary. It combines that trusted Sites user ID with the fixed Site project ID, then signs method, path, sorted query, timestamp, nonce, principal and body hash using a runtime secret. The Firebase Function verifies the HMAC, rejects replayed nonces atomically, resolves the Site principal to the linked Firebase UID, and re-runs the ordinary farm authorization checks. Forwarded UIDs, emails and company IDs never authorize access.

The link page requires a signed-in Sites user and a same-origin POST. Firebase creates a 256-bit random code with a five-minute expiry, stores only its hash, and binds it to the Site principal. The user pastes it into Shrimply Settings while authenticated. Firebase verifies the revocation-checked token, consumes the code and creates a one-to-one `farm:read` grant in a Firestore transaction. The code appears only on the human `/link` page; it is never returned to MCP tools or placed in a URL, browser storage or logs. Settings supports status and unlink. Each delegated read also checks account disablement/deletion, Firebase session revocation, grant scope/audience/expiry and current farm permissions.

The Sites identity interface exposes a stable authenticated user ID, not a separate Sites session identifier. The one-time code is issued only in that authenticated Site session, has a short expiry, is bound server-side to that Site principal, and is single-use.

## HTTP contract

All responses use `Cache-Control: private, no-cache, no-store, must-revalidate`, `Pragma: no-cache` and `Expires: 0`. CORS is disabled. Errors have the stable `{ "error": { "code", "message" } }` form; internal exceptions return fixed safe messages.

| Route | Authentication | Purpose |
| --- | --- | --- |
| `GET /api/integrations/v1/ponds` | Firebase Bearer or signed Site delegation | Authorized pond list; `limit` 1–100 (default 20), `cursor`, `blockId`/`block_id` |
| `GET /api/integrations/v1/ponds/:pondId/summary` | Firebase Bearer or signed Site delegation | Supported pond context and latest observations |
| `GET /api/integrations/v1/ponds/:pondId/water-quality` | Firebase Bearer or signed Site delegation | Explicit inclusive farm-local date range, maximum 90 days, paged |
| `GET /api/integrations/v1/ponds/:pondId/feed-summary` | Firebase Bearer or signed Site delegation | Recorded daily feed totals and coverage, maximum 90 days |
| `POST /api/integrations/v1/site-delegation/pair-challenge` | Signed Site delegation only | Create a one-use pairing code; response goes only to Site `/link` |
| `POST /api/integrations/v1/site-delegation/pair-complete` | Firebase Bearer only | Consume the code and link the authenticated UID |
| `GET /api/integrations/v1/site-delegation/status` | Firebase Bearer or signed Site delegation | Return link state without exposing the UID or Site principal |
| `POST /api/integrations/v1/site-delegation/revoke` | Firebase Bearer or signed Site delegation | Delete the server-side link mapping |

Query and input validation rejects unknown/repeated keys, ambiguous aliases, caller-selected company/UID, invalid dates or IDs, excessive page limits and malformed cursors. Cursors are opaque, bound to UID/company/route/filters and history digests, and are not credentials.

## Site MCP tools

The Worker exposes stateless POST `/mcp`, current MCP `2026-07-28` and legacy `2025-11-25`, with exactly four `readOnlyHint` tools:

| Tool | Inputs |
| --- | --- |
| `list_my_ponds` | Optional `limit` (1–100), `cursor`, `block_id` |
| `get_pond_summary` | Required `pond_id` |
| `get_water_quality_history` | Required `pond_id`, `start_date`, `end_date`; optional `limit`, `cursor` |
| `get_feed_summary` | Required `pond_id`, `start_date`, `end_date`; optional `limit`, `cursor` |

Discovery is public and contains no farm data. Calls require the trusted Site principal; requests are validated, bounded to 90-day history windows and sent only to allowlisted GET endpoints. Responses have private no-store caching. The Worker rejects redirects and never exposes the HMAC secret or Firebase bearer token.

## Configuration and deployment

Published privately on 2026-10-02:

- Site: https://shrimply-admin.ricardofransiskusho.chatgpt.site
- Human link page: https://shrimply-admin.ricardofransiskusho.chatgpt.site/link
- MCP endpoint: https://shrimply-admin.ricardofransiskusho.chatgpt.site/mcp
- Site source commit: `49419cffcd0db9dd2f2740b9b5397ae33f1f5162`, version 1, production deployment succeeded with runtime environment revision 1.
- Firebase `functions:readOnlyApi` deployed successfully. A live unauthenticated pond request returned `401` with private no-store headers and no CORS allowance.

New website account linking is currently unavailable while the web linking UI remains hidden; backend APIs, the private Site, and existing grants remain fully operational and unchanged. The historical pairing workflow is documented below solely for reference when website linking is re-enabled in the future—do not visit the removed `/dashboard/settings/sites-mcp` route. When re-enabled in the future: install/connect the provisioned Shrimply Admin plugin, generate a one-time code on the human link page, and paste it into the authenticated Shrimply Settings pairing interface. Firebase Console sign-in does not link the Shrimply account.

- Firebase Secret Manager: `SITE_MCP_HMAC_SECRET`.
- Sites production secret: `SHRIMPLY_SITE_API_SECRET` (same random secret value).
- Sites non-secret runtime setting: `SHRIMPLY_READ_ONLY_API_URL=https://us-central1-investashrimp-5d9e5.cloudfunctions.net/readOnlyApi`.
- The secret must not appear in source control, Site archives or frontend code. Rotate by setting a new value in both systems and redeploying the Function and Site.
- Vercel same-origin rewrites under `/api/sites-mcp/{status,pair,revoke}` proxy the signed-in Shrimply app to the Firebase API. The API itself keeps CORS disabled.
- Runtime IAM: `readOnlyApi` uses `496805431411-compute@developer.gserviceaccount.com`. It requires `firebaseauth.users.get` for `verifyIdToken(token, true)` and delegated disabled/revoked-user checks. The project binding `roles/firebaseauth.viewer` supplies this read-only permission; preserve revocation verification when deploying or changing service accounts.

Deploy the Function with:

```sh
firebase deploy --only functions:readOnlyApi --project investashrimp-5d9e5
```

Rollback by restoring the prior `functions/readOnlyApi.js` and `functions/shared/siteMcpDelegation.js` revisions, then redeploying only `functions:readOnlyApi`. Revoke user links via the backend API or by revoking Firebase refresh tokens (the Shrimply Settings UI is currently hidden).

## Verification and remaining live checks

Run:

```sh
node --test functions/shared/readOnlyFarmApi.test.js functions/shared/siteMcpDelegation.test.js functions/readOnlyApi.test.js sites/shrimply-admin/mcp/handler.test.js
node --test web/src/app/dashboard/settings/sitesMcpVisibility.test.cjs
npm run test:team-security
npm --prefix web run lint -- src/app/dashboard/settings/page.tsx src/components/integrations/SitesMcpSettings.tsx
npm --prefix web exec -- tsc --noEmit --pretty false
```

The tests cover role and enterprise scope, feed and water data bounds, cursors, pair-code expiry/use, HMAC signature binding and replay, identity spoofing, disabled/deleted/revoked accounts, grant metadata and MCP adapter behavior. A live authenticated MCP read and cross-company denial still require the user's installed/connected Site plugin and a paired Shrimply account; local mocks are not evidence of those live checks.

Verified locally on 2026-10-02: the API/delegation tests and Site MCP tests passed (50 distinct tests, including 13 Site checks); team security (13), Functions exports (1), and web permission tests (11) passed. Targeted web lint had no errors and five existing warnings in the original Settings page; TypeScript passed. The Site client also bounds upstream response size to 1 MiB, aborts requests after 15 seconds, and sanitizes transport errors. The final API regression verifies all three actual Vercel rewrite destinations resolve to authenticated management routes, including canonical `pair-complete`.

Vercel production deployment `dpl_8Ua6PP4GhxkNQ64aE2g3fkcJrSTq` is READY at https://out-kvda5a7sd-ricardoho1607s-projects.vercel.app, with both `shrimplytech.com` and `www.shrimplytech.com` aliases. The live pairing page returned 200 and matched the locally built HTML exactly. The corrected production build passed TypeScript and generated all 190 pages; no protected-value placeholders remain in exported JavaScript or HTML.

The final `functions:readOnlyApi` update includes the canonical pairing route. All three production `/api/sites-mcp/{status,pair,revoke}` endpoints were verified to return `401 unauthenticated` without credentials, with private no-store headers and no CORS allowance. The user confirmed the plugin is not yet connected. Authenticated MCP reads and live cross-company denial remain unverified until installation/connection and explicit account pairing are completed.

On 2026-10-02, live Shrimply bearer status requests initially returned `401` because the runtime service account lacked Firebase Authentication user-read permission. Adding the read-only IAM binding above resolved the failure without changing application code or revocation checks. The same browser session then showed no authentication error, and production logs confirmed authenticated status GETs returned `200` at 09:56 UTC. All 16 API tests passed, including revoked-token rejection and delegated disabled/revoked-user checks. Actual pairing and plugin connection remain user setup steps.

On 2026-10-02, the signed-in in-app browser successfully generated a real, valid pairing code through the published Site. The production `/link/challenge` request returned `200`; the code was verified without exposing its value, and the page showed its five-minute expiry. Site source commit `136263f3b2f19c4bbe9c1f791b1e3e8c597be550` is published privately with runtime environment revision 1 and MCP enabled.

The link-page fixes use coherent same-origin referrer policies while preserving strict Origin checks, adapt the native Worker entrypoint without forwarding execution context as a fetch implementation, and preserve the runtime fetch receiver. Outbound requests use manual redirect handling and reject every `300–399` response before reading headers or content; cancellation cannot delay rejection, and requests are never followed or retried. Application diagnostics contain only allowlisted stages, failure classifications, hints and validated numeric status; they never log codes, identities, credentials, request headers, payloads or raw errors. All 41 focused Site checks and the build passed, including receiver and redirect regressions that reject the previous behavior.

Dependency audit limitation: the web install still reports four high advisories in the existing Firebase/Firestore `@grpc/grpc-js` dependency chain. The compatible Next.js update resolves to 16.3.8. The root mobile/tooling install reports 29 existing advisories (9 moderate, 20 high); those unrelated dependencies were not changed by this integration. No forced Firebase downgrade was applied.
