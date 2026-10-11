import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const panel = document.getElementById("providerBookingsPanel");
const list = document.getElementById("providerBookingList");
const status = document.getElementById("providerBookingStatus");
const bookingsById = new Map();
let stopWatch = null;

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function setStatus(message, error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
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

function validBookingDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function renderBookings(bookings) {
    if (!list) return;
    bookingsById.clear();
    if (!bookings.length) {
        list.innerHTML = '<p class="dashboard-note">No accepted quote bookings yet.</p>';
        return;
    }

    list.innerHTML = bookings.map(({ id, data }) => {
        bookingsById.set(id, data);
        const state = String(data.status || "confirmed").toLowerCase();
        const canCancel = state === "confirmed";
        const reschedulePending = canCancel && data.rescheduleStatus === "pending";
        const providerProposed = data.rescheduleProposedBy === data.providerId;
        const rescheduleControls = !canCancel ? "" : reschedulePending
            ? providerProposed
                ? `<p class="dashboard-note">You proposed <strong>${escapeHtml(data.rescheduleProposedDate || "a new date")}</strong>. Waiting for the customer to respond.</p>`
                : `<div class="dashboard-note"><p>The customer proposed <strong>${escapeHtml(data.rescheduleProposedDate || "a new date")}</strong>.</p><button class="request-respond" type="button" data-reschedule-action="accept" data-booking-id="${escapeHtml(id)}">Accept new date</button> <button class="request-respond" type="button" data-reschedule-action="decline" data-booking-id="${escapeHtml(id)}">Decline</button></div>`
            : `<form class="provider-response-form" data-reschedule-form data-booking-id="${escapeHtml(id)}"><label>Propose a new date <input type="date" name="rescheduleDate" required></label><button class="request-respond" type="submit">Request reschedule</button></form>`;
        const rescheduleResultNote = state === "confirmed" && data.rescheduleStatus === "accepted"
            ? '<p class="dashboard-note">The new date was agreed by both sides.</p>'
            : state === "confirmed" && data.rescheduleStatus === "declined"
                ? '<p class="dashboard-note">The last date change request was declined. The current date remains unchanged.</p>'
                : "";
        const nextAction = state === "confirmed" && !reschedulePending
            ? `<button class="request-respond" type="button" data-booking-action="in_progress" data-booking-id="${escapeHtml(id)}">Mark in progress</button>`
            : state === "in_progress"
                ? `<button class="request-respond" type="button" data-booking-action="completed" data-booking-id="${escapeHtml(id)}">Mark completed</button>`
                : "";
        return `
            <article id="provider-booking-${escapeHtml(id)}" class="provider-request-card">
                <div class="dashboard-toolbar"><h3>${escapeHtml(data.service || "Service booking")}</h3><span class="request-status">${escapeHtml(state.replaceAll("_", " "))}</span></div>
                <p><strong>Customer:</strong> ${escapeHtml(data.customerName || "Customer")}</p>
                <p><strong>Preferred date:</strong> ${escapeHtml(data.preferredDate || "Flexible")}</p>
                <p><strong>Request:</strong> ${escapeHtml(data.description || "No details provided")}</p>
                <p><strong>Accepted:</strong> ${escapeHtml(formatDate(data.createdAt))}</p>
                ${state === "cancelled" ? `<p class="dashboard-note">Cancelled by ${escapeHtml(data.cancelledBy === data.customerUid ? "the customer" : "you")}.</p>` : ""}
                ${rescheduleResultNote}
                ${rescheduleControls}
                ${nextAction}
                ${canCancel ? `<button class="request-respond" type="button" data-booking-action="cancelled" data-booking-id="${escapeHtml(id)}">Cancel booking</button>` : ""}
            </article>`;
    }).join("");

    if (window.location.hash.startsWith("#provider-booking-")) {
        requestAnimationFrame(() => document.getElementById(decodeURIComponent(window.location.hash.slice(1)))?.scrollIntoView({ behavior: "smooth" }));
    }
}

async function changeBookingStatus(user, bookingId, nextStatus) {
    const booking = bookingsById.get(bookingId);
    const current = String(booking?.status || "").toLowerCase();
    if (!booking || !user || !["confirmed", "in_progress"].includes(current)) {
        return setStatus("This booking has already changed. Refresh the dashboard and try again.", true);
    }
    if (nextStatus === "cancelled" && !window.confirm("Cancel this confirmed booking? The customer will be notified.")) return;
    if (nextStatus === "in_progress" && current !== "confirmed") return;
    if (nextStatus === "completed" && current !== "in_progress") return;
    if (nextStatus === "cancelled" && current !== "confirmed") return;

    setStatus(nextStatus === "cancelled" ? "Cancelling booking..." : "Updating booking...");
    list?.querySelectorAll(`[data-booking-id="${CSS.escape(bookingId)}"]`).forEach((button) => { button.disabled = true; });

    try {
        const batch = writeBatch(db);
        const bookingRef = doc(db, "bookings", bookingId);
        if (nextStatus === "cancelled") {
            batch.update(bookingRef, {
                status: "cancelled",
                statusUpdatedAt: serverTimestamp(),
                cancelledBy: user.uid
            });
        } else {
            batch.update(bookingRef, {
                status: nextStatus,
                statusUpdatedAt: serverTimestamp()
            });
        }

        const isCancellation = nextStatus === "cancelled";
        batch.set(doc(collection(db, "notifications")), {
            recipientUid: booking.customerUid,
            actorUid: user.uid,
            bookingId,
            bookingStatus: nextStatus,
            type: isCancellation ? "booking_cancelled" : "booking_status_updated",
            title: isCancellation ? "Booking cancelled" : "Booking status updated",
            message: isCancellation
                ? "The provider cancelled this confirmed booking."
                : `Your provider marked the booking ${nextStatus.replaceAll("_", " ")}.`,
            read: false,
            createdAt: serverTimestamp()
        });
        await batch.commit();
        setStatus(isCancellation
            ? "Booking cancelled. The customer has been notified."
            : `Booking marked ${nextStatus.replaceAll("_", " ")}. The customer has been notified.`);
    } catch (error) {
        console.error("Could not update provider booking:", error);
        setStatus(error?.code === "permission-denied"
            ? "The update was denied. Publish the latest Firestore rules and try again."
            : "Could not update this booking. Please try again.", true);
        renderBookings([...bookingsById.entries()].map(([id, data]) => ({ id, data })));
    }
}

async function respondToReschedule(user, bookingId, action) {
    const booking = bookingsById.get(bookingId);
    if (!booking || !user || booking.status !== "confirmed" || booking.rescheduleStatus !== "pending" || booking.rescheduleProposedBy === user.uid) {
        return setStatus("This date proposal is no longer awaiting your response. Refresh to see the latest details.", true);
    }
    const proposedDate = String(booking.rescheduleProposedDate || "");
    if (action === "decline" && !window.confirm(`Decline the proposed date ${proposedDate}?`)) return;
    setStatus(action === "accept" ? "Accepting the proposed date…" : "Declining the proposed date…");
    list?.querySelectorAll(`[data-booking-id="${CSS.escape(bookingId)}"]`).forEach((button) => { button.disabled = true; });
    try {
        const batch = writeBatch(db);
        const nextStatus = action === "accept" ? "accepted" : "declined";
        const update = { rescheduleStatus: nextStatus, rescheduleRespondedAt: serverTimestamp() };
        if (action === "accept") update.preferredDate = proposedDate;
        batch.update(doc(db, "bookings", bookingId), update);
        batch.set(doc(collection(db, "notifications")), {
            recipientUid: booking.rescheduleProposedBy,
            actorUid: user.uid,
            bookingId,
            rescheduleStatus: nextStatus,
            rescheduleDate: proposedDate,
            type: "booking_reschedule_responded",
            title: action === "accept" ? "Date change accepted" : "Date change declined",
            message: action === "accept" ? `The provider accepted ${proposedDate}.` : "The provider declined the proposed booking date.",
            read: false,
            createdAt: serverTimestamp()
        });
        await batch.commit();
        setStatus(action === "accept" ? "New booking date accepted. The customer has been notified." : "Date proposal declined. The customer has been notified.");
    } catch (error) {
        console.error("Could not respond to customer date proposal:", error);
        setStatus(error?.code === "permission-denied" ? "The response was denied. Publish the latest Firestore rules and try again." : "Could not update the date proposal. Please try again.", true);
        renderBookings([...bookingsById.entries()].map(([id, data]) => ({ id, data })));
    }
}

list?.addEventListener("click", async (event) => {
    const rescheduleButton = event.target.closest("[data-reschedule-action]");
    if (rescheduleButton) {
        await respondToReschedule(auth.currentUser, rescheduleButton.dataset.bookingId, rescheduleButton.dataset.rescheduleAction);
        return;
    }
    const button = event.target.closest("[data-booking-action]");
    if (!button) return;
    await changeBookingStatus(auth.currentUser, button.dataset.bookingId, button.dataset.bookingAction);
});

list?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-reschedule-form]");
    if (!form) return;
    event.preventDefault();
    const user = auth.currentUser;
    const bookingId = form.dataset.bookingId;
    const booking = bookingsById.get(bookingId);
    const proposedDate = String(new FormData(form).get("rescheduleDate") || "");
    if (!user || !booking || booking.status !== "confirmed" || booking.rescheduleStatus === "pending") {
        return setStatus("This booking can’t accept a new date proposal right now. Refresh and try again.", true);
    }
    if (!validBookingDate(proposedDate) || proposedDate === booking.preferredDate) {
        return setStatus("Choose a valid date that differs from the current booking date.", true);
    }
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    setStatus("Sending your date change request…");
    try {
        const batch = writeBatch(db);
        batch.update(doc(db, "bookings", bookingId), {
            rescheduleStatus: "pending",
            rescheduleProposedDate: proposedDate,
            rescheduleProposedBy: user.uid,
            rescheduleProposedAt: serverTimestamp()
        });
        batch.set(doc(collection(db, "notifications")), {
            recipientUid: booking.customerUid,
            actorUid: user.uid,
            bookingId,
            rescheduleStatus: "pending",
            rescheduleDate: proposedDate,
            type: "booking_reschedule_requested",
            title: "Booking date change requested",
            message: `The provider proposed ${proposedDate}. Accept or decline it from your bookings.`,
            read: false,
            createdAt: serverTimestamp()
        });
        await batch.commit();
        setStatus("Date change request sent. The customer has been notified.");
    } catch (error) {
        console.error("Could not request booking reschedule:", error);
        setStatus(error?.code === "permission-denied" ? "The request was denied. Publish the latest Firestore rules and try again." : "Could not send the date change request. Please try again.", true);
        button.disabled = false;
    }
});

if (panel && list) {
    onAuthStateChanged(auth, (user) => {
        stopWatch?.();
        stopWatch = null;
        panel.hidden = !user;
        document.querySelectorAll("[data-provider-bookings-link]").forEach((link) => { link.hidden = !user; });
        if (!user) {
            list.innerHTML = "";
            return;
        }
        list.innerHTML = "<p>Loading bookings...</p>";
        stopWatch = onSnapshot(query(collection(db, "bookings"), where("providerId", "==", user.uid)), (snapshot) => {
            const bookings = snapshot.docs
                .map((item) => ({ id: item.id, data: item.data() }))
                .sort((a, b) => millis(b.data.createdAt) - millis(a.data.createdAt));
            renderBookings(bookings);
        }, (error) => {
            console.error("Provider bookings could not be loaded:", error);
            list.innerHTML = '<p class="dashboard-status error">Unable to load bookings. Please refresh and try again.</p>';
        });
    });
}
