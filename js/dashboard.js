import { db } from "./firebase.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// =====================================
// LOAD PROVIDER DASHBOARD
// =====================================

window.loadDashboard = async function (providerId) {

    try {

        // Load Quotes
        const quotesQuery = query(
            collection(db, "quoteRequests"),
            where("providerId", "==", providerId)
        );

        const quotesSnapshot = await getDocs(quotesQuery);

        const totalQuotes = quotesSnapshot.size;

        // Load Reviews
        const reviewsQuery = query(
            collection(db, "reviews"),
            where("providerId", "==", providerId)
        );

        const reviewsSnapshot = await getDocs(reviewsQuery);

        const totalReviews = reviewsSnapshot.size;

        let totalRating = 0;

        reviewsSnapshot.forEach((doc) => {

            totalRating += Number(doc.data().rating);

        });

        const averageRating =
            totalReviews > 0
                ? (totalRating / totalReviews).toFixed(1)
                : 0;

        // SkillScore
        let skillScore = 50;

        skillScore += totalReviews * 2;
        skillScore += Number(averageRating) * 5;

        if (skillScore > 100) {

            skillScore = 100;

        }

        // Display

        document.getElementById("totalRequests").innerHTML = totalQuotes;

        document.getElementById("totalReviews").innerHTML = totalReviews;

        document.getElementById("averageRating").innerHTML = averageRating;

        document.getElementById("skillScore").innerHTML = skillScore;

    }

    catch (error) {

        console.error(error);

    }

};