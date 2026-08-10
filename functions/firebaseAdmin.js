const { getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { FieldValue, Timestamp, getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

const firestore = Object.assign(() => getFirestore(), {
  FieldValue,
  Timestamp,
});

module.exports = {
  auth: () => getAuth(),
  firestore,
  initializeApp: () => getApps()[0] || initializeApp(),
  storage: () => getStorage(),
};
