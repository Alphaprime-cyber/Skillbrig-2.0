import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCgV-0KaUdjHyy_YPYRogunS5H01jPBbGg",
  authDomain: "skillbridge-app-56faf.firebaseapp.com",
  projectId: "skillbridge-app-56faf",
  storageBucket: "skillbridge-app-56faf.firebasestorage.app",
  messagingSenderId: "181813326765",
  appId: "1:181813326765:web:4732292cd467a8f7d3a724"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.registerProvider = async function () {

  const name = document.getElementById("providerName").value.trim();
  const businessName = document.getElementById("businessName").value.trim();
  const category = document.getElementById("providerCategory").value;
  const state = document.getElementById("providerState").value;
  const location = document.getElementById("providerLocation").value.trim();
  const phone = document.getElementById("providerPhone").value.trim();
  const whatsapp = document.getElementById("providerWhatsApp").value.trim();
  const email = document.getElementById("providerEmail").value.trim();
  const experience = document.getElementById("providerExperience").value.trim();
  const businessHours = document.getElementById("providerBusinessHours").value.trim();
  const description = document.getElementById("providerDescription").value.trim();

  if (
    !name ||
    !category ||
    !state ||
    !location ||
    !phone ||
    !email ||
    !experience ||
    !businessHours ||
    !description
  ) {
    alert("Please complete all required fields.");
    return;
  }

  try {

    await addDoc(collection(db, "providers"), {

      name,
      businessName,
      category,
      state,
      location,
      phone,
      whatsapp,
      email,
      experience,
      businessHours,
      description,

      verified: false,
      averageRating: 0,
      totalReviews: 0,

      createdAt: new Date()

    });

    alert("🎉 Registration successful! Your profile has been submitted.");

    document.getElementById("providerName").value = "";
    document.getElementById("businessName").value = "";
    document.getElementById("providerCategory").value = "";
    document.getElementById("providerState").value = "";
    document.getElementById("providerLocation").value = "";
    document.getElementById("providerPhone").value = "";
    document.getElementById("providerWhatsApp").value = "";
    document.getElementById("providerEmail").value = "";
    document.getElementById("providerExperience").value = "";
    document.getElementById("providerBusinessHours").value = "";
    document.getElementById("providerDescription").value = "";

  } catch (error) {

    console.error(error);
    alert(error.message);

  }

};