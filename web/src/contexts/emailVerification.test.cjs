/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const authContext = fs.readFileSync(path.join(__dirname, 'AuthContext.tsx'), 'utf8');

test('email signup sends verification before onboarding continues', () => {
  const signUpSource = authContext.slice(
    authContext.indexOf('const signUp = async'),
    authContext.indexOf('const signInWithGoogle = async'),
  );

  assert.match(signUpSource, /if \(inviteToken\)[\s\S]*?acceptInviteAfterAuth\(inviteToken\)[\s\S]*?else[\s\S]*?sendEmailVerification\(userCredential\.user\)/);
});

test('protected team actions refresh Firebase verification before checking it', () => {
  assert.match(authContext, /reload,?[\s\S]*?from ['"]firebase\/auth['"]/);
  assert.match(authContext, /const ensureVerifiedEmail[\s\S]*?await reload\(currentUser\)[\s\S]*?currentUser\.emailVerified[\s\S]*?getIdToken\(true\)/);

  for (const operation of ['requestToJoinCompany', 'approveJoinRequest', 'rejectJoinRequest']) {
    const start = authContext.indexOf(`const ${operation}`);
    const end = authContext.indexOf('\n  const ', start + 1);
    const operationSource = authContext.slice(start, end);
    assert.match(operationSource, /await ensureVerifiedEmail\(/, `${operation} must refresh email verification`);
  }
});
