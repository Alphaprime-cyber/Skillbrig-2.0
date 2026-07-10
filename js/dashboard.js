import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

async function loadDashboard() {

    try {

        // Total Providers
        const providersSnapshot = await getDocs(collection(db, "providers"));
        document.getElementById("totalProviders").textContent =
            providersSnapshot.size;

        // Pending Providers
        const pendingQuery = query(
            collection(db, "providers"),
            where("verified", "==", false)
        );

        const pendingSnapshot = await getDocs(pendingQuery);

        document.getElementById("pendingProviders").textContent =
            pendingSnapshot.size;

        // Total Reviews
        const reviewsSnapshot = await getDocs(collection(db, "reviews"));

        document.getElementById("totalCustomers").textContent =
            reviewsSnapshot.size;

        // Total Quote Requests
        const quotesSnapshot = await getDocs(collection(db, "quotes"));

        document.getElementById("totalQuotes").textContent =
            quotesSnapshot.size;

    } catch (error) {

        console.error(error);

    }

}

loadDashboard();