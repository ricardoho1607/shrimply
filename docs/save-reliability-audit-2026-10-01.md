# Save reliability audit — 1 October 2026

This release hardens web and mobile saving. The earlier final-harvest serializer fix was deployed separately as commit `49b1252`.

## Changes

| Save flow | Protection added |
| --- | --- |
| Harvest creation, edits, voids | Immediate submit lock, retained retry ID, full payload cleanup, current pond/cycle validation, safe error messages |
| Web finance and marketplace entries | Stable document ID for retries; transaction creates a record only if it does not already exist |
| Finance payments | Stable payment ID; existing settlement logic rejects duplicate payment application |
| Web feeding and daily water quality | Immediate lock; existing daily transactions retained; optional fields cleaned before writing |
| Sampling and mortality | Immediate lock, stable observation IDs, append against current server records; sampling never deducts inventory |
| Inventory creation, restocking, usage | Stable document/history IDs; retries cannot add or deduct stock or create linked expenses twice |
| Assets | Stable IDs for creation and history; transaction merges current history; return cannot clear a newer transfer |
| Treatment mixes | Stable IDs for creation, batches, and use; retries cannot deduct ingredients or mix stock twice; duplicate ingredients rejected |
| Pond creation and restart | Form clears only after acknowledgement; stable IDs; atomic cycle/pond/physical-pond transaction validates current state |
| Settings and projection prices | Immediate locks and online transactions; upload timeout cancels the actual upload |
| Mobile offline saves | Finance, inventory, asset, and treatment entry guards; stable retry identities; asset replay preserves concurrent server history; mortality waits for durable local storage acknowledgement |

Save locks release after failure. Drafts stay available for correction or retry. Active forms disable editing and cancellation. Numeric write validation rejects non-finite numbers while retaining Firestore timestamps and transforms.

## Verification

- 82 targeted tests pass, including actual handlers with real Firestore serialization and controlled transactions, duplicate taps, lost acknowledgements, stock replay, concurrent asset history, sampling isolation, and upload cancellation.
- The new save-flow regression tests fail against the committed versions of the affected handlers.
- Web and mobile TypeScript checks pass. Affected-file lint passes with existing warnings. Web production build passes.
- Full suite: 866 passed, 10 existing failures. These failures reproduce against committed code: two queue-test harness failures, the Functions export list, two biological-calculation self-tests, harvest rollback expectations, two inventory layout assertions, Plankton Overwatch markup, and the public-page theme assertion. These are separate from the passing save regressions.

## Scope and follow-up

Retry identities apply to the current draft. Deliberately opening a new draft creates a new operation. Mobile admitted mutations retain their replay identities through the durable offline queue.

Tests use controlled transactions and serializers, without saving farm records. Device/browser verification under a real connection interruption remains a useful final release check. No Firebase rules or production company data were changed by this hardening work.
