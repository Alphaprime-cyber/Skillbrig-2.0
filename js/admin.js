import { auth, db } from "./firebase.js";

import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


// ==========================================
// ADMIN ACCESS PROTECTION
// ==========================================

onAuthStateChanged(auth, (user) => {

    if (!user) {

        window.location.href = "admin-login.html";

        return;

    }


    if (
        user.email?.toLowerCase() !==
        "admin@skillbridge.com"
    ) {

        signOut(auth);

        window.location.href =
            "admin-login.html";

        return;

    }


    loadAdminDashboard();

    loadAdminProviders();

});


// ==========================================
// LOGOUT
// ==========================================

window.logoutAdmin = async function () {

    try {

        await signOut(auth);

        window.location.href =
            "admin-login.html";

    }

    catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }

};


// ==========================================
// DASHBOARD COUNTS
// ==========================================

window.loadAdminDashboard = async function () {

    try {

        const providersSnapshot =
            await getDocs(
                collection(db, "providers")
            );


        const reviewsSnapshot =
            await getDocs(
                collection(db, "reviews")
            );


        const quotesSnapshot =
            await getDocs(
                collection(db, "quotes")
            );


        const usersSnapshot =
            await getDocs(
                collection(db, "users")
            );


        let pending = 0;

        let verified = 0;


        providersSnapshot.forEach(
            (providerDoc) => {

                const provider =
                    providerDoc.data();


                if (provider.verified) {

                    verified++;

                }

                else {

                    pending++;

                }

            }
        );


        const providersCount =
            document.getElementById(
                "providersCount"
            );


        const pendingCount =
            document.getElementById(
                "pendingCount"
            );


        const verifiedCount =
            document.getElementById(
                "verifiedCount"
            );


        const reviewsCount =
            document.getElementById(
                "reviewsCount"
            );


        const customersCount =
            document.getElementById(
                "customersCount"
            );


        if (providersCount) {

            providersCount.textContent =
                providersSnapshot.size;

        }


        if (pendingCount) {

            pendingCount.textContent =
                pending;

        }


        if (verifiedCount) {

            verifiedCount.textContent =
                verified;

        }


        if (reviewsCount) {

            reviewsCount.textContent =
                reviewsSnapshot.size;

        }


        if (customersCount) {

            customersCount.textContent =
                usersSnapshot.size;

        }

    }

    catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }

};


// ==========================================
// LOAD PROVIDERS
// ==========================================

window.loadAdminProviders = async function () {

    const container =
        document.getElementById(
            "providersTable"
        );


    if (!container) return;


    container.innerHTML = `
        <div class="card" style="padding:30px;">
            <p>Loading providers...</p>
        </div>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(db, "providers")
            );


        let html = "";


        snapshot.forEach(
            (providerDoc) => {

                const provider =
                    providerDoc.data();


                const providerName =
                    provider.businessName ||
                    provider.name ||
                    "Unnamed Provider";


                const status =
                    provider.verified
                        ? "verified"
                        : "pending";


                html += `

                <div
                    class="card provider-row"
                    data-status="${status}"
                    data-category="${provider.category || ""}"
                    style="
                        padding:25px;
                        margin-bottom:20px;
                    "
                >

                    <h3>
                        ${providerName}
                    </h3>


                    <p>
                        <strong>
                            Category:
                        </strong>

                        ${provider.category || "Not specified"}
                    </p>


                    <p>
                        <strong>
                            Location:
                        </strong>

                        ${provider.state || ""}
                        ${provider.location || ""}
                    </p>


                    <p>
                        <strong>
                            Phone:
                        </strong>

                        ${provider.phone || "Not provided"}
                    </p>


                    <p>
                        <strong>
                            Email:
                        </strong>

                        ${provider.email || "Not provided"}
                    </p>


                    <p>
                        <strong>
                            Experience:
                        </strong>

                        ${provider.experience || "0"}
                        years
                    </p>


                    <p>
                        <strong>
                            Status:
                        </strong>

                        ${
                            provider.verified
                                ? "✅ Verified"
                                : "⏳ Pending Approval"
                        }

                    </p>


                    ${
                        provider.description
                            ? `
                            <p>
                                <strong>
                                    Description:
                                </strong>

                                ${provider.description}
                            </p>
                            `
                            : ""
                    }


                    <div
                        style="
                            display:flex;
                            gap:10px;
                            flex-wrap:wrap;
                            margin-top:20px;
                        "
                    >

                        ${
                            !provider.verified
                                ? `
                                <button
                                    onclick="
                                        approveProvider(
                                            '${providerDoc.id}'
                                        )
                                    "
                                >
                                    <i class="fas fa-check"></i>
                                    Approve
                                </button>
                                `
                                : ""
                        }


                        ${
                            provider.verified
                                ? `
                                <button
                                    onclick="
                                        unapproveProvider(
                                            '${providerDoc.id}'
                                        )
                                    "
                                >
                                    <i class="fas fa-clock"></i>
                                    Move to Pending
                                </button>
                                `
                                : ""
                        }


                        <button
                            onclick="
                                rejectProvider(
                                    '${providerDoc.id}'
                                )
                            "
                        >
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>

                    </div>

                </div>

                `;

            }
        );


        container.innerHTML =
            html ||
            `
            <div class="card" style="padding:30px;">
                <p>
                    No providers have registered yet.
                </p>
            </div>
            `;

    }

    catch (error) {

        console.error(
            "Provider loading error:",
            error
        );


        container.innerHTML = `
            <div class="card" style="padding:30px;">
                <p>
                    Unable to load providers.
                </p>
            </div>
        `;

    }

};


// ==========================================
// APPROVE PROVIDER
// ==========================================

window.approveProvider = async function (id) {

    try {

        await updateDoc(
            doc(db, "providers", id),
            {
                verified: true
            }
        );


        alert(
            "✅ Provider approved successfully."
        );


        await loadAdminProviders();

        await loadAdminDashboard();

    }

    catch (error) {

        console.error(
            "Approval error:",
            error
        );


        alert(
            "Unable to approve provider."
        );

    }

};


// ==========================================
// MOVE PROVIDER BACK TO PENDING
// ==========================================

window.unapproveProvider = async function (id) {

    try {

        await updateDoc(
            doc(db, "providers", id),
            {
                verified: false
            }
        );


        alert(
            "Provider moved back to pending."
        );


        await loadAdminProviders();

        await loadAdminDashboard();

    }

    catch (error) {

        console.error(
            "Status update error:",
            error
        );


        alert(
            "Unable to update provider."
        );

    }

};


// ==========================================
// REMOVE PROVIDER
// ==========================================

window.rejectProvider = async function (id) {

    const confirmed =
        confirm(
            "Are you sure you want to remove this provider?"
        );


    if (!confirmed) return;


    try {

        await deleteDoc(
            doc(db, "providers", id)
        );


        alert(
            "Provider removed."
        );


        await loadAdminProviders();

        await loadAdminDashboard();

    }

    catch (error) {

        console.error(
            "Provider removal error:",
            error
        );


        alert(
            "Unable to remove provider."
        );

    }

};


// ==========================================
// SEARCH PROVIDERS
// ==========================================

window.searchProviders = function () {

    const searchInput =
        document.getElementById(
            "providerSearch"
        );


    const statusFilter =
        document.getElementById(
            "statusFilter"
        );


    const categoryFilter =
        document.getElementById(
            "adminCategoryFilter"
        );


    const search =
        searchInput?.value
            .toLowerCase()
            .trim() || "";


    const status =
        statusFilter?.value || "";


    const category =
        categoryFilter?.value || "";


    const cards =
        document.querySelectorAll(
            ".provider-row"
        );


    cards.forEach((card) => {

        const text =
            card.innerText.toLowerCase();


        const cardStatus =
            card.dataset.status || "";


        const cardCategory =
            card.dataset.category || "";


        const matchesSearch =
            !search ||
            text.includes(search);


        const matchesStatus =
            !status ||
            cardStatus === status;


        const matchesCategory =
            !category ||
            cardCategory === category;


        if (
            matchesSearch &&
            matchesStatus &&
            matchesCategory
        ) {

            card.style.display = "";

        }

        else {

            card.style.display = "none";

        }

    });

};


// ==========================================
// FILTER EVENTS
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        document
            .getElementById("statusFilter")
            ?.addEventListener(
                "change",
                searchProviders
            );


        document
            .getElementById("adminCategoryFilter")
            ?.addEventListener(
                "change",
                searchProviders
            );

    }
);