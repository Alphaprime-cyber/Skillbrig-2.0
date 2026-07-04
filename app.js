import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgV-0KaUdjHyy_YPYRogunS5H01jPBbGg",
  authDomain: "skillbridge-app-56faf.firebaseapp.com",
  projectId: "skillbridge-app-56faf",
  storageBucket: "skillbridge-app-56faf.firebasestorage.app",
  messagingSenderId: "181813326765",
  appId: "1:181813326765:web:4732292cd467a8f7d3a724"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);