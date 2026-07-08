import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
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
const auth = getAuth(app);
const db = getFirestore(app);

// ---------------- SIGN UP ----------------

window.signup = function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  createUserWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Signup successful!");
    })
    .catch((error) => {
      alert(error.message);
    });

};

// ---------------- LOGIN ----------------

window.login = function () {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      alert("Login successful!");
    })
    .catch((error) => {
      alert(error.message);
    });

};

// ---------------- ADD SERVICE ----------------

window.addService = async function () {

  const name = document.getElementById("serviceName").value.trim();
  const category = document.getElementById("serviceCategory").value;
  const state = document.getElementById("serviceState").value;
  const location = document.getElementById("serviceLocation").value.trim();
  const phone = document.getElementById("servicePhone").value.trim();
  const description = document.getElementById("serviceDescription").value.trim();

  if (!name || !category || !state || !location || !phone || !description) {
    alert("Please complete all fields.");
    return;
  }

  try {

    await addDoc(collection(db, "services"), {
      name,
      category,
      state,
      location,
      phone,
      description,
      rating: 0,
      createdAt: new Date()
    });

    alert("Service posted successfully!");

    document.getElementById("serviceName").value = "";
    document.getElementById("serviceCategory").value = "";
    document.getElementById("serviceState").value = "";
    document.getElementById("serviceLocation").value = "";
    document.getElementById("servicePhone").value = "";
    document.getElementById("serviceDescription").value = "";

    loadServices();

  } catch (error) {
    alert(error.message);
  }

};

// ---------------- LOAD VERIFIED PROVIDERS ----------------

window.loadProviders = async function () {

  try {

    const querySnapshot = await getDocs(collection(db, "providers"));

    let output = "";

    querySnapshot.forEach((doc) => {

      const data = doc.data();

      // Show only verified providers
      if (!data.verified) return;

      output += `
      <div class="provider-card">

        <img
          class="provider-image"
          src="${data.profileImage || 'images/default-provider.png'}"
          alt="${data.businessName || data.name}">

        <div class="provider-body">

          <div class="verified-badge">
            ✓ VERIFIED
          </div>

          <div class="provider-name">
            ${data.businessName || data.name}
          </div>

          <p class="provider-info">
            <strong>Category:</strong> ${data.category}
          </p>

          <p class="provider-info">
            ⭐ ${data.averageRating || 0} |
            🏆 SkillScore ${data.skillScore || 50}
          </p>

          <p class="provider-info">
            📍 ${data.state}, ${data.location}
          </p>

          <p class="provider-info">
            💼 ${data.experience} Years Experience
          </p>

          <div class="provider-buttons">

            <a href="tel:${data.phone}">
              <button class="call-btn">📞 Call</button>
            </a>

            <a href="https://wa.me/${data.whatsapp || data.phone}" target="_blank">
              <button class="whatsapp-btn">💬 WhatsApp</button>
            </a>

            <button
              class="profile-btn"
              onclick="viewProvider('${doc.id}')">

              👤 Profile

            </button>

          </div>

        </div>

      </div>
      `;

    });

    if (output === "") {
      output = "<p>No verified providers available yet.</p>";
    }

    document.getElementById("providersList").innerHTML = output;

  } catch (error) {

    console.error(error);

    document.getElementById("providersList").innerHTML =
      "<p>Unable to load providers.</p>";

  }

};

loadProviders();