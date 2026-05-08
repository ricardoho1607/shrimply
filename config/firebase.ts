// config/firebase.ts
import { initializeApp } from "firebase/app";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNo5RXCHLOIXJM_meJWXNPUV7gjxXhZkc",
  authDomain: "investashrimp-5d9e5.firebaseapp.com",
  projectId: "investashrimp-5d9e5",
  storageBucket: "investashrimp-5d9e5.firebasestorage.app",
  messagingSenderId: "496805431411",
  appId: "1:496805431411:web:9e497f6435a20466550206",
  measurementId: "G-TE86K5EKKB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const getAppAuth = () => {
  if (Platform.OS === 'web') {
    return FirebaseAuth.getAuth(app);
  } else {
    // For native platforms, use the appropriate persistence
    const { initializeAuth, getReactNativePersistence } = FirebaseAuth as any;
    if (getReactNativePersistence) {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
    }
    return FirebaseAuth.getAuth(app);
  }
};

export const auth = getAppAuth();
export const db = getFirestore(app);
export const storage = getStorage(app); // ADD THIS LINE

export default app;