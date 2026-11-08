import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-functions.js";

const statusEl = document.getElementById("subscriptionStatus");
const buttons = [...document.querySelectorAll("[data-plan]")];
const manageButton = document.getElementById("manageSubscription");
const functions = getFunctions(undefined, "us-central1");
const startCheckout = httpsCallable(functions, "startSubscriptionCheckout");
const verifyPayment = httpsCallable(functions, "verifySubscriptionPayment");
const createManagementLink = httpsCallable(functions, "createSubscriptionManagementLink");
let currentUser = null;
let ready = false;
let autoCheckoutAttempted = false;

function status(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}
function setBusy(busy) { buttons.forEach(button => { button.disabled = busy || !ready; }); }

onAuthStateChanged(auth, async user => {
  currentUser = user;
  ready = Boolean(user);
  setBusy(false);
  if (!user) {
    status("Please sign in with your provider account before choosing a subscription.", true);
    return;
  }
  try {
    const providerSnap = await getDoc(doc(db, "providers", user.uid));
    if (!providerSnap.exists()) {
      ready = false; setBusy(false);
      status("No provider profile is linked to this account. Register as a provider or sign in with your provider account.", true);
      return;
    }
    const subscriptionSnap = await getDoc(doc(db, "subscriptions", user.uid));
    const subscription = subscriptionSnap.exists() ? subscriptionSnap.data() : null;
    if (manageButton) manageButton.hidden = !subscription?.paystackSubscriptionCode;
    if (subscription?.status === "active" && subscription.currentPeriodEnd?.toDate?.() > new Date()) {
      const renewalText = subscription.autoRenew === false ? "It will not renew automatically." : "It renews automatically until you cancel.";
      status(`Your ${subscription.planLabel || "Premium"} plan is active until ${subscription.currentPeriodEnd.toDate().toLocaleDateString()}. ${renewalText}`);
    } else {
      status("Signed in. Choose a plan to continue to secure checkout.");
    }
  } catch (error) {
    console.error(error);
    status("We couldn't load your provider/subscription details. Check your connection and try again.", true);
  }
  const reference = new URLSearchParams(location.search).get("reference");
  const params = new URLSearchParams(location.search);
  if (reference) await confirmReturn(reference);
  else if (params.get("autostart") === "1" && params.get("consent") === "1" && ["monthly", "quarterly", "yearly"].includes(params.get("plan")) && !autoCheckoutAttempted) {
    autoCheckoutAttempted = true;
    await beginCheckout(params.get("plan"), true);
  }
});

async function beginCheckout(planId, priorConsent = false) {
  const consentAccepted = priorConsent || document.getElementById("agreeAutoRenew")?.checked === true;
  if (!consentAccepted) {
    status("Please confirm automatic renewal before continuing to Paystack.", true);
    document.getElementById("agreeAutoRenew")?.focus();
    return;
  }
  if (!currentUser) {
    status("Please sign in first. Redirecting to provider login…", true);
    location.href = `provider-login.html?next=${encodeURIComponent(`subscription.html?plan=${planId}&autostart=1&consent=1`)}`;
    return;
  }
  if (!ready) { status("Your provider profile could not be confirmed. Please check your account and try again.", true); return; }
  setBusy(true); status("Starting secure Paystack checkout…");
  try {
    const result = await startCheckout({ planId, recurringConsent: true });
    if (!result.data?.authorizationUrl) throw new Error("Checkout link was not returned. Please try again.");
    location.href = result.data.authorizationUrl;
  } catch (error) {
    console.error(error);
    status(error?.message || "Unable to start payment. Please try again later.", true);
    setBusy(false);
  }
}

async function openSubscriptionManagement() {
  if (!currentUser) return;
  manageButton.disabled = true;
  status("Opening Paystack subscription management…");
  try {
    const result = await createManagementLink({});
    if (!result.data?.url) throw new Error("Paystack did not return a management link.");
    location.href = result.data.url;
  } catch (error) {
    console.error(error);
    status(error?.message || "Could not open subscription management. Please try again.", true);
  } finally {
    manageButton.disabled = false;
  }
}

async function confirmReturn(reference) {
  if (!currentUser) return;
  status("Verifying your payment securely. Please wait…");
  setBusy(true);
  try {
    const result = await verifyPayment({ reference });
    status(result.data?.activeUntil ? `Payment confirmed. Premium access is active until ${new Date(result.data.activeUntil).toLocaleDateString()}.` : "Payment verified. Your subscription status has been updated.");
    const refreshedSubscription = await getDoc(doc(db, "subscriptions", currentUser.uid));
    if (manageButton) manageButton.hidden = !refreshedSubscription.data()?.paystackSubscriptionCode;
    history.replaceState({}, "", location.pathname);
  } catch (error) {
    console.error(error);
    status(error?.message || "We couldn't verify this payment yet. If you were charged, wait a moment and refresh this page.", true);
  } finally { setBusy(false); }
}

buttons.forEach(button => button.addEventListener("click", () => beginCheckout(button.dataset.plan)));
manageButton?.addEventListener("click", openSubscriptionManagement);
