import { auth, db } from "./firebase-config.js";

import {
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =====================================
// VARIABLES
// =====================================

const urlParams = new URLSearchParams(window.location.search);
const serviceId = urlParams.get("id");

let currentService = null;

// =====================================
// INIT
// =====================================

window.addEventListener("DOMContentLoaded", () => {

    if (!serviceId) {

        showPopup(
            "error",
            "Service Not Found",
            "Invalid service link."
        );

        return;

    }

    loadService();

});

// =====================================
// LOAD SERVICE
// =====================================

async function loadService() {

    try {

        const serviceRef = doc(db, "services", serviceId);

        const snap = await getDoc(serviceRef);

        if (!snap.exists()) {

            showPopup(
                "error",
                "Service Not Found",
                "This service does not exist."
            );

            return;

        }

        currentService = snap.data();

        document.getElementById("serviceName").value =
            currentService.name || "";

        document.getElementById("price").value =
            "৳ " + (currentService.price || 0);

        const image = document.getElementById("serviceImage");

        if (image) {

            image.src =
                currentService.image ||
                "images/no-image.png";

        }

        loadRequiredFields(currentService.requiredInfo);

    }

    catch (err) {

        console.error(err);

        showPopup(
            "error",
            "Database Error",
            err.message
        );

    }

}
// =====================================
// LOAD REQUIRED FIELDS
// =====================================

function loadRequiredFields(requiredInfo) {

    const container = document.getElementById("dynamicFields");

    container.innerHTML = "";

    if (!requiredInfo) return;

    const fields = requiredInfo
        .split("\n")
        .filter(field => field.trim() !== "");

    fields.forEach(field => {

        container.innerHTML += `

<div class="dynamicField">

<label>${field}</label>

<input
type="text"
class="dynamicInput"
data-label="${field}"
placeholder="${field}">

</div>

`;

    });

}

// =====================================
// PLACE ORDER
// =====================================

document
.getElementById("placeOrderBtn")
.addEventListener("click", placeOrder);

async function placeOrder() {

    if (!currentService) {

        showPopup(
            "error",
            "Error",
            "Service not loaded."
        );

        return;

    }

    const inputs =
        document.querySelectorAll(".dynamicInput");

    let userInfo = {};

    let empty = false;

    inputs.forEach(input => {

        if (input.value.trim() === "") {

            empty = true;

        }

        userInfo[input.dataset.label] =
            input.value.trim();

    });

    if (empty) {

        showPopup(
            "warning",
            "Warning",
            "Please fill all required fields."
        );

        return;

    }

    const user = auth.currentUser;

    if (!user) {

        showPopup(
            "error",
            "Login Required",
            "Please login first."
        );

        return;

    }

        try {

        const userRef = doc(db, "users", user.uid);

        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {

            showPopup(
                "error",
                "Error",
                "User account not found."
            );

            return;

        }

        const userData = userSnap.data();

        const balance = Number(userData.balance || 0);
        const price = Number(currentService.price || 0);

        if (balance < price) {

            showPopup(
                "error",
                "Insufficient Balance",
                "Your balance is not enough."
            );

            return;

        }

        // Deduct Balance

        await updateDoc(userRef, {

            balance: balance - price

        });

        // Create Order

        await addDoc(collection(db, "orders"), {

            userId: user.uid,
            userEmail: user.email,

            serviceId: serviceId,
            serviceName: currentService.name,
            price: price,

            userInfo: userInfo,

            status: "Pending",

            createdAt: Date.now()

        });

        showPopup(
            "success",
            "Order Placed",
            "Your order has been submitted successfully."
        );

        setTimeout(() => {

            window.location.href = "dashboard.html";

        }, 1500);

    }

    catch (err) {

        console.error(err);

        showPopup(
            "error",
            "Order Failed",
            err.message
        );

    }

}