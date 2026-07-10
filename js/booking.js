import { db } from "./firebase.js";

import {

collection,
addDoc

} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

window.bookProvider = async function(){

const params = new URLSearchParams(window.location.search);

const providerId = params.get("id");

await addDoc(collection(db,"bookings"),{

providerId,

customerName:
document.getElementById("customerName").value,

customerPhone:
document.getElementById("customerPhone").value,

bookingDate:
document.getElementById("bookingDate").value,

bookingTime:
document.getElementById("bookingTime").value,

bookingDetails:
document.getElementById("bookingDetails").value,

status:"Pending",

createdAt:new Date()

});

alert("✅ Booking submitted successfully.");

}