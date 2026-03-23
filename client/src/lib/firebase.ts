import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAVWPIRCMhK_WlNqrBBe-Np12uWsemYUwI",
  authDomain: "erp-metal-trevo.firebaseapp.com",
  projectId: "erp-metal-trevo",
  storageBucket: "erp-metal-trevo.firebasestorage.app",
  messagingSenderId: "1058221220442",
  appId: "1:1058221220442:web:a6d05699d2d9ad2bf06e63",
  measurementId: "G-8TTWCK9PLN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

export const storage = getStorage(app);

export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;