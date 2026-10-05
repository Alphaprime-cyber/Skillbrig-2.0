import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
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


    try {

        // ------------------------------------------
        // FIREBASE LOGIN
        // ------------------------------------------

        const credential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            credential.user;


        // ------------------------------------------
        // FIND PROVIDER RECORD
        // ------------------------------------------

        const providerQuery =
            query(
                collection(db, "providers"),
                where("email", "==", user.email)
            );


        const snapshot =
            await getDocs(providerQuery);


        if (snapshot.empty) {

            await signOut(auth);

            message.textContent =
                "No provider account was found for this email.";

            return;

        }


        // ------------------------------------------
        // CHECK VERIFICATION
        // ------------------------------------------

        let providerVerified = false;


        snapshot.forEach((providerDoc) => {

            const provider =
                providerDoc.data();

            if (provider.verified === true) {

                providerVerified = true;

            }

        });


        if (!providerVerified) {

            await signOut(auth);

            message.textContent =
                "Your provider account is still awaiting approval.";

            return;

        }


        // ------------------------------------------
        // SUCCESS
        // ------------------------------------------

        message.textContent =
            "Login successful. Opening your dashboard...";


        window.location.href =
            "provider-dashboard.html";


    }

    catch (error) {

        console.error(
            "Provider login error:",
            error
        );


        message.textContent =
            "Invalid email or password.";

    }

});


// ==================================================
// PROTECT LOGIN PAGE
// ==================================================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

});
