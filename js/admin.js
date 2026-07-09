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
        const quotes = await getDocs(collection(db, "quoteRequests"));
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
// AUTO LOAD
// ==============================

if(document.getElementById("providersCount")){

    loadAdminDashboard();

}