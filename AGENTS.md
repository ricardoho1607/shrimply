# Shrimply Agent Instructions

> Orson AI is the chatbot assistant inside the Shrimply ecosystem. The overall platform is Shrimply.

## 1. Project Context

Shrimply is an aquaculture management platform for shrimp farms.

Tech stack:
- Mobile: React Native with Expo; use `package.json` for current versions.
- Web: Next.js App Router; use `web/package.json` for current versions.
- Backend: Firebase Firestore
- Sync: Firestore is the source of truth
- Mobile offline sync: `app/hooks/useFirebaseSync.ts`

## 2. Project Engineering Rules

- Use `v4` as the baseline branch for new Shrimply work.
- Preserve mobile and web parity where the same feature exists.
- Use live Firebase data rather than dummy data.
- Use TypeScript-safe code with strict null handling.

## 3. Firebase and Data Rules

- Firestore is the source of truth.
- Use `onSnapshot` for real-time sync where the existing pattern requires it.
- Preserve company ownership filtering.
- Preserve role-based access rules.
- Do not expose private company data to buyer-facing views unless explicitly intended.
- Use defensive checks for missing Firestore fields.
- Do not treat missing values as zero unless that is explicitly correct.

Required Firestore imports when adding Firestore logic:
- Mobile: `import { db } from '@/config/firebase';`
- Web: `@/lib/firebase`
- Common utilities: `collection`, `query`, `where`, `getDocs`, `onSnapshot`, `orderBy`, `doc`, `updateDoc`

## 4. Feeding vs Sampling Rule

- Feeding deducts Firestore inventory once, using `inventoryFeedId` and atomic `runTransaction` or `increment` writes. Relevant areas: `inventory/assetInventory` and the feeding section in `app/(tabs)/index.tsx`.
- Sampling is a biological observation: its feed amount supports FCR/projections and must never trigger inventory deductions. Store `feed` and `mbw` as numbers.
- Sampling UI: `app/(tabs)/index.tsx` and `web/src/app/dashboard/ponds/detail/PondDetailClient.tsx`.
- Sampling lifecycle & persistence: First sampling begins around DOC 30 targeting ~3.0g MBW (and every 5 days thereafter). Always ensure sampling records are genuinely saved and committed via "Save Record", verifying modal detachment and Firestore persistence. Never bypass or mock a sampling save.

## 5. Biological Calculation Rules

Use robust fallback logic because farm data may be fragmented.

### MBW Look-Back

Do not rely only on the absolute latest sampling record.

If the latest sampling has missing or zero `mbw`, search backward for the latest valid non-zero MBW.

### Stocking Fallback

If no sampling records exist:
- use `initialWeight`
- if missing, fallback to `0.5g`

### ADG

If 2+ samplings exist:

```txt
ADG = (latestMBW - previousMBW) / daysDiff
```

If only 1 sampling exists:

```txt
ADG = (latestMBW - initialWeight) / days from stocking date to sampling date
```

### Population

Always account for cumulative harvests:

```txt
population = (initialStock - totalMortality) - totalHarvested
```

Normalize field-name differences between platforms where needed:
- `mbw` vs `abw`
- `initialPopulation` vs `initialStock`

## 6. Orson AI Rules

Orson AI should provide real aquaculture intelligence, not generic answers.

Rules:
- Do not send only a single data snapshot when trend analysis is needed.
- Send the last 3 to 5 Water Quality and Sampling records where available.
- Orson must use the last 3 to 5 valid daily feed totals to calculate feed-allocation trends.
- Do not infer appetite, tray clearance, or feed consumption from a change in logged daily feed.
- When a new Sampling is created, cross-reference Water Quality history since the previous sampling to explain growth variation.
- Use stable production model IDs only.
- Avoid experimental or guessed model IDs unless verified in documentation.

## 7. Auth and Onboarding Rules

Roles:
- owner
- manager
- technician

Approval flow:
- New users request to join a company.
- Pending users remain in `/companysearch` until approved.

Safety:
- Never leave users stuck on setup, company search, or role selection screens.
- Always provide a Logout or Back option where users may get trapped.

When using `useAuth()`, destructure what is required:
- `user` for role-based logic
- `company` for `company.id`
- `signOut` for exit/logout buttons

## 8. UI and Branding Rules

Shrimply should feel premium, clean, modern, and professional.

Visual style:
- clean light-navy
- off-white backgrounds
- high contrast
- not crowded
- not childish
- professional aquaculture technology feel

Typography:
- Use Plus Jakarta Sans where configured.

Colors:
- Primary: `#0F4C75`
- Secondary: `#3282B8`
- Accent: `#BBE1FA`
- Danger: `#e74c3c`

Avoid:
- random colors
- cluttered layouts
- tiny text
- excessive decoration
- inconsistent spacing
- raw app-export style screens

## 9. PDF Report Rules

Shrimply PDF reports must read like professional company reports, not basic data exports.

Existing report services:
- Shrimp Report
- Cash Flow Report
- COGS Report
- Profit and Loss Report
- Financial Projection

Rules:
- Do not create new report services unless explicitly requested.
- Improve the existing report content and structure.
- Do not invent missing data.
- Do not use vague filler text.
- Explain what the numbers mean.
- Add executive summary, risks, recommendations, assumptions, and data quality notes where relevant.
- Financial projections must be assumption-based, not presented as guarantees.
- Finance reports must clearly separate cash flow, COGS, P&L, and projections.

## 10. Skill Improvement Rule

Propose guidance changes only for repeated mistakes, meaningful safety gaps, or reusable project conventions. Show the smallest exact diff and its purpose; edit or commit skills only when the user approves. Existing explicit approval is sufficient.

Prefer `AGENTS.md` for permanent project rules and skills for recurring workflows. Keep one-off details in tests; do not create skills for them.

## 11. Verification

Run checks relevant to the change and risk: affected tests, TypeScript/lint for changed code, Expo doctor for Expo/package issues, and build/config checks for configuration or dependency changes. Report unavailable checks and remaining manual verification. Do not repeat passing checks without a new change or unresolved concern.

## 12. SHIPALL / PUSHALL Release Shortcut

When the user says `SHIPALL` or `PUSHALL` (case-insensitive), treat it as explicit authorization to execute this production release workflow:

Vercel release procedure: run from the repository root, ensure the checkout is linked to project `out` with `npx vercel@latest link --project out --yes`, then deploy with `npx vercel@latest --prod --yes`. Do not deploy the separate `web` Vercel project. If Vercel returns `Not authorized`, refresh the project link once and retry; if authentication is still unavailable or the build is not `READY`, stop and report the blocker. Never commit `.env.local` or Vercel credential files created during linking.

1. **Commit to Git:** Run relevant checks, commit changes with a clear message, and push the branch to GitHub.
2. **Deploy Production Vercel:** Deploy the web app through the Vercel project `out`, verify that `https://www.shrimplytech.com` points to the new production deployment, and confirm the live URL returns successfully. A preview URL or the separate `web` project does not complete `SHIPALL`/`PUSHALL`.
3. **Deploy Changed Firebase Targets:** If the committed release changes Firebase runtime or configuration files, deploy only the affected targets and verify the deployment. This includes Firebase Functions, Firestore rules or indexes, Storage rules, Hosting, and relevant `firebase.json` configuration. Skip Firebase when the release has no Firebase-related changes.
4. **Push Android OTA Update:** Publish an Expo/EAS OTA update to the production channel for Android only and verify it points to the new release. Do not publish an iOS OTA during `SHIPALL`/`PUSHALL` unless the user explicitly requests iOS.
5. Report the Git commit hash, branch, Vercel production URL, Firebase targets deployed or skipped, and Expo update URL.

Safety rules:
- Stop before production deployment if a required release check fails, and report the failure.
- Preserve unrelated user changes and do not include them in the release commit.
- `SHIPALL`/`PUSHALL` authorizes deployment of Firebase targets changed by the release. It does not authorize unrelated Firebase data mutations, branch merges, native EAS/store builds, or app-store submission unless the user explicitly requests them.

## 13. PUSHWEB Release Shortcut

When the user says `PUSHWEB` (case-insensitive), treat it as explicit authorization to run relevant web checks, commit and push only the intended changes, follow the Vercel release procedure above, deploy the web app through Vercel project `out` to production, and verify that `https://www.shrimplytech.com` points to the new successful deployment.

Report the Git commit hash, branch, Vercel production deployment URL, and verified custom domain. `PUSHWEB` does not authorize Expo/EAS updates, Firebase deployment, Firestore rule changes, branch merges, native builds, or app-store submission.
