import { db } from "./firebase.js";

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ================================
// REGISTER PROVIDER
// ================================

window.registerProvider = async function () {

    const name = document.getElementById("providerName").value.trim();
    const businessName = document.getElementById("businessName").value.trim();
    const category = document.getElementById("providerCategory").value;
    const state = document.getElementById("providerState").value;
    const location = document.getElementById("providerLocation").value.trim();
    const phone = document.getElementById("providerPhone").value.trim();
    const whatsapp = document.getElementById("providerWhatsApp").value.trim();
    const email = document.getElementById("providerEmail").value.trim();
    const experience = document.getElementById("providerExperience").value.trim();
    const businessHours = document.getElementById("providerBusinessHours").value.trim();
    const description = document.getElementById("providerDescription").value.trim();

    if (
        !name ||
        !category ||
        !state ||
        !location ||
        !phone ||
        !email
    ) {

        alert("Please complete all required fields.");

        return;

    }

    try {

        await addDoc(collection(db, "providers"), {

            name,
            businessName,
            category,
            state,
            location,
            phone,
            whatsapp,
            email,
            experience,
            businessHours,
            description,

            verified: false,
            averageRating: 0,
            totalReviews: 0,
            jobsCompleted: 0,
            skillScore: 50,

            createdAt: new Date()

        });

        alert("🎉 Registration submitted successfully! Your account is awaiting approval.");

        document.querySelectorAll("input, textarea").forEach(input => input.value = "");
        document.getElementById("providerCategory").value = "";
        document.getElementById("providerState").value = "";

    } catch (error) {

        console.error(error);
        alert(error.message);

    }

};

// ================================
// LOAD VERIFIED PROVIDERS
// ================================

window.loadProviders = async function () {

    const snapshot = await getDocs(collection(db, "providers"));

    let html = "";

    snapshot.forEach((providerDoc) => {

        const provider = providerDoc.data();

        if (!provider.verified) return;

        html += `
        <div class="card">

            <h3>${provider.businessName || provider.name}</h3>

            <p>${provider.category}</p>

            <p>📍 ${provider.state}, ${provider.location}</p>

            <p>⭐ ${provider.averageRating}</p>

            <a href="profile.html?id=${providerDoc.id}">
                <button>View Profile</button>
            </a>

        </div>
        `;

    });

    const list = document.getElementById("providersList");

    if (list) {

        list.innerHTML = html || "<p>No verified providers available.</p>";

    }

};

// ================================
// LOAD SINGLE PROVIDER
// ================================

window.loadProviderProfile = async function () {

    const params = new URLSearchParams(window.location.search);

    const providerId = params.get("id");

    if (!providerId) return;

    const snapshot = await getDoc(doc(db, "providers", providerId));

    if (!snapshot.exists()) return;

    const provider = snapshot.data();

    document.getElementById("businessName").textContent =
        provider.businessName || provider.name;

    document.getElementById("category").textContent =
        provider.category;

    document.getElementById("experience").textContent =
        "Experience: " + provider.experience + " years";

    document.getElementById("location").textContent =
        "📍 " + provider.state + ", " + provider.location;

    document.getElementById("businessHours").textContent =
        "Business Hours: " + provider.businessHours;

    document.getElementById("description").textContent =
        provider.description;

    document.getElementById("rating").textContent =
        "⭐ " + provider.averageRating;

    document.getElementById("totalReviews").textContent =
        provider.totalReviews;

    document.getElementById("jobsCompleted").textContent =
        provider.jobsCompleted;

    document.getElementById("skillScore").textContent =
        "🏆 SkillScore " + provider.skillScore;

    document.getElementById("callButton").href =
        "tel:" + provider.phone;

    document.getElementById("whatsappButton").href =
        "https://wa.me/" + provider.whatsapp;

    document.getElementById("emailButton").href =
        "mailto:" + provider.email;

};

// ================================
// SEARCH PROVIDERS
// ================================

window.searchProviders = async function () {

    const keyword = document.getElementById("searchBox").value.toLowerCase().trim();

    const state = document.getElementById("stateFilter").value;

    const snapshot = await getDocs(collection(db, "providers"));

    let html = "";

    snapshot.forEach((providerDoc) => {

        const provider = providerDoc.data();

        if (!provider.verified) return;

        const matchesKeyword =
            provider.name.toLowerCase().includes(keyword) ||
            provider.category.toLowerCase().includes(keyword) ||
            provider.location.toLowerCase().includes(keyword);

        const matchesState =
            state === "" || provider.state === state;

        if (matchesKeyword && matchesState) {

            html += `
            <div class="card">

                <h3>${provider.businessName || provider.name}</h3>

                <p>${provider.category}</p>

                <p>📍 ${provider.state}, ${provider.location}</p>

                <p>⭐ ${provider.averageRating}</p>

                <a href="profile.html?id=${providerDoc.id}">
                    <button>View Profile</button>
                </a>

            </div>
            `;

        }

    });

    document.getElementById("providersList").innerHTML =
        html || "<p>No matching providers found.</p>";

};

// ================================
// AUTO LOAD
// ================================

if (document.getElementById("providersList")) {

    loadProviders();

}

if (document.getElementById("businessName")) {

    loadProviderProfile();

}