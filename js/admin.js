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


// =====================================================
// ADMIN AUTHENTICATION
// =====================================================

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "admin-login.html";
        return;
    }

    if (
        user.email?.toLowerCase() !==
        "admin@skillbridge.com"
    ) {
        signOut(auth).then(() => {
            window.location.href = "admin-login.html";
        });

        return;
    }

    loadAdminDashboard();
    loadAdminProviders();

});


// =====================================================
// LOGOUT
// =====================================================

window.logoutAdmin = async function () {

    try {

        await signOut(auth);

        window.location.href =
            "admin-login.html";

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

        alert(
            "Unable to log out. Please try again."
        );

    }

};


// =====================================================
// DASHBOARD COUNTS
// =====================================================

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

                if (provider.verified === true) {
                    verified++;
                } else {
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


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

    }

};


// =====================================================
// LOAD PROVIDERS
// =====================================================

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


                const name =
                    provider.businessName ||
                    provider.name ||
                    "Unnamed Provider";


                const status =
                    provider.verified === true
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
                            ${name}
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
                            ${provider.location ? ", " + provider.location : ""}
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
                            ${provider.experience || 0}
                            years
                        </p>


                        <p>
                            <strong>
                                Status:
                            </strong>

                            ${
                                provider.verified === true
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
                                provider.verified !== true
                                    ? `
                                        <button
                                            type="button"
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
                                provider.verified === true
                                    ? `
                                        <button
                                            type="button"
                                            onclick="
                                                unapproveProvider(
                                                    '${providerDoc.id}'
                                                )
                                            "
                                        >
                                            <i class="