import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


// ==================================================
// LOAD QUOTE REQUESTS
// ==================================================

window.loadQuotes = async function () {

    const container =
        document.getElementById("quotesTable");

    if (!container) return;


    container.innerHTML = `
        <div class="card" style="padding:25px;">
            <p>Loading quote requests...</p>
        </div>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(db, "quotes")
            );


        let html = "";


        snapshot.forEach((quoteDoc) => {

            const quote =
                quoteDoc.data();


            const customerName =
                quote.customerName ||
                "Unknown Customer";


            const phone =
                quote.customerPhone ||
                "Not provided";


            const location =
                quote.customerLocation ||
                "Not provided";


            const date =
                quote.preferredDate ||
                "Not specified";


            const description =
                quote.jobDescription ||
                "No description provided";


            const status =
                quote.status ||
                "Pending";


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
                        <strong>Phone:</strong>
                        ${escapeHtml(phone)}
                    </p>


                    <p>
                        <strong>Location:</strong>
                        ${escapeHtml(location)}
                    </p>


                    <p>
                        <strong>Preferred Date:</strong>
                        ${escapeHtml(date)}
                    </p>


                    <p>
                        <strong>Job Description:</strong>
                        ${escapeHtml(description)}
                    </p>


                    <p>
                        <strong>Status:</strong>
                        ${escapeHtml(status)}
                    </p>


                    ${
                        status !== "Completed"
                        ? `
                            <button
                                class="provider-btn"
                                onclick="markCompleted('${quoteDoc.id}')"
                            >
                                <i class="fas fa-check"></i>
                                Mark Completed
                            </button>
                        `
                        : `
                            <p>
                                ✅ This request has been completed.
                            </p>
                        `
                    }

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
                        No quote requests found.
                    </p>
                </div>
            `;


    } catch (error) {

        console.error(
            "Quote loading error:",
            error
        );


        container.innerHTML = `
            <div
                class="card"
                style="padding:25px;"
            >
                <p>
                    Unable to load quote requests.
                </p>
            </div>
        `;

    }

};


// ==================================================
// MARK QUOTE COMPLETED
// ==================================================

window.markCompleted = async function (id) {

    try {

        await updateDoc(
            doc(db, "quotes", id),
            {
                status: "Completed"
            }
        );


        alert(
            "Quote marked as completed."
        );


        loadQuotes();


    } catch (error) {

        console.error(
            "Quote update error:",
            error
        );


        alert(
            "Unable to update quote."
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

loadQuotes();