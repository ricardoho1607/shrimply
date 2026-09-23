const assert = require('node:assert/strict');
const test = require('node:test');
const { createVerificationEmailHandler } = require('./verificationEmailHandler');
const { normalizeLocale, renderVerificationEmail } = require('./verificationEmailCore');

const makeHandler = (overrides = {}) => {
  const calls = [];
  const handler = createVerificationEmailHandler({
    getUser: async (uid) => {
      calls.push(['user', uid]);
      return { email: 'farmer@example.com', emailVerified: false };
    },
    rateLimit: async (uid) => calls.push(['rate', uid]),
    generateLink: async (email) => {
      calls.push(['link', email]);
      return 'https://example.com/verify?oobCode=abc&mode=verifyEmail';
    },
    sendEmail: async (email) => calls.push(['send', email]),
    ...overrides,
  });
  return { handler, calls };
};

test('verification is sent only to the authenticated account email', async () => {
  const { handler, calls } = makeHandler();
  const result = await handler({
    auth: { uid: 'real-user' },
    data: { email: 'attacker@example.com', locale: 'id-ID' },
  });
  assert.deepEqual(result, { sent: true });
  assert.deepEqual(calls.slice(0, 3), [
    ['user', 'real-user'], ['rate', 'real-user'], ['link', 'farmer@example.com'],
  ]);
  const sent = calls[3][1];
  assert.equal(sent.to, 'farmer@example.com');
  assert.match(sent.subject, /Verifikasi email/);
  assert.match(sent.text, /shrimply\.tech@gmail\.com/);
  assert.match(sent.html, /https:\/\/example\.com\/verify\?oobCode=abc&amp;mode=verifyEmail/);
});

test('anonymous and verified users cannot request a message', async () => {
  const anonymous = makeHandler();
  await assert.rejects(anonymous.handler({ data: {} }), { code: 'unauthenticated' });
  assert.equal(anonymous.calls.length, 0);

  const verified = makeHandler({ getUser: async () => ({ email: 'farmer@example.com', emailVerified: true }) });
  await assert.rejects(verified.handler({ auth: { uid: 'verified' }, data: {} }), { code: 'failed-precondition' });
  assert.equal(verified.calls.length, 0);
});

test('rate limit prevents generating links and sending mail', async () => {
  const { handler, calls } = makeHandler({ rateLimit: async () => { throw new Error('limited'); } });
  await assert.rejects(handler({ auth: { uid: 'real-user' }, data: {} }), /limited/);
  assert.deepEqual(calls, [['user', 'real-user']]);
});

test('all Shrimply languages include a support address and a verification link', () => {
  for (const locale of ['en', 'id', 'th', 'vi', 'zh']) {
    const email = renderVerificationEmail(locale, 'https://example.com/verify');
    assert.equal(email.language, locale);
    assert.match(email.text, /shrimply\.tech@gmail\.com/);
    assert.match(email.text, /https:\/\/example\.com\/verify/);
    assert.equal((email.html.match(/href="https:\/\/example\.com\/verify"/g) || []).length, 1);
    assert.doesNotMatch(email.html, />https:\/\/example\.com\/verify</);
  }
  assert.equal(normalizeLocale('unsupported'), 'en');
});
