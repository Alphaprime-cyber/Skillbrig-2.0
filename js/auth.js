import { auth } from "./firebase.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// =========================
// SIGN UP
// =========================

window.signup = async function () {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {

        await createUserWithEmailAndPassword(auth, email, password);

        alert("Account created successfully!");

    } catch (error) {

        alert(error.message);

    }

};

// =========================
// LOGIN
// =========================

window.login = async function () {

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {

        await signInWithEmailAndPassword(auth, email, password);

        alert("Login successful!");

        window.location.href = "index.html";

    } catch (error) {

        alert(error.message);

    }

};

// =========================
// GOOGLE LOGIN
// =========================

window.googleLogin = async function () {

    const provider = new GoogleAuthProvider();

    try {

        await signInWithPopup(auth, provider);

        window.location.href = "index.html";

    } catch (error) {

        alert(error.message);

    }

};

// =========================
// LOGOUT
// =========================

window.logout = async function () {

    await signOut(auth);

    window.location.href = "login.html";

};

// =========================
// RESET PASSWORD
// =========================

window.resetPassword = async function () {

    const email = document.getElementById("email").value.trim();

    if (!email) {

        alert("Enter your email first.");

        return;

    }

    try {

        await sendPasswordResetEmail(auth, email);

        alert("Password reset email sent.");

    } catch (error) {

        alert(error.message);

    }

};

// =========================
// ADMIN LOGIN
// =========================

window.adminLogin = async function () {

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    try {

        await signInWithEmailAndPassword(auth, email, password);

        window.location.href = "dashboard.html";

    } catch (error) {

        alert(error.message);

    }

// =========================
// AUTH STATE
// =========================

onAuthStateChanged(auth, (user) => {

    const page = window.location.pathname;

    // Protect admin pages
    if (page.includes("/admin/") && !page.endsWith("index.html")) {

        if (!user) {

            window.location.href = "index.html";
            return;

        }

    }

    if (user) {

        console.log("Logged in as:", user.email);

    } else {

        console.log("No user logged in.");

    }

});