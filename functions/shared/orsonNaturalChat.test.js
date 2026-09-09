const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file);
const { buildOrsonAnalysis } = require('../../orson/pipeline.ts');
const { buildOrsonRequestPrompt } = require('../../orson/promptBuilder.ts');
const { classifyDosingRequest } = require('./orsonDosingSafety');

test('the observed risk question and check-again follow-up retain conversation without a routing rejection', async () => {
  const history = [{ role: 'user', text: 'can you check if my pond is at risk' }, { role: 'model', text: 'Pond A has a recorded morning DO of 3.5 mg/L.' }];
  for (const question of ['check again', 'could you expand on your answer?', 'what would you check next?', 'hi']) {
    const result = buildOrsonAnalysis([], question, new Date(), undefined, undefined, undefined, history);
    const prompt = buildOrsonRequestPrompt(result.promptPackage.context, question);
    assert.match(prompt, /ORSON RECENT CONVERSATION/);
    assert.match(prompt, /morning DO of 3.5/);
    assert.equal(result.promptPackage.cacheKey, null);
    assert.equal(await classifyDosingRequest({ question }), false);
  }
});
test('longer exchanges preserve the latest detailed answer within the prompt budget', () => {
  const history = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: `Turn ${i}: ` + 'evidence '.repeat(400) }));
  history[29].text += ' LATEST_CONTEXT_SENTINEL';
  const result = buildOrsonAnalysis([], 'continue', new Date(), undefined, undefined, undefined, history);
  assert.match(buildOrsonRequestPrompt(result.promptPackage.context, 'continue'), /LATEST_CONTEXT_SENTINEL/);
});
