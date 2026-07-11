import { db, auth } from "./firebase.js";

import {
    collection,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

window.bookProvider = async function () {

    if (!auth.currentUser) {

        alert("Please log in before booking.");

        return;

    }

    const params = new URLSearchParams(window.location.search);

    const providerId = params.get("id");

    try {

        await addDoc(collection(db, "bookings"), {

            providerId,

            customerEmail: auth.currentUser.email,

            customerName:
            document.getElementById("customerName").value,

            customerPhone:
            document.getElementById("customerPhone").value,

            bookingDate:
            document.getElementById("bookingDate").value,

            bookingTime:
            document.getElementById("bookingTime").value,

            bookingDetails:
            document.getElementById("bookingDetails").value,

            status: "Pending",

            createdAt: new Date()

        });

        alert("✅ Booking submitted successfully.");

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

};