import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==============================
// GET SERVICE ID
// ==============================

const params = new URLSearchParams(window.location.search);
const serviceId = params.get("id");

let currentService = null;

// ==============================
// LOAD SERVICE
// ==============================

async function loadService() {

  if (!serviceId) {
    showPopup("❌ Service not found.");
    return;
}

    const snap = await getDoc(doc(db, "services", serviceId));

    if (!snap.exists()) {
        showPopup("❌ Service not found.");
        return;
    }

    currentService = snap.data();
    

    const img = document.getElementById("serviceImage");

if (img) {
    img.src = currentService.image || "images/no-image.png";
}

    // Auto Service Name
    document.getElementById("serviceName").value = currentService.name;

    // Auto Price
    document.getElementById("price").value = "৳ " + currentService.price;

    // Dynamic Fields
    const dynamicFields = document.getElementById("dynamicFields");
    dynamicFields.innerHTML = "";

    if (currentService.requiredInfo) {

        const fields = currentService.requiredInfo
            .split("\n")
            .filter(f => f.trim() !== "");

        fields.forEach(field => {

            dynamicFields.innerHTML += `
                <div class="dynamicField">

                    <label>${field}</label>

                    <input
                        type="text"
                        class="dynamicInput"
                        data-label="${field}"
                        placeholder="${field}"
                    >

                </div>
            `;

        });

    }

}

loadService();

// ==============================
// PLACE ORDER
// ==============================

document.getElementById("placeOrderBtn").addEventListener("click", async () => {

  if (!currentService) {
    showPopup("❌ Service not loaded.");
    return;
}

    const inputs = document.querySelectorAll(".dynamicInput");

    let userInfo = {};

    let empty = false;

    inputs.forEach(input => {

        if (input.value.trim() === "") {
            empty = true;
        }

        userInfo[input.dataset.label] = input.value.trim();

    });

    if (empty) {
        showPopup("⚠️ Please fill all required fields.");
        return;
    }

 const user = auth.currentUser;

 const userRef = doc(db, "users", user.uid);

const userSnap = await getDoc(userRef);

const userData = userSnap.data();

if ((userData.balance || 0) < currentService.price) {
    showPopup("❌ Insufficient Balance");
    return;
}

await updateDoc(userRef, {
    balance: userData.balance - currentService.price
});

await addDoc(collection(db, "orders"), {

    userId: user.uid,
    userEmail: user.email,

    serviceId: serviceId,
    serviceName: currentService.name,
    price: currentService.price,
    userInfo: userInfo,

    status: "Pending",
    createdAt: Date.now()

});

    showPopup("✅ Order Placed Successfully");

    window.location.href = "dashboard.html";
showPopup("✅ Order Placed Successfully");

setTimeout(() => {
    window.location.href = "dashboard.html";
}, 1500);
});

// ==============================
// CUSTOM POPUP
// ==============================

function showPopup(message){

    const old = document.getElementById("customPopup");

    if(old) old.remove();

    document.body.insertAdjacentHTML("beforeend", `
        <div id="customPopup" class="success-popup">
            <div class="success-box">
                <div class="success-icon">✓</div>
                <p>${message}</p>
                <button onclick="document.getElementById('customPopup').remove()">OK</button>
            </div>
        </div>
    `);

}