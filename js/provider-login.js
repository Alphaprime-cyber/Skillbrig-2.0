import { auth, db } from "./firebase.js";

import {
    signInWithEmailAndPassword,
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