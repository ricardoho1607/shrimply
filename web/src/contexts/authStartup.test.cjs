const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const authContext = fs.readFileSync(path.join(__dirname, 'AuthContext.tsx'), 'utf8');
const firebaseClient = fs.readFileSync(path.join(__dirname, '../lib/firebase.ts'), 'utf8');
const authPage = fs.readFileSync(path.join(__dirname, '../app/auth/page.tsx'), 'utf8');
const authLayout = fs.readFileSync(path.join(__dirname, '../app/auth/layout.tsx'), 'utf8');
const dashboardLayout = fs.readFileSync(path.join(__dirname, '../app/dashboard/layout.tsx'), 'utf8');
const dashboardPage = fs.readFileSync(path.join(__dirname, '../app/dashboard/page.tsx'), 'utf8');

test('development App Check is opt-in so an unregistered debug token cannot block startup', () => {
  assert.match(firebaseClient, /NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_ENABLED/);
  assert.match(firebaseClient, /isProduction \|\| appCheckDebugEnabled/);
});

test('sign in relies on the auth listener instead of duplicating user and company reads', () => {
  const signInSource = authContext.slice(
    authContext.indexOf('const signIn = async'),
    authContext.indexOf('const signUp = async'),
  );

  assert.doesNotMatch(signInSource, /hydrateAuthenticatedUserState/);
  assert.doesNotMatch(signInSource, /getDoc\(/);
});

test('the auth page has one state-driven dashboard redirect', () => {
  const dashboardRedirects = authPage.match(/router\.(?:push|replace)\(ROUTES\.dashboard\)/g) || [];
  assert.equal(dashboardRedirects.length, 1);
});

test('authentication initialization keeps the route visible', () => {
  assert.doesNotMatch(authContext, /if \(initializing\) return null/);
});

test('dashboard renders its shell and structured loading state while secure data resolves', () => {
  assert.doesNotMatch(dashboardLayout, /if \(loading\) return \(/);
  assert.match(dashboardLayout, /loading \? <DashboardStartupState \/> : children/);
  assert.match(dashboardPage, /className="dashboard-page dashboard-home-loading"/);
  assert.match(dashboardPage, /dashboard-summary-panel/);
});

test('resolved auth state is handed across route-scoped providers after login', () => {
  assert.match(authContext, /lastResolvedAuthState/);
  assert.match(authContext, /useState<User \| null>\(\(\) => lastResolvedAuthState\.user\)/);
  assert.match(authContext, /lastResolvedAuthState\.company\?\.id !== companyId/);
});

test('auth query-parameter routes render within a Suspense boundary', () => {
  assert.match(authLayout, /import \{ Suspense,/);
  assert.match(authLayout, /<Suspense[\s\S]*>\s*\{children\}\s*<\/Suspense>/);
});
