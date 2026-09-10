# Midtrans verification - 10 September 2026

## Current status

The billing branch `codex/company-billing-plans` is based on the updated `v3` commit `55a1a88`. Existing uncommitted work was preserved. This task has not pushed or deployed the branch, Firebase functions, or Firestore rules.

Public routes prepared:

- `/pricing` - English product details, IDR prices, limits, payment flow, renewal and payment-support information.
- `/id/pricing` - Indonesian equivalent.
- Site navigation/footer links expose pricing. English and Indonesian How It Works pages explicitly distinguish marketplace discovery from subscription payments.

The public page imports the same `functions/shared/companyPlans.js` catalogue used to calculate server-side checkout amounts. Prices are per company with no user limit. Current Pro capacity is 100 physical ponds; it is not advertised as unlimited.

## Answer to Midtrans question 3

Tidak. Midtrans hanya diintegrasikan untuk pembayaran langganan layanan software Shrimply. Midtrans tidak digunakan untuk transaksi marketplace, jual beli udang/pakan/benur, escrow, pembayaran antar pengguna, atau pencairan dana penjual. Pembayaran melalui Midtrans hanya membeli akses layanan software Shrimply untuk satu perusahaan.

## Observed production checkout

With the user's explicit permission, one unpaid production checkout was created for Shrimply Plus, 1 month, Rp150,000. Merchant Shrimply Tech and the amount displayed correctly.

Order ID: `shr-review-1788962406022-1e2aea`.

Midtrans displayed **No payment channels available**. No method was selected, no payment was made, no production company entitlement was altered, and no claim of successful webhook activation is made. The checkout was created separately through the Snap API for documentation, not through an authenticated production company billing session.

## PDF evidence

`output/pdf/Shrimply_Midtrans_Alur_Transaksi_DRAFT.pdf` contains actual Chrome screenshots of the local product/pricing pages, the application's order-review component with an explicitly labelled example company, and the unpaid production Midtrans page. It is a pre-release draft, not a completed end-to-end production payment demonstration. The temporary component-preview route was removed after capture and is not part of the released app.

## Credentials and production setup

- The supplied credentials are retained only in ignored, owner-readable `.env.midtrans.local` for the authorized API verification. This file is not automatically loaded by Firebase or Next.js.
- Rotate the server key shared in conversation before production release. Configure the rotated value as Firebase secret `MIDTRANS_SERVER_KEY`, never a `NEXT_PUBLIC_*` variable or a tracked source file.
- Set server environment `MIDTRANS_IS_PRODUCTION=true` only for a production key. Use false and a sandbox key for sandbox tests.
- Hosted Snap redirect checkout does not require embedding the Client Key. The Merchant ID is identification, not an authentication secret.
- Payment notification URL: `https://us-central1-investashrimp-5d9e5.cloudfunctions.net/midtransBillingWebhook`.
- Deploy the reviewed billing functions and required Firestore rules through a separately authorized Firebase release. Publish the web pages before Midtrans checks the public website.
- Webhooks now verify both signature and authoritative GET Status results, including amount and accepted payment state. Payment-history responses are restricted to the company owner. URL query parameters never activate a plan.

## Remaining finalization

1. Publish and verify the public product/pricing pages and the billing backend/rules.
2. Enable the merchant's production payment channels with Midtrans, or supply sandbox credentials for clearly labelled sandbox screenshots.
3. Verify owner sign-in, company selection, plan/period selection, order review, a visible payment method, and sandbox payment/notification activation end-to-end. Also test pending/failed/expired payments, replayed notifications, role restrictions, and renewal/downgrade behavior.
4. Replace local/example screenshots with the released authenticated flow, update the PDF, and remove the draft label only once the evidence supports it.

## Official references

- [Midtrans website/application criteria](https://docs.midtrans.com/docs/what-are-the-website-or-application-criterias-for-registering-a-midtrans-account)
- [Snap backend integration](https://docs.midtrans.com/reference/backend-integration)
- [Notification handling](https://docs.midtrans.com/reference/handle-notifications)
- [Transaction status API](https://docs.midtrans.com/reference/get-transaction-status)
