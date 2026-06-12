/*
  Liga F1 Manager - configuracion Firebase

  No usa Node ni npm.

  1. Crea o reutiliza un proyecto Firebase.
  2. Activa Authentication > Email/Password.
  3. Activa Firestore Database.
  4. Crea manualmente los usuarios de equipos.
  5. Pega aqui tu configuracion web.
  6. Cambia ADMIN_EMAIL por tu email admin real.
*/

window.LFM_CONFIG = {
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

(function initFirebase() {
  const cfg = window.LFM_CONFIG.firebaseConfig;
  const values = Object.values(cfg).map((value) => String(value || ""));
  const missing = values.some((value) => value.startsWith("PEGAR_") || value.trim() === "");

  window.LFM_MISSING_CONFIG = missing || window.LFM_CONFIG.ADMIN_EMAIL.includes("TU_EMAIL_ADMIN");

  if (window.LFM_MISSING_CONFIG) return;

  firebase.initializeApp(cfg);
  window.auth = firebase.auth();
  window.db = firebase.firestore();
  window.ADMIN_EMAIL = window.LFM_CONFIG.ADMIN_EMAIL.trim().toLowerCase();
})();
