import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const list = document.getElementById("quotesList");
const status = document.getElementById("quotePageStatus");

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
})[character]);

function formatDate(value) {
    const date = value?.toDate?.();
    if (!date || Number.isNaN(date.getTime())) return "Date not available";
    return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
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

function renderQuotes(quotes) {
    if (!list) return;
    if (!quotes.length) {
        list.innerHTML = `
            <article class="quote-empty card">
                <h2>No quote requests yet</h2>
                <p>When you request a quote from a provider, it will appear here with their reply.</p>
                <a class="search-btn" href="../providers.html">Find a provider</a>
            </article>`;
        return;
    }

    list.innerHTML = quotes.map(({ id, data }) => {
        const quoteStatus = String(data.status || "pending").toLowerCase();
        const hasReply = quoteStatus === "responded" || quoteStatus === "accepted";
        const profileUrl = `../profile.html?id=${encodeURIComponent(data.providerId || "")}`;
        return `
            <article class="quote-card card">
                <div class="quote-card-heading">
                    <div>
                        <div class="section-label">${escapeHtml(data.service || "SERVICE REQUEST")}</div>
                        <h2>${escapeHtml(data.providerName || "Provider")}</h2>
                    </div>
                    <span class="quote-status quote-status-${escapeHtml(quoteStatus)}">${escapeHtml(quoteStatus)}</span>
                </div>
                <p><strong>Your request:</strong> ${escapeHtml(data.description || "No description provided")}</p>
                <p><strong>Preferred date:</strong> ${escapeHtml(data.preferredDate || "Flexible")}</p>
                <p class="quote-date"><strong>Sent:</strong> ${escapeHtml(formatDate(data.createdAt))}</p>
                ${hasReply ? `
                    <div class="provider-quote-reply">
                        <h3>Provider’s reply</h3>
                        <p class="quote-amount">${escapeHtml(formatAmount(data.quoteAmount) || "Estimate not provided")}</p>
                        <p>${escapeHtml(data.providerResponse || "No message provided")}</p>
                    </div>` : `
                    <p class="quote-waiting">Waiting for ${escapeHtml(data.providerName || "the provider")} to reply.</p>`}
                <a class="quote-profile-link" href="${escapeHtml(profileUrl)}">View provider profile</a>
            </article>`;
    }).join("");
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html?mode=login");
        return;
    }

    if (status) status.textContent = "Loading your quote requests…";
    if (list) list.innerHTML = "";
    try {
        const requestQuery = query(
            collection(db, "quoteRequests"),
            where("customerUid", "==", user.uid)
        );
        const snapshot = await getDocs(requestQuery);
        const quotes = snapshot.docs
            .map((quoteDoc) => ({ id: quoteDoc.id, data: quoteDoc.data() }))
            .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0));
        renderQuotes(quotes);
        if (status) status.textContent = "";
    } catch (error) {
        console.error("Customer quote requests could not be loaded:", error);
        if (status) status.textContent = "Unable to load quote requests. Please refresh and try again.";
        if (list) list.innerHTML = "";
    }
});
