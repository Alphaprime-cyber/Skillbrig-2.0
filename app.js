import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc
  addDoc,
  query,
  where
  updatedoc
  serverTimestamp
  updateDoc,
  doc
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

// =============================
// LOAD VERIFIED PROVIDERS
// =============================

window.loadProviders = async function () {

    try {

        const snapshot = await getDocs(collection(db, "providers"));

        let html = "";

        snapshot.forEach((doc) => {

            const provider = doc.data();

            if (!provider.verified) return;

            html += `

            <div class="provider-card">

                <img
                    src="${provider.profileImage || "images/default-provider.png"}"
                    class="provider-image"
                    alt="${provider.businessName || provider.name}">

                <div class="provider-body">

                    <span class="verified-badge">
                        <i class="fas fa-check-circle"></i>
                        Verified
                    </span>

                    <h3 class="provider-name">
                        ${provider.businessName || provider.name}
                    </h3>

                    <p class="provider-info">
                        <i class="fas fa-screwdriver-wrench"></i>
                        ${provider.category}
                    </p>

                    <p class="provider-info">
                        <i class="fas fa-location-dot"></i>
                        ${provider.state}, ${provider.location}
                    </p>

                    <p class="provider-info">
                        ⭐ ${provider.averageRating || 0}
                        &nbsp;|&nbsp;
                        🏆 ${provider.skillScore || 50}
                    </p>

                    <div class="provider-buttons">

                        <a href="tel:${provider.phone}">
                            <button class="call-btn">
                                <i class="fas fa-phone"></i>
                                Call
                            </button>
                        </a>

                        <a
                          href="https://wa.me/${provider.whatsapp || provider.phone}"
                          target="_blank">

                            <button class="whatsapp-btn">

                                <i class="fab fa-whatsapp"></i>

                                WhatsApp

                            </button>

                        </a>

                    </div>

                </div>

            </div>

            `;

        });

        document.getElementById("providersList").innerHTML =
            html || "<p>No verified providers available yet.</p>";

    }

    catch (error) {

        console.error(error);

        document.getElementById("providersList").innerHTML =
            "<p>Unable to load providers.</p>";

    }

};

loadProviders();

window.viewProvider = function(id) {

    window.location.href = `profile.html?id=${id}`;

};

// ==============================
// LOAD BUSINESS PROFILE
// ==============================

window.loadBusinessProfile = async function () {

    const params = new URLSearchParams(window.location.search);
    const providerId = params.get("id");

    if (!providerId) return;

    try {

        const providerRef = doc(db, "providers", providerId);
        const providerSnap = await getDoc(providerRef);

        if (!providerSnap.exists()) {
            document.getElementById("businessName").textContent =
                "Provider not found";
            return;
        }

        const provider = providerSnap.data();

        document.getElementById("businessName").textContent =
            provider.businessName || provider.name;

        document.getElementById("category").textContent =
            "Category: " + provider.category;

        document.getElementById("experience").textContent =
            "Experience: " + provider.experience + " years";

        document.getElementById("location").textContent =
            "Location: " + provider.state + ", " + provider.location;

        document.getElementById("businessHours").textContent =
            "Business Hours: " + provider.businessHours;

        document.getElementById("description").textContent =
            provider.description;

        document.getElementById("rating").textContent =
            "⭐ " + (provider.averageRating || 0);

        document.getElementById("skillScore").textContent =
            "🏆 SkillScore " + (provider.skillScore || 50);

        document.getElementById("callButton").href =
            "tel:" + provider.phone;

        document.getElementById("whatsappButton").href =
            "https://wa.me/" + (provider.whatsapp || provider.phone);

        if (provider.profileImage) {
            document.getElementById("profileImage").src =
                provider.profileImage;
        }

    } catch (error) {

        console.error(error);

    }

};

// Run only on profile.html
if (document.getElementById("businessName")) {
    loadBusinessProfile();
}

window.submitReview = async function () {

    const params = new URLSearchParams(window.location.search);
    const providerId = params.get("id");

    const customerName =
        document.getElementById("reviewName").value.trim();

    const rating =
        Number(document.getElementById("reviewRating").value);

    const comment =
        document.getElementById("reviewComment").value.trim();

    if (!customerName || !comment) {

        alert("Please complete all fields.");

        return;

    }

    try {

        await addDoc(collection(db, "reviews"), {

            providerId,
            customerName,
            rating,
            comment,
            createdAt: new Date()

        });

await updateProviderRating(providerId);
        alert("Thank you! Your review has been submitted.");

        loadReviews();

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

};

window.loadReviews = async function () { const params = new URLSearchParams(window.location.search); const providerId = params.get("id"); const q = query( collection(db, "reviews"), where("providerId", "==", providerId) ); const snapshot = await getDocs(q); let html = ""; snapshot.forEach((doc) => { const review = doc.data(); html += ` 

${review.customerName}

⭐ ${review.rating}/5

${review.comment}

`; }); document.getElementById("reviewsList").innerHTML = html || "

No reviews yet.

"; }; if (document.getElementById("reviewsList")) { loadReviews(); }

// ==============================
// UPDATE PROVIDER RATING
// ==============================

window.updateProviderRating = async function(providerId) {

    const q = query(
        collection(db, "reviews"),
        where("providerId", "==", providerId)
    );

    const snapshot = await getDocs(q);

    let totalRating = 0;
    let totalReviews = 0;

    snapshot.forEach((doc) => {

        const review = doc.data();

        totalRating += Number(review.rating);
        totalReviews++;

    });

    const averageRating =
        totalReviews > 0
        ? (totalRating / totalReviews).toFixed(1)
        : 0;

    const providerRef = doc(db, "providers", providerId);

    await updateDoc(providerRef, {

        averageRating: Number(averageRating),

        totalReviews: totalReviews

    });

};

// ==============================
// REQUEST A QUOTE
// ==============================

window.requestQuote = async function () {

    const params = new URLSearchParams(window.location.search);
    const providerId = params.get("id");

    const customerName =
        document.getElementById("customerName").value.trim();

    const customerPhone =
        document.getElementById("customerPhone").value.trim();

    const customerLocation =
        document.getElementById("customerLocation").value.trim();

    const preferredDate =
        document.getElementById("preferredDate").value;

    const jobDescription =
        document.getElementById("jobDescription").value.trim();

    if (
        !customerName ||
        !customerPhone ||
        !customerLocation ||
        !jobDescription
    ) {
        alert("Please complete all required fields.");
        return;
    }

    try {

        await addDoc(collection(db, "quoteRequests"), {

            providerId,
            customerName,
            customerPhone,
            customerLocation,
            preferredDate,
            jobDescription,
            status: "Pending",
            createdAt: serverTimestamp()

        });

        alert("✅ Quote request sent successfully!");

        document.getElementById("customerName").value = "";
        document.getElementById("customerPhone").value = "";
        document.getElementById("customerLocation").value = "";
        document.getElementById("preferredDate").value = "";
        document.getElementById("jobDescription").value = "";

    } catch (error) {

        console.error(error);
        alert(error.message);

    }

};

// ==============================
// ADMIN LOGIN
// ==============================

window.adminLogin = async function () {

    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!email || !password) {
        document.getElementById("adminMessage").innerHTML =
            "Please enter your email and password.";
        return;
    }

    try {

        await signInWithEmailAndPassword(auth, email, password);

        window.location.href = "dashboard.html";

    } catch (error) {

        document.getElementById("adminMessage").innerHTML =
            "Invalid email or password.";

        console.error(error);

    }

};

window.loadAdminProviders = async function(){

const snapshot = await getDocs(collection(db,"providers"));

let html="";

snapshot.forEach((providerDoc)=>{

const provider=providerDoc.data();

html+=`

<div class="provider-row">

<div>

<h3>${provider.businessName || provider.name}</h3>

<p>${provider.category}</p>

<p>${provider.state}</p>

<p>

Status:

<b style="color:${provider.verified ? 'lime':'orange'}">

${provider.verified ? 'Approved':'Pending'}

</b>

</p>

</div>

<div class="provider-actions">

<button
class="approve-btn"
onclick="approveProvider('${providerDoc.id}')">

Approve

</button>

<button
class="reject-btn"
onclick="rejectProvider('${providerDoc.id}')">

Reject

</button>

</div>

</div>

`;

});

document.getElementById("providersTable").innerHTML=html;

}

if(document.getElementById("providersTable")){

loadAdminProviders();

}