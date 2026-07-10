import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ===============================
// SUBMIT REVIEW
// ===============================

window.submitReview = async function () {

    const params = new URLSearchParams(window.location.search);
    const providerId = params.get("id");

    const customerName =
        document.getElementById("reviewName").value.trim();

    const rating =
        Number(document.getElementById("reviewRating").value);

    const comment =
        document.getElementById("reviewComment").value.trim();

    if (!customerName || !rating || !comment) {

        alert("Please complete all fields.");

        return;

    }

    try {

        await addDoc(collection(db, "reviews"), {

            providerId,
            customerName,
            rating,
            comment,
            createdAt: new Date()

        });

        await updateProviderRating(providerId);

        alert("⭐ Review submitted successfully!");

        document.getElementById("reviewName").value = "";
        document.getElementById("reviewRating").value = "5";
        document.getElementById("reviewComment").value = "";

        loadReviews();

    } catch (error) {

        console.error(error);

        alert(error.message);

    }

};

// ===============================
// LOAD REVIEWS
// ===============================

window.loadReviews = async function () {

    const params = new URLSearchParams(window.location.search);
    const providerId = params.get("id");

    const q = query(
        collection(db, "reviews"),
        where("providerId", "==", providerId)
    );

    const snapshot = await getDocs(q);

    let html = "";

    snapshot.forEach((reviewDoc) => {

        const review = reviewDoc.data();

        html += `

        <div class="card">

            <h3>${review.customerName}</h3>

            <p>⭐ ${review.rating}/5</p>

            <p>${review.comment}</p>

        </div>

        `;

    });

    document.getElementById("reviewsList").innerHTML =
        html || "<p>No reviews yet.</p>";

};

// ===============================
// UPDATE PROVIDER RATING
// ===============================

async function updateProviderRating(providerId) {

    const q = query(
        collection(db, "reviews"),
        where("providerId", "==", providerId)
    );

    const snapshot = await getDocs(q);

    let total = 0;
    let count = 0;

    snapshot.forEach((reviewDoc) => {

        total += Number(reviewDoc.data().rating);

        count++;

    });

    const average = count > 0 ? total / count : 0;

    await updateDoc(doc(db, "providers", providerId), {

        averageRating: Number(average.toFixed(1)),
        totalReviews: count

    });

}

// ===============================
// AUTO LOAD REVIEWS
// ===============================

if (document.getElementById("reviewsList")) {

    loadReviews();

}