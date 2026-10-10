import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const panel = document.getElementById("providerRequestsPanel");
const list = document.getElementById("providerRequestList");
const status = document.getElementById("providerRequestStatus");

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
        style: "currency", currency: "NGN", maximumFractionDigits: 2
    }).format(amount);
}

function renderRequests(requests) {
    if (!list) return;
    if (!requests.length) {
        list.innerHTML = '<p class="dashboard-note">No quote requests have been sent to this provider yet.</p>';
        return;
    }

    list.innerHTML = requests.map(({ id, data }) => {
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
            ${state === "declined" ? '<p class="dashboard-note">The customer declined this estimate.</p>' : ""}`;

        return `
            <article class="provider-request-card">
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

async function loadRequests(user) {
    if (!list) return;
    list.innerHTML = "<p>Loading quote requests...</p>";
    setStatus("");
    try {
        const requestQuery = query(collection(db, "quoteRequests"), where("providerId", "==", user.uid));
        const snapshot = await getDocs(requestQuery);
        const requests = snapshot.docs
            .map((requestDoc) => ({ id: requestDoc.id, data: requestDoc.data() }))
            .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0));
        renderRequests(requests);
    } catch (error) {
        console.error("Provider quote requests could not be loaded:", error);
        list.innerHTML = '<p class="dashboard-status error">Unable to load quote requests. Please refresh and try again.</p>';
    }
}

list?.addEventListener("submit", async (event) => {
    const form = event.target.closest(".provider-response-form");
    if (!form) return;
    event.preventDefault();

    const user = auth.currentUser;
    const quoteId = form.dataset.quoteId;
    const quoteAmount = Number(new FormData(form).get("quoteAmount"));
    const providerResponse = String(new FormData(form).get("providerResponse") || "").trim();
    const button = form.querySelector("button[type='submit']");
    if (!user || !quoteId) return setStatus("Please sign in again before sending an estimate.", true);
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
        await loadRequests(user);
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
        panel.hidden = !user;
        document.querySelectorAll("[data-provider-quotes-link]").forEach((link) => { link.hidden = !user; });
        if (user) {
            loadRequests(user);
            if (window.location.hash === "#providerRequestsPanel") {
                requestAnimationFrame(() => panel.scrollIntoView({ behavior: "smooth", block: "start" }));
            }
        } else {
            list.innerHTML = "";
        }
    });
}