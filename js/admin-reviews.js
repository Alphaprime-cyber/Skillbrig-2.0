import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

window.loadReviews = async function () {

    const container = document.getElementById("reviewsTable");

    if (!container) return;

    const snapshot = await getDocs(collection(db, "reviews"));

    let html = "";

    snapshot.forEach((reviewDoc) => {

        const review = reviewDoc.data();

        html += `

        <div class="provider-row">

            <h3>${review.customerName}</h3>

            <p>⭐ ${review.rating}/5</p>

            <p>${review.comment}</p>

            <button onclick="deleteReview('${reviewDoc.id}')">

                Delete

            </button>

        </div>

        `;

    });

    container.innerHTML = html || "<p>No reviews available.</p>";

}

window.deleteReview = async function(id){

    if(!confirm("Delete this review?")) return;

    await deleteDoc(doc(db,"reviews",id));

    alert("Review deleted.");

    loadReviews();

}

loadReviews();