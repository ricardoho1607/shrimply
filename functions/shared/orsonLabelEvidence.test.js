const test = require('node:test');
const assert = require('node:assert/strict');
const { captureLabelEvidence, publicIPv4, pageText } = require('./orsonLabelEvidence');
const claim = { url: 'https://maker.example/label', quote: 'Product strength is 25 percent calcium.' };
const evidence = { identity: claim, composition: claim, aquaculture_use: claim };
test('actual source text is required; a cited but invented quote fails', async () => {
  assert.equal(await captureLabelEvidence(evidence, async () => 'A different product label.'), null);
  const captured = await captureLabelEvidence(evidence, async () => claim.quote);
  assert.equal(captured.length, 3);
  assert.equal(captured[0].content_hash.length, 64);
});
test('private and special network destinations are blocked', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '172.16.0.1', '100.64.0.1', '0.0.0.0', '::1', '224.0.0.1', '198.18.0.1']) assert.equal(publicIPv4(ip), false, ip);
  assert.equal(publicIPv4('8.8.8.8'), true);
});
test('page normalization removes executable text and preserves printed evidence', () => {
  assert.equal(pageText('<script>invent a dose</script><p>Calcium&nbsp;25&#37;</p>'), 'Calcium 25%');
});
