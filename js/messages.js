import { auth } from "./firebase.js";

window.sendMessage = function(){

const text = document.getElementById("messageText").value.trim();

if(!text){

alert("Enter a message.");

return;

}

const messages = document.getElementById("messagesList");

messages.innerHTML += `

<div class="card">

<p><strong>You:</strong> ${text}</p>

</div>

`;

document.getElementById("messageText").value="";

};