import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, setDoc, getDocs, doc, getDoc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const byId = (id) => document.getElementById(id);
const clean = (value) => String(value ?? "").trim();
const escapeHtml = (value) => clean(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

// Provider registration: preserve the fields and Firestore collection used by provider.html.
window.registerProvider = async function () {
    const name = clean(byId("providerName")?.value);
    const businessName = clean(byId("businessName")?.value);
    const category = clean(byId("providerCategory")?.value);
    const state = clean(byId("providerState")?.value);
    const location = clean(byId("providerLocation")?.value);
    const phone = clean(byId("providerPhone")?.value);
    const whatsapp = clean(byId("providerWhatsApp")?.value);
    const email = clean(byId("providerEmail")?.value);
    const password = clean(byId("providerPassword")?.value);
    const experience = clean(byId("providerExperience")?.value);
    const businessHours = clean(byId("providerBusinessHours")?.value);
    const description = clean(byId("providerDescription")?.value);

    if (!name || !category || !state || !location || !phone || !email || !password) {
        alert("Please complete all required fields.");
        return;
    }
    if (password.length < 8) {
        alert("Choose a password with at least 8 characters.");
        return;
    }
    if (!byId("agreeTerms")?.checked) {
        alert("Please agree to the Terms & Conditions.");
        return;
    }

    try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "providers", credential.user.uid), {
            uid: credential.user.uid,
            name, businessName, category, state, location, phone, whatsapp, email,
            experience, businessHours, description,
            verified: false, averageRating: 0, totalReviews: 0, jobsCompleted: 0,
            skillScore: 50, createdAt: new Date()
        });
        alert("🎉 Registration submitted successfully! Your application is awaiting approval. You can manage your profile from the Provider Dashboard.");
        document.querySelectorAll("input, textarea").forEach((input) => {
            if (input.type !== "checkbox") input.value = "";
        });
        if (byId("providerCategory")) byId("providerCategory").value = "";
        if (byId("providerState")) byId("providerState").value = "";
        if (byId("agreeTerms")) byId("agreeTerms").checked = false;
        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Registration error:", error);
        alert("Registration failed: " + (error?.message || "Please try again."));
    }
};

async function loadProviderDashboard() {
    const form = byId("dashboardLoginForm");
    const profileForm = byId("dashboardProfileForm");
    const loginPanel = byId("dashboardLoginPanel");
    const profilePanel = byId("dashboardProfilePanel");
    const status = byId("dashboardStatus");
    if (!form || !profileForm || !loginPanel || !profilePanel) return;

    const showStatus = (message, isError = false) => {
        if (!status) return;
        status.textContent = message;
        status.classList.toggle("error", isError);
    };
    const setProfileFields = (provider) => {
        ["name", "businessName", "category", "state", "location", "phone", "whatsapp", "email", "experience", "businessHours", "description"].forEach((key) => {
            const input = byId(`dashboard${key[0].toUpperCase()}${key.slice(1)}`);
            if (input) input.value = provider[key] ?? "";
        });
        const approval = byId("dashboardApproval");
        if (approval) {
            approval.textContent = provider.verified === true ? "Approved and visible in the provider directory" : "Pending approval — your profile is not visible in the directory yet";
            approval.classList.toggle("pending", provider.verified !== true);
        }
        const link = byId("dashboardPublicProfile");
        if (link) {
            link.href = `profile.html?id=${encodeURIComponent(auth.currentUser.uid)}`;
            link.hidden = provider.verified !== true;
        }
    };

    async function refreshDashboard(user) {
        loginPanel.hidden = !user;
        profilePanel.hidden = true;
        const logoutButton = byId("dashboardLogout");
        if (logoutButton) logoutButton.hidden = !user;
        if (!user) return;
        showStatus("Loading your provider profile...");
        try {
            const snapshot = await getDoc(doc(db, "providers", user.uid));
            if (!snapshot.exists()) {
                loginPanel.hidden = false;
                showStatus("No provider profile is linked to this account. Register using the provider form, or contact SkillBridge support if you had an older registration.", true);
                return;
            }
            setProfileFields(snapshot.data());
            loginPanel.hidden = true;
            profilePanel.hidden = false;
            showStatus("");
        } catch (error) {
            console.error("Dashboard profile load error:", error);
            showStatus("Unable to load your profile. Please check your connection and try again.", true);
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = clean(byId("dashboardLoginEmail")?.value);
        const password = clean(byId("dashboardPassword")?.value);
        showStatus("Signing in...");
        try {
            const credential = await signInWithEmailAndPassword(auth, email, password);
            await refreshDashboard(credential.user);
        } catch (error) {
            console.error("Dashboard sign-in error:", error);
            showStatus(error?.code === "auth/invalid-credential" || error?.code === "auth/user-not-found" ? "Email or password is incorrect." : "Unable to sign in. Please check your details and try again.", true);
        }
    });
    profileForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        const keys = ["name", "businessName", "category", "state", "location", "phone", "whatsapp", "email", "experience", "businessHours", "description"];
        const updates = Object.fromEntries(keys.map((key) => {
            const input = byId(`dashboard${key[0].toUpperCase()}${key.slice(1)}`);
            return [key, clean(input?.value)];
        }));
        if (!updates.name || !updates.category || !updates.state || !updates.location || !updates.phone || !updates.email) {
            showStatus("Complete all required fields before saving.", true);
            return;
        }
        showStatus("Saving changes...");
        try {
            await updateDoc(doc(db, "providers", user.uid), updates);
            await refreshDashboard(user);
            showStatus("Your profile has been updated.");
        } catch (error) {
            console.error("Dashboard profile save error:", error);
            showStatus("Unable to save changes. Check your Firestore rules and try again.", true);
        }
    });
    byId("dashboardLogout")?.addEventListener("click", async () => {
        try {
            await signOut(auth);
            profilePanel.hidden = true;
            loginPanel.hidden = false;
            showStatus("You are signed out.");
        } catch (error) {
            console.error("Dashboard sign-out error:", error);
            showStatus("Unable to sign out. Please try again.", true);
        }
    });
    onAuthStateChanged(auth, (user) => { refreshDashboard(user); });
}

async function getVerifiedProviders() {
    const snapshot = await getDocs(query(collection(db, "providers"), where("verified", "==", true)));
    const providers = [];
    snapshot.forEach((providerDoc) => providers.push({ id: providerDoc.id, ...providerDoc.data() }));
    return providers;
}

function displayProviders(providers) {
    const list = byId("providersList");
    if (!list) return;
    if (!providers.length) {
        list.innerHTML = '<div class="card"><h3>No providers found</h3><p>Try another category, state or search term.</p></div>';
        return;
    }
    list.innerHTML = providers.map((provider) => {
        const title = escapeHtml(provider.businessName || provider.name || "Professional");
        const category = escapeHtml(provider.category || "Service Provider");
        const place = [provider.state, provider.location].filter(Boolean).map(escapeHtml).join(", ");
        const rating = Number(provider.averageRating) || 0;
        const experience = provider.experience ? `<p>${escapeHtml(provider.experience)} years experience</p>` : "";
        return `<article class="card provider-card">
            <h3>${title}</h3><p><strong>${category}</strong></p>
            ${place ? `<p><i class="fas fa-location-dot" aria-hidden="true"></i> ${place}</p>` : ""}
            <p>⭐ ${rating}</p>${experience}
            <a href="profile.html?id=${encodeURIComponent(provider.id)}" class="search-btn" style="display:inline-flex;text-decoration:none;">View Profile</a>
        </article>`;
    }).join("");
}

async function filterProviders() {
    const search = clean(byId("providerSearch")?.value).toLowerCase();
    const category = clean(byId("providerCategory")?.value).toLowerCase();
    const state = clean(byId("providerState")?.value).toLowerCase();
    const providers = await getVerifiedProviders();
    const filtered = providers.filter((provider) => {
        const values = [provider.name, provider.businessName, provider.category, provider.state, provider.location].map((value) => clean(value).toLowerCase());
        return (!search || values.some((value) => value.includes(search))) &&
            (!category || clean(provider.category).toLowerCase() === category) &&
            (!state || clean(provider.state).toLowerCase() === state);
    });
    displayProviders(filtered);
}

async function loadProviderDirectory() {
    const list = byId("providersList");
    if (!list) return;
    list.innerHTML = '<div class="card"><p>Loading providers...</p></div>';
    const params = new URLSearchParams(window.location.search);
    if (byId("providerSearch")) byId("providerSearch").value = params.get("search") || "";
    if (byId("providerCategory")) byId("providerCategory").value = params.get("category") || "";
    if (byId("providerState")) byId("providerState").value = params.get("state") || "";
    try { await filterProviders(); }
    catch (error) {
        console.error("Error loading providers:", error);
        list.innerHTML = '<div class="card"><h3>Unable to load providers</h3><p>Please check your connection and try again.</p></div>';
    }
}

function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
}
function setActionLink(id, href, available) {
    const element = byId(id);
    if (!element) return;
    if (available) {
        element.href = href;
        element.removeAttribute("aria-disabled");
        element.classList.remove("is-disabled");
    } else {
        element.removeAttribute("href");
        element.setAttribute("aria-disabled", "true");
        element.classList.add("is-disabled");
    }
}

window.loadProviderProfile = async function () {
    const providerId = new URLSearchParams(window.location.search).get("id");
    const status = byId("profileStatus");
    if (!providerId) {
        if (status) status.textContent = "This profile link is missing a provider ID.";
        return;
    }
    if (status) status.textContent = "Loading provider profile...";
    try {
        const snapshot = await getDoc(doc(db, "providers", providerId));
        if (!snapshot.exists()) {
            if (status) status.textContent = "This provider profile could not be found.";
            return;
        }
        const provider = snapshot.data();
        if (provider.verified !== true) {
            if (status) status.textContent = "This provider profile is not available yet.";
            return;
        }
        setText("businessName", provider.businessName || provider.name || "Professional");
        setText("category", provider.category || "Service Provider");
        setText("experience", provider.experience ? `Experience: ${provider.experience} years` : "Experience not provided");
        setText("location", [provider.state, provider.location].filter(Boolean).join(", ") ? `📍 ${[provider.state, provider.location].filter(Boolean).join(", ")}` : "Location not provided");
        setText("businessHours", provider.businessHours ? `Business Hours: ${provider.businessHours}` : "Business hours not provided");
        setText("description", provider.description || "No description provided.");
        const metric = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
        const averageRating = metric(provider.averageRating);
        const totalReviews = metric(provider.totalReviews);
        const jobsCompleted = metric(provider.jobsCompleted);
        const skillScore = metric(provider.skillScore);
        setText("rating", averageRating === null ? "Not rated yet" : `⭐ ${averageRating}`);
        setText("totalReviews", totalReviews === null ? "Not available" : totalReviews);
        setText("jobsCompleted", jobsCompleted === null ? "Not available" : jobsCompleted);
        setText("skillScore", skillScore === null ? "Not available" : `🏆 SkillScore ${skillScore}`);
        const phone = clean(provider.phone);
        const wa = clean(provider.whatsapp).replace(/[^\d]/g, "");
        const email = clean(provider.email);
        setActionLink("callButton", `tel:${phone.replace(/[^\d+]/g, "")}`, phone);
        setActionLink("whatsappButton", `https://wa.me/${wa}`, wa);
        setActionLink("emailButton", `mailto:${email}`, email);
        if (status) status.textContent = "";
    } catch (error) {
        console.error("Error loading provider profile:", error);
        if (status) status.textContent = "Unable to load this profile. Please check your connection and try again.";
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const registerButton = byId("registerProviderButton");
    registerButton?.addEventListener("click", () => {
        // This legacy page uses standalone inputs instead of a <form>, so run
        // native input validation explicitly before starting Firebase signup.
        const requiredFields = ["providerName", "providerCategory", "providerState", "providerLocation", "providerPhone", "providerEmail", "providerPassword", "agreeTerms"]
            .map(byId)
            .filter(Boolean);
        const invalidField = requiredFields.find((field) => !field.checkValidity());
        if (invalidField) {
            invalidField.reportValidity();
            return;
        }
        if (registerButton.disabled) return;
        registerButton.disabled = true;
        const originalLabel = registerButton.innerHTML;
        registerButton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Submitting...';
        Promise.resolve(window.registerProvider()).finally(() => {
            registerButton.disabled = false;
            registerButton.innerHTML = originalLabel;
        });
    });
    if (byId("providersList")) loadProviderDirectory();
    if (byId("profileStatus")) window.loadProviderProfile();
    if (byId("dashboardLoginForm")) loadProviderDashboard();
    byId("providerSearch")?.addEventListener("input", () => filterProviders().catch(console.error));
    byId("providerCategory")?.addEventListener("change", () => filterProviders().catch(console.error));
    byId("providerState")?.addEventListener("change", () => filterProviders().catch(console.error));
});
