import { auth, db } from "./firebase-config.js";

import {
    collection,
    query,
    where,
    getDocs,
     doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginBtn = document.getElementById("loginBtn");

if (loginBtn) {

  loginBtn.addEventListener("click", async () => {

   const loginInput = document.getElementById("loginInput").value.trim();
const password = document.getElementById("password").value.trim();

let email = loginInput;

if (loginInput === "" || password === "") {
    showPopup(
    "warning",
    "Required",
    "Please enter Email or Username and Password"
);
    return;
}

if (!loginInput.includes("@")) {

    const q = query(
        collection(db, "users"),
        where("username", "==", loginInput)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
        showPopup(
    "error",
    "Login Failed",
    "Username not found"
);
        return;
    }

    email = snap.docs[0].data().email;
}

    try {

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

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
padding:30px;
border-radius:20px;
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
Login Successful
</h2>

<p style="color:#ddd;">
Welcome to JN IT CENTER
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

     setTimeout(async () => {

    const userRef = doc(db, "users", userCredential.user.uid);

    const snap = await getDoc(userRef);

    if (snap.exists()) {

        const data = snap.data();

        if (data.role === "admin") {

            window.location.href = "admin.html";

        } else {

            window.location.href = "dashboard.html";

        }

    }

}, 2000);

    }

    catch (error) {

      let message = "Login Failed";

      if (error.code === "auth/user-not-found") {
        message = "User not found.";
      }

      else if (error.code === "auth/wrong-password") {
        message = "Wrong password.";
      }

      else if (error.code === "auth/invalid-email") {
        message = "Invalid email address.";
      }

      else if (error.code === "auth/invalid-credential") {
        message = "Email or Password is incorrect.";
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
Login Failed
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
// FORGOT PASSWORD
// =========================

function openResetModal(){

    document.getElementById("resetPasswordModal").style.display="flex";

}

function closeResetModal(){

    document.getElementById("resetPasswordModal").style.display="none";

}

window.closeResetModal = closeResetModal;

const forgotBtn = document.getElementById("forgotPasswordBtn");

if(forgotBtn){

    forgotBtn.addEventListener("click",(e)=>{

      console.log("Forgot button clicked");

        e.preventDefault();

        openResetModal();

    });

}

const sendResetBtn = document.getElementById("sendResetBtn");

if(sendResetBtn){

    sendResetBtn.addEventListener("click",async()=>{

        const email=document.getElementById("resetEmail").value.trim();

        if(!email){

            showPopup(
    "warning",
    "Required",
    "Please enter your email."
);

            return;

        }

        try{
          
await sendPasswordResetEmail(auth, email);

closeResetModal();

            document.body.insertAdjacentHTML(
    "beforeend",
    `
<div id="successPopup" class="success-popup">

    <div class="success-box">

        <div class="success-icon">✓</div>

        <h2>Password Reset</h2>

        <p>Password reset link has been sent successfully to your email.</p>

        <button onclick="closeSuccessPopup()">OK</button>

    </div>

</div>
`);

            closeResetModal();

        }

        catch(err){

          showPopup(
    "error",
    "Reset Failed",
    err.message
);

        }

    });

}

window.closeSuccessPopup = function () {

    document.getElementById("successPopup").remove();

}