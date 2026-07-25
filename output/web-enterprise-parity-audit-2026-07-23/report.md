# Web Enterprise Parity Audit

Date: 2026-07-23

Scope: enterprise owner web UI and lifecycle/data parity against the current mobile implementation.

## Result

The seeded enterprise happy path works on web at desktop and phone widths, but it is not yet fully equivalent to mobile. No Firebase writes were made during this audit.

## Confirmed working

- Enterprise owner authentication and dashboard routing.
- Collapsible farm-cycle tracker and farm blocks.
- Active, Inactive, and Ended filters change the displayed state.
- Five pond tiles per row at phone width with no DOM horizontal overflow.
- Solid green/orange/red pond status tiles.
- Pond 9 warning opens with low dissolved oxygen and links to the matching water-quality record.
- Pond 1 feed history shows the current dated entry: 23 Jul 2026, 80.00 kg.
- Technician display uses the member name when available and falls back to email.
- Web reads the same Firestore company subcollections and uses real-time listeners.

## Discrepancies

### High

1. Web does not infer a legacy active farm cycle when active pond records exist but the `cycles` document is missing. Mobile constructs `inferredFarmCycle`; web only searches the cycle collection. Migrated farms can therefore show active ponds while the web cycle tracker says there is no active cycle.

2. Web has no farm-cycle report/archive equivalent. Mobile exposes Cycle Reports and offers a report immediately after ending a cycle; the web reports menu has Financial Reports, Sampling Reports, and Harvest Projections only.

3. The web start-cycle form labels the field `PL Value (g)`, defaults it to `0.5`, and then divides the submitted value by 10. The label/default imply grams, so a user entering `0.5 g` creates `0.05 g`. The field should represent PL stage/number or use direct gram input consistently.

### Medium

4. Starting an inactive pond from the enterprise dashboard leaves the command center and routes to `/dashboard/ponds`. If the pond ID is stale or inaccessible, the request silently does nothing.

5. The start-cycle modal is fixed to a two-column inline grid, including at phone width. Its header scrolls with the form, the close icon has no accessible label, outside-click does not dismiss it, and much of the copy is hardcoded in English.

6. Web adds legacy ended pond records to the Inactive list when no physical placeholder exists, while also retaining them in Ended. Mobile enterprise Inactive is based on saved physical ponds. The same historical pond can therefore appear in two web filters.

7. Renaming a farm cycle updates every pond through one unbounded `Promise.all`. On farms with hundreds of ponds this creates a large concurrent write fan-out and can leave a partially renamed cycle if some updates fail.

8. Normal navigation logs `Public company member count sync failed: Missing or insufficient permissions` from `web/src/contexts/AuthContext.tsx`. The dashboard remains usable, but public member counts may stay stale and the client retries the denied write.

### Low

9. Some cycle controls need accessibility-state cleanup: the expanded tracker's accessible name repeats `active`, filter buttons do not expose pressed state, and the start-cycle close icon is unlabeled.

## Evidence limits

- The seed has 11 active ponds and no inactive or ended ponds, so starting a saved inactive pond and closing an active farm cycle were inspected in code but not executed live.
- Technician-role isolation was not retested in this owner-session audit.
- Ending or starting a cycle was intentionally avoided because it would mutate the seeded Firebase data.

## Verification

- Live browser walkthrough at desktop and phone widths.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for enterprise dashboard, ponds, auth, feed, and water files: 0 errors, 7 existing warnings.
- Full web ESLint: failed with 73 errors and 55 warnings across the wider web project.
