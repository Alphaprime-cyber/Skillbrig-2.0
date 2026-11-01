import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
const message = document.getElementById("message");
const subscriptionsBody = document.getElementById("subscriptions");
const paymentsBody = document.getElementById("payments");
function cell(row, value) { const td = document.createElement("td"); td.textContent = value ?? "—"; row.appendChild(td); return td; }
function dateText(value) { return value?.toDate ? value.toDate().toLocaleString() : "—"; }
onAuthStateChanged(auth, async user => {
  if (!user) { location.href = "../admin-login.html"; return; }
  try {
    const adminSnap = await getDoc(doc(db, "admins", user.uid));
    if (!adminSnap.exists() || adminSnap.data().enabled !== true) { message.textContent = "Access denied: this account is not an enabled admin."; message.className = "danger"; return; }
    message.textContent = "Admin access confirmed.";
    const [subscriptionsSnap, paymentsSnap] = await Promise.all([
      getDocs(query(collection(db, "subscriptions"), orderBy("updatedAt", "desc"), limit(200))),
      getDocs(query(collection(db, "subscriptionPayments"), orderBy("createdAt", "desc"), limit(200)))
    ]);
    subscriptionsBody.replaceChildren();
    if (subscriptionsSnap.empty) { const row = subscriptionsBody.insertRow(); const td = row.insertCell(); td.colSpan = 5; td.textContent = "No subscriptions yet."; }
    subscriptionsSnap.forEach(item => { const data = item.data(); const row = subscriptionsBody.insertRow(); cell(row, data.uid || item.id); cell(row, data.planLabel || data.planId); const statusCell = cell(row, data.status); if (data.status === "active") statusCell.innerHTML = '<span class="pill">active</span>'; cell(row, dateText(data.currentPeriodEnd)); cell(row, data.lastPaymentReference); });
    paymentsBody.replaceChildren();
    if (paymentsSnap.empty) { const row = paymentsBody.insertRow(); const td = row.insertCell(); td.colSpan = 6; td.textContent = "No payment attempts yet."; }
    paymentsSnap.forEach(item => { const data = item.data(); const row = paymentsBody.insertRow(); cell(row, data.reference || item.id); cell(row, data.uid); cell(row, data.planId); cell(row, typeof data.amount === "number" ? `₦${(data.amount/100).toLocaleString()}` : "—"); cell(row, data.status); cell(row, dateText(data.createdAt)); });
  } catch (error) { console.error(error); message.textContent = "Unable to load subscription records. Confirm Firestore rules are deployed and this admin is enabled."; message.className = "danger"; }
});
