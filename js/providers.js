import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";


// ======================================================
// CATEGORY NORMALIZATION
// ======================================================

function normalizeCategory(category) {

    if (!category) return "";

    const value = category.toLowerCase().trim();

    const categoryMap = {

        "electrician": "electrical",
        "electricians": "electrical",
        "electrical": "electrical",

        "plumber": "plumbing",
        "plumbers": "plumbing",
        "plumbing": "plumbing",

        "carpenter": "carpentry",
        "carpenters": "carpentry",
        "carpentry": "carpentry",

        "mechanic": "mechanic",
        "mechanics": "mechanic",
        "auto mechanic": "mechanic",

        "painter": "painting",
        "painters": "painting",
        "painting": "painting",

        "barber": "barbing",
        "barbers": "barbing",
        "barbing": "barbing",

        "makeup artist": "makeup",
        "makeup artists": "makeup",
        "makeup": "makeup",

        "developer": "software development",
        "developers": "software development",
        "software development": "software development",
        "web development": "software development",
        "mobile app development": "software development",

        "cleaner": "cleaning",
        "cleaners": "cleaning",
        "cleaning services": "cleaning",

        "photographer": "photography",
        "photographers": "photography",
        "photography": "photography",

        "tailor & fashion designer": "fashion",
        "tailors & fashion designers": "fashion",
        "tailoring": "fashion",
        "fashion design": "fashion",

        "hair stylist": "hair dressing",
        "hair stylists": "hair dressing",
        "hair dressing": "hair dressing",

        "ac & refrigeration": "ac & refrigeration",
        "ac & refrigeration technician": "ac & refrigeration",

        "builder & mason": "masonry",
        "builders & masons": "masonry",
        "masonry": "masonry",

        "welder": "welding",
        "welders": "welding",
        "welding": "welding",

        "interior designer": "interior decoration",
        "interior designers": "interior decoration",
        "interior decoration": "interior decoration",

        "landscaper & gardener": "gardening & landscaping",
        "landscapers & gardeners": "gardening & landscaping",
        "gardening & landscaping": "gardening & landscaping",

        "mover & logistics": "logistics",
        "movers & logistics": "logistics",

        "phone & computer repair": "technology repair",
        "phone repair": "technology repair",
        "computer repair": "technology repair",
        "laptop repair": "technology repair",

        "appliance repair": "appliance repair",
        "appliance repair technician": "appliance repair",

        "security services": "security",

        "tutor": "education",
        "tutors": "education",
        "private tutor": "education",

        "caterer & chef": "catering",
        "caterers & chefs": "catering",
        "catering": "catering",

        "spa & massage": "spa & massage",
        "spa & massage therapist": "spa & massage",

        "car wash & detailing": "car wash",
        "car wash": "car wash",
        "car detailing": "car wash",
        "car detailing": "car wash",

        "auto electrician": "auto electrical",
        "auto electrical": "auto electrical",

        "generator repair technician": "generator repair",
        "generator repair": "generator repair",

        "solar installer": "solar installation",
        "solar installers": "solar installation",

        "roofer": "roofing",
        "roofers": "roofing",
        "roofing": "roofing",

        "tiler": "tiling",
        "tilers": "tiling",
        "tiling": "tiling",

        "plasterer": "plastering",
        "plasterers": "plastering",

        "glass & aluminium worker": "glass & aluminium",
        "glass & aluminium workers": "glass & aluminium",

        "pop & ceiling installer": "pop ceiling",
        "pop & ceiling installers": "pop ceiling",
        "pop ceiling": "pop ceiling",

        "flooring specialist": "flooring",
        "flooring specialists": "flooring",

        "sign writer & graphics designer": "graphics design",
        "sign writers & graphics designers": "graphics design",
        "graphic design": "graphics design",

        "videographer": "videography",
        "videographers": "videography",
        "videography": "videography",

        "event planner": "event planning",
        "event planners": "event planning",
        "event planning": "event planning",

        "dj & music services": "dj services",
        "dj services": "dj services",

        "printing services": "printing",

        "digital marketer": "digital marketing",
        "digital marketers": "digital marketing",
        "digital marketing": "digital marketing",

        "content creator": "content creation",
        "content creators": "content creation"

    };

    return categoryMap[value] || value;
}


// ======================================================
// CREATE PROVIDER CARD
// ======================================================

function createProviderCard(provider, id) {

    return `
        <div class="card provider-card">

            <h3>
                ${provider.businessName || provider.name}
            </h3>

            <p>
                ${provider.category || "Professional Service"}
            </p>

            <p>
                📍 ${provider.state || ""}${provider.location ? ", " + provider.location : ""}
            </p>

            <p>
                ⭐ ${provider.averageRating || 0}
            </p>

            <a href="profile.html?id=${id}">
                <button type="button">
                    View Profile
                </button>
            </a>

        </div>
    `;
}


// ======================================================
// LOAD PROVIDERS
// ======================================================

window.loadProviders = async function () {

    const list = document.getElementById("providersList");

    if (!list) return;

    list.innerHTML = "<p>Loading providers...</p>";

    try {

        const params = new URLSearchParams(window.location.search);

        const selectedCategory = params.get("category");
        const selectedState = params.get("state");
        const keyword = params.get("search");


        const snapshot = await getDocs(
            collection(db, "providers")
        );


        let providers = [];


        snapshot.forEach((providerDoc) => {

            const provider = providerDoc.data();


            // Only verified providers appear publicly

            if (!provider.verified) return;


            // CATEGORY FILTER

            if (
                selectedCategory &&
                normalizeCategory(provider.category) !==
                normalizeCategory(selectedCategory)
            ) {
                return;
            }


            // STATE FILTER

            if (
                selectedState &&
                provider.state?.toLowerCase() !==
                selectedState.toLowerCase()
            ) {
                return;
            }


            // KEYWORD SEARCH

            if (keyword) {

                const searchText = `

                    ${provider.name || ""}

                    ${provider.businessName || ""}

                    ${provider.category || ""}

                    ${provider.location || ""}

                    ${provider.state || ""}

                    ${provider.description || ""}

                `.toLowerCase();


                if (!searchText.includes(keyword.toLowerCase())) {
                    return;
                }

            }


            providers.push({
                ...provider,
                id: providerDoc.id
            });

        });


        // ==================================================
        // DISPLAY RESULTS
        // ==================================================

        if (!providers.length) {

            if (selectedCategory) {

                list.innerHTML = `
                    <p>
                        No verified providers found for
                        <strong>${selectedCategory}</strong>.
                    </p>
                `;

            } else {

                list.innerHTML = `
                    <p>
                        No verified providers available.
                    </p>
                `;

            }

            return;
        }


        list.innerHTML = providers
            .map(provider =>
                createProviderCard(provider, provider.id)
            )
            .join("");


    } catch (error) {

        console.error("Error loading providers:", error);

        list.innerHTML = `
            <p>
                Unable to load providers right now.
            </p>
        `;

    }

};


// ======================================================
// REGISTER PROVIDER
// ======================================================

window.registerProvider = async function () {

    const name =
        document.getElementById("providerName")?.value.trim();

    const businessName =
        document.getElementById("businessName")?.value.trim();

    const category =
        document.getElementById("providerCategory")?.value;

    const state =
        document.getElementById("providerState")?.value;

    const location =
        document.getElementById("providerLocation")?.value.trim();

    const phone =
        document.getElementById("providerPhone")?.value.trim();

    const whatsapp =
        document.getElementById("providerWhatsApp")?.value.trim();

    const email =
        document.getElementById("providerEmail")?.value.trim();

    const experience =
        document.getElementById("providerExperience")?.value.trim();

    const businessHours =
        document.getElementById("providerBusinessHours")?.value.trim();

    const description =
        document.getElementById("providerDescription")?.value.trim();


    if (
        !name ||
        !category ||
        !state ||
        !location ||
        !phone ||
        !email
    ) {

        alert("Please complete all required fields.");

        return;
    }


    try {

        await addDoc(
            collection(db, "providers"),
            {

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

                jobsCompleted: 0,

                skillScore: 50,

                createdAt: new Date()

            }
        );


        alert(
            "🎉 Registration submitted successfully! Your account is awaiting approval."
        );


        document
            .querySelectorAll("input, textarea")
            .forEach(input => {

                if (input.type !== "file") {
                    input.value = "";
                }

            });


        const categoryField =
            document.getElementById("providerCategory");

        const stateField =
            document.getElementById("providerState");


        if (categoryField) {
            categoryField.value = "";
        }


        if (stateField) {
            stateField.value = "";
        }


    } catch (error) {

        console.error(error);

        alert(error.message);

    }

};


// ======================================================
// LOAD SINGLE PROVIDER PROFILE
// ======================================================

window.loadProviderProfile = async function () {

    const params =
        new URLSearchParams(window.location.search);

    const providerId =
        params.get("id");


    if (!providerId) return;


    try {

        const snapshot =
            await getDoc(
                doc(db, "providers", providerId)
            );


        if (!snapshot.exists()) return;


        const provider =
            snapshot.data();


        const businessName =
            document.getElementById("businessName");

        const category =
            document.getElementById("category");

        const experience =
            document.getElementById("experience");

        const location =
            document.getElementById("location");

        const businessHours =
            document.getElementById("businessHours");

        const description =
            document.getElementById("description");

        const rating =
            document.getElementById("rating");

        const totalReviews =
            document.getElementById("totalReviews");

        const jobsCompleted =
            document.getElementById("jobsCompleted");

        const skillScore =
            document.getElementById("skillScore");

        const callButton =
            document.getElementById("callButton");

        const whatsappButton =
            document.getElementById("whatsappButton");

        const emailButton =
            document.getElementById("emailButton");


        if (businessName)
            businessName.textContent =
                provider.businessName || provider.name;


        if (category)
            category.textContent =
                provider.category || "";


        if (experience)
            experience.textContent =
                "Experience: " +
                (provider.experience || 0) +
                " years";


        if (location)
            location.textContent =
                "📍 " +
                (provider.state || "") +
                ", " +
                (provider.location || "");


        if (businessHours)
            businessHours.textContent =
                "Business Hours: " +
                (provider.businessHours || "Not provided");


        if (description)
            description.textContent =
                provider.description || "";


        if (rating)
            rating.textContent =
                "⭐ " +
                (provider.averageRating || 0);


        if (totalReviews)
            totalReviews.textContent =
                provider.totalReviews || 0;


        if (jobsCompleted)
            jobsCompleted.textContent =
                provider.jobsCompleted || 0;


        if (skillScore)
            skillScore.textContent =
                "🏆 SkillScore " +
                (provider.skillScore || 0);


        if (callButton)
            callButton.href =
                "tel:" +
                (provider.phone || "");


        if (whatsappButton)
            whatsappButton.href =
                "https://wa.me/" +
                (provider.whatsapp || "");


        if (emailButton)
            emailButton.href =
                "mailto:" +
                (provider.email || "");

    } catch (error) {

        console.error(
            "Error loading provider profile:",
            error
        );

    }

};


// ======================================================
// HOMEPAGE SEARCH
// ======================================================

window.searchProviders = function () {

    const keyword =
        document.getElementById("searchBox")?.value.trim() || "";

    const state =
        document.getElementById("stateFilter")?.value || "";

    const category =
        document.getElementById("categoryFilter")?.value || "";


    const params =
        new URLSearchParams();


    if (keyword)
        params.set("search", keyword);


    if (state)
        params.set("state", state);


    if (category)
        params.set("category", category);


    window.location.href =
        "provider.html" +
        (params.toString()
            ? "?" + params.toString()
            : "");

};


// ======================================================
// AUTO INITIALIZATION
// ======================================================

if (
    document.getElementById("providersList")
) {

    loadProviders();

}


if (
    document.getElementById("businessName") &&
    document.getElementById("category")
) {

    loadProviderProfile();

}