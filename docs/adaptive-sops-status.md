# Adaptive SOP release and acceptance ledger

Updated 13 October 2026. This is the current status entry point. Historical handovers describe their own checkpoint only. Live saved records remain authoritative for assignments, cycles, adoptions, and task results.

## Revision and environments

| Environment | Evidence | Status |
| --- | --- | --- |
| Feature baseline | `codex/adaptive-sops`, `2b7a69f` | Local branch matches cached remote-tracking revision at inspection. |
| Earlier production release | 8 October chat handover, `25b5015`, signed Android 3.3.0 code 40 | Historical release evidence; does not prove today’s production revision. |
| SOP branch preview | Technician session inspected 13 October | Live pilot data; older UI displayed 146 active tasks. Current deployment revision not verified in this task. |
| Current fixes | Managed checkout `adaptive-sop-fixes`, based on `2b7a69f` | Local web/mobile/runtime/index changes saved in a local commit; not pushed or deployed. |
| Local browser | `http://localhost:3017/dashboard/todo` | Updated frontend connected to existing live Firebase backend; technician account. |
| Backend acceptance | Isolated Firebase emulators, `demo-shrimply-sop` | Current local backend changes verified; no production scheduler mutation from these tests. |

A successful localhost check verifies the local UI and whichever Firebase backend it is configured to use. It must not be described as a deployment of the changed backend.

## Current changes

- Today, Pending, Upcoming, Done, and Everything use the farm timezone, with visible tab counts. Old unfinished work is retained separately.
- Legacy manual scheduling is labelled once at each selected stage, consistent with runtime occurrence identity. No approved schedules or occurrence IDs were silently rewritten.
- Reassignment synchronizes top-level and nested assignees and visibility for active tasks and issues.
- Scheduler/assignment/source replay work uses bounded pages and saved cursors. Completed-task evidence corrections/retractions use targeted evaluation jobs. Dependencies and gates query matching results instead of loading full task histories.
- Routine non-critical recording tasks use the performed farm day; delayed entry can finish them. Missing records do not create new corrective/recheck chains. Existing issues remain visible and are not silently waived.
- Water-reading actions open Water Quality instead of pond details; the New Parameter Log action preselects an accessible linked pond. Mobile follows the same route and selection policy.
- A previously saved insufficient-evidence decision can become current again after source retraction, reopening a completed task rather than leaving stale completion.

## Validation

90 SOP tests and 34 Firebase integration tests passed before final browser acceptance. Web/mobile TypeScript and affected lint checks are recorded in the completion report. The integration suite includes late-entry completion, source removal, bounded assignment pages, ownership consistency, existing source-correction/recovery behavior, cycle/stage transitions, inherited access, and idempotency.

The H-20 fixture now fixes the activation clock before its scheduled dates; using the real clock made it fail once the machine date passed 12 October. This changes test timing, not production scheduling.

## Release requirements

Deploy the added Firestore indexes before the changed backend relies on them. Changed runtime is shared by `runSopScheduler` and the `onSop*Evidence` projectors. Deploy the affected backend functions together; client-only publication does not activate the new scheduler behavior. Preserve existing functions, access rules, immutable approved SOP versions, farm histories, and historical corrective issues.

Native device/offline/push acceptance remains separate. No native build, production publication, or automatic narrative flag change is part of this task.

## Live QA record acceptance

The user authorized water entries on the two SOP QA ponds and requested that the session remain signed in. **Completed:** each pond has one persisted daily QA water record for 13 October 2026. Authenticated Firestore reads confirmed 22 matching routine tasks (11 per pond) at completed/pass. Both nitrite tasks remain open because the daily form has no nitrite input. The browser also shows 22 existing water rechecks completed, giving 44 total Done tasks; corrective episodes were not manually closed or waived. The local Today view shows 8 remaining tasks, Pending 94, Upcoming 0, Everything 180. These counts are a dated live-data snapshot, not permanent expectations. Entries must carry explicit synthetic QA notes and observation timestamps. Do not claim physical measurements, production compliance, or chemical operations. Confirm saved history after refresh and then inspect matching task IDs/results; merely closing the form is not proof of completion. Record the final result in the task completion report.
