/* eslint-disable @typescript-eslint/no-require-imports -- This is a CommonJS Node test. */
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

test('sign-in keeps its translated label in the same element while loading changes', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const buttonSource = authPage.match(/<button type="submit"[\s\S]*?<\/button>/)?.[0];
  assert.ok(buttonSource, 'The login submit button must exist');
  const compiled = ts.transpileModule(`const Button = ({ loading }) => (${buttonSource});`, {
    compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const Button = new Function('React', 't', 'LogIn', `${compiled}; return Button;`)(
    React, { auth: {} }, () => React.createElement('svg'),
  );

  for (const loading of [false, true, false]) {
    const markup = renderToStaticMarkup(React.createElement(Button, { loading }));
    const label = loading ? 'Authenticating...' : 'Enter Dashboard';
    // A direct text child beside the icon can be detached by browser translation,
    // causing React's removeChild operation to crash when loading starts.
    assert.match(markup, new RegExp(`^<button[^>]*><span>${label}</span>`));
    assert.equal(markup.includes('<svg'), !loading);
    assert.equal(markup.includes('disabled=""'), loading);
  }
});

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

test('the auth page redirects only after a user starts sign-in', () => {
  const dashboardRedirects = authPage.match(/router\.(?:push|replace)\(ROUTES\.dashboard\)/g) || [];
  assert.equal(dashboardRedirects.length, 1);
  assert.match(authPage, /const \[loginRequested, setLoginRequested\] = useState\(false\)/);
  assert.match(authPage, /if \(!loginRequested \|\| !isAuthenticated\) return/);
  assert.equal((authPage.match(/setLoginRequested\(true\)/g) || []).length, 2);
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

// --- Behavioral Mocked Harness for AuthContext and AuthPage ---

const onboardingSource = fs.readFileSync(path.join(__dirname, '../../../shared/onboarding.ts'), 'utf8');
const compiledOnboarding = ts.transpileModule(onboardingSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const onboardingModule = { exports: {} };
new Function('module', 'exports', 'require', compiledOnboarding)(onboardingModule, onboardingModule.exports, require);

const compiledAuthContext = ts.transpileModule(authContext, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

const compiledAuthPage = ts.transpileModule(authPage, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
}).outputText;

function createAuthHarness(initialFirebaseUser = null, optionsOrRuntime = null) {
  let existingRuntime = null;
  let delayAuthCallback = false;
  if (optionsOrRuntime) {
    if (optionsOrRuntime.module) {
      existingRuntime = optionsOrRuntime;
    } else if (typeof optionsOrRuntime === 'object') {
      if (optionsOrRuntime.existingRuntime) existingRuntime = optionsOrRuntime.existingRuntime;
      if (optionsOrRuntime.delayAuthCallback) delayAuthCallback = true;
    }
  }

  let currentUser = initialFirebaseUser;
  let authCallback = null;
  let rejectSignOut = false;
  const docListeners = new Map();
  const allCapturedListeners = [];
  const docWrites = [];
  const updateWrites = [];
  const routerNavigations = [];

  const mockDb = {};
  const mockAuth = {
    get currentUser() { return currentUser; },
    setCurrentUser(u) { currentUser = u; },
  };

  const mockRouter = {
    push: (route) => { routerNavigations.push({ type: 'push', route }); },
    replace: (route) => { routerNavigations.push({ type: 'replace', route }); },
  };

  let stateSlots = [];
  let refSlots = [];
  let callbackSlots = [];
  let effectSlots = [];
  let prevEffectDeps = [];
  let cleanups = [];
  let slotIndex = 0;
  let latestContextValue = null;
  let isFlushing = false;
  let needsRender = false;
  let rootComponent = null;

  const mockReact = {
    createContext: (defaultValue) => {
      return {
        _currentValue: defaultValue,
        Provider: function Provider({ value, children }) {
          latestContextValue = value;
          return children;
        },
      };
    },
    useContext: (ctx) => {
      return latestContextValue !== undefined ? latestContextValue : ctx?._currentValue;
    },
    useState: (initial) => {
      const idx = slotIndex++;
      if (stateSlots[idx] === undefined) {
        stateSlots[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (newVal) => {
        const nextVal = typeof newVal === 'function' ? newVal(stateSlots[idx]) : newVal;
        if (!Object.is(stateSlots[idx], nextVal)) {
          stateSlots[idx] = nextVal;
          scheduleRender();
        }
      };
      return [stateSlots[idx], setState];
    },
    useRef: (initial) => {
      const idx = slotIndex++;
      if (refSlots[idx] === undefined) {
        refSlots[idx] = { current: initial };
      }
      return refSlots[idx];
    },
    useCallback: (fn, deps) => {
      const idx = slotIndex++;
      const prev = callbackSlots[idx];
      if (prev && deps && prev.deps.length === deps.length && deps.every((d, i) => Object.is(d, prev.deps[i]))) {
        return prev.fn;
      }
      callbackSlots[idx] = { fn, deps: deps ? [...deps] : null };
      return fn;
    },
    useMemo: (fn) => fn(),
    useEffect: (effect, deps) => {
      const idx = slotIndex++;
      effectSlots[idx] = { effect, deps };
    },
    createElement: (type, props, ...children) => {
      const resolvedChildren = children.length === 0 ? undefined : children.length === 1 ? children[0] : children;
      const combinedProps = { ...(props || {}), ...(resolvedChildren !== undefined ? { children: resolvedChildren } : {}) };
      if (typeof type === 'function') {
        return type(combinedProps);
      }
      if (type && typeof type === 'object' && typeof type.Provider === 'function') {
        return type.Provider(combinedProps);
      }
      return { type, props: combinedProps };
    },
    Fragment: Symbol('Fragment'),
  };
  mockReact.default = mockReact;

  const customRequire = (id) => {
    if (id === 'react') return mockReact;
    if (id === 'next/navigation') {
      return {
        useRouter: () => mockRouter,
        useSearchParams: () => ({ get: () => null }),
      };
    }
    if (id === 'firebase/auth') {
      return {
        onAuthStateChanged: (_auth, cb) => {
          authCallback = cb;
          if (currentUser !== undefined && !delayAuthCallback) cb(currentUser);
          return () => { authCallback = null; };
        },
        signInWithEmailAndPassword: async () => {},
        createUserWithEmailAndPassword: async () => ({ user: { uid: 'new-uid' } }),
        signOut: async () => {
          if (rejectSignOut) {
            throw new Error('Injected Firebase signOut failure');
          }
          currentUser = null;
          if (authCallback) authCallback(null);
        },
        sendPasswordResetEmail: async () => {},
        reload: async () => {},
        GoogleAuthProvider: class {},
        signInWithPopup: async () => {},
      };
    }
    if (id === 'firebase/firestore') {
      return {
        doc: (_db, col, docId) => `${col}/${docId}`,
        collection: (_db, name) => name,
        query: (...args) => args,
        where: (...args) => args,
        getDocs: async () => ({ docs: [] }),
        getDoc: async () => ({ exists: () => false, data: () => null }),
        setDoc: async (docRef, data, options) => {
          docWrites.push({ docRef, data, options });
        },
        updateDoc: async (docRef, data) => {
          updateWrites.push({ docRef, data });
        },
        deleteField: () => ({ __delete: true }),
        serverTimestamp: () => 'SERVER_TIMESTAMP',
        onSnapshot: (docRef, ...args) => {
          let options = {};
          let onNext = null;
          let onError = null;
          if (typeof args[0] === 'function') {
            onNext = args[0];
            onError = args[1];
          } else {
            options = args[0];
            onNext = args[1];
            onError = args[2];
          }
          const listener = { docRef, onNext, onError, options, active: true };
          allCapturedListeners.push(listener);
          if (!docListeners.has(docRef)) docListeners.set(docRef, []);
          docListeners.get(docRef).push(listener);
          return () => {
            listener.active = false;
            const list = docListeners.get(docRef) || [];
            const idx = list.indexOf(listener);
            if (idx !== -1) list.splice(idx, 1);
          };
        },
      };
    }
    if (id === 'firebase/functions') {
      return {
        getFunctions: () => ({}),
        httpsCallable: () => async () => ({ data: {} }),
      };
    }
    if (id === '@/lib/firebase') {
      return { app: {}, auth: mockAuth, db: mockDb };
    }
    if (id === '@/contexts/LanguageContext') {
      return {
        useLanguage: () => ({
          currentLanguage: 'en',
          t: { messages: {}, auth: {} },
        }),
      };
    }
    if (id.endsWith('verificationEmailClient')) {
      return { requestVerificationEmail: async () => {} };
    }
    if (id === '@/lib/publicCompanyProfile') {
      return {
        syncPublicCompanyMemberCount: async () => {},
        syncPublicCompanyProfile: async () => {},
      };
    }
    if (id === '@/lib/firestoreData') {
      return { removeUndefinedFields };
    }
    if (id === '@/lib/googlePlacesClient') {
      return { getLocationTimeZone: async () => 'UTC' };
    }
    if (id.endsWith('farmDate')) {
      return {
        getSystemTimeZone: () => 'UTC',
        isValidTimeZone: () => true,
        resolveFarmTimeZone: (tz, fb) => tz || fb,
      };
    }
    if (id.endsWith('onboarding')) {
      return onboardingModule.exports;
    }
    throw new Error(`Unhandled module require in harness: ${id}`);
  };

  const mod = existingRuntime ? existingRuntime.module : { exports: {} };
  if (!existingRuntime) {
    new Function('module', 'exports', 'require', compiledAuthContext)(mod, mod.exports, customRequire);
  }
  const AuthProviderComponent = mod.exports.AuthProvider;

  function scheduleRender() {
    needsRender = true;
    if (isFlushing) return;
    flush();
  }

  function flush() {
    isFlushing = true;
    try {
      while (needsRender) {
        needsRender = false;
        slotIndex = 0;
        if (rootComponent) {
          rootComponent({ children: null });
        }

        const effectsToRun = [];
        for (let i = 0; i < effectSlots.length; i++) {
          const item = effectSlots[i];
          if (!item) continue;
          const prev = prevEffectDeps[i];
          let hasChanged = true;
          if (prev && item.deps && prev.length === item.deps.length) {
            hasChanged = item.deps.some((dep, depIdx) => !Object.is(dep, prev[depIdx]));
          }
          if (hasChanged) {
            prevEffectDeps[i] = item.deps ? [...item.deps] : null;
            effectsToRun.push(i);
          }
        }

        for (const i of effectsToRun) {
          if (cleanups[i]) {
            const cl = cleanups[i];
            cleanups[i] = null;
            cl();
          }
          const item = effectSlots[i];
          if (item) {
            const cleanup = item.effect();
            if (typeof cleanup === 'function') {
              cleanups[i] = cleanup;
            }
          }
        }
      }
    } finally {
      isFlushing = false;
    }
  }

  function unmount() {
    for (let i = 0; i < cleanups.length; i++) {
      if (typeof cleanups[i] === 'function') {
        cleanups[i]();
      }
    }
    cleanups = [];
    prevEffectDeps = [];
    rootComponent = null;
  }

  function resetHookState() {
    unmount();
    stateSlots = [];
    refSlots = [];
    callbackSlots = [];
    effectSlots = [];
    prevEffectDeps = [];
    slotIndex = 0;
    latestContextValue = null;
  }

  function mount(Component) {
    rootComponent = Component;
    scheduleRender();
  }

  mount(AuthProviderComponent);

  function emitSnapshot(docPath, data, metadata = {}) {
    const list = docListeners.get(docPath) || [];
    const snapshot = {
      id: docPath.split('/')[1],
      exists: () => data !== null && data !== undefined,
      data: () => data,
      metadata: { fromCache: false, ...metadata },
    };
    for (const listener of [...list]) {
      if (listener.onNext) listener.onNext(snapshot);
    }
  }

  function emitError(docPath, error) {
    const list = docListeners.get(docPath) || [];
    for (const listener of [...list]) {
      if (listener.onError) listener.onError(error);
    }
  }

  function triggerAuthChange(user) {
    currentUser = user;
    if (authCallback) authCallback(user);
  }

  async function signOut() {
    if (latestContextValue?.signOut) {
      await latestContextValue.signOut();
    }
  }

  function flushAuthCallback() {
    if (authCallback && currentUser !== undefined) {
      authCallback(currentUser);
    }
  }

  function remount(newFirebaseUser, remountOptions = {}) {
    resetHookState();
    currentUser = newFirebaseUser;
    delayAuthCallback = Boolean(remountOptions.delayAuthCallback);
    mount(AuthProviderComponent);
  }

  return {
    getContext: () => latestContextValue,
    emitSnapshot,
    emitError,
    triggerAuthChange,
    flushAuthCallback,
    setRejectSignOut: (val) => { rejectSignOut = val; },
    signOut,
    unmount,
    remount,
    docWrites,
    updateWrites,
    routerNavigations,
    module: mod,
    getActiveListener: (docPath) => {
      const list = docListeners.get(docPath) || [];
      return list[list.length - 1] || null;
    },
    getCapturedListeners: (docPath) => allCapturedListeners.filter((l) => !docPath || l.docRef === docPath),
  };
}

async function runAuthPageTest(authContextState, nextAuthContextState = null) {
  let formSubmitHandler = null;
  const routerNavigations = [];
  const mockRouter = {
    replace: (route) => routerNavigations.push({ type: 'replace', route }),
    push: (route) => routerNavigations.push({ type: 'push', route }),
  };

  let stateSlots = [];
  let refSlots = [];
  let effectSlots = [];
  let prevEffectDeps = [];
  let cleanups = [];
  let slotIndex = 0;
  let isFlushing = false;
  let needsRender = false;

  let currentAuthState = {
    signIn: async () => {},
    signInWithGoogle: async () => {},
    resetPassword: async () => {},
    isAuthenticated: true,
    emailVerified: true,
    needsRoleSelection: false,
    needsSetup: false,
    user: { role: 'owner' },
    loading: false,
    companyLoading: false,
    ...authContextState,
  };

  const mockReact = {
    createContext: () => ({ Provider: () => null }),
    useContext: () => null,
    useState: (initial) => {
      const idx = slotIndex++;
      if (stateSlots[idx] === undefined) {
        stateSlots[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (newVal) => {
        const nextVal = typeof newVal === 'function' ? newVal(stateSlots[idx]) : newVal;
        if (!Object.is(stateSlots[idx], nextVal)) {
          stateSlots[idx] = nextVal;
          scheduleRender();
        }
      };
      return [stateSlots[idx], setState];
    },
    useRef: (initial) => {
      const idx = slotIndex++;
      if (refSlots[idx] === undefined) {
        refSlots[idx] = { current: initial };
      }
      return refSlots[idx];
    },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useEffect: (effect, deps) => {
      const idx = slotIndex++;
      effectSlots[idx] = { effect, deps };
    },
    createElement: (type, props) => {
      if (props && typeof props.onSubmit === 'function') {
        formSubmitHandler = props.onSubmit;
      }
      return { type, props };
    },
    Fragment: Symbol('Fragment'),
  };
  mockReact.default = mockReact;

  function scheduleRender() {
    needsRender = true;
    if (isFlushing) return;
    flush();
  }

  function flush() {
    isFlushing = true;
    try {
      while (needsRender) {
        needsRender = false;
        slotIndex = 0;
        AuthPageComponent();

        const effectsToRun = [];
        for (let i = 0; i < effectSlots.length; i++) {
          const item = effectSlots[i];
          if (!item) continue;
          const prev = prevEffectDeps[i];
          let hasChanged = true;
          if (prev && item.deps && prev.length === item.deps.length) {
            hasChanged = item.deps.some((dep, depIdx) => !Object.is(dep, prev[depIdx]));
          }
          if (hasChanged) {
            prevEffectDeps[i] = item.deps ? [...item.deps] : null;
            effectsToRun.push(i);
          }
        }

        for (const i of effectsToRun) {
          if (cleanups[i]) {
            const cl = cleanups[i];
            cleanups[i] = null;
            cl();
          }
          const item = effectSlots[i];
          if (item) {
            const cleanup = item.effect();
            if (typeof cleanup === 'function') {
              cleanups[i] = cleanup;
            }
          }
        }
      }
    } finally {
      isFlushing = false;
    }
  }

  const authPageMod = { exports: {} };
  new Function('module', 'exports', 'require', compiledAuthPage)(authPageMod, authPageMod.exports, (id) => {
    if (id === 'react') return mockReact;
    if (id === 'lucide-react') return new Proxy({}, { get: () => () => null });
    if (id === '@/contexts/AuthContext') {
      return {
        useAuth: () => currentAuthState,
      };
    }
    if (id === '@/contexts/LanguageContext') return { useLanguage: () => ({ t: { messages: {}, auth: {} } }) };
    if (id === 'next/navigation') {
      return {
        useRouter: () => mockRouter,
        useSearchParams: () => ({ get: () => null }),
      };
    }
    if (id === 'next/link') return ({ children }) => children;
    if (id === 'next/image') return () => null;
    if (id === '@/config/routes') {
      return {
        ROUTES: { dashboard: '/dashboard', roleSelection: '/roleselection', setup: '/setup' },
        getRequiredSetupRoute: () => '/setup',
      };
    }
    throw new Error(`Unhandled module: ${id}`);
  });

  const AuthPageComponent = authPageMod.exports.default;

  // Initial render of AuthPage
  scheduleRender();

  // Form submit handler must exist
  assert(typeof formSubmitHandler === 'function', 'AuthPage form onSubmit handler must exist');

  // Simulate submitting login form and wait for async completion
  const fakeEvent = { preventDefault: () => {} };
  await formSubmitHandler(fakeEvent);

  // If a nextAuthState transition is provided, transition context and trigger routing
  if (nextAuthContextState) {
    currentAuthState = {
      ...currentAuthState,
      ...nextAuthContextState,
    };
    scheduleRender();
  }

  return routerNavigations.map((nav) => nav.route);
}

test('technician UID -> signed out -> different owner UID never redirects owner to setup', async () => {
  const harness = createAuthHarness({ uid: 'u-technician', email: 'tech@farm.com', emailVerified: true });
  assert.equal(harness.getContext().loading, true);

  // Technician cached snapshot arrives: complete technician is provisional while fromCache
  harness.emitSnapshot('users/u-technician', {
    id: 'u-technician',
    uid: 'u-technician',
    role: 'technician',
    companyId: 'farm-1',
    hasCompletedSetup: true,
  }, { fromCache: true });

  assert.equal(harness.getContext().user?.role, 'technician');
  assert.equal(harness.getContext().loading, true, 'Cached complete technician remains provisional');
  assert.equal(harness.getContext().companyLoading, true);

  // Technician server snapshot arrives
  harness.emitSnapshot('users/u-technician', {
    id: 'u-technician',
    uid: 'u-technician',
    role: 'technician',
    companyId: 'farm-1',
    hasCompletedSetup: true,
  }, { fromCache: false });

  assert.equal(harness.getContext().loading, false);

  // Technician signs out
  await harness.signOut();
  assert.equal(harness.getContext().user, null);
  assert.equal(harness.getContext().loading, false);

  // Switch to different owner UID
  harness.triggerAuthChange({ uid: 'u-owner-diff', email: 'owner@farm.com', emailVerified: true });
  assert.equal(harness.getContext().loading, true);

  // Owner cached snapshot arrives
  harness.emitSnapshot('users/u-owner-diff', {
    id: 'u-owner-diff',
    uid: 'u-owner-diff',
    role: 'owner',
    companyId: 'farm-2',
    hasCompletedSetup: true,
  }, { fromCache: true });

  assert.equal(harness.getContext().user?.role, 'owner');
  assert.equal(harness.getContext().loading, true, 'Cached complete owner remains provisional');
  assert.equal(harness.getContext().companyLoading, true);
  assert.equal(harness.getContext().needsSetup, false, 'Provisional owner must not trigger setup');

  // Owner server snapshot arrives
  harness.emitSnapshot('users/u-owner-diff', {
    id: 'u-owner-diff',
    uid: 'u-owner-diff',
    role: 'owner',
    companyId: 'farm-2',
    hasCompletedSetup: true,
  }, { fromCache: false });

  assert.equal(harness.getContext().loading, false);
  assert.equal(harness.getContext().companyLoading, true);
  assert.equal(harness.getContext().needsSetup, false);

  // Company server snapshot arrives
  harness.emitSnapshot('companies/farm-2', {
    id: 'farm-2',
    companyName: 'Owner Farm',
    primaryLocation: 'Bali',
    farmType: 'shrimp',
    ownerId: 'u-owner-diff',
    teamMembers: ['u-owner-diff'],
  }, { fromCache: false });

  assert.equal(harness.getContext().companyLoading, false);
  assert.equal(harness.getContext().needsSetup, false, 'Completed owner must not need setup');
  harness.unmount();
});

test('cached accepted membership stays provisional and terminates on server revocation', () => {
  const harness = createAuthHarness({ uid: 'u-revoked-member', email: 'mem@farm.com', emailVerified: true });

  // User server snapshot arrives
  harness.emitSnapshot('users/u-revoked-member', {
    id: 'u-revoked-member',
    uid: 'u-revoked-member',
    role: 'technician',
    companyId: 'farm-shared',
    hasCompletedSetup: true,
  }, { fromCache: false });

  // Cached company snapshot where user was previously an accepted member
  harness.emitSnapshot('companies/farm-shared', {
    id: 'farm-shared',
    companyName: 'Shared Farm',
    ownerId: 'different-owner',
    teamMembers: ['u-revoked-member'],
    primaryLocation: 'Java',
    farmType: 'shrimp',
  }, { fromCache: true });

  assert.equal(harness.getContext().companyLoading, true, 'Cached company doc remains provisional');
  assert.equal(harness.getContext().needsSetup, false, 'Provisional cache must not prematurely route to setup or dashboard');

  // Server revokes access: permission denied on company listener
  harness.emitError('companies/farm-shared', { code: 'permission-denied' });

  assert.equal(harness.getContext().company, null, 'Revocation must clear inaccessible company state');
  assert.equal(harness.getContext().companyLoading, false, 'Error must resolve company loading');
  assert.equal(harness.getContext().needsSetup, true, 'Revoked user must need company setup/join and not enter dashboard');
  assert.equal(harness.docWrites.length, 0, 'Listener permission errors must never write profile changes');
  harness.unmount();
});

test('cache-missing user and company stay unresolved until server confirmation with zero writes', () => {
  const harness = createAuthHarness({ uid: 'u-cache-miss', email: 'miss@farm.com', emailVerified: true });

  // Cache-missing user snapshot: exists = false, fromCache = true
  harness.emitSnapshot('users/u-cache-miss', null, { fromCache: true });

  assert.equal(harness.docWrites.length, 0, 'Cache-missing user snapshot must never write profile');
  assert.equal(harness.getContext().user, null, 'Cache-missing user doc must stay unresolved');
  assert.equal(harness.getContext().loading, true, 'Initialization must not terminate on cache miss');
  assert.equal(harness.getContext().needsSetup, false);

  // Server confirms existing user doc
  harness.emitSnapshot('users/u-cache-miss', {
    id: 'u-cache-miss',
    uid: 'u-cache-miss',
    role: 'owner',
    companyId: 'farm-miss',
    hasCompletedSetup: true,
  }, { fromCache: false });

  assert.equal(harness.docWrites.length, 0);
  assert.equal(harness.getContext().user?.role, 'owner');
  assert.equal(harness.getContext().companyLoading, true);

  // Cache-missing company snapshot: exists = false, fromCache = true
  harness.emitSnapshot('companies/farm-miss', null, { fromCache: true });

  assert.equal(harness.getContext().companyLoading, true, 'Cache-missing company remains unresolved');
  assert.equal(harness.getContext().needsSetup, false);

  // Server confirms complete company profile
  harness.emitSnapshot('companies/farm-miss', {
    id: 'farm-miss',
    companyName: 'Farm Miss',
    primaryLocation: 'Java',
    farmType: 'shrimp',
    ownerId: 'u-cache-miss',
    teamMembers: ['u-cache-miss'],
  }, { fromCache: false });

  assert.equal(harness.getContext().companyLoading, false);
  assert.equal(harness.getContext().needsSetup, false);
  assert.equal(harness.docWrites.length, 0, 'Complete hydration of returning user must have zero profile writes');
  harness.unmount();
});

test('true new, incomplete, and pending users resolve correctly on server confirmation', () => {
  // True new user: server confirms absence
  const harnessNew = createAuthHarness({ uid: 'u-brand-new', email: 'new@farm.com', emailVerified: true });
  harnessNew.emitSnapshot('users/u-brand-new', null, { fromCache: false });

  assert.equal(harnessNew.docWrites.length, 1, 'Server-confirmed missing user creates sanitized profile');
  assert.equal(harnessNew.docWrites[0].data.id, 'u-brand-new');
  assert.equal(harnessNew.docWrites[0].data.hasCompletedSetup, false);
  assert.equal(harnessNew.getContext().needsRoleSelection, true);
  harnessNew.unmount();

  // Incomplete user: server user has no completed setup
  const harnessIncomplete = createAuthHarness({ uid: 'u-incomplete', email: 'inc@farm.com', emailVerified: true });
  harnessIncomplete.emitSnapshot('users/u-incomplete', {
    id: 'u-incomplete',
    uid: 'u-incomplete',
    role: 'owner',
    hasCompletedSetup: false,
  }, { fromCache: false });

  assert.equal(harnessIncomplete.getContext().needsRoleSelection, false);
  assert.equal(harnessIncomplete.getContext().needsSetup, true);
  harnessIncomplete.unmount();

  // Pending user: technician without company
  const harnessPending = createAuthHarness({ uid: 'u-pending', email: 'pen@farm.com', emailVerified: true });
  harnessPending.emitSnapshot('users/u-pending', {
    id: 'u-pending',
    uid: 'u-pending',
    role: 'technician',
    hasCompletedSetup: false,
  }, { fromCache: false });

  assert.equal(harnessPending.getContext().needsSetup, true);
  harnessPending.unmount();
});

test('generation guards reject active and retired listener callbacks after logout, UID switch, and company change', async () => {
  const harness = createAuthHarness({ uid: 'user-A', email: 'a@farm.com', emailVerified: true });

  // Get captured user listener for User A
  const userListenersA = harness.getCapturedListeners('users/user-A');
  assert.equal(userListenersA.length, 1);
  const userAListener = userListenersA[0];

  // Switch to User B before User A snapshot arrives
  harness.triggerAuthChange({ uid: 'user-B', email: 'b@farm.com', emailVerified: true });

  // Invoke captured User A callback after UID switch
  userAListener.onNext({
    id: 'user-A',
    exists: () => true,
    data: () => ({ id: 'user-A', uid: 'user-A', role: 'owner', hasCompletedSetup: true }),
    metadata: { fromCache: false },
  });

  assert.notEqual(harness.getContext().user?.uid, 'user-A', 'Captured User A callback must be rejected by auth session guard');

  // User B snapshot arrives with company-1
  harness.emitSnapshot('users/user-B', {
    id: 'user-B',
    uid: 'user-B',
    role: 'owner',
    companyId: 'comp-1',
    hasCompletedSetup: true,
  }, { fromCache: false });

  const comp1Listeners = harness.getCapturedListeners('companies/comp-1');
  assert.equal(comp1Listeners.length, 1);
  const comp1Listener = comp1Listeners[0];

  // User B switches to company-2
  harness.emitSnapshot('users/user-B', {
    id: 'user-B',
    uid: 'user-B',
    role: 'owner',
    companyId: 'comp-2',
    hasCompletedSetup: true,
  }, { fromCache: false });

  assert.equal(harness.getContext().companyLoading, true);

  // Invoke captured comp-1 callback after company switch
  comp1Listener.onNext({
    id: 'comp-1',
    exists: () => true,
    data: () => ({ id: 'comp-1', companyName: 'Old Comp', primaryLocation: 'Old', farmType: 'shrimp', ownerId: 'user-B', teamMembers: ['user-B'] }),
    metadata: { fromCache: false },
  });

  assert.notEqual(harness.getContext().company?.id, 'comp-1', 'Captured company-1 callback must be rejected by company session guard');

  // Capture CURRENT ACTIVE company and user callbacks immediately before logout
  const activeUserListener = harness.getActiveListener('users/user-B');
  const activeComp2Listener = harness.getActiveListener('companies/comp-2');
  assert(activeUserListener, 'Active user listener must exist before logout');
  assert(activeComp2Listener, 'Active company listener must exist before logout');

  // Sign out
  await harness.signOut();
  assert.equal(harness.getContext().user, null, 'User cleared on sign out');
  assert.equal(harness.getContext().company, null, 'Company cleared on sign out');

  const writesBeforeStale = harness.docWrites.length;

  // Invoke success and error on active listeners after logout
  activeUserListener.onNext({
    id: 'user-B',
    exists: () => true,
    data: () => ({ id: 'user-B', uid: 'user-B', role: 'owner', hasCompletedSetup: true }),
    metadata: { fromCache: false },
  });
  activeUserListener.onError(new Error('stale user error post-logout'));
  assert.equal(harness.getContext().user, null, 'User callback after logout must be rejected');

  activeComp2Listener.onNext({
    id: 'comp-2',
    exists: () => true,
    data: () => ({ id: 'comp-2', companyName: 'Resurrected', primaryLocation: 'Loc', farmType: 'shrimp' }),
    metadata: { fromCache: false },
  });
  activeComp2Listener.onError(new Error('stale company error post-logout'));
  assert.equal(harness.getContext().company, null, 'Company callback after logout must be rejected');
  assert.equal(harness.docWrites.length, writesBeforeStale, 'Stale callbacks after logout must not write');
  harness.unmount();
});

test('explicit companyId removal and post-user-error stale company callbacks do not resurrect state or write', () => {
  // Scenario 1: Explicit companyId removal
  const harness = createAuthHarness({ uid: 'u-removal-test', email: 'rem@farm.com', emailVerified: true });
  harness.emitSnapshot('users/u-removal-test', {
    id: 'u-removal-test',
    uid: 'u-removal-test',
    role: 'owner',
    companyId: 'comp-active',
    hasCompletedSetup: true,
  }, { fromCache: false });

  const compActiveListener = harness.getActiveListener('companies/comp-active');
  assert(compActiveListener, 'Company listener must be active for comp-active');

  // Explicit removal of companyId in user snapshot
  harness.emitSnapshot('users/u-removal-test', {
    id: 'u-removal-test',
    uid: 'u-removal-test',
    role: 'owner',
    companyId: null,
    hasCompletedSetup: true,
  }, { fromCache: false });

  assert.equal(harness.getContext().company, null);
  assert.equal(harness.getContext().companyLoading, false);

  const writesBefore = harness.docWrites.length;

  // Stale callback from removed company listener invoked
  compActiveListener.onNext({
    id: 'comp-active',
    exists: () => true,
    data: () => ({ id: 'comp-active', companyName: 'Stale Farm', ownerId: 'u-removal-test' }),
    metadata: { fromCache: false },
  });
  compActiveListener.onError(new Error('permission-denied'));

  assert.equal(harness.getContext().company, null, 'Stale company callback must not resurrect company');
  assert.equal(harness.docWrites.length, writesBefore, 'Stale company callback must not write');
  harness.unmount();

  // Scenario 2: Post-user-error stale callbacks (user and company) do not resurrect state or write
  const harness2 = createAuthHarness({ uid: 'u-err-test', email: 'err@farm.com', emailVerified: true });
  harness2.emitSnapshot('users/u-err-test', {
    id: 'u-err-test',
    uid: 'u-err-test',
    role: 'owner',
    companyId: 'comp-err',
    hasCompletedSetup: true,
  }, { fromCache: false });
  harness2.emitSnapshot('companies/comp-err', {
    id: 'comp-err',
    companyName: 'Farm Err',
    primaryLocation: 'Loc',
    farmType: 'shrimp',
    ownerId: 'u-err-test',
    teamMembers: ['u-err-test'],
  }, { fromCache: false });

  assert.equal(harness2.getContext().user?.uid, 'u-err-test');
  assert.equal(harness2.getContext().company?.id, 'comp-err');
  assert.equal(harness2.getContext().loading, false);
  assert.equal(harness2.getContext().companyLoading, false);

  // Capture fresh currently active user and company listeners before user permission error
  const activeUserListener = harness2.getActiveListener('users/u-err-test');
  const activeCompListener = harness2.getActiveListener('companies/comp-err');
  assert(activeUserListener, 'User listener must be active');
  assert(activeCompListener, 'Company listener must be active');

  const writesBeforeError = harness2.docWrites.length;

  // User listener encounters terminal permission-denied error
  harness2.emitError('users/u-err-test', { code: 'permission-denied' });
  assert.equal(harness2.getContext().user, null, 'User cleared on error');
  assert.equal(harness2.getContext().company, null, 'Company cleared on error');
  assert.equal(harness2.getContext().loading, false, 'Loading settled on error');
  assert.equal(harness2.getContext().companyLoading, false, 'Company loading settled on error');

  // Invoke captured user existing-profile success callback (cached and server)
  activeUserListener.onNext({
    id: 'u-err-test',
    exists: () => true,
    data: () => ({ id: 'u-err-test', uid: 'u-err-test', role: 'owner', companyId: 'comp-err' }),
    metadata: { fromCache: true },
  });
  activeUserListener.onNext({
    id: 'u-err-test',
    exists: () => true,
    data: () => ({ id: 'u-err-test', uid: 'u-err-test', role: 'owner', companyId: 'comp-err' }),
    metadata: { fromCache: false },
  });

  // Invoke captured user missing-profile callback (must NOT call setDoc to write new incomplete profile)
  activeUserListener.onNext({
    id: 'u-err-test',
    exists: () => false,
    data: () => null,
    metadata: { fromCache: false },
  });

  // Invoke captured user error callback again
  activeUserListener.onError(new Error('subsequent user error'));

  // Invoke captured company existing-profile, missing-profile, and error callbacks
  activeCompListener.onNext({
    id: 'comp-err',
    exists: () => true,
    data: () => ({ id: 'comp-err', companyName: 'Zombie Farm' }),
    metadata: { fromCache: true },
  });
  activeCompListener.onNext({
    id: 'comp-err',
    exists: () => true,
    data: () => ({ id: 'comp-err', companyName: 'Zombie Farm' }),
    metadata: { fromCache: false },
  });
  activeCompListener.onNext({
    id: 'comp-err',
    exists: () => false,
    data: () => null,
    metadata: { fromCache: false },
  });
  activeCompListener.onError(new Error('subsequent comp-err'));

  // Assert user/company remain null, loading settled, no company resurrection, and zero profile/migration/member sync writes
  assert.equal(harness2.getContext().user, null, 'User must remain null');
  assert.equal(harness2.getContext().company, null, 'Company must not resurrect');
  assert.equal(harness2.getContext().loading, false, 'Loading must stay settled');
  assert.equal(harness2.getContext().companyLoading, false, 'Company loading must stay settled');
  assert.equal(harness2.docWrites.length, writesBeforeError, 'No writes from stale callbacks');
  assert.equal(harness2.updateWrites.length, 0, 'No migration/update writes from stale callbacks');

  // Verify that a real Firebase auth callback can create a new valid generation thereafter
  harness2.triggerAuthChange({ uid: 'u-err-test', email: 'err@farm.com', emailVerified: true });
  assert.equal(harness2.getContext().loading, true, 'New auth session restarts loading');
  harness2.emitSnapshot('users/u-err-test', {
    id: 'u-err-test',
    uid: 'u-err-test',
    role: 'owner',
    companyId: 'comp-new-gen',
    hasCompletedSetup: true,
  }, { fromCache: false });
  assert.equal(harness2.getContext().user?.uid, 'u-err-test', 'New generation resolves valid snapshot');

  harness2.unmount();
});

test('unmount invalidates fresh active session and guards against stale user and company callbacks', () => {
  const harness = createAuthHarness({ uid: 'u-unmount-fresh', email: 'unmount@farm.com', emailVerified: true });
  harness.emitSnapshot('users/u-unmount-fresh', {
    id: 'u-unmount-fresh',
    uid: 'u-unmount-fresh',
    role: 'owner',
    companyId: 'comp-unmount',
    hasCompletedSetup: true,
  }, { fromCache: false });
  harness.emitSnapshot('companies/comp-unmount', {
    id: 'comp-unmount',
    companyName: 'Unmount Farm',
    primaryLocation: 'Location',
    farmType: 'shrimp',
    ownerId: 'u-unmount-fresh',
    teamMembers: ['u-unmount-fresh'],
  }, { fromCache: false });

  assert.equal(harness.getContext().user?.uid, 'u-unmount-fresh');
  assert.equal(harness.getContext().company?.id, 'comp-unmount');
  assert.equal(harness.getContext().loading, false);
  assert.equal(harness.getContext().companyLoading, false);

  // Capture active listeners immediately before unmount while session is fresh and active
  const activeUserListener = harness.getActiveListener('users/u-unmount-fresh');
  const activeCompanyListener = harness.getActiveListener('companies/comp-unmount');
  assert(activeUserListener, 'Active user listener must exist before unmount');
  assert(activeCompanyListener, 'Active company listener must exist before unmount');

  const contextBeforeUnmount = harness.getContext();
  const writesBeforeUnmount = harness.docWrites.length;
  const updatesBeforeUnmount = harness.updateWrites.length;

  // Call unmount
  harness.unmount();

  // Exercise captured user success, missing, and error callbacks post-unmount
  activeUserListener.onNext({
    id: 'u-unmount-fresh',
    exists: () => true,
    data: () => ({ id: 'u-unmount-fresh', uid: 'u-unmount-fresh', role: 'technician', companyId: 'other' }),
    metadata: { fromCache: false },
  });
  activeUserListener.onNext({
    id: 'u-unmount-fresh',
    exists: () => false,
    data: () => null,
    metadata: { fromCache: false },
  });
  activeUserListener.onError(new Error('post-unmount user error'));

  // Exercise captured company success, missing, and error callbacks post-unmount
  activeCompanyListener.onNext({
    id: 'comp-unmount',
    exists: () => true,
    data: () => ({ id: 'comp-unmount', companyName: 'Mutated Farm' }),
    metadata: { fromCache: false },
  });
  activeCompanyListener.onNext({
    id: 'comp-unmount',
    exists: () => false,
    data: () => null,
    metadata: { fromCache: false },
  });
  activeCompanyListener.onError(new Error('post-unmount company error'));

  // Context must not mutate and writes stay unchanged
  assert.equal(harness.getContext().user?.role, contextBeforeUnmount.user?.role, 'User must not mutate post-unmount');
  assert.equal(harness.getContext().company?.companyName, contextBeforeUnmount.company?.companyName, 'Company must not mutate post-unmount');
  assert.equal(harness.docWrites.length, writesBeforeUnmount, 'No writes from post-unmount callbacks');
  assert.equal(harness.updateWrites.length, updatesBeforeUnmount, 'No update writes from post-unmount callbacks');
});

test('signOut rejection preserves active session and continues hydrating until real signout', async () => {
  const harness = createAuthHarness({ uid: 'u-reject-test', email: 'r@farm.com', emailVerified: true });
  harness.setRejectSignOut(true);

  let caughtError = null;
  try {
    await harness.signOut();
  } catch (err) {
    caughtError = err;
  }
  assert(caughtError, 'Expected signOut to throw when rejectSignOut is enabled');

  // Existing session must continue to hydrate snapshots because generation was not invalidated
  harness.emitSnapshot('users/u-reject-test', {
    id: 'u-reject-test',
    uid: 'u-reject-test',
    role: 'owner',
    companyId: 'farm-reject',
    hasCompletedSetup: true,
  }, { fromCache: false });

  assert.equal(harness.getContext().user?.uid, 'u-reject-test', 'User doc hydrates after failed signOut');

  harness.emitSnapshot('companies/farm-reject', {
    id: 'farm-reject',
    companyName: 'Reject Farm',
    ownerId: 'u-reject-test',
    teamMembers: ['u-reject-test'],
    primaryLocation: 'Loc',
    farmType: 'shrimp',
  }, { fromCache: false });

  assert.equal(harness.getContext().company?.id, 'farm-reject', 'Company doc hydrates after failed signOut');
  assert.equal(harness.getContext().loading, false);

  // Now allow successful signout
  harness.setRejectSignOut(false);
  await harness.signOut();
  assert.equal(harness.getContext().user, null, 'User cleared after successful signOut');
  assert.equal(harness.getContext().company, null, 'Company cleared after successful signOut');

  harness.unmount();
});

test('module cache remount displays matching UID data but restarts server readiness, and clears mismatched UID', () => {
  // First mount resolves user and company
  const harness = createAuthHarness({ uid: 'cached-user', email: 'c@farm.com', emailVerified: true });
  harness.emitSnapshot('users/cached-user', {
    id: 'cached-user',
    uid: 'cached-user',
    role: 'owner',
    companyId: 'cached-farm',
    hasCompletedSetup: true,
  }, { fromCache: false });
  harness.emitSnapshot('companies/cached-farm', {
    id: 'cached-farm',
    companyName: 'Cached Farm',
    primaryLocation: 'Location',
    farmType: 'shrimp',
    ownerId: 'cached-user',
    teamMembers: ['cached-user'],
  }, { fromCache: false });

  assert.equal(harness.getContext().loading, false);
  assert.equal(harness.getContext().companyLoading, false);

  // Remount with SAME UID and delayed initial auth callback:
  // displays cached data immediately, but first committed context remains loading before Firebase async callback
  harness.remount({ uid: 'cached-user', email: 'c@farm.com', emailVerified: true }, { delayAuthCallback: true });
  assert.equal(harness.getContext().user?.uid, 'cached-user', 'Same UID displays cached user');
  assert.equal(harness.getContext().company?.id, 'cached-farm', 'Same UID displays cached company');
  assert.equal(harness.getContext().loading, true, 'First committed context remains loading on cached remount');
  assert.equal(harness.getContext().companyLoading, true, 'First committed context companyLoading remains true');

  // Flushing delayed async initial auth callback maintains server readiness wait
  harness.flushAuthCallback();
  assert.equal(harness.getContext().loading, true, 'Same UID restarts server readiness at subscription');

  // Remount with DIFFERENT UID: clears incompatible cache and restarts initialization
  harness.remount({ uid: 'different-user', email: 'd@farm.com', emailVerified: true });
  assert.equal(harness.getContext().user, null, 'Mismatched UID clears user');
  assert.equal(harness.getContext().company, null, 'Mismatched UID clears company');
  assert.equal(harness.getContext().loading, true, 'Mismatched UID restarts initialization');

  harness.unmount();
});

test('actual AuthPage redirect effect awaits context loading and companyLoading before selecting setup or dashboard', async () => {
  // Case 1: Unverified email redirects immediately to verify
  const routesUnverified = await runAuthPageTest({ emailVerified: false });
  assert.deepEqual(routesUnverified, ['/auth/verify']);

  // Case 2: Verified email but authLoading is true: waits
  const routesAuthLoading = await runAuthPageTest({ emailVerified: true, loading: true, needsSetup: true });
  assert.deepEqual(routesAuthLoading, [], 'Must await auth loading');

  // Case 3: Verified email and authLoading false, but companyLoading is true: waits
  const routesCompanyLoading = await runAuthPageTest({ emailVerified: true, loading: false, companyLoading: true, needsSetup: true });
  assert.deepEqual(routesCompanyLoading, [], 'Must await company loading');

  // Case 4: Fully resolved with needsSetup: redirects to setup
  const routesNeedsSetup = await runAuthPageTest({ emailVerified: true, loading: false, companyLoading: false, needsSetup: true });
  assert.deepEqual(routesNeedsSetup, ['/setup']);

  // Case 5: Fully resolved completed owner: redirects to dashboard
  const routesDashboard = await runAuthPageTest({ emailVerified: true, loading: false, companyLoading: false, needsSetup: false });
  assert.deepEqual(routesDashboard, ['/dashboard']);

  // Case 6: Transition from pending (companyLoading: true) to resolved (companyLoading: false) triggers redirect in same runtime
  const routesTransitionSetup = await runAuthPageTest(
    { emailVerified: true, loading: false, companyLoading: true, needsSetup: true },
    { loading: false, companyLoading: false, needsSetup: true }
  );
  assert.deepEqual(routesTransitionSetup, ['/setup'], 'Resolving companyLoading triggers pending setup redirect');

  // Case 7: Transition from pending authLoading & companyLoading to fully resolved dashboard
  const routesTransitionDashboard = await runAuthPageTest(
    { emailVerified: true, loading: true, companyLoading: true, needsSetup: false },
    { loading: false, companyLoading: false, needsSetup: false }
  );
  assert.deepEqual(routesTransitionDashboard, ['/dashboard'], 'Resolving auth and company loading triggers pending dashboard redirect');
});
