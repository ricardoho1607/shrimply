const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('./firebaseAdmin');
const { notificationTimestampMillis } = require('./shared/notificationTimestamp');
const { publicDiseaseAlert } = require('./shared/publicDiseaseAlert');
exports.publishPublicDiseaseAlert = onDocumentWritten('diseaseReports/{reportId}', async event => {
  const db = admin.firestore();
  const source = db.collection('diseaseReports').doc(event.params.reportId);
  const target = db.collection('publicDiseaseAlerts').doc(event.params.reportId);
  // Read current data to make out-of-order trigger deliveries harmless.
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(source);
    const projection = snapshot.exists ? publicDiseaseAlert(snapshot.data()) : null;
    if (projection) transaction.set(target, projection);
    else transaction.delete(target);
  });
});

exports.normalizeNotificationTimestamp = onDocumentWritten('notifications/{notificationId}', async event => {
  const ref = admin.firestore().collection('notifications').doc(event.params.notificationId);
  await admin.firestore().runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists || snapshot.data().timestamp instanceof admin.firestore.Timestamp) return;
    const millis = notificationTimestampMillis(snapshot.data(), snapshot.createTime);
    transaction.update(ref, { timestamp: millis == null ? admin.firestore.FieldValue.serverTimestamp() : admin.firestore.Timestamp.fromMillis(millis) });
  });
});
