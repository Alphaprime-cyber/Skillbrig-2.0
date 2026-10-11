import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const panel = document.getElementById("providerRequestsPanel");
const list = document.getElementById("providerRequestList");
const status = document.getElementById("providerRequestStatus");
const quoteDataById = new Map();

let stopRequestWatch = null;
let stopNotificationWatch = null;
let notifications = [];

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function setStatus(message, isError = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", isError);
}

function formatDate(value) {
    const date = value?.toDate?.();
    if (!date || Number.isNaN(date.getTime())) return "Date not provided";
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

function formatAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 2
    }).format(amount);
}

function timestampMillis(value) {
    const millis = value?.toMillis?.();
    return Number.isFinite(millis) ? millis : 0;
}

function ensureNotificationPanel() {
    if (!list?.parentElement) return null;

    let notificationPanel = document.getElementById("providerQuoteNotifications");
    if (notificationPanel) return notificationPanel;

    notificationPanel = document.createElement("section");
    notificationPanel.id = "providerQuoteNotifications";
    notificationPanel.className = "card";
    notificationPanel.setAttribute("aria-label", "Quote notifications");
    notificationPanel.style.cssText = "padding:18px;margin:0 0 20px;border:1px solid rgba(120,120,120,.22);border-radius:14px;";
    list.parentElement.insertBefore(notificationPanel, list);

    notificationPanel.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-mark-notification]");
        if (!button) return;

        button.disabled = true;
        try {
            await updateDoc(doc(db, "notifications", button.dataset.markNotification), {
                read: true,
                readAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Could not mark notification as read:", error);
            button.disabled = false;
        }
    });

    return notificationPanel;
}

function renderNotifications() {
    const notificationPanel = ensureNotificationPanel();
    if (!notificationPanel) return;

    const ordered = [...notifications].sort(
        (a, b) => timestampMillis(b.data.createdAt) - timestampMillis(a.data.createdAt)
    );
    const unreadCount = ordered.filter((item) => item.data.read !== true).length;

    notificationPanel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <h2 style="font-size:1.15rem;margin:0">Notifications</h2>
            <span>${unreadCount ? `${unreadCount} unread` : "All caught up"}</span>
        </div>
        <div style="display:grid;gap:10px;margin-top:12px">
            ${ordered.length ? ordered.slice(0, 10).map(({ id, data }) => `
                <article style="padding:12px;border-radius:10px;background:rgba(120,120,120,.08)">
                    <strong>${escapeHtml(data.title || "Update")}</strong>
                    <p style="margin:6px 0">${escapeHtml(data.message || "There is an update to your account.")}</p>
                    <small>${escapeHtml(formatDate(data.createdAt))}</small>
                    <div style="display:flex;gap:14px;margin-top:8px">
                        <a href="${data.bookingId ? `#provider-booking-${escapeHtml(data.bookingId)}` : `#provider-quote-${escapeHtml(data.quoteRequestId || "")}`}">${data.bookingId ? "View booking" : "View request"}</a>
                        ${data.read === true ? "" : `<button type="button" data-mark-notification="${escapeHtml(id)}">Mark as read</button>`}
                    </div>
                </article>`).join("") : "<p style='margin:0'>No notifications yet.</p>"}
        </div>`;
}

function renderRequests(requests) {
    if (!list) return;
    quoteDataById.clear();

    if (!requests.length) {
        list.innerHTML = '<p class="dashboard-note">No quote requests have been sent to this provider yet.</p>';
        return;
    }

    list.innerHTML = requests.map(({ id, data }) => {
        quoteDataById.set(id, data);
        const state = String(data.status || "pending").toLowerCase();
        const canRespond = state === "pending" || state === "revision_requested";
        const responseForm = canRespond ? `
            ${state === "revision_requested" ? `
                <div class="provider-quote-follow-up">
                    <strong>Customer asked for clarification or a change:</strong>
                    <p>${escapeHtml(data.customerMessage || "No details provided")}</p>
                </div>
                <p><strong>Previous estimate:</strong> ${escapeHtml(formatAmount(data.quoteAmount) || "Not provided")}</p>
                <p><strong>Previous message:</strong> ${escapeHtml(data.providerResponse || "Not provided")}</p>` : ""}
            <form class="provider-response-form" data-quote-id="${escapeHtml(id)}">
                <label>${state === "revision_requested" ? "Updated estimate amount (₦)" : "Estimate amount (₦)"}
                    <input name="quoteAmount" type="number" min="1" step="0.01" value="${state === "revision_requested" ? escapeHtml(data.quoteAmount ?? "") : ""}" required>
                </label>
                <label>${state === "revision_requested" ? "Updated message to the customer" : "Message to the customer"}
                    <textarea name="providerResponse" rows="3" maxlength="1000" required>${state === "revision_requested" ? escapeHtml(data.providerResponse || "") : ""}</textarea>
                </label>
                <button class="request-respond" type="submit">${state === "revision_requested" ? "Update and resend estimate" : "Send estimate"}</button>
            </form>` : `
            <p><strong>Your estimate:</strong> ${escapeHtml(formatAmount(data.quoteAmount) || "Not provided")}</p>
            <p><strong>Your message:</strong> ${escapeHtml(data.providerResponse || "No message provided")}</p>
            ${state === "accepted" ? '<p class="dashboard-note">The customer accepted this estimate.</p>' : ""}
            ${state === "declined" ? '<p class="dashboard-note">The customer declined this estimate.</p>' : ""}`;

        return `
            <article id="provider-quote-${escapeHtml(id)}" class="provider-request-card">
                <div class="dashboard-toolbar">
                    <h3>${escapeHtml(data.service || "Service request")}</h3>
                    <span class="request-status">${escapeHtml(state.replaceAll("_", " "))}</span>
                </div>
                <p><strong>Customer:</strong> ${escapeHtml(data.customerName || "Customer")}</p>
                <p><strong>Email:</strong> ${escapeHtml(data.customerEmail || "Not provided")}</p>
                <p><strong>Preferred date:</strong> ${escapeHtml(data.preferredDate || "Flexible")}</p>
                <p><strong>Request:</strong> ${escapeHtml(data.description || "No details provided")}</p>
                <p><strong>Received:</strong> ${escapeHtml(formatDate(data.createdAt))}</p>
                ${responseForm}
            </article>`;
    }).join("");
}

function startNotificationWatch(user) {
    stopNotificationWatch?.();
    notifications = [];
    renderNotifications();

    const notificationQuery = query(
        collection(db, "notifications"),
        where("recipientUid", "==", user.uid)
    );

    stopNotificationWatch = onSnapshot(notificationQuery, (snapshot) => {
        notifications = snapshot.docs.map((notificationDoc) => ({
            id: notificationDoc.id,
            data: notificationDoc.data()
        }));
        renderNotifications();
    }, (error) => {
        console.error("Provider notifications could not be loaded:", error);
        const notificationPanel = ensureNotificationPanel();
        if (notificationPanel) notificationPanel.innerHTML = "<p>Unable to load notifications.</p>";
    });
}

function startRequestWatch(user) {
    stopRequestWatch?.();
    if (!list) return;

    list.innerHTML = "<p>Loading quote requests...</p>";
    setStatus("");

    const requestQuery = query(
        collection(db, "quoteRequests"),
        where("providerId", "==", user.uid)
    );

    stopRequestWatch = onSnapshot(requestQuery, (snapshot) => {
        const requests = snapshot.docs
            .map((requestDoc) => ({ id: requestDoc.id, data: requestDoc.data() }))
            .sort((a, b) => timestampMillis(b.data.createdAt) - timestampMillis(a.data.createdAt));

        renderRequests(requests);
    }, (error) => {
        console.error("Provider quote requests could not be loaded:", error);
        list.innerHTML = '<p class="dashboard-status error">Unable to load quote requests. Please refresh and try again.</p>';
    });
}

list?.addEventListener("submit", async (event) => {
    const form = event.target.closest(".provider-response-form");
    if (!form) return;
    event.preventDefault();

    const user = auth.currentUser;
    const quoteId = form.dataset.quoteId;
    const quote = quoteDataById.get(quoteId);
    const quoteAmount = Number(new FormData(form).get("quoteAmount"));
    const providerResponse = String(new FormData(form).get("providerResponse") || "").trim();
    const button = form.querySelector("button[type='submit']");
    const state = String(quote?.status || "").toLowerCase();

    if (!user || !quoteId || !quote) {
        return setStatus("Please sign in again before sending an estimate.", true);
    }
    if (!["pending", "revision_requested"].includes(state)) {
        return setStatus("This request has already been updated. Refresh the page to see its current status.", true);
    }
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0 || !providerResponse || providerResponse.length > 1000) {
        return setStatus("Enter an amount above zero and a message of no more than 1,000 characters.", true);
    }

    button.disabled = true;
    setStatus("Sending your estimate...");

    try {
        await updateDoc(doc(db, "quoteRequests", quoteId), {
            status: "responded",
            quoteAmount,
            providerResponse,
            respondedAt: serverTimestamp()
        });

        setStatus("Your estimate has been sent to the customer.");
    } catch (error) {
        console.error("Provider estimate could not be sent:", error);
        setStatus(error?.code === "permission-denied"
            ? "Unable to send the estimate. Make sure the latest Firestore rules are published."
            : "Unable to send the estimate. Check your connection and try again.", true);
        button.disabled = false;
    }
});

if (panel && list) {
    onAuthStateChanged(auth, (user) => {
        stopRequestWatch?.();
        stopNotificationWatch?.();
        stopRequestWatch = null;
        stopNotificationWatch = null;

        panel.hidden = !user;
        document.querySelectorAll("[data-provider-quotes-link]").forEach((link) => {
            link.hidden = !user;
        });

        if (user) {
            startRequestWatch(user);
            startNotificationWatch(user);

            if (window.location.hash === "#providerRequestsPanel") {
                requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }));
            }
        } else {
            list.innerHTML = "";
            document.getElementById("providerQuoteNotifications")?.remove();
        }
    });
}