
import { db } from "./firebase.js";
import { auth } from "./firebase.js";

import {
collection,
getDocs,
query,
where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {

if (!user) {

window.location = "login.html";
return;

}

const email = user.email;

// Load Bookings
const bookings = await getDocs(
query(collection(db,"bookings"),
where("customerEmail","==",email))
);

// Load Quotes
const quotes = await getDocs(
query(collection(db,"quotes"),
where("customerEmail","==",email))
);

// Load Reviews
const reviews = await getDocs(
query(collection(db,"reviews"),
where("customerEmail","==",email))
);

document.getElementById("bookingCount").textContent = bookings.size;
document.getElementById("quoteCount").textContent = quotes.size;
document.getElementById("reviewCount").textContent = reviews.size;

document.getElementById("activityList").innerHTML = `
<p>📅 Bookings: ${bookings.size}</p>
<p>📩 Quotes: ${quotes.size}</p>
<p>⭐ Reviews: ${reviews.size}</p>
`;

});