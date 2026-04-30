import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc",
  authDomain: "investashrimp-5d9e5.firebaseapp.com",
  projectId: "investashrimp-5d9e5",
  storageBucket: "investashrimp-5d9e5.firebasestorage.app",
  messagingSenderId: "496805431411",
  appId: "1:496805431411:web:9e497f6435a20466550206",
  measurementId: "G-TE86K5EKKB"
};

// Initialize Firebase for SSR compatibility
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
