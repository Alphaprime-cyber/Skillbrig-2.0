import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const byId = (id) => document.getElementById(id);
const providerId = new URLSearchParams(window.location.search).get("id");
const authForm = byId("quoteAuthForm");
const requestForm = byId("quoteRequestForm");
const status = byId("quoteNotice");
let provider = null;

function setStatus(message, error = false) {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle("error", error);
}

async function loadProvider() {
    if (!providerId) return setStatus("This provider link is missing an ID.", true);
    try {
        const snapshot = await getDoc(doc(db, "providers", providerId));
        if (!snapshot.exists() || snapshot.data().verified !== true) return setStatus("Quote requests are available for approved providers only.", true);
        provider = snapshot.data();
        const category = byId("quoteService");
        if (category && !category.value) category.placeholder = `For example, ${provider.category || "a service"}`;
        updateControls(auth.currentUser);
    } catch (error) {
        console.error("Unable to load provider for quote request:", error);
        setStatus("Unable to prepare a quote request. Please try again later.", true);
    }
}

function updateControls(user) {
    if (!authForm || !requestForm) return;
    authForm.hidden = Boolean(user);
    requestForm.hidden = !user || !provider;
    if (user && provider && user.uid === providerId) {
        requestForm.hidden = true;
        setStatus("You can’t request a quote from your own provider profile.", true);
    } else if (user && provider) {
        setStatus("Describe the work and this provider will respond with an estimate.");
    }
}

authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("Signing in...");
    try {
        await signInWithEmailAndPassword(auth, byId("quoteEmail").value.trim(), byId("quotePassword").value);
        setStatus("You’re signed in. Complete your quote request below.");
    } catch (error) {
        console.error("Quote request sign-in failed:", error);
        setStatus("Sign-in failed. Check your email and password.", true);
    }
});

byId("createQuoteAccount")?.addEventListener("click", async () => {
    const nameWrap = byId("quoteNameWrap");
    const nameField = byId("quoteName");
    if (nameWrap?.hidden) {
        nameWrap.hidden = false;
        if (nameField) nameField.required = true;
        nameField?.focus();
        setStatus("Enter your name, email, and a password of at least 8 characters, then select Create account again.");
        return;
    }
    const name = nameField?.value.trim() || "";
    const email = byId("quoteEmail")?.value.trim() || "";
    const password = byId("quotePassword")?.value || "";
    if (!name || !email || password.length < 8) return setStatus("Enter your name and email, and choose a password of at least 8 characters.", true);
    setStatus("Creating your customer account...");
    try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        setStatus("Account created. You can now send your request.");
    } catch (error) {
        console.error("Quote customer account creation failed:", error);
        setStatus(error?.code === "auth/email-already-in-use" ? "An account already uses that email. Sign in instead." : "Unable to create the account. Check your details and try again.", true);
    }
});

requestForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    if (!user || !provider) return setStatus("Sign in and reload the provider profile before sending a request.", true);
    const service = byId("quoteService").value.trim();
    const description = byId("quoteDescription").value.trim();
    const preferredDate = byId("quotePreferredDate").value;
    if (!service || !description) return setStatus("Add the service and a short description of the work.", true);
    const button = requestForm.querySelector("button[type=submit]");
    button.disabled = true;
    setStatus("Sending your quote request...");
    try {
        await addDoc(collection(db, "quoteRequests"), {
            customerUid: user.uid,
            customerName: (user.displayName || user.email?.split("@")[0] || "Customer").slice(0, 80),
            customerEmail: (user.email || "").slice(0, 254),
            providerId,
            providerName: (provider.businessName || provider.name || "Provider").slice(0, 120),
            service: service.slice(0, 120),
            description: description.slice(0, 2000),
            preferredDate,
            status: "pending",
            createdAt: serverTimestamp()
        });
        requestForm.reset();
        setStatus("Quote request sent. You can track the response from your customer dashboard.");
    } catch (error) {
        console.error("Quote request failed:", error);
        setStatus(error?.code === "permission-denied" ? "Request denied. Check that the latest Firestore rules are deployed." : "Unable to send your request. Please try again.", true);
    } finally {
        button.disabled = false;
    }
});

onAuthStateChanged(auth, updateControls);
loadProvider();
