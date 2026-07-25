import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtUWE4wGBNxYdD8zTpwxOg89Ej_NHn0Sk",
  authDomain: "jn-it-center-5db46.firebaseapp.com",
  projectId: "jn-it-center-5db46",
  storageBucket: "jn-it-center-5db46.firebasestorage.app",
  messagingSenderId: "753523859312",
  appId: "1:753523859312:web:18544ee604a43fc67d39b5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { auth, db, storage };