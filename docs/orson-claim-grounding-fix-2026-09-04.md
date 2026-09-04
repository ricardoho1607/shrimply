# Orson answer-claim fix — 4 September 2026

## What was wrong

The model's first draft went directly to chat, including streamed text. Prompt warnings did not reliably stop claims that biomass had grown, that a biomass estimate was wrong in a particular direction, or that a suspected cause was confirmed.

There was also a data gap: historical biomass estimates entered without a same-day MBW were retained as observations but omitted from biomass comparisons. Flat recorded estimates could therefore appear as missing comparative evidence. The Firebase clients also retained the SDK's default 70-second timeout, despite a longer outer timeout.

## What changed

- `functions/shared/orsonAnswerGrounding.js` buffers farm-analysis drafts and reviews them against the complete supplied context using the same Muse Spark 1.3 Contributor model. Corrections are checked again before publication. Known unsupported biomass, estimation-direction, causal-confidence, sampling/health and FCR explanations have deterministic regression checks as well.
- Failed, invalid or incomplete reviews return a disclosed fallback containing supplied values. An unchecked draft is never released by this path. General knowledge/product routing keeps its existing streaming behaviour.
- `orson/diagnosticContext.ts` includes dated recorded biomass estimates independently of MBW, keeps calculation bases separate, removes duplicate dates, and excludes future/other-cycle records. Missing estimates remain missing.
- `functions/shared/orsonPromptPolicy.js` separates confidence in a calculation from confidence in its cause. Both prompt copies remove the old mortality-mode permission to infer appetite from feed allocation.
- `functions/orson.js` applies the shared review for mobile and web. Auth, company ownership, quota reservation and the requested model remain intact. Logs contain review status/issue codes, not draft farm text.
- `orson/promptBuilder.ts` and both `useGemini.ts` clients allow the review to finish: draft up to 90 seconds, review up to 45 seconds, function 150 seconds, client 155 seconds. The Firebase callable timeout is explicitly configured too.
- `scripts/evaluate-orson-diagnostics.cjs` exercises the same response-review helper as production. Failed edits are retained only for the synthetic evaluation fixtures, never in production responses.

## Verification

- 117 focused regression tests and 17 Orson TypeScript self-tests pass, including withholding unsafe stream chunks, reviewed replies on both client paths, review failure, incomplete output, correct negation, optional missing fields, recorded biomass without MBW, and Firebase timeout configuration.
- Root TypeScript, web production build/type checking (113 pages), applicable root/web lint and `git diff --check` pass.
- All 20 synthetic contexts retain their evidence and knowledge. Live Muse answers, final review states, manual rubric notes and any remaining limitations are recorded in `orson-diagnostic-evaluation-results.json`. Completion or a reviewer pass alone is not an accuracy score.
- Final live results: 16 drafts corrected, 4 passed review, 0 fallback. All 20 published replies pass the final known-claim regression checks. Broader rubric scores still mark weak/repetitive tentative rankings and broad checks as partial; they are not presented as perfect semantic accuracy.

## Release and limits

Not deployed. This change requires the Firebase Orson function plus the web/Android client changes; a web-only release does not activate the server review. After release, smoke-test one signed-in web and Android farm question through the deployed callable.

Review adds another model call and delays the first visible farm answer. The guard reduces the demonstrated claim failures and fails closed when review fails; it does not guarantee that every future model sentence is correct. Tentative cause ranking and answer length still vary, and the evaluation uses synthetic data rather than confirmed farm outcomes.
