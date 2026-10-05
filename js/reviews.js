import { auth, db } from "./firebase.js";
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const byId = (id) => document.getElementById(id);
const providerId = new URLSearchParams(window.location.search).get("id");
const authForm = byId("reviewAuthForm");
const reviewForm = byId("reviewForm");
const note = byId("reviewNotice");

function setNotice(message, isError = false) {
    if (!note) return;
    note.textContent = message;
    note.classList.toggle("error", isError);
}

function formatDate(value) {
    const date = value?.toDate?.();
    return date && Number.isFinite(date.getTime())
        ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date)
        : "Recently";
}

function renderReview(review) {
    const article = document.createElement("article");
    article.className = "review-item";
    const heading = document.createElement("h3");
    heading.textContent = review.displayName || "SkillBridge customer";
    const stars = document.createElement("div");
    stars.className = "review-stars";
    stars.setAttribute("aria-label", `${review.rating} out of 5 stars`);
    stars.textContent = `${"★".repeat(review.rating)}${"☆".repeat(5 - review.rating)}`;
    const date = document.createElement("div");
    date.className = "review-date";
    date.textContent = formatDate(review.createdAt);
    const comment = document.createElement("p");
    comment.textContent = review.comment;
    article.append(heading, stars, date, comment);
    return article;
}

async function loadReviews() {
    const list = byId("reviewsList");
    const summary = byId("reviewSummary");
    if (!providerId || !list) return;
    list.replaceChildren();
    try {
        const providerSnap = await getDoc(doc(db, "providers", providerId));
        if (!providerSnap.exists() || providerSnap.data().verified !== true) {
            if (summary) summary.textContent = "Reviews are unavailable for this profile.";
            return;
        }
        const provider = providerSnap.data();
        const reviewQuery = query(collection(db, "providers", providerId, "reviews"), orderBy("createdAt", "desc"), limit(50));
        const reviewSnaps = await getDocs(reviewQuery);
        reviewSnaps.forEach((reviewSnap) => list.append(renderReview(reviewSnap.data())));
        const count = Number(provider.totalReviews) || 0;
        const average = Number(provider.averageRating) || 0;
        if (summary) summary.textContent = count
            ? `${average.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`
            : "No reviews yet. Be the first to share your experience.";
        if (!reviewSnaps.size) {
            const empty = document.createElement("p");
            empty.textContent = "No written reviews yet.";
            list.append(empty);
        }
    } catch (error) {
        console.error("Unable to load provider reviews:", error);
        if (summary) summary.textContent = "Unable to load reviews right now. Please try again later.";
    }
}

async function refreshReviewControls(user) {
    const signOutButton = byId("reviewSignOut");
    if (authForm) authForm.hidden = Boolean(user);
    if (signOutButton) signOutButton.hidden = !user;
    if (!reviewForm || !user || !providerId) {
        if (reviewForm) reviewForm.hidden = true;
        return;
    }
    if (user.uid === providerId) {
        reviewForm.hidden = true;
        setNotice("You cannot review your own provider profile.");
        return;
    }
    try {
        const existing = await getDoc(doc(db, "providers", providerId, "reviews", user.uid));
        reviewForm.hidden = existing.exists();
        setNotice(existing.exists() ? "You have already reviewed this provider." : "Signed in. You can submit one review for this provider.");
    } catch (error) {
        reviewForm.hidden = true;
        setNotice("Unable to check your review status. Please try again.", true);
        console.error("Unable to check existing review:", error);
    }
}

authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setNotice("Signing in...");
    try {
        await signInWithEmailAndPassword(auth, byId("reviewEmail").value.trim(), byId("reviewPassword").value);
        setNotice("Signed in successfully.");
    } catch (error) {
        console.error("Review sign-in failed:", error);
        setNotice(error?.code === "auth/invalid-credential" ? "Email or password is incorrect." : "Unable to sign in. Please check your details.", true);
    }
});

byId("createCustomerAccount")?.addEventListener("click", async () => {
    const nameWrap = byId("reviewNameWrap");
    const nameInput = byId("reviewName");
    if (nameWrap) nameWrap.hidden = false;
    if (nameInput) nameInput.required = true;
    const name = nameInput?.value.trim() || "";
    const email = byId("reviewEmail")?.value.trim() || "";
    const password = byId("reviewPassword")?.value || "";
    if (!name || !email || password.length < 8) {
        setNotice("Enter your name and email, and choose a password with at least 8 characters.", true);
        nameInput?.focus();
        return;
    }
    setNotice("Creating your customer account...");
    try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        setNotice("Account created. You can now submit your review.");
    } catch (error) {
        console.error("Customer account creation failed:", error);
        const message = error?.code === "auth/email-already-in-use"
            ? "An account already uses that email. Sign in instead."
            : "Unable to create the account. Check your details and try again.";
        setNotice(message, true);
    }
});

reviewForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const user = auth.currentUser;
    const rating = Number(new FormData(reviewForm).get("reviewRating"));
    const comment = byId("reviewComment")?.value.trim() || "";
    if (!user) return setNotice("Sign in before submitting a review.", true);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return setNotice("Choose a rating from 1 to 5 stars.", true);
    if (!comment || comment.length > 2000) return setNotice("Write a review of up to 2,000 characters.", true);
    const displayName = (user.displayName || user.email?.split("@")[0] || "SkillBridge customer").slice(0, 80);
    setNotice("Submitting your review...");
    try {
        await setDoc(doc(db, "providers", providerId, "reviews", user.uid), {
            uid: user.uid,
            displayName,
            rating,
            comment,
            createdAt: serverTimestamp()
        });
        reviewForm.reset();
        reviewForm.hidden = true;
        setNotice("Thank you. Your review has been submitted.");
        await loadReviews();
    } catch (error) {
        console.error("Review submission failed:", error);
        setNotice(error?.code === "permission-denied"
            ? "Your review could not be accepted. Make sure Firestore rules and the rating function are installed."
            : "Unable to submit your review. Please try again.", true);
    }
});

byId("reviewSignOut")?.addEventListener("click", async () => {
    try {
        await signOut(auth);
        setNotice("You are signed out.");
    } catch (error) {
        console.error("Review sign-out failed:", error);
        setNotice("Unable to sign out. Please try again.", true);
    }
});

onAuthStateChanged(auth, refreshReviewControls);
loadReviews();
