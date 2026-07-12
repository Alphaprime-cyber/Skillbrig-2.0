import { auth, db } from "./firebase.js";

import { onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
collection,
query,
where,
getDocs
}
from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {

if (!user) {

window.location = "../login.html";
return;

}

const q = query(
collection(db, "quoteRequests"),
where("customerEmail", "==", user.email)
);

const snapshot = await getDocs(q);

let html = "";

snapshot.forEach((doc) => {

const quote = doc.data();

html += `

<div class="card">

<h3>${quote.customerName}</h3>

<p><strong>Location:</strong> ${quote.customerLocation}</p>

<p><strong>Job:</strong> ${quote.jobDescription}</p>

<p><strong>Status:</strong> ${quote.status || "Pending"}</p>

</div>

`;

});

document.getElementById("quotesList").innerHTML =
html || "<p>No quote requests found.</p>";

});