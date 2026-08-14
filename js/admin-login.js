import { auth } from "./firebase.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


window.adminLogin = async function () {

    const emailInput =
        document.getElementById("adminEmail");

    const passwordInput =
        document.getElementById("adminPassword");

    const message =
        document.getElementById("loginMessage");


    const email =
        emailInput?.value.trim() || "";

    const password =
        passwordInput?.value || "";


    if (!email || !password) {

        if (message) {

            message.textContent =
                "Please enter your email and password.";

        } else {

            alert(
                "Please enter your email and password."
            );

        }

        return;

    }


    try {

        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        /*
         * For now, this checks the administrator
         * email you already configured.
         *
         * Later, we can replace this with a proper
         * Firestore/admin-role system.
         */

        if (email.toLowerCase() !== "admin@skillbridge.com") {

            await auth.signOut();

            if (message) {

                message.textContent =
                    "This account is not authorized as an administrator.";

            } else {

                alert(
                    "This account is not authorized as an administrator."
                );

            }

            return;

        }


        window.location.href = "admin.html";


    } catch (error) {

        console.error(
            "Admin login error:",
            error
        );


        if (message) {

            message.textContent =
                "Login failed. Please check your email and password.";

        } else {

            alert(
                "Login failed. Please check your email and password."
            );

        }

    }

};