const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const root = require('node:path').resolve(__dirname, '..');
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run this test through the Firestore emulator.');
const req = require('node:module').createRequire(root+'/functions/package.json');
const {initializeApp,deleteApp}=req('firebase-admin/app');
const {getFirestore}=req('firebase-admin/firestore');
const app=initializeApp({projectId:'demo-shrimply-migration-test'});
test('privacy migration dry-run, apply, chronology and repeat behavior', async () => {
 const db=getFirestore();
 const report=db.doc('diseaseReports/report'), notice=db.doc('notifications/notice');
 await report.set({companyId:'private-farm',companyName:'Private Farm',symptoms:'private symptoms',estimatedLoss:100,location:{latitude:10.1234,longitude:100.4567},diseaseType:'wssv',reportDate:'2026-09-10'});
 await notice.set({type:'disease_alert',title:'Private Farm',message:'private symptoms',timestamp:'2026-09-10T01:00:00Z',data:{reportId:'report',companyName:'Private Farm',distance:1.23}});
 function run(apply){const r=spawnSync(process.execPath,[root+'/scripts/migrate-audit-privacy.cjs','--project=demo-shrimply-migration-test',...(apply?['--apply']:[])],{env:process.env,encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);}
 assert.equal(run(false).mode,'dry-run');
 assert.equal((await db.doc('publicDiseaseAlerts/report').get()).exists,false);
 assert.equal((await notice.get()).data().title,'Private Farm');
 assert.equal(run(true).mode,'apply');
 const publicData=(await db.doc('publicDiseaseAlerts/report').get()).data();
 assert.equal(publicData.companyName,undefined);assert.equal(publicData.symptoms,undefined);assert.equal(publicData.location.latitude,10.5);
 const notification=(await notice.get()).data();assert.equal(notification.title,'Regional disease alert');assert.equal(notification.data.companyName,undefined);assert.equal(notification.data.distance,undefined);assert.equal(notification.timestamp.toMillis(),Date.parse('2026-09-10T01:00:00Z'));
 assert.equal(run(true).counts.notificationTimestamps,0);
 await Promise.all([report.delete(),notice.delete(),db.doc('publicDiseaseAlerts/report').delete()]);
 console.log('PASS: migration dry-run leaves data intact; apply sanitizes alerts and preserves chronology; repeat is safe.');
 await deleteApp(app);
});
