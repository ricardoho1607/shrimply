// Dry run by default. Explicit project required; never print farm data.
const functionsRequire = require('node:module').createRequire(require('node:path').resolve(__dirname, '../functions/package.json'));
const { initializeApp } = functionsRequire('firebase-admin/app');
const { getFirestore, FieldPath, FieldValue, Timestamp } = functionsRequire('firebase-admin/firestore');
const { publicDiseaseAlert } = require('../functions/shared/publicDiseaseAlert');
const { notificationTimestampMillis } = require('../functions/shared/notificationTimestamp');
const args = process.argv.slice(2);
const projectId = args.find(arg => arg.startsWith('--project='))?.slice(10);
if (!projectId) throw new Error('Specify --project=PROJECT_ID. Add --apply only after reviewing the dry-run counts.');
initializeApp({ projectId });
const db = getFirestore(), apply = args.includes('--apply');
async function scan(collection, visit) {
  let cursor;
  while (true) {
    let query = db.collection(collection).orderBy(FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) return;
    for (const doc of page.docs) await visit(doc);
    cursor = page.docs.at(-1);
  }
}
(async () => {
  const counts = { publicAlerts: 0, notificationTimestamps: 0, privateDiseaseNotifications: 0 };
  await scan('diseaseReports', async document => {
    if (!publicDiseaseAlert(document.data())) return;
    counts.publicAlerts++;
    if (apply) await db.runTransaction(async tx => {
      const latest = await tx.get(document.ref);
      const target = db.collection('publicDiseaseAlerts').doc(document.id);
      const value = latest.exists ? publicDiseaseAlert(latest.data()) : null;
      if (value) tx.set(target, value); else tx.delete(target);
    });
  });
  await scan('notifications', async document => {
    const value = document.data();
    if (!(value.timestamp instanceof Timestamp)) counts.notificationTimestamps++;
    if (value.type === 'disease_alert') counts.privateDiseaseNotifications++;
    if (!apply || (value.timestamp instanceof Timestamp && value.type !== 'disease_alert')) return;
    await db.runTransaction(async tx => {
      const latest = await tx.get(document.ref);
      if (!latest.exists) return;
      const record = latest.data(), update = {};
      if (!(record.timestamp instanceof Timestamp)) {
        const millis = notificationTimestampMillis(record, latest.createTime);
        update.timestamp = millis == null ? FieldValue.serverTimestamp() : Timestamp.fromMillis(millis);
      }
      if (record.type === 'disease_alert') {
        update.title = 'Regional disease alert';
        update.message = 'A disease alert was reported in your region. Farm details are private. Review biosecurity and monitor ponds closely.';
        update.data = { reportId: record.data?.reportId || null, diseaseType: record.data?.diseaseType || 'unknown', diseaseName: record.data?.diseaseName || 'Disease alert', severity: record.data?.severity || 'medium' };
      }
      if (Object.keys(update).length) tx.update(document.ref, update);
    });
  });
  console.log(JSON.stringify({ projectId, mode: apply ? 'apply' : 'dry-run', counts }, null, 2));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
