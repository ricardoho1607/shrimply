const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
require('../../../scripts/register-typescript.cjs');
const dialogs = require('./appDialogs.ts');
const { getUserErrorMessage } = require('./userError.ts');
afterEach(() => dialogs.cancelAppDialogs());

test('SDK errors have safe messages while application validation stays useful', () => {
  assert.match(getUserErrorMessage({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }), /do not have permission/);
  assert.match(getUserErrorMessage('Firebase: Error (auth/network-request-failed).'), /Check your connection/);
  assert.match(getUserErrorMessage({ code: 'auth/invalid-credential' }), /email or password/);
  assert.equal(getUserErrorMessage({ name: 'FirebaseError', code: 'functions/internal', message: 'internal implementation details' }, 'Could not remove feed. Please try again.'), 'Could not remove feed. Please try again.');
  assert.equal(getUserErrorMessage(new Error('End the active cycle before deleting this pond.')), 'End the active cycle before deleting this pond.');
  assert.doesNotMatch(getUserErrorMessage('FirebaseError: query requires an index: https://console.firebase.google.com'), /Firebase|https:/);
});

test('alerts use the app queue and sanitize raw SDK messages', () => {
  dialogs.showAppAlert('Firebase: Missing or insufficient permissions.');
  const dialog = dialogs.getAppDialog();
  assert.equal(dialog.kind, 'alert');
  assert.match(dialog.message, /do not have permission/);
  assert.doesNotMatch(dialog.message, /Firebase/);
  dialogs.resolveAppDialog(dialog.id, true);
  assert.equal(dialogs.getAppDialog(), null);
});

test('confirmation stays pending until a choice; cancellation cannot perform the action', async () => {
  let writes = 0;
  const action = (async () => { if (await dialogs.confirmAppAction('Delete record?')) writes++; })();
  await Promise.resolve();
  assert.equal(writes, 0);
  dialogs.resolveAppDialog(dialogs.getAppDialog().id, false);
  await action;
  assert.equal(writes, 0);
  const accepted = dialogs.confirmAppAction('Delete record?');
  dialogs.resolveAppDialog(dialogs.getAppDialog().id, true);
  assert.equal(await accepted, true);
});

test('queue order and stale callbacks cannot approve another action', async () => {
  dialogs.showAppAlert('Saved.');
  const first = dialogs.getAppDialog();
  const pending = dialogs.confirmAppAction('Delete another record?');
  dialogs.resolveAppDialog(first.id, true);
  const second = dialogs.getAppDialog();
  dialogs.resolveAppDialog(first.id, true);
  assert.equal(dialogs.getAppDialog().id, second.id);
  dialogs.resolveAppDialog(second.id, false);
  assert.equal(await pending, false);
});

test('duplicate clicks cannot queue a second destructive action', async () => {
  const first = dialogs.confirmAppAction('Remove feed?');
  assert.equal(await dialogs.confirmAppAction('Remove feed?'), false);
  dialogs.resolveAppDialog(dialogs.getAppDialog().id, true);
  assert.equal(await first, true);
  assert.equal(dialogs.getAppDialog(), null);
});

test('navigation cancels actions while retaining success feedback; unmount cancels everything', async () => {
  const first = dialogs.confirmAppAction('Remove feed?');
  dialogs.showAppAlert('Saved.');
  dialogs.cancelAppConfirmations();
  assert.equal(await first, false);
  assert.equal(dialogs.getAppDialog().message, 'Saved.');
  const next = dialogs.confirmAppAction('Delete another record?');
  dialogs.cancelAppDialogs();
  assert.equal(await next, false);
  assert.equal(dialogs.getAppDialog(), null);
});
