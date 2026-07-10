import { db } from "./firebase.js";

import {
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

async function loadAnalytics(){

const providers = await getDocs(collection(db,"providers"));

const reviews = await getDocs(collection(db,"reviews"));

const quotes = await getDocs(collection(db,"quotes"));

let verified = 0;

providers.forEach(doc=>{

if(doc.data().verified){

verified++;

}

});

document.getElementById("analyticsProviders").innerHTML = providers.size;

document.getElementById("analyticsReviews").innerHTML = reviews.size;

document.getElementById("analyticsQuotes").innerHTML = quotes.size;

document.getElementById("analyticsVerified").innerHTML = verified;

}

loadAnalytics();