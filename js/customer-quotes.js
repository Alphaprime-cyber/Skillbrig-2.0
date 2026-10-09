import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    getDocs,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const list = document.getElementById("quotesList");
const status = document.getElementById("quotePageStatus");
const quoteDataById = new Map();

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
    quoteDataById.clear();

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
        quoteDataById.set(id, data);
        const quoteStatus = String(data.status || "pending").toLowerCase();
        const hasReply = ["responded", "accepted", "declined"].includes(quoteStatus);
        const profileUrl = `../profile.html?id=${encodeURIComponent(data.providerId || "")}`;
        let followUp = "";
        if (quoteStatus === "responded") {
            followUp = `
                <div class="quote-actions">
                    <button class="quote-action quote-accept" type="button" data-quote-action="accept" data-quote-id="${escapeHtml(id)}">Accept quote</button>
                    <button class="quote-action quote-decline" type="button" data-quote-action="decline" data-quote-id="${escapeHtml(id)}">Decline</button>
                </div>`;
        } else if (quoteStatus === "accepted") {
            followUp = `<p class="quote-follow-up quote-accepted-note">You accepted this estimate. A booking has been added to <a href="bookings.html">My Bookings</a>.</p>`;
        } else if (quoteStatus === "declined") {
            followUp = `<p class="quote-follow-up quote-declined-note">You declined this estimate.</p>`;
        }

        return `
            <article class="quote-card card" data-quote-card="${escapeHtml(id)}">
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
                ${followUp}
                <a class="quote-profile-link" href="${escapeHtml(profileUrl)}">View provider profile</a>
            </article>`;
    }).join("");
}

async function reloadQuotes(user) {
    const requestQuery = query(
        collection(db, "quoteRequests"),
        where("customerUid", "==", user.uid)
    );
    const snapshot = await getDocs(requestQuery);
    const quotes = snapshot.docs
        .map((quoteDoc) => ({ id: quoteDoc.id, data: quoteDoc.data() }))
        .sort((a, b) => (b.data.createdAt?.toMillis?.() || 0) - (a.data.createdAt?.toMillis?.() || 0));
    renderQuotes(quotes);
}

list?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-quote-action]");
    if (!button) return;
    event.preventDefault();

    const user = auth.currentUser;
    const quoteId = button.dataset.quoteId;
    const action = button.dataset.quoteAction;
    const quote = quoteDataById.get(quoteId);
    if (!user || !quote || quote.status !== "responded") {
        if (status) status.textContent = "This quote has already been updated. Refresh the page to see its current status.";
        return;
    }
    if (action === "decline" && !window.confirm("Decline this provider’s estimate?")) return;

    const card = button.closest("[data-quote-card]");
    card?.querySelectorAll("button").forEach((item) => { item.disabled = true; });
    if (status) status.textContent = action === "accept" ? "Accepting the estimate and creating your booking…" : "Declining the estimate…";

    try {
        const quoteRef = doc(db, "quoteRequests", quoteId);
        if (action === "accept") {
            const batch = writeBatch(db);
            batch.update(quoteRef, {
                status: "accepted",
                acceptedAt: serverTimestamp()
            });
            batch.set(doc(db, "bookings", quoteId), {
                quoteRequestId: quoteId,
                customerUid: user.uid,
                customerName: String(quote.customerName || user.displayName || "Customer").slice(0, 80),
                providerId: quote.providerId,
                providerName: quote.providerName,
                service: quote.service,
                description: quote.description,
                preferredDate: quote.preferredDate || "",
                quoteAmount: quote.quoteAmount,
                providerResponse: quote.providerResponse,
                status: "confirmed",
                createdAt: serverTimestamp()
            });
            await batch.commit();
            if (status) status.textContent = "Quote accepted. Your booking is ready in My Bookings.";
        } else if (action === "decline") {
            await updateDoc(quoteRef, {
                status: "declined",
                declinedAt: serverTimestamp()
            });
            if (status) status.textContent = "You declined the estimate.";
        } else {
            return;
        }

        await reloadQuotes(user);
    } catch (error) {
        console.error("Could not update customer quote:", error);
        if (status) {
            status.textContent = error?.code === "permission-denied"
                ? "This action was denied. Publish the updated Firestore rules, then try again."
                : "Could not update this quote. Please refresh and try again.";
        }
        card?.querySelectorAll("button").forEach((item) => { item.disabled = false; });
    }
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("auth.html?mode=login");
        return;
    }

    if (status) status.textContent = "Loading your quote requests…";
    if (list) list.innerHTML = "";
    try {
        await reloadQuotes(user);
        if (status) status.textContent = "";
    } catch (error) {
        console.error("Customer quote requests could not be loaded:", error);
        if (status) status.textContent = "Unable to load quote requests. Please refresh and try again.";
        if (list) list.innerHTML = "";
    }
});