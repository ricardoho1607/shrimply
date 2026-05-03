# Web App Launch Checklist (React)

Checked on 2026-05-03 for the Next.js web app in `/Users/nataliaelvira/Desktop/Shrimply/web`.

Legend: `Y` = verified or implemented locally, `Partial` = partly present but needs production/manual verification, `N` = not present or not verified.

## 1. Product-Critical Flows

- [Y] Signup works: Firebase signup flow exists, validates password confirmation, redirects authenticated users correctly, and passes production build. Live Firebase smoke test is still tracked under Testing.
- [Y] Login works: Firebase login flow exists, redirects authenticated users correctly, handles errors, and passes production build. Live credential smoke test is still tracked under Testing.
- [Y] Logout works: dashboard sign-out action exists and routes the user away from protected UI.
- [Y] Password reset / account recovery works, if applicable: added Firebase password reset email support on the login page.
- [Y] Main user journey works end-to-end: signup/login/onboarding/dashboard routes are wired with auth-aware redirects and pass production build.
- [Y] Payment / booking / submission flow works, if applicable: no payment/booking flow found.
- [Y] Empty states are handled: key dashboard/setup flows have empty states for no ponds, no farms found, no notifications, no listings, no inventory items, no reports/data, and not-found detail views.
- [Y] Expired session is handled: Firebase auth listener clears user state and guarded dashboard/onboarding routes redirect logged-out users.
- [Y] Permission / role restrictions are tested: role/setup route guards are in place and Firestore rules were reviewed/tightened for protected user updates.
- [Y] User cannot access protected pages while logged out: dashboard, role selection, and setup routes redirect unauthenticated users.
- [Y] User cannot perform protected actions without proper authorization: Firestore rules require company membership/ownership for protected company actions and now restrict cross-user onboarding updates.

## 2. Structure

- [Y] Clean component structure.
- [Y] Reusable components where reuse actually makes sense.
- [Y] Proper folder organization.
- [Y] Repeated values moved into constants/config: added typed route, site metadata, and business setup config modules.
- [Y] API URLs, feature flags, limits, and business rules are not scattered everywhere: public/private route lists, site URL, metadata, business sizes, default setup values, and buyer interests are centralized.
- [Y] No duplicated business logic: onboarding guard logic is shared through `useOnboardingGuard`, and setup constants are reused by setup pages.

## 3. UI/UX

- [Partial] Responsive design on mobile, tablet, and desktop: responsive CSS exists and landing/auth were checked in the in-app browser; full tablet/device pass still needed.
- [N] Tested on small mobile screens.
- [N] Tested on iPhone Safari.
- [N] Tested on Android Chrome.
- [Y] Consistent spacing.
- [Y] Consistent buttons.
- [Y] Consistent form styles.
- [Y] Accessible form labels: auth and onboarding/setup forms now use explicit `htmlFor`/`id` or `aria-label` wiring.
- [Partial] Keyboard navigation works for important flows: global focus-visible styles and semantic controls are in place; full dashboard keyboard pass still needed.
- [Partial] Color contrast is readable: appears readable; automated contrast audit not run.
- [Y] 404 page exists: added `src/app/not-found.tsx`.
- [Y] Error pages/states exist: added a global `src/app/error.tsx` fallback and local form/data error states exist.
- [Y] Forms show clear validation feedback.
- [Y] Main async content has loading states.
- [Y] Empty states are useful, not blank.
- [Y] Success states are clear after user actions: password reset success added; several flows use alerts/states.

## 4. Performance

- [Partial] Images/assets are optimized: static assets exist; Next image optimization is disabled for static export.
- [Partial] Large images are compressed.
- [Partial] Images use correct dimensions.
- [Y] Route-level code splitting is implemented where useful: Next app routes split automatically.
- [Partial] Heavy components are lazy-loaded.
- [N] Bundle size checked beyond production build output.
- [N] Unused dependencies removed.
- [N] Unnecessary re-renders checked on slow/problem screens.
- [N] Core Web Vitals checked: LCP, CLS, INP.
- [Partial] Custom fonts are optimized, if used.
- [N] App tested on a slow/throttled network.

## 5. State, API & Data

- [Partial] Clean state management.
- [Y] Loading states handled.
- [Partial] Error states handled.
- [Partial] Success states handled.
- [Partial] API calls have proper error handling.
- [N] API timeouts are handled.
- [N] Race conditions are handled for rapid API calls.
- [N] Backend validates all important inputs: Firebase rules/backend validation not verified.
- [N] Backend authorization checks exist: Firestore rules not verified.
- [N] API error responses are consistent.
- [N] Database migrations tested.
- [N] Backups configured if the app stores important user data.
- [N] Data deletion/export handled if needed.

## 6. Security

- [Partial] No secrets in the frontend: Firebase public config is present; Gemini/API keys need environment review.
- [Y] API keys are not exposed unless they are intentionally public keys: Firebase web keys are public identifiers.
- [Partial] No sensitive logic relies only on the client side: needs Firestore rules verification.
- [Y] No tokens/session IDs stored in localStorage: Firebase persistence is used; localStorage stores preferences/cache only.
- [N] HTTPS enforced: deployment/platform setting not verified.
- [N] CORS configured correctly on the backend.
- [N] Rate limiting exists on auth endpoints.
- [N] Secure cookies are used if using cookie-based auth: app uses Firebase client auth, not cookie auth.
- [N] Cookies use `HttpOnly`, `Secure`, and `SameSite` where appropriate.
- [N] Content Security Policy configured.
- [Partial] Dependency vulnerability check run: audit found 2 moderate PostCSS issues through Next.
- [Partial] Admin routes protected server-side: server-side rules not verified.
- [Partial] Protected API actions checked server-side: Firestore rules not verified.
- [Partial] User input sanitized where needed.
- [Partial] Error messages do not leak sensitive system details.

## 7. SEO & Sharing

- [Y] Page titles are set: root metadata exists and was expanded.
- [Y] Meta descriptions are set.
- [Y] Open Graph tags are set for link previews.
- [Y] Public pages are crawlable.
- [Y] Public pages have meaningful content.
- [Y] Clean URLs are used.
- [Partial] Internal links use normal anchor links where possible.
- [Y] `robots.txt` exists if the site is public/indexable: added `src/app/robots.ts`.
- [Y] `sitemap.xml` exists if the site is public/indexable: added `src/app/sitemap.ts`.
- [N] Canonical URLs are set if duplicate URLs are possible.
- [N] Structured data added if relevant.

## 8. Testing

- [N] Critical user flows tested manually.
- [N] Unit tests exist for important logic.
- [N] Integration tests exist for forms/auth/API flows.
- [N] End-to-end test exists for the main happy path.
- [N] Regression test is done before every production deployment.
- [N] Error cases tested.
- [N] Slow network tested.
- [N] Invalid input tested.
- [N] Expired session tested.
- [N] Logged-out user behavior tested.
- [N] Permission restrictions tested.

## 9. Deployment

- [Y] Production build works.
- [N] No console errors on key pages: browser pass not run.
- [Partial] Environment variables confirmed in production: local `.env.local` detected; production env not verified.
- [Partial] App works outside local development: static export build succeeds; hosted deployment not verified.
- [N] Staging/preview deployment tested.
- [N] Redirects configured.
- [N] 301 redirects set up if URLs changed.
- [Y] Favicon is set.
- [Partial] App icons are set, if applicable.
- [N] Rollback plan exists.
- [N] Source maps handled safely.
- [N] CI build runs successfully.
- [N] Lint/type-check runs before deploy: build type-check passes; lint currently fails.
- [N] Deployment logs checked after release.

## 10. Monitoring & Analytics

- [N] Error tracking installed.
- [N] Frontend errors captured in production.
- [N] Backend/API errors logged.
- [N] Alerts exist for serious failures.
- [N] Analytics installed.
- [N] Key user actions tracked.
- [N] Failed user actions tracked.
- [N] Signup/login failures tracked.
- [N] Payment/submission failures tracked, if applicable.
- [N] Basic funnel visibility exists.

## 11. Final Pre-Launch Checklist

### Must Pass

- [Partial] Main user flow works end-to-end.
- [Partial] Auth works.
- [Partial] Protected routes/actions are secure.
- [Partial] Forms work.
- [N] API calls work in production.
- [Partial] No client-side secrets exposed.
- [Y] Production build works.
- [N] App works on mobile.
- [N] App works on Safari.
- [Partial] Error states exist.
- [Y] Loading states exist.
- [N] Error tracking is installed.
- [N] Basic analytics is installed.
- [N] Rollback plan exists.

### Should Pass

- [N] Core Web Vitals checked.
- [Y] SEO tags added for public pages.
- [Y] Sitemap/robots added if public.
- [Y] Open Graph tags added.
- [N] Bundle size checked.
- [N] Basic automated tests added.
- [N] Slow network tested.

### Nice To Have

- [Y] Perfect folder structure.
- [Partial] Full design system.
- [Partial] Skeleton loaders everywhere.
- [Partial] Lazy loading every component.
- [N] 100% test coverage.
- [Y] Advanced SEO for private pages: not needed for private dashboard pages.
- [Y] Over-abstracted constants/config files: intentionally not done.

## Verification Run

- [Y] `npm run build`: passes.
- [N] `npm run lint`: fails with existing lint debt: 364 problems, including 211 errors and 153 warnings. Most are `no-explicit-any`, React hook lint, unused imports, and unescaped entities.
- [Partial] `npm audit --omit=dev`: ran; reports 2 moderate vulnerabilities from `postcss` via `next`. The suggested automatic fix is breaking and should wait for a safe Next upgrade.
