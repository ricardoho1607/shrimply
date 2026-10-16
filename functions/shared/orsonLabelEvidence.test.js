'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { captureLabelEvidence, publicIPv4, pageText, fetchLabelPage } = require('./orsonLabelEvidence');

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

test('fetchLabelPage rejects immediately when signal is aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    fetchLabelPage('https://maker.example/label', { signal: controller.signal }),
    /label_abort/
  );
});

test('fetchLabelPage rejects when deadline has already expired', async () => {
  await assert.rejects(
    fetchLabelPage('https://maker.example/label', { deadlineMs: Date.now() - 10 }),
    /label_timeout/
  );
});

test('captureLabelEvidence validates claims first, concurrently fetches unique pages max 3 and preserves original order', async () => {
  let fetchCount = 0;
  const fetchedUrls = [];
  const multiUrlEvidence = {
    identity: { url: 'https://maker.example/label-a', quote: 'Calcium product identification details here.' },
    composition: { url: 'https://maker.example/label-b', quote: 'Elemental calcium is 25 percent by mass.' },
    aquaculture_use: { url: 'https://maker.example/label-a', quote: 'Approved for aquaculture pond treatment.' },
  };

  const mockFetch = async (url) => {
    fetchCount++;
    fetchedUrls.push(url);
    if (url === 'https://maker.example/label-a') {
      return 'Calcium product identification details here. Approved for aquaculture pond treatment.';
    }
    return 'Elemental calcium is 25 percent by mass.';
  };

  const snapshots = await captureLabelEvidence(multiUrlEvidence, mockFetch);
  assert.ok(snapshots);
  assert.equal(snapshots.length, 3);
  assert.equal(snapshots[0].claim, 'identity');
  assert.equal(snapshots[1].claim, 'composition');
  assert.equal(snapshots[2].claim, 'aquaculture_use');
  assert.equal(fetchCount, 2);
  assert.deepEqual(fetchedUrls.sort(), ['https://maker.example/label-a', 'https://maker.example/label-b']);

  let calledOnInvalid = false;
  const invalidEvidence = {
    identity: { url: 'https://maker.example/label-a', quote: 'too short' },
    composition: { url: 'https://maker.example/label-b', quote: 'Elemental calcium is 25 percent by mass.' },
    aquaculture_use: { url: 'https://maker.example/label-a', quote: 'Approved for aquaculture pond treatment.' },
  };
  const result = await captureLabelEvidence(invalidEvidence, async () => {
    calledOnInvalid = true;
    return 'something';
  });
  assert.equal(result, null);
  assert.equal(calledOnInvalid, false);
});

test('captureLabelEvidence returns null if aborted before or during fetch', async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await captureLabelEvidence(evidence, async () => claim.quote, { signal: controller.signal });
  assert.equal(result, null);
});
