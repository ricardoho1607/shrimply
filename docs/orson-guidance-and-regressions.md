# Maintaining Orson guidance

The shared application guidance is `functions/shared/orsonPromptPolicy.js`.
Both the server system instruction and the mobile/web prompt builder consume it.
It is application context for Orson; AGENTS.md and Codex skills do not automatically
become Orson context. Server changes require a Firebase Functions release.

Add a short principle to the existing evidence rules when it applies broadly.
For each addition, describe scope, preferred interpretation, relevant exceptions
or environmental context, and the failure it should prevent. Keep examples and
incident details in regression cases rather than growing the system prompt.
Avoid prescribed wording, universal diagnoses, and a new prohibition for every
bad answer. Let Orson choose its explanation, ask useful questions, and reason
from evidence. Reserve firm boundaries for data integrity and consequential
misinterpretations such as presenting an emergency floor as an operating target.

Proposed future additions should be reviewed as small diffs, with a few prompts
showing expected behavior. No separate editor or database is needed initially.
If the collection grows, group it by topic and select relevant context while
retaining essential evidence and safety principles on every route.

## Oxygen regression prompts (live model evaluation)

1. Nighttime: “Secara umum, bagaimana cara menentukan apakah aerasi kolam vaname sudah cukup pada malam hari, dan data apa yang perlu dipantau? Jangan menganalisis kolam tertentu.”
2. Morning: “Apakah DO pagi 3–4 mg/L sudah cukup untuk target operasional vaname? Bedakan pengukuran pagi dan sebelum matahari terbit.”
3. Emergency: “DO vaname 2,8 mg/L malam hari dan udang berkumpul dekat aerator. Apa tindakan segera dan target setelah pulih?”
4. Follow-up after each: “Ringkas target DO dalam satu kalimat.”

Evaluate every answer and its summary: preferred target above 5 mg/L; below
5 mg/L calls for attention/action; 3–4 mg/L is a low-oxygen warning floor;
at/below 3 mg/L requires emergency action. Do not imply waiting until 3 mg/L
when DO falls rapidly or distress is present. Preserve mg/L, time/depth,
temperature, salinity, biomass and exposure context where relevant. The general
question must not analyze saved ponds. Emergency guidance should prioritize
safe aeration, checking power/equipment and repeat measurements, with the farm
emergency SOP; avoid unsupported chemical dosing.

These are operational reference levels, not universal biological cutoffs.
References: [FAO shrimp culture oxygen guidance](https://www.fao.org/4/ac418e/AC418E03.htm)
identifies 3 ppm or below as requiring remedial action;
[CAA compendium](https://www.caa.gov.in/uploaded/doc/compendium_act.pdf)
lists a 5–7 ppm oxygen reference range.

Automated prompt tests verify injection, not generated-answer compliance.
Run these live prompts before release and record the model, answer and result.

## Notification regression

`functions/orsonAlertState.test.js` covers duplicate/concurrent evaluation,
weak-feed recovery, immutable creation/legacy display timestamps, separate update
and resolution times, read-state preservation, serialized reload, chronological
ordering, and legacy event deduplication. A live mobile/web reload remains needed
to verify the reported display-age issue; the existing server timestamp overwrite
was not reproduced locally. Legacy timestamps are retained, never replaced with
an invented original creation time.
