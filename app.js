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
// SIGN UP
window.signup = function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Signup successful!");
    })
    .catch((error) => {
      alert(error.message);
    });
};

// LOGIN
window.login = function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Login successful!");
    })
    .catch((error) => {
      alert(error.message);
    });
};
window.addService = async function () {

  const name = document.getElementById("serviceName").value.trim();
  const category = document.getElementById("serviceCategory").value;
  const state = document.getElementById("serviceState").value;
  const location = document.getElementById("serviceLocation").value.trim();
  const phone = document.getElementById("servicePhone").value.trim();
  const description = document.getElementById("serviceDescription").value.trim();

  if (!name || !category || !state || !location || !phone || !description) {
    alert("Please complete all fields.");
    return;
  }

  try {

    await addDoc(collection(db, "services"), {
      name,
      category,
      state,
      location,
      phone,
      description,
      rating: 0,
      createdAt: new Date()
    });

    alert("Service posted successfully!");

    document.getElementById("serviceName").value = "";
    document.getElementById("serviceCategory").value = "";
    document.getElementById("serviceState").value = "";
    document.getElementById("serviceLocation").value = "";
    document.getElementById("servicePhone").value = "";
    document.getElementById("serviceDescription").value = "";

    loadServices();

  } catch (error) {
    alert(error.message);
  }

};