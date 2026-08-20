# Shrimply Agent Instructions

> Orson AI is the chatbot assistant inside the Shrimply ecosystem. The overall platform is Shrimply.

## 1. Project Context

Shrimply is an aquaculture management platform for shrimp farms.

Tech stack:
- Mobile: React Native with Expo SDK 54
- Web: Next.js 14+ App Router
- Backend: Firebase Firestore
- Sync: Firestore is the source of truth
- Mobile offline sync: `app/hooks/useFirebaseSync.ts`

Main domains:
- ponds
- sampling
- feeding
- inventory
- finance reports
- PDF reports
- company setup
- roles and approvals
- Orson AI

## 2. Core Engineering Rules

- Make minimal, targeted changes.
- Do not rewrite unrelated files.
- Do not remove existing features.
- Do not use hardcoded dummy data when live Firebase data exists.
- Search the existing codebase before creating new logic.
- Preserve mobile and web parity where the same feature exists.
- Use TypeScript-safe code with strict null handling.
- Do not add new packages unless necessary.
- Explain files changed and verification performed.

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

This is critical.

Feeding deducts inventory.

Sampling does not deduct inventory.

### Feeding

Purpose:
- Actual inventory action
- Deducts feed stock from Firestore

Relevant areas:
- `inventory/assetInventory`
- `index.tsx` feeding section

Rules:
- Use `inventoryFeedId` to identify the feed brand.
- Use atomic deductions via `runTransaction` or `increment`.
- Do not duplicate deductions.

### Sampling

Purpose:
- Biological observation
- Tracks MBW, mortality, feed amount for FCR/projection

Relevant areas:
- Mobile: `app/(tabs)/index.tsx` dashboard modal
- Web: `web/src/app/dashboard/ponds/[id]/page.tsx` sampling modal

Rules:
- Sampling must not deduct inventory.
- Sampling feed amount is for FCR/projection only.
- Store `feed` and `mbw` as numbers.
- Do not trigger inventory transactions from sampling.

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

For report content upgrades, use the Shrimply Report Content Director skill.

## 10. Skill Improvement Rule

Codex may suggest improvements to Shrimply skills when a task reveals:
- a repeated mistake
- a missing instruction
- a safer workflow
- a better verification step
- a useful project convention

Rules:
1. Do not automatically edit, apply, or commit skill updates without approval.
2. Propose the smallest useful change only.
3. Show the exact diff for the relevant `SKILL.md`.
4. Explain why the update is needed.
5. Prefer `AGENTS.md` for permanent repo-wide rules.
6. Prefer skills for repeatable workflows.
7. Do not create new skills unless the workflow is repeated often enough to justify it.
8. Do not add vague, bloated, or one-off instructions to skills.

## 11. Verification

After coding, run the most relevant checks available in the repo:
- TypeScript check
- lint
- tests
- Expo doctor for Expo/package issues
- build/config checks if app config or dependencies changed

If a command is unavailable, say so.

Final response should include:
1. Root cause or task summary
2. Files changed
3. What changed
4. Verification run
5. Remaining risk or manual testing required

### Response Style

- Role & Tone: Expert communicator who explains complex ideas in very simple, everyday English.
- Explain everything so simply that a 5-year-old child can easily understand.
- Do NOT use technical jargon, buzzwords, or complicated terms.
- Keep answers as short and concise as possible (maximum 2 to 3 sentences or quick bullet points).
- Use simple real-world metaphors (like toys, playgrounds, or animals) when explaining hard concepts.
- Skip conversational filler, fluff, introductions, or repeated context; get straight to the point.
- Final task summaries should strictly focus on: what changed, files modified, and verification status.

## 12. SHIPALL / PUSHALL Release Shortcut

When the user says `SHIPALL` or `PUSHALL` (case-insensitive), treat it as explicit authorization to execute this 3-step production release workflow:

1. **Commit to Git:** Run relevant checks, commit changes with a clear message, and push the branch to GitHub.
2. **Deploy Production Vercel:** Deploy the web app through the Vercel project `out`, verify that `https://www.shrimplytech.com` points to the new production deployment, and confirm the live URL returns successfully. A preview URL or the separate `web` project does not complete `SHIPALL`/`PUSHALL`.
3. **Push OTA Update:** Publish an Expo/EAS OTA update to the production channel and verify it points to the new release.
4. Report the Git commit hash, branch, Vercel production URL, and Expo update URL.

Safety rules:
- Stop before production deployment if a required release check fails, and report the failure.
- Preserve unrelated user changes and do not include them in the release commit.
- `SHIPALL`/`PUSHALL` does not authorize Firebase deployment, Firestore rule changes, branch merges, native EAS/store builds, or app-store submission unless the user explicitly requests them.
