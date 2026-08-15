# Firebase App Check and abuse-protection rollout

## Audited state

- Before this hardening change, native Expo clients used only the Firebase JavaScript SDK and could not issue native App Check tokens.
- The Expo web target and Next.js web app did not initialize App Check before this hardening change.
- No callable in the audited source sets `enforceAppCheck: true`.
- All deployed callable and HTTP Functions use public ingress. Callable protocol validation, Firebase Auth, and application authorization still run inside the handlers.
- A reCAPTCHA v3 site-key environment variable exists in the local web environment, but Firebase Console provider registration, the production Vercel value, and token issuance still require manual verification.
- The deployed project also contains billing callables and an HTTP webhook whose source is not present on the stable `v2` branch: `beginDokuCheckout`, `beginDokuEnrollment`, `cancelProRenewal`, `getBillingOverview`, `setEnterpriseEntitlement`, and `dokuBillingWebhook`. Their deployed authorization, signature validation, rate limiting, and App Check state cannot be safely changed from this branch. Recover their accepted source before the next Functions deployment.

## Sensitive callable inventory

| Functions | Current server protection | App Check rollout |
| --- | --- | --- |
| `generateOrsonResponse` | Auth, server-side company membership, bounded prompt, authoritative per-company daily AI quotas, per-user burst limit | Observe tokens; do not enforce until native installed clients support App Check |
| `extractLabReportFromPdf` | Auth, server-side company membership, exact report/storage path checks, per-company/type cooldown and pending lock, per-user hourly burst limit | Observe tokens; do not enforce until native installed clients support App Check |
| `processConfirmedLabReport` | Firestore-triggered; confirmed reports are immutable; referenced pond IDs are bounded and re-read inside the same company; paid insight generation is capped per company and falls back to deterministic analysis | Protect the originating Firestore writes only after native App Check rollout is safe |
| `getOrsonMortalityContext`, compatibility route in `generateOrsonResponse` | Auth, company membership, bounded document IDs, per-user burst limit | Observe tokens; shared native compatibility prevents enforcement |
| `recordOrsonPrediction` | Auth, company membership, pond lookup within the company, bounded values, deduplication, per-user burst limit | Observe tokens; shared native compatibility prevents enforcement |
| Team invite/join/member callables | Auth and verified email where applicable; company, role, target user, and ownership/co-ownership are re-read and authorized server-side; existing invite/join throttles | Keep unenforced until native adoption; App Check is not a replacement for these checks |
| `searchAdminAccounts`, `getAdminAccountIntelligence`, `deleteAdminUser` | Platform-owner custom claim, bounded inputs, audit events, per-user burst limits | Web-only candidates after production web token metrics are verified |
| `getAdminMetrics`, `hardDeleteCompany` | Founder email allowlist plus platform-owner custom claim; per-user burst limits; bounded company ID | Web-only candidates after production web token metrics are verified |
| `requestAndroidTesterAccess` | Public by design; bounded fields; hashed per-email and per-IP daily limits before Firestore writes and email delivery | Candidate after the public web form is confirmed to issue valid tokens |

Firestore event and scheduled Functions are not directly callable by clients. Their exposure depends on the write rules for their trigger documents and on scheduler/Eventarc permissions rather than callable App Check enforcement.

## Client support added

- Next.js and the Expo web target initialize Firebase App Check with `ReCaptchaV3Provider` when their public site-key environment variable is present.
- Token auto-refresh is enabled.
- Non-production web builds use Firebase's debug-token mechanism. The generated debug token must be registered manually in Firebase Console; no debug token is stored in source.
- Android now initializes the native Play Integrity provider in production and Firebase's native debug provider in development. A small custom-provider bridge supplies the resulting token to the existing Firebase JavaScript client, so Firestore, Storage, Authentication, and callable requests use the same App Check token without a broad Firebase SDK migration.
- No debug token is stored in source. Development tokens must be registered in Firebase Console.
- The app/runtime version is `3.2.0`, isolating this native-module change from installed `3.1.0` clients. This change must ship in a new Play Store build and must not be published as an OTA update for the old runtime.
- iOS App Check remains disabled because the Firebase project has no registered iOS app or `GoogleService-Info.plist`. Register the iOS app before adding App Attest with DeviceCheck fallback.

Required public environment variables:

- Next.js: `NEXT_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_V3_SITE_KEY`
- Expo web: `EXPO_PUBLIC_FIREBASE_APPCHECK_RECAPTCHA_V3_SITE_KEY`
- Local Next.js development only: `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_ENABLED=true` after registering the generated debug token. Leave unset otherwise.

Android EAS builds also require the `GOOGLE_SERVICES_JSON` file variable. The build hook validates that it belongs to Firebase project `investashrimp-5d9e5` and package `com.shrimply.tech.investashrimp` before copying it into the native Android project. The file remains gitignored.

The deployed project currently injects `RESEND_API_KEY` as a plain environment variable into every Function. This change declares it as a Secret Manager secret scoped only to `requestAndroidTesterAccess`. Before deploying, create/update the `RESEND_API_KEY` Firebase Functions secret and remove the same key from the local `functions/.env` file so Firebase does not continue propagating it as a normal environment variable. Rotate it separately if exposure policy requires; this task does not rotate credentials.

## Safe enforcement sequence

1. Finish the Android App Check registration in Firebase Console using the Google Play app-signing SHA-256 fingerprint and accept the Play Integrity terms as the account owner. Keep the default one-hour token TTL.
2. In Play Console, confirm the Play Integrity API is linked to Firebase project `investashrimp-5d9e5`.
3. Build Android `3.2.0` and test it through a closed track. Confirm Firebase App Check reports verified Android traffic before promoting it to production.
4. Deploy the web clients with enforcement off. Register local debug tokens only in Firebase Console.
5. Confirm valid web tokens and monitor App Check metrics plus `app_check_rollout_observation` logs for sensitive callables.
6. Measure Android version adoption and retain missing-token compatibility until supported builds cover the installed production population.
7. Register the iOS Firebase app and add App Attest with DeviceCheck fallback before any shared-service enforcement that includes iOS users.
8. First enable `enforceAppCheck: true` for web-only admin callables and the tester-request callable after their valid-token metrics are clean.
9. Enable enforcement for Orson, lab extraction, team, Firestore, and Storage only after unsupported native builds have been retired or explicitly blocked by a minimum-version policy.

Full App Check enforcement is not safe now: enabling it on shared Functions would reject every currently installed native client.
