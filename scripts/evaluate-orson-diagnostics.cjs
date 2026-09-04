/* global __dirname */
require('sucrase/register/ts');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const cases = require('../orson/fixtures/diagnosticEvaluation.cjs');
const { buildOrsonAnalysis } = require('../orson/pipeline.ts');
const { buildOrsonRequestPrompt, estimateOrsonPromptTokens, ORSON_PROMPT_TOKEN_BUDGET } = require('../orson/promptBuilder.ts');
const { generateMetaModelResponse, getOrsonGenerationSettings, META_MODEL_API_MODEL } = require('../functions/shared/metaModelApi');
const { generateGroundedOrsonResponse } = require('../functions/shared/orsonAnswerGrounding');

const rubric = ['Connect related variables', 'Do not invent facts', 'Rank supported causes', 'State uncertainty',
  'Prioritize useful checks', 'Give practical conditional actions', 'Avoid overdiagnosis', 'Separate correlation from causation'];
const live = process.argv.includes('--live');
const retryFailed = process.argv.includes('--retry-failed');
const outputPath = path.join(__dirname, '../docs/orson-diagnostic-evaluation-results.json');
const selectedId = process.argv.find(arg => arg.startsWith('--case='))?.split('=')[1];
const previous = (retryFailed || selectedId) && fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, 'utf8')) : null;
const selected = cases.filter(item => (!selectedId || selectedId.split(',').includes(item.id))
  && (!retryFailed || !previous?.results.some(result => result.id === item.id && result.finishReason === 'STOP')));
assert.ok(selected.length, 'No matching evaluation cases.');

async function main() {
  let apiKey;
  let serverInstruction;
  if (live) {
    apiKey = process.env.MODEL_API_KEY;
    if (!apiKey) {
      const secretPath = path.join(__dirname, '../functions/.secret.local');
      apiKey = fs.existsSync(secretPath) ? fs.readFileSync(secretPath, 'utf8').match(/^MODEL_API_KEY=(.+)$/m)?.[1]?.trim() : undefined;
    }
    if (!apiKey) throw new Error('MODEL_API_KEY is unavailable.');
    process.env.NODE_ENV = 'test';
    serverInstruction = require('../functions/orson.js').__test.buildServerOrsonSystemInstruction;
  }
  const output = { model: META_MODEL_API_MODEL, generatedAt: new Date().toISOString(), live, rubric,
    scoring: 'Reviewer scores each dimension 0 (fails), 1 (partial), 2 (meets). Keyword checks are smoke tests, not a quality score.',
    results: previous?.results.filter(result => !selected.some(scenario => scenario.id === result.id)) ?? [] };
  const evaluate = async (scenario) => {
    const analysis = buildOrsonAnalysis(scenario.ponds, scenario.question, new Date(scenario.asOf));
    const pack = analysis.promptPackage;
    assert.notEqual(pack.questionFocus.analysisMode, 'standard', `${scenario.id}: diagnostic route`);
    const prompt = buildOrsonRequestPrompt(pack.context, pack.userMessage);
    assert.ok(estimateOrsonPromptTokens(prompt) <= ORSON_PROMPT_TOKEN_BUDGET, `${scenario.id}: token budget`);
    assert.ok(prompt.includes(pack.userMessage), `${scenario.id}: question retained`);
    assert.ok(prompt.includes('ORSON SELECTED KNOWLEDGE'), `${scenario.id}: relevant knowledge retained`);
    if (scenario.ponds.length) assert.ok(prompt.includes('ORSON RISK PAYLOAD'), `${scenario.id}: pond evidence retained`);
    const result = { id: scenario.id, title: scenario.title, review: scenario.review, mode: pack.questionFocus.analysisMode,
      promptTokens: estimateOrsonPromptTokens(prompt), generationSettings: getOrsonGenerationSettings(pack.questionFocus.analysisMode), scores: null };
    const earlier = previous?.results.find(item => item.id === scenario.id);
    if (earlier) result.earlierAttempt = { finishReason: earlier.finishReason, error: earlier.error, outputTokens: earlier.outputTokens };
    if (live) {
      const start = Date.now();
      try {
        const attempts = [];
        const generated = await generateGroundedOrsonResponse({ prompt,
          mode: pack.questionFocus.analysisMode, questionRoute: pack.questionFocus.route,
          generate: async overrides => {
            const attempt = await generateMetaModelResponse({ apiKey, prompt,
              systemInstruction: serverInstruction(pack.questionFocus.analysisMode, 'chat', pack.questionFocus.route),
              ...getOrsonGenerationSettings(pack.questionFocus.analysisMode), ...overrides });
            attempts.push(attempt);
            return attempt;
          },
          onTextDelta: async () => {} });
        Object.assign(result, generated, { elapsedMs: Date.now() - start });
        // Synthetic fixtures only: retain failed edits for human review, never in production responses.
        if (generated.groundingStatus === 'fallback') result.groundingDebug = attempts;
      } catch (error) {
        result.error = String(error.message).split(apiKey).join('[redacted]');
        result.elapsedMs = Date.now() - start;
      }
    }
    output.results.push(result);
    output.results.sort((a, b) => a.id.localeCompare(b.id));
    console.log(`${scenario.id} ${live ? result.finishReason ?? 'ERROR' : 'context PASS'} ${scenario.title}`);
    if (live) {
      fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    }
  };
  let nextIndex = 0;
  await Promise.all(Array.from({ length: live ? 3 : 1 }, async () => {
    while (nextIndex < selected.length) await evaluate(selected[nextIndex++]);
  }));
  if (output.results.some(result => result.error || (live && result.finishReason !== 'STOP'))) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
