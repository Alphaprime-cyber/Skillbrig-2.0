import { auth } from "./firebase.js";
import { db } from "./firebase.js";

import {
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
doc,
getDoc,
setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

onAuthStateChanged(auth, async(user)=>{

if(!user){

window.location="../login.html";
return;

}

document.getElementById("userEmail").textContent=user.email;

const ref=doc(db,"users",user.uid);

const snap=await getDoc(ref);

if(snap.exists()){

const data=snap.data();

document.getElementById("userName").textContent=data.fullName||"Customer";

document.getElementById("userPhone").textContent=data.phoneNumber||"";

document.getElementById("fullName").value=data.fullName||"";

document.getElementById("phoneNumber").value=data.phoneNumber||"";

}

window.saveProfile=async function(){

await setDoc(ref,{

fullName:document.getElementById("fullName").value,

phoneNumber:document.getElementById("phoneNumber").value,

email:user.email

},{merge:true});

alert("✅ Profile updated successfully.");

};

});

window.editProfile=function(){

document.querySelector(".profile-form").scrollIntoView({

behavior:"smooth"

});

};