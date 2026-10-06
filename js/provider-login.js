import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


// ==================================================
// PROVIDER LOGIN
// ==================================================

const loginForm =
    document.getElementById("providerLoginForm");

const forgotPasswordButton =
    document.getElementById("providerForgotPassword");

forgotPasswordButton?.addEventListener("click", async function () {
    const emailInput = document.getElementById("providerEmail");
    const email = emailInput.value.trim().toLowerCase();
    const message = document.getElementById("loginMessage");

    if (!email) {
        message.textContent = "Enter your provider email above first, then select Forgot password?";
        emailInput.focus();
        return;
    }

    forgotPasswordButton.disabled = true;
    message.textContent = "Sending password reset email...";
    try {
        await sendPasswordResetEmail(auth, email);
        message.textContent = "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.";
    } catch (error) {
        console.error("Provider password reset error:", error);
        if (error?.code === "auth/invalid-email") {
            message.textContent = "Enter a valid email address and try again.";
        } else if (error?.code === "auth/network-request-failed") {
            message.textContent = "Connection problem. Check your internet and try again.";
        } else {
            message.textContent = "We couldn't send the reset email. Check the email address and try again.";
        }
    } finally {
        forgotPasswordButton.disabled = false;
    }
});


loginForm?.addEventListener("submit", async function (event) {

    event.preventDefault();


    const email =
        document
            .getElementById("providerEmail")
            .value
            .trim()
            .toLowerCase();


    const password =
        document
            .getElementById("providerPassword")
            .value;


    const message =
        document.getElementById("loginMessage");


    message.textContent = "Logging in...";


    let user;
    try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        user = credential.user;
    } catch (error) {
        console.error("Provider authentication error:", error);
        if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(error?.code)) {
            message.textContent = "That email and password did not match a SkillBridge account. Check the email used when registering, or use Forgot password? to reset it.";
        } else if (error?.code === "auth/too-many-requests") {
            message.textContent = "Too many attempts. Wait a little while, then try again or reset your password.";
        } else if (error?.code === "auth/network-request-failed") {
            message.textContent = "Could not reach Firebase. Check your internet connection and try again.";
        } else if (error?.code === "auth/invalid-email") {
            message.textContent = "Enter a valid email address and try again.";
        } else {
            message.textContent = "We couldn't sign you in. Please check your details and try again.";
        }
        return;
    }

    try {
        // Provider registration stores the profile at providers/{auth uid}.
        // Read just this account's document so Firestore can enforce owner-only access.
        const snapshot = await getDoc(doc(db, "providers", user.uid));

        if (!snapshot.exists()) {
            await signOut(auth);
            message.textContent = "Your email and password were accepted, but no provider profile is linked to this account. Check that you used the email from provider registration.";
            return;
        }

        const providerVerified = snapshot.data().verified === true;
        if (!providerVerified) {
            await signOut(auth);
            message.textContent = "Your provider account is still awaiting approval.";
            return;
        }

        message.textContent = "Login successful. Opening your dashboard...";
        window.location.href = "provider-dashboard.html";
    } catch (error) {
        console.error("Provider profile lookup error:", error);
        await signOut(auth).catch((signOutError) => console.error("Unable to clear failed login session:", signOutError));
        if (error?.code === "permission-denied") {
            message.textContent = "Your password was accepted, but SkillBridge could not read your provider profile. The Firestore rules need to allow you to read your own provider record.";
        } else if (error?.code === "unavailable" || error?.code === "deadline-exceeded") {
            message.textContent = "Your password was accepted, but the provider profile could not be loaded. Check your connection and try again.";
        } else {
            message.textContent = "Your password was accepted, but we couldn't load the provider profile. Please try again or contact SkillBridge support.";
        }
    }

});


// ==================================================
// PROTECT LOGIN PAGE
// ==================================================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

});
