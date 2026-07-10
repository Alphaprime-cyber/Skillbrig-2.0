import { db } from "./firebase.js";

import {
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

window.requestQuote = async function () {

    const params = new URLSearchParams(window.location.search);
    const providerId = params.get("id");

    const customerName =
        document.getElementById("customerName").value.trim();

    const customerPhone =
        document.getElementById("customerPhone").value.trim();

    const customerLocation =
        document.getElementById("customerLocation").value.trim();

    const preferredDate =
        document.getElementById("preferredDate").value;

    const jobDescription =
        document.getElementById("jobDescription").value.trim();

    if (
        !customerName ||
        !customerPhone ||
        !customerLocation ||
        !preferredDate ||
        !jobDescription
    ) {
        alert("Please complete all fields.");
        return;
    }

    try {

        await addDoc(collection(db, "quotes"), {

            providerId,
            customerName,
            customerPhone,
            customerLocation,
            preferredDate,
            jobDescription,
            status: "Pending",
            createdAt: new Date()

        });

        alert("✅ Your quote request has been sent successfully!");

        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        document.getElementById("customerLocation").value = "";
        document.getElementById("preferredDate").value = "";
        document.getElementById("jobDescription").value = "";

    } catch (error) {

        console.error(error);
        alert(error.message);

    }

};