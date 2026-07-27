
import { db, storage } from "./firebase-config.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// URL থেকে Order ID
const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

// Hidden Input
document.getElementById("orderId").value = orderId;

// Order Load
async function loadOrder(){

    const snap = await getDoc(doc(db,"orders",orderId));

    if(!snap.exists()){
        alert("Order Not Found");
        return;
    }

    const order = snap.data();

    console.log(order);

}

loadOrder();

// Upload Result

 window.saveResult = async function () {

    const resultLink = document.getElementById("resultLink").value.trim();
    const adminNote = document.getElementById("adminNote").value.trim();

  if (!resultLink) {

    showPopup(
        "⚠️",
        "Google Drive Link Required",
        "Please paste your Google Drive link first."
    );

    return;
}

    try {

        await updateDoc(doc(db, "orders", orderId), {
    resultLink: resultLink,
    adminNote: adminNote,
    status: "Completed"
});

document.getElementById("successPopup").classList.add("show");

setTimeout(() => {

    window.location.href = "admin.html";

}, 2000);

return;



    } catch (err) {

        console.error(err);
        alert(err.message);

    }

};

function showPopup(icon, title, text){

    document.getElementById("popupIcon").innerHTML = icon;
    document.getElementById("popupTitle").innerHTML = title;
    document.getElementById("popupText").innerHTML = text;

    const popup = document.getElementById("messagePopup");

    popup.classList.add("show");

    setTimeout(()=>{
        popup.classList.remove("show");
    },2000);

}