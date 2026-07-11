import { auth } from "./firebase.js";
import { db } from "./firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
collection,
query,
where,
getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async(user)=>{

if(!user){

window.location="../login.html";

return;

}

const q=query(

collection(db,"bookings"),

where("customerEmail","==",user.email)

);

const snapshot=await getDocs(q);

let html="";

snapshot.forEach(doc=>{

const booking=doc.data();

html+=`

<div class="card">

<h3>${booking.bookingDate}</h3>

<p><strong>Time:</strong> ${booking.bookingTime}</p>

<p><strong>Status:</strong> ${booking.status}</p>

<p>${booking.bookingDetails}</p>

</div>

`;

});

document.getElementById("bookingsList").innerHTML=

html || "<p>No bookings yet.</p>";

});