import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


// =====================================================
// REGISTER PROVIDER
// =====================================================

window.registerProvider = async function () {

    const name =
        document.getElementById("providerName")?.value.trim() || "";

    const businessName =
        document.getElementById("businessName")?.value.trim() || "";

    const category =
        document.getElementById("providerCategory")?.value || "";

    const state =
        document.getElementById("providerState")?.value || "";

    const location =
        document.getElementById("providerLocation")?.value.trim() || "";

    const phone =
        document.getElementById("providerPhone")?.value.trim() || "";

    const whatsapp =
        document.getElementById("providerWhatsApp")?.value.trim() || "";

    const email =
        document.getElementById("providerEmail")?.value.trim() || "";

    const experience =
        document.getElementById("providerExperience")?.value.trim() || "";

    const businessHours =
        document.getElementById("providerBusinessHours")?.value.trim() || "";

    const description =
        document.getElementById("providerDescription")?.value.trim() || "";


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


    const agreeTerms =
        document.getElementById("agreeTerms")?.checked;


    if (!agreeTerms) {

        alert("Please agree to the Terms & Conditions.");

        return;
    }


    try {

        await addDoc(
            collection(db, "providers"),
            {

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

            }
        );


        alert(
            "🎉 Registration submitted successfully! Your application is awaiting approval."
        );


        document
            .querySelectorAll("input, textarea")
            .forEach(input => {

                if (input.type !== "checkbox") {
                    input.value = "";
                }

            });


        document.getElementById("providerCategory").value = "";

        document.getElementById("providerState").value = "";

        if (document.getElementById("agreeTerms")) {
            document.getElementById("agreeTerms").checked = false;
        }


    } catch (error) {

        console.error("Registration error:", error);

        alert(
            "Registration failed: " + error.message
        );

    }

};



// =====================================================
// LOAD PROVIDERS
// =====================================================

async function getVerifiedProviders() {

    const snapshot =
        await getDocs(
            collection(db, "providers")
        );


    const providers = [];


    snapshot.forEach(providerDoc => {

        const provider =
            providerDoc.data();


        if (provider.verified === true) {

            providers.push({

                id: providerDoc.id,

                ...provider

            });

        }

    });


    return providers;

}



// =====================================================
// DISPLAY PROVIDERS
// =====================================================

function displayProviders(providers) {

    const list =
        document.getElementById("providersList");


    if (!list) return;


    if (providers.length === 0) {

        list.innerHTML = `
            <div class="card">

                <h3>
                    No providers found
                </h3>

                <p>
                    Try another category, state or search term.
                </p>

            </div>
        `;

        return;

    }


    let html = "";


    providers.forEach(provider => {

        html += `

            <div class="card provider-card">

                <h3>
                    ${provider.businessName || provider.name || "Professional"}
                </h3>

                <p>
                    <strong>
                        ${provider.category || "Service Provider"}
                    </strong>
                </p>

                <p>
                    <i class="fas fa-location-dot"></i>
                    ${provider.state || ""}${provider.location ? ", " + provider.location : ""}
                </p>

                <p>
                    ⭐ ${provider.averageRating || 0}
                </p>

                ${
                    provider.experience
                    ? `<p>
                        ${provider.experience} years experience
                       </p>`
                    : ""
                }

                <a
                    href="profile.html?id=${provider.id}"
                    class="search-btn"
                    style="display:inline-flex;text-decoration:none;"
                >
                    View Profile
                </a>

            </div>

        `;

    });


    list.innerHTML = html;

}



// =====================================================
// FILTER PROVIDERS
// =====================================================

async function filterProviders() {

    const search =
        document
            .getElementById("providerSearch")
            ?.value
            .trim()
            .toLowerCase() || "";


    const category =
        document
            .getElementById("providerCategory")
            ?.value || "";


    const state =
        document
            .getElementById("providerState")
            ?.value || "";


    const providers =
        await getVerifiedProviders();


    const filtered =
        providers.filter(provider => {

            const name =
                (provider.name || "").toLowerCase();

            const businessName =
                (provider.businessName || "").toLowerCase();

            const providerCategory =
                (provider.category || "").toLowerCase();

            const providerState =
                (provider.state || "").toLowerCase();

            const location =
                (provider.location || "").toLowerCase();


            const matchesSearch =
                !search ||
                name.includes(search) ||
                businessName.includes(search) ||
                providerCategory.includes(search) ||
                providerState.includes(search) ||
                location.includes(search);


            const matchesCategory =
                !category ||
                providerCategory === category.toLowerCase();


            const matchesState =
                !state ||
                providerState === state.toLowerCase();


            return (
                matchesSearch &&
                matchesCategory &&
                matchesState
            );

        });


    displayProviders(filtered);

}



// =====================================================
// LOAD PROVIDER DIRECTORY
// =====================================================

async function loadProviderDirectory() {

    const list =
        document.getElementById("providersList");


    if (!list) return;


    list.innerHTML = `
        <div class="card">
            <p>Loading providers...</p>
        </div>
    `;


    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const search =
            params.get("search") || "";

        const category =
            params.get("category") || "";

        const state =
            params.get("state") || "";


        const searchInput =
            document.getElementById("providerSearch");

        const categorySelect =
            document.getElementById("providerCategory");

        const stateSelect =
            document.getElementById("providerState");


        if (searchInput) {
            searchInput.value = search;
        }


        if (categorySelect) {
            categorySelect.value = category;
        }


        if (stateSelect) {
            stateSelect.value = state;
        }


        await filterProviders();


    } catch (error) {

        console.error(
            "Error loading providers:",
            error
        );


        list.innerHTML = `
            <div class="card">

                <h3>
                    Unable to load providers
                </h3>

                <p>
                    Please check your connection and try again.
                </p>

            </div>
        `;

    }

}



// =====================================================
// LOAD SINGLE PROVIDER PROFILE
// =====================================================

window.loadProviderProfile = async function () {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const providerId =
        params.get("id");


    if (!providerId) return;


    try {

        const snapshot =
            await getDoc(
                doc(
                    db,
                    "providers",
                    providerId
                )
            );


        if (!snapshot.exists()) {

            console.error(
                "Provider not found."
            );

            return;

        }


        const provider =
            snapshot.data();


        const businessName =
            document.getElementById("businessName");

        const category =
            document.getElementById("category");

        const experience =
            document.getElementById("experience");

        const location =
            document.getElementById("location");

        const businessHours =
            document.getElementById("businessHours");

        const description =
            document.getElementById("description");

        const rating =
            document.getElementById("rating");

        const totalReviews =
            document.getElementById("totalReviews");

        const jobsCompleted =
            document.getElementById("jobsCompleted");

        const skillScore =
            document.getElementById("skillScore");

        const callButton =
            document.getElementById("callButton");

        const whatsappButton =
            document.getElementById("whatsappButton");

        const emailButton =
            document.getElementById("emailButton");


        if (businessName)
            businessName.textContent =
                provider.businessName ||
                provider.name ||
                "Professional";


        if (category)
            category.textContent =
                provider.category || "";


        if (experience)
            experience.textContent =
                "Experience: " +
                (provider.experience || 0) +
                " years";


        if (location)
            location.textContent =
                "📍 " +
                (provider.state || "") +
                ", " +
                (provider.location || "");


        if (businessHours)
            businessHours.textContent =
                "Business Hours: " +
                (provider.businessHours || "Not provided");


        if (description)
            description.textContent =
                provider.description || "";


        if (rating)
            rating.textContent =
                "⭐ " +
                (provider.averageRating || 0);


        if (totalReviews)
            totalReviews.textContent =
                provider.totalReviews || 0;


        if (jobsCompleted)
            jobsCompleted.textContent =
                provider.jobsCompleted || 0;


        if (skillScore)
            skillScore.textContent =
                "🏆 SkillScore " +
                (provider.skillScore || 0);


        if (callButton)
            callButton.href =
                "tel:" +
                (provider.phone || "");


        if (whatsappButton)
            whatsappButton.href =
                "https://wa.me/" +
                (provider.whatsapp || "");


        if (emailButton)
            emailButton.href =
                "mailto:" +
                (provider.email || "");

    } catch (error) {

        console.error(
            "Error loading provider profile:",
            error
        );

    }

};



// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {


        // Provider directory

        if (
            document.getElementById(
                "providersList"
            )
        ) {

            loadProviderDirectory();

        }


        // Provider profile

        if (
            document.getElementById(
                "businessName"
            ) &&
            new URLSearchParams(
                window.location.search
            ).get("id")
        ) {

            loadProviderProfile();

        }


        // Directory filters

        const searchInput =
            document.getElementById(
                "providerSearch"
            );

        const categorySelect =
            document.getElementById(
                "providerCategory"
            );

        const stateSelect =
            document.getElementById(
                "providerState"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                filterProviders
            );

        }


        if (categorySelect) {

            categorySelect.addEventListener(
                "change",
                filterProviders
            );

        }


        if (stateSelect) {

            stateSelect.addEventListener(
                "change",
                filterProviders
            );

        }

    }
);