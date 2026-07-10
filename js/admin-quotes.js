import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    updateDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

window.loadQuotes = async function () {

    const container = document.getElementById("quotesTable");

    if (!container) return;

    const snapshot = await getDocs(collection(db, "quotes"));

    let html = "";

    snapshot.forEach((quoteDoc) => {

        const quote = quoteDoc.data();

        html += `

        <div class="provider-row">

            <h3>${quote.customerName}</h3>

            <p><strong>Phone:</strong> ${quote.customerPhone}</p>

            <p><strong>Location:</strong> ${quote.customerLocation}</p>

            <p><strong>Date:</strong> ${quote.preferredDate}</p>

            <p>${quote.jobDescription}</p>

            <p><strong>Status:</strong> ${quote.status}</p>

            <button onclick="markCompleted('${quoteDoc.id}')">

                Mark Completed

            </button>

        </div>

        `;

    });

    container.innerHTML = html || "<p>No quote requests found.</p>";

}

window.markCompleted = async function(id){

    await updateDoc(doc(db, "quotes", id), {

        status: "Completed"

    });

    alert("Quote marked as completed.");

    loadQuotes();

}

loadQuotes();