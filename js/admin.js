import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ==============================
// LOAD DASHBOARD COUNTS
// ==============================

window.loadAdminDashboard = async function () {

    try {

        const providers = await getDocs(collection(db, "providers"));
        const reviews = await getDocs(collection(db, "reviews"));
        const quotes = await getDocs(collection(db, "quotes"));
        const users = await getDocs(collection(db, "users"));

        let pending = 0;

        providers.forEach((provider) => {

            if (!provider.data().verified) {

                pending++;

            }

        });

        if(document.getElementById("providersCount"))
            document.getElementById("providersCount").innerHTML = providers.size;

        if(document.getElementById("reviewsCount"))
            document.getElementById("reviewsCount").innerHTML = reviews.size;

        if(document.getElementById("customersCount"))
            document.getElementById("customersCount").innerHTML = users.size;

        if(document.getElementById("pendingCount"))
            document.getElementById("pendingCount").innerHTML = pending;

    }

    catch(error){

        console.error(error);

    }

}

// ==============================
// APPROVE PROVIDER
// ==============================

window.approveProvider = async function(id){

    await updateDoc(doc(db,"providers",id),{

        verified:true

    });

    alert("✅ Provider Approved");

    loadAdminProviders();

    loadAdminDashboard();

}

// ==============================
// REJECT PROVIDER
// ==============================

window.rejectProvider = async function(id){

    if(!confirm("Reject this provider?")) return;

    await deleteDoc(doc(db,"providers",id));

    alert("Provider Removed");

    loadAdminProviders();

    loadAdminDashboard();

}

// ==============================
// SEARCH PROVIDERS
// ==============================

window.searchProviders = function(){

    const text=document
    .getElementById("providerSearch")
    .value
    .toLowerCase();

    const cards=document.querySelectorAll(".provider-row");

    cards.forEach(card=>{

        if(card.innerText.toLowerCase().includes(text))

            card.style.display="flex";

        else

            card.style.display="none";

    });

}

// ==============================
// LOAD ADMIN PROVIDERS
// ==============================

window.loadAdminProviders = async function () {

    const container = document.getElementById("providersTable");

    if (!container) return;

    const snapshot = await getDocs(collection(db, "providers"));

    let html = "";

    snapshot.forEach((providerDoc) => {

        const provider = providerDoc.data();

        html += `

        <div class="provider-row">

            <h3>${provider.businessName || provider.name}</h3>

            <p><strong>Category:</strong> ${provider.category}</p>

            <p><strong>Location:</strong> ${provider.state}, ${provider.location}</p>

            <p><strong>Status:</strong>
                ${provider.verified ? "✅ Verified" : "⏳ Pending"}
            </p>

            <button onclick="approveProvider('${providerDoc.id}')">
                Approve
            </button>

            <button onclick="rejectProvider('${providerDoc.id}')">
                Reject
            </button>

        </div>

        `;

    });

    container.innerHTML = html || "<p>No providers found.</p>";

}

if (document.getElementById("providersTable")) {

    loadAdminProviders();

}

// ==============================
// AUTO LOAD
// ==============================

if(document.getElementById("providersCount")){

    loadAdminDashboard();

}