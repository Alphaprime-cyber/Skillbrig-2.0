import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const byId = (id) => document.getElementById(id);
const loginUrl = "auth.html?mode=login";

window.addEventListener("customer-logout", async () => {
  try {
    await signOut(auth);
    window.location.assign(loginUrl);
  } catch (error) {
    byId("customerDashboardStatus").textContent = error.message || "Could not sign out. Please try again.";
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace(loginUrl);
    return;
  }

  byId("customerName").textContent = user.displayName || "Customer";
  byId("customerEmail").textContent = user.email || "";

  try {
    const [bookings, quotes] = await Promise.all([
      getDocs(query(collection(db, "bookings"), where("customerUid", "==", user.uid))),
      getDocs(query(collection(db, "quoteRequests"), where("customerUid", "==", user.uid))),
    ]);

    byId("bookingCount").textContent = bookings.size;
    byId("quoteCount").textContent = quotes.size;
    byId("reviewCount").textContent = "—";
    byId("activityList").innerHTML = `<p>Bookings: ${bookings.size}</p><p>Quote requests: ${quotes.size}</p>`;
  } catch (error) {
    byId("activityList").textContent = "Your account is signed in, but activity could not be loaded.";
    byId("customerDashboardStatus").textContent = error.message || "Please check your connection and try again.";
  }
});
