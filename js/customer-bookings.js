import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const list = document.getElementById("bookingsList");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function formatAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "Estimate not available";
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 }).format(amount);
}

function renderBookings(bookings) {
    if (!list) return;
    if (!bookings.length) {
        list.innerHTML = `<p>You have no accepted quotes or bookings yet. <a href="quotes.html">View your quote requests</a>.</p>`;
        return;
    }

    list.innerHTML = bookings.map((booking) => `
        <article class="card" style="padding:24px;margin:18px auto;max-width:900px;">
            <h2>${escapeHtml(booking.service || "Service booking")}</h2>
            <p><strong>Provider:</strong> ${escapeHtml(booking.providerName || "Provider")}</p>
            <p><strong>Estimate:</strong> ${escapeHtml(formatAmount(booking.quoteAmount))}</p>
            <p><strong>Preferred date:</strong> ${escapeHtml(booking.preferredDate || "Flexible")}</p>
            <p><strong>Status:</strong> ${escapeHtml(booking.status || "Confirmed")}</p>
            <p><strong>Your request:</strong> ${escapeHtml(booking.description || "No description provided")}</p>
            ${booking.providerResponse ? `<p><strong>Provider’s message:</strong> ${escapeHtml(booking.providerResponse)}</p>` : ""}
        </article>
    `).join("");
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html?mode=login");
        return;
    }

    if (list) list.textContent = "Loading your bookings…";
    try {
        const snapshot = await getDocs(query(
            collection(db, "bookings"),
            where("customerUid", "==", user.uid)
        ));
        const bookings = snapshot.docs
            .map((item) => item.data())
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        renderBookings(bookings);
    } catch (error) {
        console.error("Customer bookings could not be loaded:", error);
        if (list) list.textContent = "Unable to load bookings. Please refresh and try again.";
    }
});