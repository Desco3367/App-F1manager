import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const LFM_CONFIG = {
  ADMIN_EMAIL: "admin@manager.local",

  firebaseConfig: {
    apiKey: "AIzaSyCCr10aS4ySODCqactCQPd2hbPY1OGEKoo",
    authDomain: "app-f1manager.firebaseapp.com",
    projectId: "app-f1manager",
    storageBucket: "app-f1manager.firebasestorage.app",
    messagingSenderId: "689471306567",
    appId: "1:689471306567:web:b44b81c9ac506b3803ea62"
  }
};

// Initialize Firebase
const app = initializeApp(LFM_CONFIG.firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
