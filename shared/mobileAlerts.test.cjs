const test = require('node:test');
const assert = require('node:assert/strict');
require('../scripts/register-typescript.cjs');
const dialogs = require('../components/alerts/appAlert.ts');
const { getUserErrorMessage } = require('./userError.ts');
test.afterEach(() => dialogs.cancelAppAlertActions(true));

test('mobile SDK alerts show a safe message and preserve application validation', () => {
  dialogs.AppAlert.alert('Error', 'Firebase: Missing or insufficient permissions.');
  assert.match(dialogs.getAppAlert().message, /do not have permission/);
  assert.doesNotMatch(dialogs.getAppAlert().message, /Firebase|firestore/i);
  assert.equal(getUserErrorMessage(new Error('End the active cycle first.')), 'End the active cycle first.');
  assert.equal(getUserErrorMessage({ name: 'FirebaseError', code: 'functions/internal', message: 'internal' }, 'Could not remove feed.'), 'Could not remove feed.');
});

test('confirmation never writes before approval; Cancel and stale double taps cannot write', () => {
  let writes = 0;
  dialogs.AppAlert.alert('Remove feed', 'Remove this record?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => writes++ },
  ]);
  const first = dialogs.getAppAlert();
  assert.equal(writes, 0);
  dialogs.chooseAppAlert(first.id, 0);
  dialogs.chooseAppAlert(first.id, 1);
  assert.equal(writes, 0);
  dialogs.AppAlert.alert('Remove feed', 'Remove this record?', first.buttons);
  const second = dialogs.getAppAlert();
  dialogs.chooseAppAlert(second.id, 1);
  dialogs.chooseAppAlert(second.id, 1);
  assert.equal(writes, 1);
});

test('actions may queue follow-up alerts without losing them', () => {
  dialogs.AppAlert.alert('Remove feed', 'Remove?', [{ text: 'Remove', onPress: () => dialogs.AppAlert.alert('Error', 'Firebase: Error (auth/network-request-failed).') }]);
  dialogs.chooseAppAlert(dialogs.getAppAlert().id, 0);
  assert.match(dialogs.getAppAlert().message, /Check your connection/);
  assert.equal(dialogs.getAppAlert().buttons[0].text, 'OK');
});

test('Back and outside tap honor cancelable and onDismiss without approving an action', () => {
  let dismissed = 0, writes = 0;
  dialogs.AppAlert.alert('Confirm', 'Continue?', [{ text: 'Confirm', onPress: () => writes++ }]);
  dialogs.dismissAppAlert(dialogs.getAppAlert().id);
  assert.ok(dialogs.getAppAlert());
  dialogs.cancelAppAlertActions(true);
  dialogs.AppAlert.alert('Confirm', 'Continue?', [{ text: 'Confirm', onPress: () => writes++ }], { cancelable: true, onDismiss: () => dismissed++ });
  const id = dialogs.getAppAlert().id;
  dialogs.dismissAppAlert(id);
  dialogs.dismissAppAlert(id);
  assert.equal(dismissed, 1);
  assert.equal(writes, 0);
});

test('navigation cancels pending confirmations and resolves their cancel handlers; plain alerts survive', async () => {
  let writes = 0;
  const result = new Promise(resolve => dialogs.AppAlert.alert('SOP preview', 'Continue?', [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Confirm', onPress: () => { writes++; resolve(true); } },
  ], { cancelable: false }));
  dialogs.AppAlert.alert('Saved', 'Your changes were saved.');
  dialogs.cancelAppAlertActions();
  assert.equal(await result, false);
  assert.equal(writes, 0);
  assert.equal(dialogs.getAppAlert().title, 'Saved');
});

function renderMobileHost(platform) {
  const fs = require('node:fs'), path = require('node:path'), ts = require('typescript');
  const source = fs.readFileSync(path.resolve(__dirname, '../components/alerts/AppAlertHost.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const module = { exports: {} };
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: { useEffect() {}, useSyncExternalStore: (_, snapshot) => snapshot() },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'expo-router': { usePathname: () => '/feed-history' },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Icon' },
    'react-native': { Platform: { OS: platform }, StyleSheet: { create: value => value, absoluteFill: {} },
      Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View' },
    'react-native-screens': { FullWindowOverlay: 'FullWindowOverlay' },
    './appAlert': dialogs,
  };
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  return module.exports.default();
}
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
for (const platform of ['android', 'ios']) test(`${platform}: real dialog buttons keep cancellation and destructive actions separate`, () => {
  let writes = 0;
  dialogs.AppAlert.alert('Remove feed', 'Remove this record?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => writes++ },
  ]);
  let view = renderMobileHost(platform);
  assert.equal(view.type, platform === 'ios' ? 'FullWindowOverlay' : 'Modal');
  if (platform === 'android') {
    view.props.onRequestClose();
    assert.ok(dialogs.getAppAlert(), 'Hardware Back must not approve or dismiss a required choice');
  }
  const buttons = nodes(view).filter(node => node.type === 'Pressable' && node.props.accessibilityRole === 'button');
  assert.equal(buttons.length, 2);
  assert.equal(writes, 0);
  buttons[0].props.onPress();
  assert.equal(writes, 0);
  assert.equal(renderMobileHost(platform), null);
  // A retained event from a closed dialog cannot act on the next dialog.
  dialogs.AppAlert.alert('Next record', 'Continue?');
  buttons[1].props.onPress();
  assert.equal(writes, 0);
  assert.equal(dialogs.getAppAlert().title, 'Next record');
});
