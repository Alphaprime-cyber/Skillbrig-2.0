import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
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

async function loadProviders() {

  const container = document.getElementById("providersList");
  container.innerHTML = "Loading providers...";

  try {

    const snapshot = await getDocs(collection(db, "providers"));

    let output = "";

    snapshot.forEach((provider) => {

      const data = provider.data();

      output += `
      <div class="card">

        <h3>${data.businessName || data.name}</h3>

        <p><strong>Owner:</strong> ${data.name}</p>

        <p><strong>Category:</strong> ${data.category}</p>

        <p><strong>Location:</strong> ${data.state}, ${data.location}</p>

        <p><strong>Phone:</strong> ${data.phone}</p>

        <p><strong>Email:</strong> ${data.email}</p>

        <p><strong>Status:</strong>
        ${data.verified ? "✅ Verified" : "⏳ Pending"}
        </p>

        <button onclick="verifyProvider('${provider.id}')">
        ✅ Verify
        </button>

        <button onclick="deleteProvider('${provider.id}')">
        ❌ Delete
        </button>

      </div>
      `;

    });

    if (output === "") {
      output = "<p>No providers registered yet.</p>";
    }

    container.innerHTML = output;

  } catch (error) {

    console.error(error);

    container.innerHTML = "<p>Error loading providers.</p>";

  }

}

window.verifyProvider = async function(id) {

  await updateDoc(doc(db, "providers", id), {
    verified: true
  });

  alert("Provider verified.");

  loadProviders();

};

window.deleteProvider = async function(id) {

  if (!confirm("Delete this provider?")) return;

  await deleteDoc(doc(db, "providers", id));

  alert("Provider deleted.");

  loadProviders();

};

loadProviders();