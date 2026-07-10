import { db } from "./firebase.js";

import {
doc,
setDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

window.saveSettings = async function(){

const settings={

platformName:
document.getElementById("platformName").value,

supportEmail:
document.getElementById("supportEmail").value,

supportPhone:
document.getElementById("supportPhone").value

};

await setDoc(doc(db,"settings","platform"),settings);

alert("✅ Settings Saved");

}

async function loadSettings(){

const snapshot=await getDoc(doc(db,"settings","platform"));

if(snapshot.exists()){

const data=snapshot.data();

document.getElementById("platformName").value=data.platformName;

document.getElementById("supportEmail").value=data.supportEmail;

document.getElementById("supportPhone").value=data.supportPhone;

}

}

loadSettings();