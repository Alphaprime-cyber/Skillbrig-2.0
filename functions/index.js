const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");
const SITE_BASE_URL = require("firebase-functions/params").defineString("SITE_BASE_URL", { default: "https://alphaprime-cyber.github.io/Skillbrig-2.0" });
const PAYSTACK_PLAN_CODES = {
  monthly: require("firebase-functions/params").defineString("PAYSTACK_PLAN_MONTHLY_CODE"),
  quarterly: require("firebase-functions/params").defineString("PAYSTACK_PLAN_QUARTERLY_CODE"),
  yearly: require("firebase-functions/params").defineString("PAYSTACK_PLAN_YEARLY_CODE")
};
const PLANS = {
  monthly: { amount: 150000, months: 1, label: "Monthly" },
  quarterly: { amount: 350000, months: 3, label: "3 Months" },
  yearly: { amount: 1000000, months: 12, label: "Yearly" }
};

function planIdForCode(code) {
  return Object.entries(PAYSTACK_PLAN_CODES).find(([, parameter]) => parameter.value() === code)?.[0] || null;
}

function addBillingPeriod(baseDate, planId) {
  const result = new Date(baseDate);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + PLANS[planId].months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function nextPeriodEnd(data, currentEnd, planId) {
  const paystackNextDate = data?.subscription?.next_payment_date;
  const parsedNextDate = paystackNextDate ? new Date(paystackNextDate) : null;
  if (parsedNextDate && Number.isFinite(parsedNextDate.getTime())) return admin.firestore.Timestamp.fromDate(parsedNextDate);
  const paidPeriodEnd = data?.period_end ? new Date(data.period_end) : null;
  if (paidPeriodEnd && Number.isFinite(paidPeriodEnd.getTime()) && paidPeriodEnd.getTime() > Date.now()) {
    return admin.firestore.Timestamp.fromDate(paidPeriodEnd);
  }
  const base = currentEnd && currentEnd.toMillis() > Date.now() ? currentEnd.toDate() : new Date();
  return admin.firestore.Timestamp.fromDate(addBillingPeriod(base, planId));
}

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
  if (request.data?.recurringConsent !== true) throw new HttpsError("failed-precondition", "Confirm automatic renewal before starting checkout.");
  const providerRef = db.collection("providers").doc(uid);
  const providerSnap = await providerRef.get();
  if (!providerSnap.exists) throw new HttpsError("failed-precondition", "No provider profile is linked to this account.");
  const existingSubscription = await db.collection("subscriptions").doc(uid).get();
  if (existingSubscription.exists) {
    const existing = existingSubscription.data();
    const paidThrough = existing.currentPeriodEnd?.toMillis?.() > Date.now();
    const remoteStillRenewing = Boolean(existing.paystackSubscriptionCode) && existing.autoRenew !== false && !["cancelled", "completed", "expired"].includes(existing.paystackStatus);
    if (paidThrough || remoteStillRenewing) {
      throw new HttpsError("failed-precondition", "Your current paid period or Paystack plan is still active. Manage or cancel it, then wait until the paid period ends before starting another plan.");
    }
  }
  const email = request.auth.token.email;
  if (!email) throw new HttpsError("failed-precondition", "Your account needs an email address to pay.");
  const planCode = PAYSTACK_PLAN_CODES[planId].value();
  if (!planCode || !/^PLN_[A-Za-z0-9]+$/.test(planCode)) throw new HttpsError("failed-precondition", "The selected recurring plan is not configured yet.");
  const reference = `SB-${uid.slice(0, 8)}-${crypto.randomUUID()}`;
  const baseUrl = SITE_BASE_URL.value().replace(/\/$/, "");
  const callbackUrl = `${baseUrl}/subscription.html`;
  await db.collection("subscriptionPayments").doc(reference).create({ uid, email, planId, planCode, amount: plan.amount, currency: "NGN", recurringConsent: true, consentVersion: "auto-renew-v1", consentedAt: admin.firestore.FieldValue.serverTimestamp(), status: "initialized", reference, createdAt: admin.firestore.FieldValue.serverTimestamp() });
  try {
    const result = await paystackRequest("/transaction/initialize", { method: "POST", body: JSON.stringify({ email, amount: plan.amount, plan: planCode, currency: "NGN", channels: ["card"], reference, callback_url: callbackUrl, metadata: { uid, planId, planLabel: plan.label, custom_fields: [{ display_name: "Provider UID", variable_name: "provider_uid", value: uid }] } }) });
    return { authorizationUrl: result.authorization_url, reference };
  } catch (error) {
    await db.collection("subscriptionPayments").doc(reference).update({ status: "initialization_failed", error: String(error.message || error) });
    throw new HttpsError("internal", "Could not initialize payment. Check Paystack configuration and try again.");
  }
});

async function activateVerifiedPayment(reference, transaction, webhookData = {}) {
  if (transaction.status !== "success" || transaction.currency !== "NGN") throw new Error("Payment is not successful in NGN.");
  const paymentRef = db.collection("subscriptionPayments").doc(reference);
  return db.runTransaction(async tx => {
    const paymentSnap = await tx.get(paymentRef);
    if (!paymentSnap.exists) throw new Error("Unknown payment reference.");
    const payment = paymentSnap.data();
    const subscriptionRef = db.collection("subscriptions").doc(payment.uid);
    if (payment.status === "success") {
      const existing = await tx.get(subscriptionRef);
      if (webhookData?.subscription?.subscription_code && existing.exists) {
        tx.set(subscriptionRef, {
          paystackSubscriptionCode: webhookData.subscription.subscription_code,
          paystackPlanCode: payment.planCode,
          autoRenew: true,
          nextPaymentAt: webhookData.subscription.next_payment_date ? admin.firestore.Timestamp.fromDate(new Date(webhookData.subscription.next_payment_date)) : null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
      return existing.exists ? existing.data().currentPeriodEnd?.toDate?.().toISOString() : null;
    }
    if (payment.status !== "initialized" || payment.amount !== transaction.amount || payment.currency !== transaction.currency || transaction.reference !== reference) throw new Error("Payment details do not match the expected transaction.");
    if (transaction.metadata?.uid !== payment.uid || transaction.metadata?.planId !== payment.planId) throw new Error("Payment metadata mismatch.");
    const plan = PLANS[payment.planId];
    if (!plan || transaction.amount !== plan.amount) throw new Error("Unexpected payment amount.");
    if (payment.planCode && planIdForCode(payment.planCode) !== payment.planId) throw new Error("Configured recurring plan does not match the selected plan.");
    const eventPlanCode = transaction.plan?.plan_code || transaction.plan_code;
    if (eventPlanCode && payment.planCode && eventPlanCode !== payment.planCode) throw new Error("Paystack plan does not match the selected plan.");
    const subscriptionSnap = await tx.get(subscriptionRef);
    const now = admin.firestore.Timestamp.now();
    const oldEnd = subscriptionSnap.exists ? subscriptionSnap.data().currentPeriodEnd : null;
    const startMillis = oldEnd && oldEnd.toMillis() > now.toMillis() ? oldEnd.toMillis() : now.toMillis();
    const end = nextPeriodEnd(webhookData, admin.firestore.Timestamp.fromMillis(startMillis), payment.planId);
    tx.set(subscriptionRef, { uid: payment.uid, planId: payment.planId, planLabel: plan.label, status: "active", autoRenew: true, paystackPlanCode: payment.planCode || null, paystackSubscriptionCode: webhookData?.subscription?.subscription_code || subscriptionSnap.data()?.paystackSubscriptionCode || null, nextPaymentAt: webhookData?.subscription?.next_payment_date ? admin.firestore.Timestamp.fromDate(new Date(webhookData.subscription.next_payment_date)) : end, currentPeriodStart: admin.firestore.Timestamp.fromMillis(startMillis), currentPeriodEnd: end, lastPaymentReference: reference, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    tx.update(paymentRef, { status: "success", verifiedAmount: transaction.amount, verifiedAt: admin.firestore.FieldValue.serverTimestamp(), paystackTransactionId: transaction.id });
    return end.toDate().toISOString();
  });
}

async function findSubscriptionForWebhook(data) {
  const code = data?.subscription?.subscription_code || data?.subscription_code;
  if (code) {
    const byCode = await db.collection("subscriptions").where("paystackSubscriptionCode", "==", code).limit(1).get();
    if (!byCode.empty) return byCode.docs[0];
  }
  const subscriptionId = data?.subscription?.id || data?.subscription;
  if (subscriptionId && typeof subscriptionId === "number") {
    const byId = await db.collection("subscriptions").where("paystackSubscriptionId", "==", subscriptionId).limit(1).get();
    if (!byId.empty) return byId.docs[0];
  }
  const email = data?.customer?.email;
  if (!email) return null;
  const providerMatches = await db.collection("providers").where("email", "==", email).limit(2).get();
  if (providerMatches.size !== 1) return null;
  const subscriptionSnap = await db.collection("subscriptions").doc(providerMatches.docs[0].id).get();
  if (!subscriptionSnap.exists) return null;
  const eventPlanCode = data?.plan?.plan_code || data?.subscription?.plan?.plan_code;
  if (eventPlanCode && subscriptionSnap.data().paystackPlanCode && eventPlanCode !== subscriptionSnap.data().paystackPlanCode) return null;
  return subscriptionSnap;
}

async function registerPaystackSubscription(data) {
  const subscriptionCode = data?.subscription_code;
  const email = data?.customer?.email;
  const planCode = data?.plan?.plan_code;
  const planId = planIdForCode(planCode);
  if (!subscriptionCode || !email || !planId) throw new Error("Subscription event is missing the customer, plan, or subscription code.");
  const providers = await db.collection("providers").where("email", "==", email).limit(2).get();
  if (providers.size !== 1) throw new Error("Could not match the Paystack subscriber to one provider account.");
  const providerId = providers.docs[0].id;
  const subscriptionRef = db.collection("subscriptions").doc(providerId);
  const currentSnap = await subscriptionRef.get();
  const current = currentSnap.exists ? currentSnap.data() : {};
  await subscriptionRef.set({
    uid: providerId,
    planId,
    planLabel: PLANS[planId].label,
    paystackSubscriptionCode: subscriptionCode,
    paystackSubscriptionId: data.id || null,
    paystackPlanCode: planCode,
    autoRenew: data.status !== "cancelled" && data.status !== "complete",
    paystackStatus: data.status || "active",
    nextPaymentAt: data.next_payment_date ? admin.firestore.Timestamp.fromDate(new Date(data.next_payment_date)) : current.nextPaymentAt || null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function activateRecurringCharge(reference, transaction, eventData) {
  if (transaction.status !== "success" || transaction.currency !== "NGN" || transaction.reference !== reference) throw new Error("Recurring charge verification failed.");
  const subscriptionSnap = await findSubscriptionForWebhook(eventData);
  if (!subscriptionSnap) throw new Error("Could not match the recurring charge to a provider subscription.");
  const subscription = subscriptionSnap.data();
  const plan = PLANS[subscription.planId];
  if (!plan || transaction.amount !== plan.amount) throw new Error("Recurring charge amount does not match the provider plan.");
  const eventPlanCode = eventData?.plan?.plan_code || eventData?.subscription?.plan?.plan_code;
  if (eventPlanCode && subscription.paystackPlanCode && eventPlanCode !== subscription.paystackPlanCode) throw new Error("Recurring charge plan does not match the active subscription.");
  const paymentRef = db.collection("subscriptionPayments").doc(reference);
  const currentSubRef = db.collection("subscriptions").doc(subscriptionSnap.id);
  await db.runTransaction(async tx => {
    const [payment, current] = await Promise.all([tx.get(paymentRef), tx.get(currentSubRef)]);
    if (!current.exists) throw new Error("Provider subscription no longer exists.");
    if (payment.exists && payment.data().status === "success") return;
    const latest = current.data();
    const now = admin.firestore.Timestamp.now();
    const currentEnd = latest.currentPeriodEnd;
    const start = currentEnd && currentEnd.toMillis() > now.toMillis() ? currentEnd : now;
    const end = nextPeriodEnd(eventData, start, latest.planId);
    tx.set(paymentRef, { uid: current.id, email: transaction.customer?.email || null, planId: latest.planId, planCode: latest.paystackPlanCode, amount: transaction.amount, currency: transaction.currency, status: "success", source: "recurring_renewal", reference, paystackTransactionId: transaction.id, verifiedAt: admin.firestore.FieldValue.serverTimestamp(), createdAt: payment.exists ? payment.data().createdAt : admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    tx.set(currentSubRef, { status: "active", autoRenew: true, paystackStatus: "active", currentPeriodStart: start, currentPeriodEnd: end, nextPaymentAt: eventData?.subscription?.next_payment_date ? admin.firestore.Timestamp.fromDate(new Date(eventData.subscription.next_payment_date)) : end, lastPaymentReference: reference, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  });
}

async function updateWebhookSubscriptionStatus(data, status) {
  const subscriptionSnap = await findSubscriptionForWebhook(data);
  if (!subscriptionSnap) return false;
  const current = subscriptionSnap.data();
  const end = current.currentPeriodEnd;
  const stillPaid = end?.toMillis?.() > Date.now();
  await subscriptionSnap.ref.set({
    status: stillPaid ? "active" : (status === "complete" ? "expired" : "cancelled"),
    autoRenew: false,
    paystackStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return true;
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

exports.createSubscriptionManagementLink = onCall({ secrets: [PAYSTACK_SECRET_KEY], cors: true }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before managing your subscription.");
  const subscriptionSnap = await db.collection("subscriptions").doc(request.auth.uid).get();
  const code = subscriptionSnap.data()?.paystackSubscriptionCode;
  if (!subscriptionSnap.exists || !code) throw new HttpsError("failed-precondition", "The recurring subscription is not ready to manage yet. Refresh in a moment or contact support.");
  try {
    const result = await paystackRequest(`/subscription/${encodeURIComponent(code)}/manage/link`);
    return { url: result.link };
  } catch (error) {
    console.error("Subscription management link failed", error);
    throw new HttpsError("internal", "Could not open subscription management. Please try again.");
  }
});

exports.paystackSubscriptionWebhook = onRequest({ secrets: [PAYSTACK_SECRET_KEY], cors: false }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.rawBody;
  const expected = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY.value()).update(rawBody).digest("hex");
  if (!signature || Buffer.byteLength(signature) !== Buffer.byteLength(expected) || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).send("Invalid signature");
  const event = req.body;
  try {
    if (event?.event === "charge.success" && event?.data?.reference) {
      const reference = String(event.data.reference);
      const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
      const paymentSnap = await db.collection("subscriptionPayments").doc(reference).get();
      if (paymentSnap.exists) await activateVerifiedPayment(reference, transaction, event.data);
      else await activateRecurringCharge(reference, transaction, event.data);
      return res.status(200).send("OK");
    }
    if (event?.event === "subscription.create") {
      await registerPaystackSubscription(event.data);
      return res.status(200).send("OK");
    }
    if (event?.event === "invoice.update" && event.data?.paid && event.data?.transaction?.reference) {
      const reference = String(event.data.transaction.reference);
      const paymentSnap = await db.collection("subscriptionPayments").doc(reference).get();
      if (!paymentSnap.exists || paymentSnap.data().status !== "success") {
        const transaction = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
        await activateRecurringCharge(reference, transaction, event.data);
      }
      return res.status(200).send("OK");
    }
    if (event?.event === "invoice.payment_failed") {
      const subscriptionSnap = await findSubscriptionForWebhook(event.data);
      if (subscriptionSnap) await subscriptionSnap.ref.set({ renewalStatus: "payment_failed", lastInvoiceFailedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.status(200).send("OK");
    }
    if (event?.event === "subscription.not_renew") {
      if (!(await updateWebhookSubscriptionStatus(event.data, "non-renewing"))) throw new Error("Could not match Paystack cancellation to a provider account.");
      return res.status(200).send("OK");
    }
    if (event?.event === "subscription.disable") {
      if (!(await updateWebhookSubscriptionStatus(event.data, event.data?.status || "cancelled"))) throw new Error("Could not match disabled Paystack subscription to a provider account.");
      return res.status(200).send("OK");
    }
    return res.status(200).send("Ignored");
  } catch (error) {
    console.error("Paystack webhook processing failed", error);
    return res.status(500).send("Could not process event");
  }
});
