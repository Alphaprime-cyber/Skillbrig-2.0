const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");
const SITE_BASE_URL = require("firebase-functions/params").defineString("SITE_BASE_URL", { default: "https://alphaprime-cyber.github.io/Skillbrig-2.0" });
const PLANS = {
  monthly: { amount: 150000, days: 30, label: "Monthly" },
  quarterly: { amount: 350000, days: 90, label: "3 Months" },
  yearly: { amount: 1000000, days: 365, label: "Yearly" }
};

async function paystackRequest(path, options = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}`, "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok || !data.status) throw new Error(data.message || "Paystack request failed");
  return data.data;
}

exports.startSubscriptionCheckout = onCall({ secrets: [PAYSTACK_SECRET_KEY], cors: true }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in with your provider account first.");
  const uid = request.auth.uid;
  const planId = request.data?.planId;
  const plan = PLANS[planId];
  if (!plan) throw new HttpsError("invalid-argument", "Choose a valid subscription plan.");
  const providerRef = db.collection("providers").doc(uid);
  const providerSnap = await providerRef.get();
  if (!providerSnap.exists) throw new HttpsError("failed-precondition", "No provider profile is linked to this account.");
  const email = request.auth.token.email;
  if (!email) throw new HttpsError("failed-precondition", "Your account needs an email address to pay.");
  const reference = `SB-${uid.slice(0, 8)}-${crypto.randomUUID()}`;
  const baseUrl = SITE_BASE_URL.value().replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/subscription.html`;
  await db.collection("subscriptionPayments").doc(reference).create({ uid, planId, amount: plan.amount, currency: "NGN", status: "initialized", reference, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  try {
    const result = await paystackRequest("/transaction/initialize", { method: "POST", body: JSON.stringify({ email, amount: plan.amount, currency: "NGN", reference, callback_url: callbackUrl, metadata: { uid, planId, planLabel: plan.label, custom_fields: [{ display_name: "Provider UID", variable_name: "provider_uid", value: uid }] } }) });
    return { authorizationUrl: result.authorization_url, reference };
  } catch (error) {
    await db.collection("subscriptionPayments").doc(reference).update({ status: "initialization_failed", error: String(error.message || error) });
    throw new HttpsError("internal", "Could not initialize payment. Check Paystack configuration and try again.");
  }
});

async function activateVerifiedPayment(reference, transaction) {
  if (transaction.status !== "success" || transaction.currency !== "NGN") throw new Error("Payment is not successful in NGN.");
  const paymentRef = db.collection("subscriptionPayments").doc(reference);
  return db.runTransaction(async tx => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) throw new Error("Unknown payment reference.");
    const payment = paymentSnap.data();
    if (payment.status === "success") {
      const existing = await tx.get(db.collection("subscriptions").doc(payment.uid));
      return existing.exists ? existing.data().currentPeriodEnd?.toDate?.().toISOString() : null;
    }
    if (payment.status !== "initialized" || payment.amount !== transaction.amount || payment.currency !== transaction.currency || transaction.reference !== reference) throw new Error("Payment details do not match the expected transaction.");
    if (transaction.metadata?.uid !== payment.uid || transaction.metadata?.planId !== payment.planId) throw new Error("Payment metadata mismatch.");
    const plan = PLANS[payment.planId];
    if (!plan || transaction.amount !== plan.amount) throw new Error("Unexpected payment amount.");
    const subscriptionRef = db.collection("subscriptions").doc(payment.uid);
    const subscriptionSnap = await tx.get(subscriptionRef);
    const now = admin.firestore.Timestamp.now();
    const oldEnd = subscriptionSnap.exists ? subscriptionSnap.data().currentPeriodEnd : null;
    const startMillis = oldEnd && oldEnd.toMillis() > now.toMillis() ? oldEnd.toMillis() : now.toMillis();
    const end = admin.firestore.Timestamp.fromMillis(startMillis + plan.days * 24 * 60 * 60 * 1000);
    tx.set(subscriptionRef, { uid: payment.uid, planId: payment.planId, planLabel: plan.label, status: "active", currentPeriodStart: admin.firestore.Timestamp.fromMillis(startMillis), currentPeriodEnd: end, lastPaymentReference: reference, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    tx.update(paymentRef, { status: "success", verifiedAmount: transaction.amount, verifiedAt: admin.firestore.FieldValue.serverTimestamp(), paystackTransactionId: transaction.id });
    return end.toDate().toISOString();
  });
}

exports.verifySubscriptionPayment = onCall({ secrets: [PAYSTACK_SECRET_KEY], cors: true }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before verifying payment.");
  const reference = String(request.data?.reference || "");
  if (!/^SB-[A-Za-z0-9-]{10,100}$/.test(reference)) throw new HttpsError("invalid-argument", "Invalid payment reference.");
  const paymentSnap = await db.collection("subscriptionPayments").doc(reference).get();
  if (!paymentSnap.exists || paymentSnap.data().uid !== request.auth.uid) throw new HttpsError("permission-denied", "This payment reference does not belong to your account.");
  try {
    const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    const activeUntil = await activateVerifiedPayment(reference, transaction);
    return { verified: true, activeUntil };
  } catch (error) {
    console.error("Subscription verification failed", error);
    throw new HttpsError("failed-precondition", error.message || "Payment has not been verified.");
  }
});

exports.paystackSubscriptionWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY], cors: false }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.rawBody;
  const expected = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY.value()).update(rawBody).digest("hex");
  if (!signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).send("Invalid signature");
  const event = req.body;
  if (event?.event !== "charge.success" || !event?.data?.reference) return res.status(200).send("Ignored");
  try {
    const reference = String(event.data.reference);
    const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
    await activateVerifiedPayment(reference, transaction);
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Paystack webhook processing failed", error);
    return res.status(500).send("Could not process event");
  }
});
