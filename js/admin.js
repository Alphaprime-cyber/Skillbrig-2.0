import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


// ==================================================
// ADMIN LOGOUT
// ==================================================

window.logoutAdmin = async function () {

    try {

        await signOut(auth);

        window.location.href = "admin-login.html";

    } catch (error) {

        console.error("Logout error:", error);

        alert("Unable to logout.");

    }

};


// ==================================================
// LOAD DASHBOARD
// ==================================================

window.loadAdminDashboard = async function () {

    try {

        const providersSnapshot =
            await getDocs(collection(db, "providers"));

        const reviewsSnapshot =
            await getDocs(collection(db, "reviews"));

        const usersSnapshot =
            await getDocs(collection(db, "users"));


        let pending = 0;

        let verified = 0;


        providersSnapshot.forEach((providerDoc) => {

            const provider = providerDoc.data();


            if (provider.verified === true) {

                verified++;

            } else {

                pending++;

            }

        });


        const providersCount =
            document.getElementById("providersCount");

        const pendingCount =
            document.getElementById("pendingCount");

        const verifiedCount =
            document.getElementById("verifiedCount");

        const reviewsCount =
            document.getElementById("reviewsCount");

        const customersCount =
            document.getElementById("customersCount");


        if (providersCount)
            providersCount.textContent =
                providersSnapshot.size;


        if (pendingCount)
            pendingCount.textContent =
                pending;


        if (verifiedCount)
            verifiedCount.textContent =
                verified;


        if (reviewsCount)
            reviewsCount.textContent =
                reviewsSnapshot.size;


        if (customersCount)
            customersCount.textContent =
                usersSnapshot.size;


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

    }

};


// ==================================================
// LOAD PROVIDERS
// ==================================================

window.loadAdminProviders = async function () {

    const container =
        document.getElementById("providersTable");


    if (!container) return;


    container.innerHTML = `
        <div class="card" style="padding:25px;">
            <p>Loading providers...</p>
        </div>
    `;


    try {

        const snapshot =
            await getDocs(
                collection(db, "providers")
            );


        let html = "";


        snapshot.forEach((providerDoc) => {

            const provider =
                providerDoc.data();


            const id =
                providerDoc.id;


            const name =
                provider.businessName ||
                provider.name ||
                "Unnamed Provider";


            const category =
                provider.category ||
                "Not specified";


            const state =
                provider.state ||
                "Not specified";


            const location =
                provider.location ||
                "";


            const verified =
                provider.verified === true;


            html += `

                <div
                    class="card provider-row"
                    data-status="${verified ? "verified" : "pending"}"
                    style="
                        padding:25px;
                        margin-bottom:20px;
                    "
                >

                    <h3>
                        ${escapeHtml(name)}
                    </h3>


                    <p>
                        <strong>Category:</strong>
                        ${escapeHtml(category)}
                    </p>


                    <p>
                        <strong>Location:</strong>
                        ${escapeHtml(state)}
                        ${location
                            ? ", " + escapeHtml(location)
                            : ""}
                    </p>


                    <p>
                        <strong>Status:</strong>

                        ${
                            verified
                            ? "✅ Verified"
                            : "⏳ Pending"
                        }

                    </p>


                    ${
                        provider.phone
                        ? `
                            <p>
                                <strong>Phone:</strong>
                                ${escapeHtml(provider.phone)}
                            </p>
                        `
                        : ""
                    }


                    <div
                        style="
                            display:flex;
                            gap:10px;
                            flex-wrap:wrap;
                            margin-top:15px;
                        "
                    >

                        ${
                            !verified
                            ? `
                                <button
                                    class="provider-btn"
                                    onclick="approveProvider('${id}')"
                                >
                                    <i class="fas fa-check"></i>
                                    Approve
                                </button>
                            `
                            : ""
                        }


                        <button
                            class="login-btn"
                            onclick="rejectProvider('${id}')"
                        >
                            <i class="fas fa-trash"></i>
                            Remove
                        </button>

                    </div>

                </div>

            `;

        });


        container.innerHTML =
            html ||
            `
                <div class="card" style="padding:25px;">
                    <p>No providers registered yet.</p>
                </div>
            `;


    } catch (error) {

        console.error(
            "Provider loading error:",
            error
        );


        container.innerHTML = `
            <div class="card" style="padding:25px;">
                <p>
                    Unable to load providers.
                </p>
            </div>
        `;

    }

};


// ==================================================
// APPROVE PROVIDER
// ==================================================

window.approveProvider = async function (id) {

    try {

        await updateDoc(
            doc(db, "providers", id),
            {
                verified: true
            }
        );


        alert("Provider approved successfully.");


        await loadAdminProviders();

        await loadAdminDashboard();


    } catch (error) {

        console.error(
            "Approval error:",
            error
        );


        alert(
            "Unable to approve provider."
        );

    }

};


// ==================================================
// REMOVE PROVIDER
// ==================================================

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


        alert("Provider removed.");


        await loadAdminProviders();

        await loadAdminDashboard();


    } catch (error) {

        console.error(
            "Provider removal error:",
            error
        );


        alert(
            "Unable to remove provider."
        );

    }

};


// ==================================================
// SEARCH PROVIDERS
// ==================================================

window.searchProviders = function () {

    const input =
        document.getElementById(
            "providerSearch"
        );


    const searchText =
        input
        ? input.value.toLowerCase().trim()
        : "";


    const rows =
        document.querySelectorAll(
            ".provider-row"
        );


    rows.forEach((row) => {

        const text =
            row.innerText.toLowerCase();


        row.style.display =
            text.includes(searchText)
            ? ""
            : "none";

    });

};


// ==================================================
// STATUS FILTER
// ==================================================

const statusFilter =
    document.getElementById(
        "statusFilter"
    );


if (statusFilter) {

    statusFilter.addEventListener(
        "change",
        function () {

            const selected =
                this.value;


            const rows =
                document.querySelectorAll(
                    ".provider-row"
                );


            rows.forEach((row) => {

                const status =
                    row.dataset.status;


                if (
                    !selected ||
                    status === selected
                ) {

                    row.style.display = "";

                } else {

                    row.style.display =
                        "none";

                }

            });

        }
    );

}


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
// START DASHBOARD
// ==================================================

loadAdminDashboard();

loadAdminProviders();