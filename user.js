import { auth, db } from "./firebase-config.js";
import { sendNotification } from "./notification.js";
import {
    doc,
    getDoc,
    collection,
    addDoc,
    updateDoc,
    getDocs,
query,
where
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

        const serviceTitle = document.getElementById("serviceTitle");
        const serviceNameText = document.getElementById("serviceNameText");
        const serviceDescription = document.getElementById("serviceDescription");
        const rateDisplay = document.getElementById("rateDisplay");
        const deliveryDisplay = document.getElementById("deliveryDisplay");
        const quantityLimitText = document.getElementById("quantityLimitText");

        if (serviceTitle) serviceTitle.textContent = currentService.name || "Service";
        if (serviceNameText) serviceNameText.textContent = currentService.name || "Service";
        if (serviceDescription) serviceDescription.textContent =
            currentService.description || "Fast & reliable social media service.";

        const ratePer1000 = Number(currentService.ratePer1000 || 0);
        const legacyPrice = Number(currentService.price || 0);

        if (rateDisplay) {
            rateDisplay.textContent = ratePer1000 > 0
                ? "৳ " + ratePer1000.toLocaleString() + " / 1000"
                : "৳ " + legacyPrice.toLocaleString();
        }

        if (deliveryDisplay) {
            deliveryDisplay.textContent = "Automatic";
        }

        const serviceImage = document.getElementById("serviceImage");
        if (serviceImage) {
            serviceImage.src = currentService.image || "images/no-image.png";
        }
            
            const deliveryBox = document.getElementById("deliveryBox");
const quantityLimit = document.getElementById("quantityLimit");
const quantityInput = document.getElementById("quantity");

if (currentService.enableQuantity) {

    deliveryBox.style.display = "block";
    quantityLimit.style.display = "block";

    document.getElementById("estimatedDelivery").value =
        "Automatic";

    quantityLimit.innerHTML =
        `Minimum: ${currentService.minimumQuantity} | Maximum: ${currentService.maximumQuantity}`;

    quantityInput.min = currentService.minimumQuantity || 1;
    quantityInput.max = currentService.maximumQuantity || 999999;
    quantityInput.value = currentService.minimumQuantity || 1;

} else {

    deliveryBox.style.display = "none";
    quantityLimit.style.display = "none";

}
            
            updateTotalPrice();
 
        const image = document.getElementById("serviceImage");

        if (image) {

            image.src =
                currentService.image ||
                "images/no-image.png";

        }

        loadRequiredFields(currentService.requiredInfo);
        
        document.getElementById("quantity").addEventListener("input", updateTotalPrice);

updateTotalPrice();
        
        const quantityBox = document.getElementById("quantityBox");

if (quantityBox) {

    quantityBox.style.display =
        currentService.enableQuantity ? "block" : "none";

}

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
        const quantity = currentService.enableQuantity
    ? Number(document.getElementById("quantity").value || 1)
    : 1;

const ratePer1000 = Number(currentService.ratePer1000 || 0);
const price = ratePer1000 > 0
    ? (ratePer1000 * quantity) / 1000
    : Number(currentService.price || 0) * quantity;

if (currentService.enableQuantity) {

    if (quantity < Number(currentService.minimumQuantity || 1)) {

        showPopup(
            "warning",
            "Minimum Quantity",
            `Minimum quantity is ${currentService.minimumQuantity}.`
        );

        return;

    }

    if (quantity > Number(currentService.maximumQuantity || 999999)) {

        showPopup(
            "warning",
            "Maximum Quantity",
            `Maximum quantity is ${currentService.maximumQuantity}.`
        );

        return;

    }

}


        if (balance < price) {

            showPopup(
                "error",
                "Insufficient Balance",
                "Your balance is not enough."
            );

            return;

        }

        // ===============================
        // AUTOMATIC API SUBMISSION
        // ===============================
        let apiOrderId = null;
        let finalStatus = "Pending";

        if (currentService.apiEnabled === true) {

            const apiUrl = (currentService.apiUrl || "").trim();
            const apiServiceId = String(currentService.apiServiceId || "").trim();

            if (!apiUrl || !apiServiceId) {
                showPopup(
                    "error",
                    "API Configuration Missing",
                    "This service is enabled for automatic delivery, but its API settings are incomplete."
                );
                return;
            }

            const link = findApiLink(userInfo);
            const comments = findApiComments(userInfo);

            if (!link) {
                showPopup(
                    "error",
                    "Target Link Missing",
                    "For automatic delivery, add a required field such as Link or URL and enter the target link."
                );
                return;
            }

            try {
                const apiEndpoint = /\/order$/i.test(apiUrl) ? apiUrl : apiUrl.replace(/\/$/, "") + "/order";

                const apiResponse = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        provider: "safollow",
                        service: apiServiceId,
                        link: link,
                        quantity: quantity,
                        comments: comments || ""
                    })
                });

                const apiData = await apiResponse.json().catch(() => ({}));

                if (!apiResponse.ok || apiData.error || !apiData.order) {
                    throw new Error(apiData.error || "Automatic API order could not be created.");
                }

                apiOrderId = String(apiData.order);
                finalStatus = "Processing";

            } catch (apiError) {
                console.error("Automatic API error:", apiError);
                showPopup(
                    "error",
                    "Automatic Order Failed",
                    apiError.message || "The provider API did not accept this order."
                );
                return;
            }
        }

        // Deduct Balance only after API submission succeeds (or for manual services).
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
            quantity: quantity,
            userInfo: userInfo,
            status: finalStatus,
            apiEnabled: currentService.apiEnabled === true,
            apiOrderId: apiOrderId,
            apiProxyUrl: currentService.apiUrl || "",
            createdAt: Date.now()
        });
        await sendNotification(
    user.uid,
    "📦 Order Submitted",
    `Your ${currentService.name} (${quantity}) order has been received successfully. Our team will review it shortly.`,
    "order"
);
// Notify all admins
const adminQuery = query(
    collection(db, "users"),
    where("role", "==", "admin")
);

const adminSnap = await getDocs(adminQuery);

for (const adminDoc of adminSnap.docs) {

    await sendNotification(
    adminDoc.id,
    "📥 New Order Received",
    `${userData.name || user.email} placed a new ${currentService.name} (${quantity}) order.`,
    "order"
);

}

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


function findApiLink(userInfo) {
    const entries = Object.entries(userInfo || {});
    for (const [label, value] of entries) {
        if (/link|url|profile|target|username|user name/i.test(label) && /^https?:\/\//i.test(String(value).trim())) {
            return String(value).trim();
        }
    }
    for (const [, value] of entries) {
        const text = String(value || "").trim();
        if (/^https?:\/\//i.test(text)) return text;
    }
    return "";
}

function findApiComments(userInfo) {
    const entries = Object.entries(userInfo || {});
    for (const [label, value] of entries) {
        if (/comment|comments|keyword/i.test(label)) return String(value || "").trim();
    }
    return "";
}

function updateTotalPrice() {

    if (!currentService) return;

    const qty = Number(document.getElementById("quantity").value || 1);

    const ratePer1000 = Number(currentService.ratePer1000 || 0);
    const total = ratePer1000 > 0
        ? (ratePer1000 * qty) / 1000
        : Number(currentService.price || 0) * qty;

    document.getElementById("totalPrice").value = "৳" + total.toFixed(2);

}