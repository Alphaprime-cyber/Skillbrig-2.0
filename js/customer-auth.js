import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const byId = (id) => document.getElementById(id);
const status = byId("customerAuthStatus");
const dashboardUrl = "dashboard.html";

function showStatus(message, kind = "") {
  status.textContent = message;
  status.className = `auth-status ${kind}`.trim();
}

function showMode(mode) {
  const register = mode === "register";
  byId("customerLoginForm").hidden = register;
  byId("customerRegisterForm").hidden = !register;
  byId("loginTab").classList.toggle("active", !register);
  byId("registerTab").classList.toggle("active", register);
  byId("loginTab").setAttribute("aria-selected", String(!register));
  byId("registerTab").setAttribute("aria-selected", String(register));
  byId("authHeading").textContent = register ? "Create your customer account" : "Welcome back";
  showStatus("");
}

function firebaseMessage(error) {
  const messages = {
    "auth/email-already-in-use": "An account already uses this email. Try signing in instead.",
    "auth/invalid-credential": "Email or password is incorrect. Check them and try again.",
    "auth/weak-password": "Choose a password with at least 6 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/network-request-failed": "Connection problem. Check your internet and try again.",
  };
  return messages[error.code] || error.message || "We could not complete that request. Please try again.";
}

async function requireCustomerAccount(user) {
  const provider = await getDoc(doc(db, "providers", user.uid));
  if (provider.exists()) {
    await signOut(auth);
    throw new Error("This email is linked to a provider account. Use Provider Login on the home page.");
  }
}

byId("loginTab").addEventListener("click", () => showMode("login"));
byId("registerTab").addEventListener("click", () => showMode("register"));

byId("customerForgotPassword").addEventListener("click", async (event) => {
  const email = byId("customerLoginEmail").value.trim();
  if (!email) {
    showStatus("Enter your email address above first, then select Forgot password?", "error");
    byId("customerLoginEmail").focus();
    return;
  }

  const button = event.currentTarget;
  button.disabled = true;
  showStatus("Sending password reset email…");
  try {
    await sendPasswordResetEmail(auth, email);
    showStatus("If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.", "success");
  } catch (error) {
    console.error("Customer password reset error:", error);
    if (error?.code === "auth/invalid-email") {
      showStatus("Enter a valid email address and try again.", "error");
    } else if (error?.code === "auth/network-request-failed") {
      showStatus("Connection problem. Check your internet and try again.", "error");
    } else {
      showStatus("We couldn't send the reset email. Check the email address and try again.", "error");
    }
  } finally {
    button.disabled = false;
  }
});

byId("customerLoginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  showStatus("Signing in…");
  try {
    const credential = await signInWithEmailAndPassword(auth, byId("customerLoginEmail").value.trim(), byId("customerLoginPassword").value);
    await requireCustomerAccount(credential.user);
    window.location.assign(dashboardUrl);
  } catch (error) {
    showStatus(firebaseMessage(error), "error");
  } finally {
    button.disabled = false;
  }
});

byId("customerRegisterForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button[type=submit]");
  button.disabled = true;
  showStatus("Creating your account…");
  try {
    const name = byId("customerRegisterName").value.trim();
    const email = byId("customerRegisterEmail").value.trim();
    const credential = await createUserWithEmailAndPassword(auth, email, byId("customerRegisterPassword").value);
    await updateProfile(credential.user, { displayName: name });
    window.location.assign(dashboardUrl);
  } catch (error) {
    showStatus(firebaseMessage(error), "error");
  } finally {
    button.disabled = false;
  }
});

const mode = new URLSearchParams(window.location.search).get("mode");
showMode(mode === "register" ? "register" : "login");
