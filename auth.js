import { auth, db } from "./firebase-config.js";

import {
    doc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const registerBtn = document.getElementById("registerBtn");

if (registerBtn) {
  registerBtn.addEventListener("click", async () => {

    const name = document.getElementById("name").value.trim();
const email = document.getElementById("email").value.trim();
const password = document.getElementById("password").value.trim();
const username = document.getElementById("username").value.trim();

 if (name === "" || email === "" || password === "") {
    showPopup(
    "warning",
    "Required",
    "Please fill all fields"
);
return;
    return;
}

    try {

      const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
);

try {

   await setDoc(doc(db, "users", userCredential.user.uid), {
    uid: userCredential.user.uid,
    username: username,
    name: name,
    email: email,
    balance: 0,
    role: "user",
    createdAt: Date.now()
});

    console.log("✅ User saved to Firestore");

} catch (e) {

    console.error("Firestore Save Error:", e);
    alert("Firestore Error: " + e.message);

}

      document.body.insertAdjacentHTML("beforeend", `
      <div id="popup" style="
      position:fixed;
      inset:0;
      background:rgba(0,0,0,.7);
      display:flex;
      justify-content:center;
      align-items:center;
      z-index:9999;
      ">

      <div style="
      width:330px;
      background:#1b1b1b;
      border-radius:20px;
      padding:30px;
      text-align:center;
      box-shadow:0 0 25px rgba(0,230,118,.45);
      animation:show .35s ease;
      ">

      <div style="
      width:80px;
      height:80px;
      border-radius:50%;
      background:#00c853;
      margin:auto;
      display:flex;
      justify-content:center;
      align-items:center;
      font-size:45px;
      color:#fff;
      ">
      ✓
      </div>

      <h2 style="color:#00e676;margin:20px 0 10px;">
      Registration Successful
      </h2>

      <p style="color:#ddd;">
      Your account has been created successfully.
      </p>

      </div>
      </div>

      <style>
      @keyframes show{
      from{
      opacity:0;
      transform:scale(.7);
      }
      to{
      opacity:1;
      transform:scale(1);
      }
      }
      </style>
      `);

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2500);

    }
    catch (error) {

let message = "Something went wrong!";

if (error.code === "auth/email-already-in-use") {
    message = "This email is already registered.";
} else if (error.code === "auth/invalid-email") {
    message = "Please enter a valid email address.";
} else if (error.code === "auth/weak-password") {
    message = "Password must be at least 6 characters.";
}

document.body.insertAdjacentHTML("beforeend", `
<div id="errorPopup" style="
position:fixed;
inset:0;
background:rgba(0,0,0,.7);
display:flex;
justify-content:center;
align-items:center;
z-index:9999;
">

<div style="
width:330px;
background:#1b1b1b;
padding:30px;
border-radius:20px;
text-align:center;
box-shadow:0 0 25px rgba(255,59,48,.45);
animation:show .35s ease;
">

<div style="
width:80px;
height:80px;
border-radius:50%;
background:#ff3b30;
margin:auto;
display:flex;
justify-content:center;
align-items:center;
font-size:45px;
color:#fff;
">
✕
</div>

<h2 style="color:#ff3b30;margin:20px 0 10px;">
Registration Failed
</h2>

<p style="color:#ddd;">
${message}
</p>

<button onclick="document.getElementById('errorPopup').remove()"
style="
margin-top:20px;
padding:10px 20px;
background:#ff3b30;
color:#fff;
border:none;
border-radius:8px;
cursor:pointer;
">
OK
</button>

</div>
</div>
`);
}

  });
}
// =========================
// USER SEARCH
// =========================

document.getElementById("userSearch")?.addEventListener("input", function(){

    loadUsers();

});