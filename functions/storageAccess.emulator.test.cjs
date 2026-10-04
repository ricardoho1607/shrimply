const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, updateDoc } = require('firebase/firestore');
const { ref, uploadBytes, getMetadata } = require('firebase/storage');
let env;
test.before(async () => { env = await initializeTestEnvironment({ projectId: process.env.GCLOUD_PROJECT || 'demo-shrimply-audit', firestore: { rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') }, storage: { rules: fs.readFileSync(path.join(__dirname, '../storage.rules'), 'utf8') } }); });
test.after(async () => env?.cleanup());
test.beforeEach(async () => {
  await env.clearFirestore(); await env.clearStorage();
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'companies/farm'), { ownerId: 'owner', teamMembers: ['owner', 'tech', 'moved', 'manager', 'mechanic'] });
    for (const [id, role, companyId, permissionOverrides] of [['owner','owner','farm',{}],['tech','technician','farm',{}],['moved','technician','other',{}],['manager','manager','farm',{manageLabReports:true}],['mechanic','mechanic','farm',{}]]) await setDoc(doc(db, 'users', id), { companyId, role, permissionOverrides });
    await setDoc(doc(db, 'companies/farm/labReports/lab'), { status: 'draft' });
  });
});
const file = uid => ref(env.authenticatedContext(uid).storage(), 'companies/farm/labReports/lab/source.pdf');
const metadata = { contentType: 'application/pdf', customMetadata: { companyId: 'farm', labReportId: 'lab' } };
test('granted manager uploads; revoked technician and missing metadata are rejected', async () => {
  await assertSucceeds(uploadBytes(file('manager'), new Uint8Array([1,2]), metadata));
  await assertFails(uploadBytes(file('tech'), new Uint8Array([1,2]), { contentType: 'application/pdf' }));
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'users/tech'), { permissionOverrides: { manageLabReports: false } }));
  await assertFails(uploadBytes(file('tech'), new Uint8Array([1,2]), metadata));
});
test('stale company member cannot read company files', async () => {
  await assertSucceeds(uploadBytes(file('owner'), new Uint8Array([1,2]), metadata));
  await assertFails(getMetadata(file('moved')));
  await assertSucceeds(getMetadata(file('tech')));
});
test('confirmed lab source cannot be replaced and profile path is user owned', async () => {
  await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), 'companies/farm/labReports/lab'), { status: 'confirmed' }));
  await assertFails(uploadBytes(file('owner'), new Uint8Array([1,2]), metadata));
  const storage = env.authenticatedContext('tech').storage();
  await assertSucceeds(uploadBytes(ref(storage, 'users/tech/profile/photo.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
  await assertFails(uploadBytes(ref(storage, 'users/owner/profile/photo.jpg'), new Uint8Array([1]), { contentType: 'image/jpeg' }));
});
test('mechanic may upload maintenance media but not ordinary asset photos', async () => {
  const storage = env.authenticatedContext('mechanic').storage();
  const metadata = { contentType: 'image/jpeg', customMetadata: { companyId: 'farm', assetId: 'asset' } };
  await assertSucceeds(uploadBytes(ref(storage, 'companies/farm/assets/asset/maintenance/photo.jpg'), new Uint8Array([1]), metadata));
  await assertFails(uploadBytes(ref(storage, 'companies/farm/assets/asset/asset/photo.jpg'), new Uint8Array([1]), metadata));
});
