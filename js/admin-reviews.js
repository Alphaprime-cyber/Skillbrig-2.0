import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


// ==================================================
// LOAD REVIEWS
// ==================================================

window.loadReviews = async function () {

    const container =
        document.getElementById("reviewsTable");

    if (!container) return;


    container.innerHTML = `
        <div class="card" style="padding:25px;">
            <p>Loading reviews...</p>
        </div>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(db, "reviews")
            );


        let html = "";


        snapshot.forEach((reviewDoc) => {

            const review =
                reviewDoc.data();


            const customerName =
                review.customerName ||
                "Unknown Customer";


            const rating =
                review.rating || 0;


            const comment =
                review.comment ||
                "No comment provided.";


            html += `

                <div
                    class="card"
                    style="
                        padding:25px;
                        margin-bottom:20px;
                    "
                >

                    <h3>
                        ${escapeHtml(customerName)}
                    </h3>


                    <p>
                        <strong>Rating:</strong>
                        ⭐ ${escapeHtml(rating)}/5
                    </p>


                    <p>
                        ${escapeHtml(comment)}
                    </p>


                    <button
                        class="login-btn"
                        onclick="deleteReview('${reviewDoc.id}')"
                    >
                        <i class="fas fa-trash"></i>
                        Delete Review
                    </button>

                </div>

            `;

        });


        container.innerHTML =
            html ||
            `
                <div
                    class="card"
                    style="padding:25px;"
                >
                    <p>
                        No reviews available.
                    </p>
                </div>
            `;


    } catch (error) {

        console.error(
            "Review loading error:",
            error
        );


        container.innerHTML = `
            <div
                class="card"
                style="padding:25px;"
            >
                <p>
                    Unable to load reviews.
                </p>
            </div>
        `;

    }

};


// ==================================================
// DELETE REVIEW
// ==================================================

window.deleteReview = async function (id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this review?"
        );


    if (!confirmed) return;


    try {

        await deleteDoc(
            doc(db, "reviews", id)
        );


        alert(
            "Review deleted successfully."
        );


        loadReviews();


    } catch (error) {

        console.error(
            "Review deletion error:",
            error
        );


        alert(
            "Unable to delete review."
        );

    }

};


// ==================================================
// ESCAPE HTML
// ==================================================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ==================================================
// START
// ==================================================

loadReviews();