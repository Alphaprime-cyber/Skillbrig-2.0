import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
    writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const list = document.getElementById("quotesList");
const status = document.getElementById("quotePageStatus");
const quoteDataById = new Map();

let stopQuoteWatch = null;
let currentQuotes = [];
let notificationPanel = null;

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
    return new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(date);
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

function seenStorageKey(userId) {
    return `skillbridge.customer.quoteNotifications.${userId}`;
}

function getSeenNotifications(userId) {
    try {
        const saved = JSON.parse(localStorage.getItem(seenStorageKey(userId)) || "[]");
        return new Set(Array.isArray(saved) ? saved : []);
    } catch {
        return new Set();
    }
}

function saveSeenNotifications(userId, seen) {
    try {
        localStorage.setItem(seenStorageKey(userId), JSON.stringify([...seen]));
    } catch (error) {
        console.warn("Could not save notification read state:", error);
    }
}

function ensureNotificationPanel() {
    if (!list?.parentElement) return null;
    if (notificationPanel?.isConnected) return notificationPanel;

    notificationPanel = document.createElement("section");
    notificationPanel.id = "customerQuoteNotifications";
    notificationPanel.className = "card";
    notificationPanel.setAttribute("aria-label", "Quote notifications");
    notificationPanel.style.cssText = "padding:18px;margin:0 0 20px;border:1px solid rgba(120,120,120,.22);border-radius:14px;";
    list.parentElement.insertBefore(notificationPanel, list);

    notificationPanel.addEventListener("click", (event) => {
        const markButton = event.target.closest("[data-mark-notification]");
        if (!markButton) return;

        const user = auth.currentUser;
        if (!user) return;

        const seen = getSeenNotifications(user.uid);
        seen.add(markButton.dataset.markNotification);
        saveSeenNotifications(user.uid, seen);
        renderNotifications(currentQuotes, user.uid);
    });

    return notificationPanel;
}

function getCustomerNotificationEvents(quotes) {
    return quotes.flatMap(({ id, data }) => {
        const state = String(data.status || "pending").toLowerCase();
        const repliedAt = timestampMillis(data.respondedAt);

        if (!repliedAt || !["responded", "revision_requested", "accepted", "declined"].includes(state)) {
            return [];
        }

        const eventId = `${id}:provider-reply:${repliedAt}`;
        return [{
            id: eventId,
            quoteId: id,
            time: repliedAt,
            title: "Your provider replied",
            message: `${data.providerName || "Your provider"} sent an estimate for ${data.service || "your request"}.`
        }];
    }).sort((a, b) => b.time - a.time);
}

function renderNotifications(quotes, userId) {
    const panel = ensureNotificationPanel();
    if (!panel) return;

    const seen = getSeenNotifications(userId);
    const events = getCustomerNotificationEvents(quotes);
    const unread = events.filter((item) => !seen.has(item.id));

    panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <h2 style="font-size:1.15rem;margin:0">Notifications</h2>
            <span>${unread.length ? `${unread.length} new` : "All caught up"}</span>
        </div>
        <div style="display:grid;gap:10px;margin-top:12px">
            ${unread.length ? unread.slice(0, 10).map((item) => `
                <article style="padding:12px;border-radius:10px;background:rgba(120,120,120,.08)">
                    <strong>${escapeHtml(item.title)}</strong>
                    <p style="margin:6px 0">${escapeHtml(item.message)}</p>
                    <small>${escapeHtml(formatDate({ toDate: () => new Date(item.time) }))}</small>
                    <div style="display:flex;gap:14px;margin-top:8px">
                        <a href="#quote-${escapeHtml(item.quoteId)}">View quote</a>
                        <button type="button" data-mark-notification="${escapeHtml(item.id)}">Mark as read</button>
                    </div>
                </article>`).join("") : "<p style='margin:0'>No new quote updates.</p>"}
        </div>`;
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
        const hasReply = ["responded", "accepted", "declined", "revision_requested"].includes(quoteStatus);
        const profileUrl = `../profile.html?id=${encodeURIComponent(data.providerId || "")}`;
        let followUp = "";

        if (quoteStatus === "responded") {
            followUp = `
                <div class="quote-actions">
                    <button class="quote-action quote-accept" type="button" data-quote-action="accept" data-quote-id="${escapeHtml(id)}">Accept quote</button>
                    <button class="quote-action quote-decline" type="button" data-quote-action="decline" data-quote-id="${escapeHtml(id)}">Decline</button>
                    <button class="quote-action quote-clarify" type="button" data-quote-action="open-revision" data-quote-id="${escapeHtml(id)}">Ask for clarification or a change</button>
                </div>
                <form class="quote-revision-form" data-revision-form data-quote-id="${escapeHtml(id)}" hidden>
                    <label for="revision-${escapeHtml(id)}">What should the provider clarify or change?</label>
                    <textarea id="revision-${escapeHtml(id)}" name="customerMessage" maxlength="1000" rows="3" required placeholder="For example, ask what the estimate includes or request an updated estimate."></textarea>
                    <button class="quote-action quote-accept" type="submit">Send to provider</button>
                </form>`;
        } else if (quoteStatus === "revision_requested") {
            followUp = `<p class="quote-follow-up quote-waiting-revision">Your message was sent. Waiting for the provider to reply.</p>`;
        } else if (quoteStatus === "accepted") {
            followUp = `<p class="quote-follow-up quote-accepted-note">You accepted this estimate. A booking has been added to <a href="bookings.html">My Bookings</a>.</p>`;
        } else if (quoteStatus === "declined") {
            followUp = `<p class="quote-follow-up quote-declined-note">You declined this estimate.</p>`;
        }

        const customerMessage = data.customerMessage
            ? `<div class="customer-quote-message"><strong>Your question or requested change:</strong><p>${escapeHtml(data.customerMessage)}</p></div>`
            : "";

        return `
            <article id="quote-${escapeHtml(id)}" class="quote-card card" data-quote-card="${escapeHtml(id)}">
                <div class="quote-card-heading">
                    <div>
                        <div class="section-label">${escapeHtml(data.service || "SERVICE REQUEST")}</div>
                        <h2>${escapeHtml(data.providerName || "Provider")}</h2>
                    </div>
                    <span class="quote-status quote-status-${escapeHtml(quoteStatus)}">${escapeHtml(quoteStatus.replaceAll("_", " "))}</span>
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
                ${customerMessage}
                ${followUp}
                <a class="quote-profile-link" href="${escapeHtml(profileUrl)}">View provider profile</a>
            </article>`;
    }).join("");
}

function watchQuotes(user) {
    stopQuoteWatch?.();

    if (status) status.textContent = "Loading your quote requests…";
    if (list) list.innerHTML = "";

    const requestQuery = query(
        collection(db, "quoteRequests"),
        where("customerUid", "==", user.uid)
    );

    stopQuoteWatch = onSnapshot(requestQuery, (snapshot) => {
        currentQuotes = snapshot.docs
            .map((quoteDoc) => ({ id: quoteDoc.id, data: quoteDoc.data() }))
            .sort((a, b) => timestampMillis(b.data.createdAt) - timestampMillis(a.data.createdAt));

        renderQuotes(currentQuotes);
        renderNotifications(currentQuotes, user.uid);
        if (status) status.textContent = "";
    }, (error) => {
        console.error("Customer quote requests could not be loaded:", error);
        if (status) status.textContent = "Unable to load quote requests. Please refresh and try again.";
        if (list) list.innerHTML = "";
    });
}

list?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-quote-action]");
    if (!button) return;
    event.preventDefault();

    const action = button.dataset.quoteAction;
    const card = button.closest("[data-quote-card]");
    if (action === "open-revision") {
        const form = card?.querySelector("[data-revision-form]");
        if (form) {
            form.hidden = false;
            form.querySelector("textarea")?.focus();
        }
        return;
    }

    const user = auth.currentUser;
    const quoteId = button.dataset.quoteId;
    const quote = quoteDataById.get(quoteId);
    if (!user || !quote || String(quote.status || "").toLowerCase() !== "responded") {
        if (status) status.textContent = "This quote has already been updated. Refresh the page to see its current status.";
        return;
    }
    if (action === "decline" && !window.confirm("Decline this provider’s estimate?")) return;

    card?.querySelectorAll("button").forEach((item) => { item.disabled = true; });
    if (status) status.textContent = action === "accept" ? "Accepting the estimate and creating your booking…" : "Declining the estimate…";

    try {
        const quoteRef = doc(db, "quoteRequests", quoteId);
        const batch = writeBatch(db);
        const notificationRef = doc(collection(db, "notifications"));

        if (action === "accept") {
            batch.update(quoteRef, { status: "accepted", acceptedAt: serverTimestamp() });
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
            batch.set(notificationRef, {
                recipientUid: quote.providerId,
                actorUid: user.uid,
                quoteRequestId: quoteId,
                type: "quote_accepted",
                title: "Estimate accepted",
                message: "The customer accepted your estimate.",
                read: false,
                createdAt: serverTimestamp()
            });
        } else if (action === "decline") {
            batch.update(quoteRef, { status: "declined", declinedAt: serverTimestamp() });
            batch.set(notificationRef, {
                recipientUid: quote.providerId,
                actorUid: user.uid,
                quoteRequestId: quoteId,
                type: "quote_declined",
                title: "Estimate declined",
                message: "The customer declined your estimate.",
                read: false,
                createdAt: serverTimestamp()
            });
        } else {
            return;
        }

        await batch.commit();
        if (status) status.textContent = action === "accept"
            ? "Quote accepted. Your booking is ready in My Bookings."
            : "You declined the estimate.";
    } catch (error) {
        console.error("Could not update customer quote:", error);
        if (status) {
            status.textContent = error?.code === "permission-denied"
                ? "This action was denied. The latest Firestore rules may need a notification rule."
                : "Could not update this quote. Please refresh and try again.";
        }
        card?.querySelectorAll("button").forEach((item) => { item.disabled = false; });
    }
});

list?.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-revision-form]");
    if (!form) return;
    event.preventDefault();

    const user = auth.currentUser;
    const quoteId = form.dataset.quoteId;
    const quote = quoteDataById.get(quoteId);
    const customerMessage = String(new FormData(form).get("customerMessage") || "").trim();
    const button = form.querySelector("button[type='submit']");

    if (!user || !quote || String(quote.status || "").toLowerCase() !== "responded") {
        if (status) status.textContent = "This quote is no longer awaiting a response. Refresh the page and try again.";
        return;
    }
    if (!customerMessage || customerMessage.length > 1000) {
        if (status) status.textContent = "Enter a message of up to 1,000 characters.";
        return;
    }

    button.disabled = true;
    if (status) status.textContent = "Sending your question to the provider…";

    try {
        const batch = writeBatch(db);
        batch.update(doc(db, "quoteRequests", quoteId), {
            status: "revision_requested",
            customerMessage,
            customerMessageAt: serverTimestamp()
        });
        batch.set(doc(collection(db, "notifications")), {
            recipientUid: quote.providerId,
            actorUid: user.uid,
            quoteRequestId: quoteId,
            type: "customer_revision_requested",
            title: "Clarification requested",
            message: "A customer asked you to clarify or revise an estimate.",
            read: false,
            createdAt: serverTimestamp()
        });

        await batch.commit();
        if (status) status.textContent = "Your question was sent. The provider can now reply with clarification or an updated estimate.";
    } catch (error) {
        console.error("Could not send quote clarification request:", error);
        if (status) {
            status.textContent = error?.code === "permission-denied"
                ? "This request was denied. The latest Firestore rules may need a notification rule."
                : "Could not send your message. Please refresh and try again.";
        }
        button.disabled = false;
    }
});

onAuthStateChanged(auth, (user) => {
    stopQuoteWatch?.();
    stopQuoteWatch = null;

    if (!user) {
        window.location.replace("auth.html?mode=login");
        return;
    }

    watchQuotes(user);
});