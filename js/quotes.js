import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ======================================
// SEND QUOTE REQUEST
// ======================================

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
        !jobDescription
    ) {
        alert("Please complete all required fields.");
        return;
    }

    try {

        await addDoc(collection(db, "quoteRequests"), {

            providerId,
            customerName,
            customerPhone,
            customerLocation,
            preferredDate,
            jobDescription,

            status: "Pending",

            createdAt: serverTimestamp()

        });

        alert("✅ Quote request sent successfully!");

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

// ======================================
// LOAD PROVIDER QUOTES
// ======================================

window.loadQuotes = async function(providerId){

    const q = query(
        collection(db,"quoteRequests"),
        where("providerId","==",providerId)
    );

    const snapshot = await getDocs(q);

    let html="";

    snapshot.forEach((quoteDoc)=>{

        const quote = quoteDoc.data();

        html += `

        <div class="card">

            <h3>${quote.customerName}</h3>

            <p><strong>Phone:</strong> ${quote.customerPhone}</p>

            <p><strong>Location:</strong> ${quote.customerLocation}</p>

            <p><strong>Date:</strong> ${quote.preferredDate || "Not specified"}</p>

            <p>${quote.jobDescription}</p>

            <p>Status:
                <strong>${quote.status}</strong>
            </p>

            <button onclick="acceptQuote('${quoteDoc.id}')">
                Accept
            </button>

            <button onclick="rejectQuote('${quoteDoc.id}')">
                Reject
            </button>

        </div>

        `;

    });

    const list = document.getElementById("requestsList");

    if(list){

        list.innerHTML = html || "<p>No quote requests yet.</p>";

    }

};

// ======================================
// ACCEPT QUOTE
// ======================================

window.acceptQuote = async function(id){

    await updateDoc(doc(db,"quoteRequests",id),{

        status:"Accepted"

    });

    alert("Quote accepted.");

};

// ======================================
// REJECT QUOTE
// ======================================

window.rejectQuote = async function(id){

    await updateDoc(doc(db,"quoteRequests",id),{

        status:"Rejected"

    });

    alert("Quote rejected.");

};