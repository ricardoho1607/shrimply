# Company billing

Shrimply subscriptions belong to a company. Team-member count is never used for billing.

| Plan | Physical ponds | Orson per month | Chat per day | Projections | Price |
| --- | ---: | ---: | ---: | ---: | --- |
| Free | 10 | 60 | 3 | 1/week | Free |
| Plus | 30 | 300 | 10 | 2/day | Rp150,000 monthly, Rp500,000 per 4 months, Rp1,500,000 yearly |
| Pro | 100 | 750 | 20 | 5/day | Rp450,000 monthly, Rp1,500,000 per 4 months, Rp4,500,000 yearly |
| Enterprise | Custom | Custom | Custom | Custom | Contact Shrimply |

Only physical ponds count toward the pond allowance. New production cycles reuse the same physical pond and do not increase the count. A downgrade never deletes existing data; it only prevents creating ponds above the new allowance.

The current plans differ by pond capacity, Orson allowance, and support level. Existing farm tools remain controlled by staff permissions rather than by subscription tier.

## Midtrans setup

1. Store the Midtrans server key as the Firebase secret `MIDTRANS_SERVER_KEY`.
2. Keep `MIDTRANS_IS_PRODUCTION=false` for sandbox testing. Set it to `true` only with the production server key.
3. In Midtrans, set the payment notification URL to `https://us-central1-investashrimp-5d9e5.cloudfunctions.net/midtransBillingWebhook`.
4. Deploy the billing functions and Firestore rules together. The web checkout will remain unavailable until the secret and webhook are configured.

Payments are prepaid. Paid-plan renewal is started from Web Settings → Billing & Plans. The mobile app shows the company plan and usage but does not open an external checkout.

## Lifetime promises to existing companies

The owner confirmed lifetime free access, unlimited physical ponds, unlimited team members and unlimited Orson requests for **every company already present**. This is a private complimentary entitlement, not a fourth public paid plan.

- Fixed cohort cutoff: **2026-09-09 14:28:43 UTC** (September 10 in Melbourne), using Firestore's immutable document `createTime`, not the editable `createdAt` field.
- **20 company grants were saved** in production under `companies/{companyId}/subscriptionGrants/current`. Each records the cutoff, original company creation time, source, status and server grant timestamp. No expiry is set.
- New companies created after the cutoff start on Free. Additional staff joining a grandfathered company share that company's lifetime benefits; creating another company does not inherit the grant.
- The server resolves this grant before paid-plan expiry or legacy fallback. Midtrans checkout and downgrades are disabled for lifetime companies. A previously opened checkout settling after a grant is recorded with `requiresRefundReview: true`; refund handling is manual, never automatic.
- Orson daily, weekly and monthly subscription quotas are unlimited, with usage/cost tracking retained. Provider, security and technical safeguards remain; this is not a hidden Pro quota.
- Companies without a lifetime grant retain the previous temporary Early access behavior (where eligible) through November 5, 2026. The 20 granted companies **do not fall back to Free** on that date.

The grants are separate from `entitlements/current`, so delayed payment webhooks, renewal processing and expiry jobs cannot overwrite them. Client writes to grants are denied, including company owners. Grant/revocation changes require a deliberate server-side administrative operation.

## Pond integrity and rollout

All new production cycles must reference a registered physical pond in the same company, using its name and block, with its active-cycle pointer saved atomically. An active physical pond cannot be deleted or reassigned to a second active cycle. Starting another cycle reuses the slot; it does not consume another pond allowance. Firestore deletion events are deduplicated so retries cannot free extra slots.

Mobile normal/enterprise cycle starts, detail-screen restarts, offline create retries and both web cycle-start paths now preserve the canonical physical ID. Legacy observation edits remain available. Invalid/ambiguous links fail with a repair message instead of silently inventing a physical pond.

**36 unambiguous legacy links were repaired in production**, changing only `physicalPondId`; observations, harvests and financial history were not rewritten. Two ended records belonging to deleted physical ponds remain archived and unchanged. To restart those deleted ponds, register the physical pond first.

Administrative scripts (dry-run by default; `--apply` performs the writes):

```sh
node scripts/company-billing-admin.cjs --project=investashrimp-5d9e5 --before=2026-09-09T14:28:43Z
node scripts/backfill-physical-pond-links.cjs --project=investashrimp-5d9e5 --before=2026-09-09T14:28:43Z
```

Use the existing Firebase CLI operator login. Never change the cutoff on a rerun. Grant writes are create-only; repairs reject ambiguity and use transactions to protect live edits. Neither script deploys code or changes payment credentials.

The data preparation above is complete, but **the new enforcement and lifetime UI are not live until deployment**. Deploy the updated backend (billing and Orson grant resolution), publish the updated web/mobile cycle writers, then enable the matching rules. Firebase deployment requires separate explicit authorization; SHIPALL alone does not cover it. Older app versions that omit physical IDs must update before the strict rules go live.
