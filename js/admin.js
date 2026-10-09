import { db, auth } from "./firebase.js";

import {
    collection,
    getDocs,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
    onAuthStateChanged,
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
    const setCount = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = String(value);
    };

    // Provider totals must not be hidden by a failure in another collection.
    try {
        const providersSnapshot = await getDocs(collection(db, "providers"));
        let pending = 0;
        let verified = 0;
        let reviews = 0;

        providersSnapshot.forEach((providerDoc) => {
            const provider = providerDoc.data();
            if (provider.verified === true) verified++;
            else pending++;
            reviews += Number(provider.totalReviews) || 0;
        });

        setCount("providersCount", providersSnapshot.size);
        setCount("pendingCount", pending);
        setCount("verifiedCount", verified);
        setCount("reviewsCount", reviews);
    } catch (error) {
        console.error("Unable to load admin provider totals:", error);
        ["providersCount", "pendingCount", "verifiedCount", "reviewsCount"]
            .forEach((id) => setCount(id, "—"));
    }

    // The app stores customer details with quote requests/bookings, not in a
    // Firestore users collection. Count distinct customers with marketplace activity.
    try {
        const [requests, bookings] = await Promise.all([
            getDocs(collection(db, "quoteRequests")),
            getDocs(collection(db, "bookings"))
        ]);
        const customerIds = new Set();
        [requests, bookings].forEach((snapshot) => snapshot.forEach((item) => {
            const uid = item.data().customerUid;
            if (uid) customerIds.add(uid);
        }));
        setCount("customersCount", customerIds.size);
    } catch (error) {
        console.error("Unable to load active customer total:", error);
        setCount("customersCount", "—");
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
    const user = auth.currentUser;
    if (!user) {
      throw new Error("You must be signed in as an admin.");
    }

    await updateDoc(doc(db, "providers", id), {
      verified: true,
      verificationUpdatedAt: serverTimestamp(),
      verificationUpdatedBy: user.uid
    });

    alert("Provider approved successfully.");
    await loadAdminProviders();
    await loadAdminDashboard();
  } catch (error) {
    console.error("Approval error:", error);
    alert(`Unable to approve provider: ${error.message}`);
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
// Dashboard data is loaded after Firebase restores the saved sign-in.

// ==================================================
// LOAD CUSTOMERS
// ==================================================

window.loadAdminCustomers = async function () {
    const container = document.getElementById("customersTable");
    if (!container) return;

    container.innerHTML = `
        <div class="card" style="padding:25px;"><p>Loading customers...</p></div>
    `;

    try {
        const [requests, bookings] = await Promise.all([
            getDocs(collection(db, "quoteRequests")),
            getDocs(collection(db, "bookings"))
        ]);
        const customers = new Map();

        const addActivity = (item, kind) => {
            const data = item.data();
            const uid = data.customerUid;
            if (!uid) return;

            if (!customers.has(uid)) {
                customers.set(uid, {
                    name: data.customerName || "SkillBridge customer",
                    email: data.customerEmail || "Email not provided",
                    phone: data.customerPhone || "Phone not provided",
                    services: new Set(),
                    requests: 0,
                    bookings: 0
                });
            }
            const customer = customers.get(uid);
            if (data.customerName) customer.name = data.customerName;
            if (data.customerEmail) customer.email = data.customerEmail;
            if (data.customerPhone) customer.phone = data.customerPhone;
            if (data.service) customer.services.add(data.service);
            if (kind === "request") customer.requests++;
            if (kind === "booking") customer.bookings++;
        };

        requests.forEach((item) => addActivity(item, "request"));
        bookings.forEach((item) => addActivity(item, "booking"));

        if (!customers.size) {
            container.innerHTML = `
                <div class="card" style="padding:25px;">
                    <p>No customers with quote requests or bookings yet.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = [...customers.values()].map((customer) => `
            <div class="card" style="padding:25px; margin-bottom:20px;">
                <h3>${escapeHtml(customer.name)}</h3>
                <p><strong>Email:</strong> ${escapeHtml(customer.email)}</p>
                <p><strong>Phone:</strong> ${escapeHtml(customer.phone)}</p>
                <p><strong>Services:</strong> ${escapeHtml([...customer.services].join(", ") || "None listed")}</p>
                <p><strong>Quote requests:</strong> ${customer.requests}</p>
                <p><strong>Bookings:</strong> ${customer.bookings}</p>
            </div>
        `).join("");
    } catch (error) {
        console.error("Customer activity loading error:", error);
        container.innerHTML = `
            <div class="card" style="padding:25px;">
                <p>Unable to load customer activity. Check Firestore rules and try again.</p>
            </div>
        `;
    }
};


// Wait for Firebase Auth to restore the saved admin session before making
// Firestore requests; otherwise the first reads can be rejected as signed out.
onAuthStateChanged(auth, (user) => {
    if (!user) return;
    loadAdminDashboard();
    loadAdminProviders();
    loadAdminCustomers();
});
