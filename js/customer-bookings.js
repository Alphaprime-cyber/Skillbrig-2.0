import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    writeBatch,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const list = document.getElementById("bookingsList");
const notificationsPanel = document.getElementById("bookingNotifications");
const statusMessage = document.getElementById("bookingsStatus");
const bookingById = new Map();
let stopBookings = null;
let stopNotifications = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function setStatus(message, error = false) {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", error);
}

function formatAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "Estimate not available";
    return new Intl.NumberFormat("en-NG", {
        style: "currency", currency: "NGN", maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(value) {
    const date = value?.toDate?.();
    if (!date || Number.isNaN(date.getTime())) return "Date not available";
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

function millis(value) {
    const result = value?.toMillis?.();
    return Number.isFinite(result) ? result : 0;
}

function renderBookings(bookings) {
    if (!list) return;
    bookingById.clear();

    if (!bookings.length) {
        list.innerHTML = '<p>You have no accepted quotes or bookings yet. <a href="quotes.html">View your quote requests</a>.</p>';
        return;
    }

    list.innerHTML = bookings.map(({ id, data }) => {
        bookingById.set(id, data);
        const state = String(data.status || "confirmed").toLowerCase();
        const reviewUrl = `../profile.html?id=${encodeURIComponent(data.providerId || "")}&bookingId=${encodeURIComponent(id)}#reviewsSection`;
        const canCancel = state === "confirmed";
        const cancellationNote = state === "cancelled"
            ? `<p class="booking-note">Cancelled by ${escapeHtml(data.cancelledBy === data.customerUid ? "you" : "the provider")}.</p>`
            : "";
        const reviewAction = state === "completed"
            ? `<p><a class="search-btn" href="${escapeHtml(reviewUrl)}">Leave a review</a></p>`
            : "";
        return `
            <article id="booking-${escapeHtml(id)}" class="card" style="padding:24px;margin:18px auto;max-width:900px;">
                <h2>${escapeHtml(data.service || "Service booking")}</h2>
                <p><strong>Provider:</strong> ${escapeHtml(data.providerName || "Provider")}</p>
                <p><strong>Estimate:</strong> ${escapeHtml(formatAmount(data.quoteAmount))}</p>
                <p><strong>Preferred date:</strong> ${escapeHtml(data.preferredDate || "Flexible")}</p>
                <p><strong>Status:</strong> <span class="booking-status">${escapeHtml(state.replaceAll("_", " "))}</span></p>
                <p><strong>Your request:</strong> ${escapeHtml(data.description || "No description provided")}</p>
                ${data.providerResponse ? `<p><strong>Provider’s message:</strong> ${escapeHtml(data.providerResponse)}</p>` : ""}
                ${cancellationNote}
                ${canCancel ? `<button type="button" data-cancel-booking="${escapeHtml(id)}">Cancel booking</button>` : ""}
                ${reviewAction}
            </article>`;
    }).join("");

    if (window.location.hash.startsWith("#booking-")) {
        requestAnimationFrame(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: "smooth" }));
    }
}

function renderNotifications(items) {
    if (!notificationsPanel) return;
    const events = items
        .filter(({ data }) => ["booking_status_updated", "booking_cancelled"].includes(data.type))
        .sort((a, b) => millis(b.data.createdAt) - millis(a.data.createdAt));
    const unreadCount = events.filter(({ data }) => data.read !== true).length;

    notificationsPanel.innerHTML = `
        <div class="card" style="padding:18px;margin:18px auto;max-width:900px">
            <div style="display:flex;justify-content:space-between;gap:12px"><h2 style="margin:0">Booking notifications</h2><span>${unreadCount ? `${unreadCount} unread` : "All caught up"}</span></div>
            <div style="display:grid;gap:10px;margin-top:14px">
                ${events.length ? events.slice(0, 10).map(({ id, data }) => `
                    <article style="padding:12px;border-radius:10px;background:rgba(120,120,120,.08)">
                        <strong>${escapeHtml(data.title || "Booking update")}</strong>
                        <p>${escapeHtml(data.message || "There is an update to your booking.")}</p>
                        <small>${escapeHtml(formatDate(data.createdAt))}</small>
                        <div style="display:flex;gap:14px;margin-top:8px">
                            <a href="#booking-${encodeURIComponent(data.bookingId || "")}">View booking</a>
                            ${data.read === true ? "" : `<button type="button" data-mark-notification="${escapeHtml(id)}">Mark as read</button>`}
                        </div>
                    </article>`).join("") : "<p>No booking updates yet.</p>"}
            </div>
        </div>`;
}

list?.addEventListener("click", async (event) => {
    const cancelButton = event.target.closest("[data-cancel-booking]");
    if (!cancelButton) return;
    const user = auth.currentUser;
    const bookingId = cancelButton.dataset.cancelBooking;
    const booking = bookingById.get(bookingId);
    if (!user || !booking || String(booking.status || "").toLowerCase() !== "confirmed") {
        return setStatus("This booking can no longer be cancelled. Refresh to see its latest status.", true);
    }
    if (!window.confirm("Cancel this booking?")) return;

    cancelButton.disabled = true;
    setStatus("Cancelling booking...");
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, "bookings", bookingId), {
            status: "cancelled",
            statusUpdatedAt: serverTimestamp(),
            cancelledBy: user.uid
        });
        batch.set(doc(collection(db, "notifications")), {
            recipientUid: booking.providerId,
            actorUid: user.uid,
            bookingId,
            bookingStatus: "cancelled",
            type: "booking_cancelled",
            title: "Booking cancelled",
            message: "The customer cancelled this confirmed booking.",
            read: false,
            createdAt: serverTimestamp()
        });
        await batch.commit();
        setStatus("Booking cancelled. The provider has been notified.");
    } catch (error) {
        console.error("Could not cancel booking:", error);
        setStatus(error?.code === "permission-denied"
            ? "The cancellation was denied. Publish the latest Firestore rules and try again."
            : "Could not cancel this booking. Please try again.", true);
        cancelButton.disabled = false;
    }
});

notificationsPanel?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-mark-notification]");
    if (!button) return;
    button.disabled = true;
    try {
        await updateDoc(doc(db, "notifications", button.dataset.markNotification), {
            read: true,
            readAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Could not mark booking notification as read:", error);
        button.disabled = false;
        setStatus("Could not mark that notification as read.", true);
    }
});

onAuthStateChanged(auth, (user) => {
    stopBookings?.();
    stopNotifications?.();
    stopBookings = null;
    stopNotifications = null;

    if (!user) {
        window.location.replace("auth.html?mode=login");
        return;
    }

    if (list) list.innerHTML = "<p>Loading your bookings…</p>";
    stopBookings = onSnapshot(query(collection(db, "bookings"), where("customerUid", "==", user.uid)), (snapshot) => {
        const bookings = snapshot.docs
            .map((item) => ({ id: item.id, data: item.data() }))
            .sort((a, b) => millis(b.data.createdAt) - millis(a.data.createdAt));
        renderBookings(bookings);
    }, (error) => {
        console.error("Customer bookings could not be loaded:", error);
        setStatus("Unable to load bookings. Please refresh and try again.", true);
    });

    stopNotifications = onSnapshot(query(collection(db, "notifications"), where("recipientUid", "==", user.uid)), (snapshot) => {
        renderNotifications(snapshot.docs.map((item) => ({ id: item.id, data: item.data() })));
    }, (error) => {
        console.error("Customer booking notifications could not be loaded:", error);
        if (notificationsPanel) notificationsPanel.textContent = "Unable to load booking notifications.";
    });
});
