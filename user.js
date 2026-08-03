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
// SMALL HELPERS
// =====================================

function el(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const node = el(id);
    if (node) node.textContent = value ?? "";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// =====================================
// INIT
// =====================================

window.addEventListener("DOMContentLoaded", () => {
    const orderButton = el("placeOrderBtn");

    if (orderButton) {
        orderButton.addEventListener("click", placeOrder);
    }

    if (!serviceId) {
        showPopup("error", "Service Not Found", "Invalid service link.");
        return;
    }

    loadService();
});

// =====================================
// LOAD SERVICE
// =====================================

async function loadService() {
    try {
        const snap = await getDoc(doc(db, "services", serviceId));

        if (!snap.exists()) {
            showPopup("error", "Service Not Found", "This service does not exist.");
            return;
        }

        currentService = {
            ...snap.data(),
            id: snap.id
        };

        setText("serviceTitle", currentService.name || "Service");
        setText("serviceNameText", currentService.name || "Service");
        const descriptionNode = el("serviceDescription");
        const serviceDescription = String(currentService.description || "").trim();
        if (descriptionNode) {
            descriptionNode.textContent = serviceDescription;
            descriptionNode.style.display = serviceDescription ? "block" : "none";
        }

        const image = el("serviceImage");
        if (image) {
            image.src = currentService.image || "images/no-image.png";
            image.onerror = () => {
                image.src = "images/no-image.png";
            };
        }

        const ratePer1000 = Number(currentService.ratePer1000 || 0);
        const legacyPrice = Number(currentService.price || 0);

        setText(
            "rateDisplay",
            ratePer1000 > 0
                ? "৳ " + ratePer1000.toLocaleString() + " / 1000"
                : "৳ " + legacyPrice.toLocaleString()
        );

        // Delivery is always shown as Automatic as requested.
        setText("deliveryDisplay", "Automatic");

        configureQuantity();
        loadRequiredFields(currentService.requiredInfo);
        updateTotalPrice();

        const quantityInput = el("quantity");
        if (quantityInput) {
            quantityInput.addEventListener("input", updateTotalPrice);
            quantityInput.addEventListener("change", updateTotalPrice);
        }

    } catch (err) {
        console.error("loadService error:", err);
        showPopup(
            "error",
            "Database Error",
            err?.message || "Unable to load the service."
        );
    }
}

// =====================================
// QUANTITY UI
// =====================================

function configureQuantity() {
    const enabled = currentService?.enableQuantity === true;

    const quantitySection = el("quantitySection");
    const quantityMeta = el("quantityMeta");
    const quantityLimit = el("quantityLimit");
    const quantityInput = el("quantity");

    if (quantitySection) {
        quantitySection.style.display = enabled ? "block" : "none";
    }

    if (quantityMeta) {
        quantityMeta.style.display = enabled ? "block" : "none";
    }

    if (!quantityInput) {
        return;
    }

    if (!enabled) {
        quantityInput.value = "1";
        quantityInput.removeAttribute("min");
        quantityInput.removeAttribute("max");

        if (quantityLimit) {
            quantityLimit.textContent = "";
            quantityLimit.style.display = "none";
        }

        return;
    }

    const min = Math.max(1, Number(currentService.minimumQuantity || 1));
    const max = Math.max(min, Number(currentService.maximumQuantity || 999999));

    quantityInput.min = String(min);
    quantityInput.max = String(max);
    quantityInput.value = String(min);

    setText("quantityLimitText", `${min.toLocaleString()} / ${max.toLocaleString()}`);

    if (quantityLimit) {
        quantityLimit.textContent =
            `Minimum: ${min.toLocaleString()} | Maximum: ${max.toLocaleString()}`;
        quantityLimit.style.display = "block";
    }
}

// =====================================
// REQUIRED INFORMATION
// =====================================

function loadRequiredFields(requiredInfo) {
    const container = el("dynamicFields");
    const section = el("requiredInfoSection");

    if (!container) return;

    container.innerHTML = "";

    // Admin enters one required field per line.
    const raw = String(requiredInfo || "").trim();

    if (!raw) {
        if (section) section.style.display = "none";
        return;
    }

    const fields = raw
        .split(/\r?\n/)
        .map(field => field.trim())
        .filter(Boolean);

    if (!fields.length) {
        if (section) section.style.display = "none";
        return;
    }

    fields.forEach((field, index) => {
        const safeField = escapeHtml(field);

        container.insertAdjacentHTML(
            "beforeend",
            `
            <div class="dynamicField">
                <label for="required_${index}">${safeField}</label>
                <input
                    type="text"
                    id="required_${index}"
                    class="dynamicInput"
                    data-label="${safeField}"
                    placeholder="${safeField}"
                    autocomplete="off">
            </div>
            `
        );
    });

    if (section) section.style.display = "block";
}

// =====================================
// PLACE ORDER
// =====================================

async function placeOrder() {
    if (!currentService) {
        showPopup("error", "Error", "Service not loaded.");
        return;
    }

    const inputs = document.querySelectorAll(".dynamicInput");
    const userInfo = {};
    let empty = false;

    inputs.forEach(input => {
        const value = input.value.trim();
        const label = input.dataset.label || "Required Information";

        if (!value) empty = true;
        userInfo[label] = value;
    });

    if (empty) {
        showPopup("warning", "Warning", "Please fill all required fields.");
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        showPopup("error", "Login Required", "Please login first.");
        return;
    }

    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            showPopup("error", "Error", "User account not found.");
            return;
        }

        const userData = userSnap.data();
        const balance = Number(userData.balance || 0);

        const quantityEnabled = currentService.enableQuantity === true;
        const quantityInput = el("quantity");

        const quantity = quantityEnabled
            ? Number(quantityInput?.value || currentService.minimumQuantity || 1)
            : 1;

        if (!Number.isFinite(quantity) || quantity < 1) {
            showPopup("warning", "Invalid Quantity", "Please enter a valid quantity.");
            return;
        }

        if (quantityEnabled) {
            const min = Math.max(1, Number(currentService.minimumQuantity || 1));
            const max = Math.max(min, Number(currentService.maximumQuantity || 999999));

            if (quantity < min) {
                showPopup(
                    "warning",
                    "Minimum Quantity",
                    `Minimum quantity is ${min}.`
                );
                return;
            }

            if (quantity > max) {
                showPopup(
                    "warning",
                    "Maximum Quantity",
                    `Maximum quantity is ${max}.`
                );
                return;
            }
        }

        const ratePer1000 = Number(currentService.ratePer1000 || 0);
        const basePrice = Number(currentService.price || 0);

        let price;

        if (quantityEnabled) {
            if (ratePer1000 > 0) {
                price = (ratePer1000 * quantity) / 1000;
            } else if (basePrice > 0) {
                price = basePrice * quantity;
            } else {
                price = 0;
            }
        } else {
            // Either pricing field may be used for a non-quantity service.
            price = basePrice > 0 ? basePrice : ratePer1000;
        }

        if (!Number.isFinite(price) || price < 0) {
            showPopup("error", "Invalid Price", "This service has an invalid price.");
            return;
        }

        if (balance < price) {
            showPopup(
                "error",
                "Insufficient Balance",
                "Your balance is not enough."
            );
            return;
        }

        // =====================================
        // AUTOMATIC API SUBMISSION
        // =====================================

        let apiOrderId = null;
        let finalStatus = "Pending";

        if (currentService.apiEnabled === true) {
            const apiUrl = String(currentService.apiUrl || "").trim();
            const apiServiceId = String(currentService.apiServiceId || "").trim();
            const apiKey = String(currentService.apiKey || "").trim();

            if (!apiUrl || !apiServiceId || !apiKey) {
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
                const apiEndpoint =
                    /\/order$/i.test(apiUrl)
                        ? apiUrl
                        : apiUrl.replace(/\/$/, "") + "/order";

                const apiResponse = await fetch(apiEndpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        provider: "safollow",
                        apiKey,
                        service: apiServiceId,
                        link,
                        quantity,
                        comments: comments || ""
                    })
                });

                const apiData = await apiResponse.json().catch(() => ({}));

                if (!apiResponse.ok || apiData.error || !apiData.order) {
                    throw new Error(
                        apiData.error || "Automatic API order could not be created."
                    );
                }

                apiOrderId = String(apiData.order);
                finalStatus = "Processing";

            } catch (apiError) {
                console.error("Automatic API error:", apiError);
                showPopup(
                    "error",
                    "Automatic Order Failed",
                    apiError?.message || "The provider API did not accept this order."
                );
                return;
            }
        }

        // Deduct only after API submission succeeds.
        await updateDoc(userRef, {
            balance: balance - price
        });

        await addDoc(collection(db, "orders"), {
            userId: user.uid,
            userEmail: user.email,
            serviceId,
            serviceName: currentService.name || "Service",
            price,
            quantity,
            quantityEnabled,
            userInfo,
            status: finalStatus,
            delivery: "Automatic",
            apiEnabled: currentService.apiEnabled === true,
            apiOrderId,
            apiProxyUrl: currentService.apiUrl || "",
            apiKey: currentService.apiKey || "",
            apiServiceId: currentService.apiServiceId || "",
            createdAt: Date.now()
        });

        // User notification.
        await sendNotification(
            user.uid,
            "📦 Order Submitted",
            `Your ${currentService.name || "service"} (${quantity}) order has been received successfully.`,
            "order"
        );

        // Admin notifications.
        const adminSnap = await getDocs(
            query(collection(db, "users"), where("role", "==", "admin"))
        );

        for (const adminDoc of adminSnap.docs) {
            await sendNotification(
                adminDoc.id,
                "📥 New Order Received",
                `${userData.name || user.email} placed a new ${currentService.name || "service"} (${quantity}) order.`,
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

    } catch (err) {
        console.error("placeOrder error:", err);

        showPopup(
            "error",
            "Order Failed",
            err?.message || "Unable to place the order."
        );
    }
}

// =====================================
// API HELPERS
// =====================================

function findApiLink(userInfo) {
    const entries = Object.entries(userInfo || {});

    for (const [label, value] of entries) {
        if (
            /link|url|profile|target|username|user name/i.test(label) &&
            /^https?:\/\//i.test(String(value).trim())
        ) {
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
        if (/comment|comments|keyword/i.test(label)) {
            return String(value || "").trim();
        }
    }

    return "";
}

// =====================================
// TOTAL PRICE
// =====================================

function updateTotalPrice() {
    if (!currentService) return;

    const quantityEnabled = currentService.enableQuantity === true;
    const qty = quantityEnabled
        ? Number(el("quantity")?.value || currentService.minimumQuantity || 1)
        : 1;

    const ratePer1000 = Number(currentService.ratePer1000 || 0);
    const basePrice = Number(currentService.price || 0);

    let total;
    if (quantityEnabled) {
        if (ratePer1000 > 0) {
            total = (ratePer1000 * qty) / 1000;
        } else if (basePrice > 0) {
            total = basePrice * qty;
        } else {
            total = 0;
        }
    } else {
        total = basePrice > 0 ? basePrice : ratePer1000;
    }

    const totalInput = el("totalPrice");
    if (totalInput) {
        totalInput.value = "৳" + Number(total || 0).toFixed(2);
    }
}
