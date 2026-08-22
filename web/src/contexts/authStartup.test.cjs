const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');

const authContext = fs.readFileSync(path.join(__dirname, 'AuthContext.tsx'), 'utf8');
const firebaseClient = fs.readFileSync(path.join(__dirname, '../lib/firebase.ts'), 'utf8');
const authPage = fs.readFileSync(path.join(__dirname, '../app/auth/page.tsx'), 'utf8');
const authLayout = fs.readFileSync(path.join(__dirname, '../app/auth/layout.tsx'), 'utf8');
const dashboardLayout = fs.readFileSync(path.join(__dirname, '../app/dashboard/layout.tsx'), 'utf8');
const dashboardPage = fs.readFileSync(path.join(__dirname, '../app/dashboard/page.tsx'), 'utf8');
const vercelConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../vercel.json'), 'utf8'),
);
const portalProvidersPath = path.join(__dirname, '../components/PortalProviders.tsx');
const portalProviders = fs.existsSync(portalProvidersPath)
  ? fs.readFileSync(portalProvidersPath, 'utf8')
  : '';
const firestoreDataSource = fs.readFileSync(path.join(__dirname, '../lib/firestoreData.ts'), 'utf8');
const compiledFirestoreData = ts.transpileModule(firestoreDataSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const firestoreDataModule = { exports: {} };
new Function('module', 'exports', 'require', compiledFirestoreData)(firestoreDataModule, firestoreDataModule.exports, require);
const { removeUndefinedFields } = firestoreDataModule.exports;

test('App Check requires explicit registration before it can block authentication startup', () => {
  assert.match(firebaseClient, /NEXT_PUBLIC_FIREBASE_APPCHECK_ENABLED/);
  assert.match(firebaseClient, /NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_ENABLED/);
  assert.match(firebaseClient, /appCheckEnabled && appCheckSiteKey/);
});

test('sign in relies on the auth listener instead of duplicating user and company reads', () => {
  const signInSource = authContext.slice(
    authContext.indexOf('const signIn = async'),
    authContext.indexOf('const signUp = async'),
  );

  assert.doesNotMatch(signInSource, /hydrateAuthenticatedUserState/);
  assert.doesNotMatch(signInSource, /getDoc\(/);
});

test('installed PWA sign in preserves Firebase-selected persistence fallbacks', () => {
  const signInSource = authContext.slice(
    authContext.indexOf('const signIn = async'),
    authContext.indexOf('const signUp = async'),
  );

  assert.doesNotMatch(signInSource, /setPersistence/);
  assert.doesNotMatch(signInSource, /browserLocalPersistence/);
  assert.doesNotMatch(signInSource, /browserSessionPersistence/);
});

test('installed PWA sign in retries one transient Firebase network failure', () => {
  const signInSource = authContext.slice(
    authContext.indexOf('const signIn = async'),
    authContext.indexOf('const signUp = async'),
  );
  const signInAttempts = signInSource.match(/await signInWithEmailAndPassword/g) || [];

  assert.equal(signInAttempts.length, 2);
  assert.match(signInSource, /isAuthNetworkRequestFailed/);
  assert.match(signInSource, /waitForAuthNetworkRecovery/);
  assert.match(authContext, /\.code === ['"]auth\/network-request-failed['"]/);
});

test('production Firebase Auth always uses the same-origin network path', () => {
  assert.match(firebaseClient, /initializeAuth/);
  assert.doesNotMatch(firebaseClient, /getAuth|browserPopupRedirectResolver/);
  assert.doesNotMatch(firebaseClient, /isInstalledWebApp|display-mode: standalone|navigator\.standalone/);
  assert.match(firebaseClient, /config\.apiHost = .*firebase-auth\/identitytoolkit/);
  assert.match(firebaseClient, /config\.tokenApiHost = .*firebase-auth\/securetoken/);

  assert.ok(vercelConfig.rewrites.some((rewrite) =>
    rewrite.source === '/firebase-auth/identitytoolkit/:path*'
      && rewrite.destination === 'https://identitytoolkit.googleapis.com/:path*'));
  assert.ok(vercelConfig.rewrites.some((rewrite) =>
    rewrite.source === '/firebase-auth/securetoken/:path*'
      && rewrite.destination === 'https://securetoken.googleapis.com/:path*'));
});

test('auth page explains an installed-app network failure without blaming credentials', () => {
  assert.match(authPage, /auth\/network-request-failed/);
  assert.match(authPage, /Unable to reach the secure sign-in service/);
  assert.doesNotMatch(authPage, /fully close and reopen/);
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
  assert.doesNotMatch(dashboardPage, /if \(loading\) return \(/);
  assert.match(dashboardPage, /pondsLoading \? \(/);
  assert.match(dashboardPage, /dashboard-summary-panel/);
});

test('portal navigation retains one provider across auth, setup, and dashboard routes', () => {
  assert.match(portalProviders, /<AppProviders>\{children\}<\/AppProviders>/);
  assert.match(portalProviders, /['"]\/auth['"]/);
  assert.match(portalProviders, /['"]\/dashboard['"]/);
  assert.match(portalProviders, /['"]\/roleselection['"]/);
  assert.match(portalProviders, /['"]\/setup['"]/);
  assert.doesNotMatch(authLayout, /AppProviders/);
  assert.doesNotMatch(dashboardLayout, /AppProviders/);
});

test('company hydration is reported separately from secure auth initialization', () => {
  assert.match(authContext, /companyLoading:\s*boolean/);
  assert.match(authContext, /const companyLoading = !!user\?\.companyId && !companyResolved/);
  assert.match(authContext, /companyLoading,/);
  assert.match(authContext, /loading:\s*loading\s*\|\|\s*initializing,/);
  assert.doesNotMatch(authContext, /loading:\s*loading\s*\|\|\s*initializing\s*\|\|/);
});

test('returning users hydrate Firestore listeners from persistent multi-tab cache', () => {
  assert.match(firebaseClient, /initializeFirestore/);
  assert.match(firebaseClient, /persistentLocalCache/);
  assert.match(firebaseClient, /persistentMultipleTabManager/);
});

test('auth query-parameter routes render within a Suspense boundary', () => {
  assert.match(authLayout, /import \{ Suspense,/);
  assert.match(authLayout, /<Suspense[\s\S]*>\s*\{children\}\s*<\/Suspense>/);
});

test('new login profiles remove undefined optional fields before Firestore writes', () => {
  const profileCreation = authContext.slice(
    authContext.indexOf('const newUser: User = {'),
    authContext.indexOf("console.error('User profile creation failed:'"),
  );

  assert.match(profileCreation, /removeUndefinedFields\(newUser\)/);
  assert.deepEqual(removeUndefinedFields({
    id: 'pilot-user',
    name: undefined,
    profileImage: undefined,
    settings: { phone: undefined, locale: 'id' },
  }), {
    id: 'pilot-user',
    settings: { locale: 'id' },
  });
});
