import { auth, db } from "./firebase-config.js";

import { sendNotification } from "./notification.js";

import {
    collection,
    addDoc,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    updateDoc,
    setDoc,
    query,
    where,
    increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
        window.location.href = "login.html";
        return;
    }

    const data = snap.data();

    if (data.role !== "admin") {
        showPopup(
    "error",
    "Access Denied",
    "You don't have permission to access the Admin Panel."
);

return;
        window.location.href = "dashboard.html";
        return;
    }

});

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    const userRef = doc(db, "users", user.uid);

    const snap = await getDoc(userRef);

    if (!snap.exists()) {

        window.location.href = "login.html";

        return;

    }

    const data = snap.data();

    if (data.role !== "admin") {

        showPopup(
    "error",
    "Access Denied",
    "You don't have permission to access the Admin Panel."
);

return;

        window.location.href = "dashboard.html";

        return;

    }

});

let editId = null;
// ===============================
// LOAD SERVICES
// ===============================

async function loadServiceList(){

    const table = document.getElementById("serviceList");

    if(!table) return;

    table.innerHTML = "";

    const snapshot = await getDocs(collection(db,"services"));

    snapshot.forEach((serviceDoc)=>{

        const service = serviceDoc.data();

        table.innerHTML += `
        <tr>

        <td>
    <img
        src="${service.image}"
        style="
            width:60px;
            height:60px;
            object-fit:cover;
            border-radius:8px;
            display:block;
            margin:0 auto 5px;
        "
    >

    ${service.name}
</td>

            <td>৳ ${service.price}</td>

            <td>${service.active ? "Active" : "Inactive"}</td>

            <td class="action-cell">

    <button class="action-btn"
        onclick="editService('${serviceDoc.id}')">
        ✏️
    </button>

    <button class="action-btn"
        onclick="deleteService('${serviceDoc.id}')">
        🗑️
    </button>

</td>

        </tr>
        `;

    });

}

// =========================
// LOAD SERVICE CATEGORY DROPDOWN
// =========================

async function loadServiceCategories() {

    const select =
        document.getElementById("serviceCategory");

    if (!select) return;

    try {

        const snapshot =
            await getDocs(collection(db, "categories"));

        select.innerHTML = `
            <option value="">Select Category</option>
        `;

        snapshot.forEach((categoryDoc) => {

            const category = categoryDoc.data();

            const option =
                document.createElement("option");

            option.value = category.name;

            option.textContent =
                `${category.icon || "📦"} ${category.name}`;

            select.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Service category load error:",
            error
        );

    }

}

// ===============================
// SAVE SERVICE
// ===============================

window.saveService = async function(){

    const name = document.getElementById("serviceName").value.trim();
    const price = document.getElementById("servicePrice").value.trim();
    const requiredInfo = document.getElementById("requiredInfo").value.trim();
    const description = document.getElementById("serviceDescription").value.trim();
    const active = document.getElementById("serviceActive").checked;
const category = document.getElementById("serviceCategory").value;

const image = document.getElementById("serviceImage").value.trim();

const enableQuantity = document.getElementById("enableQuantity").checked;

const minimumQuantity = Number(
    document.getElementById("minimumQuantity").value || 1
);

const maximumQuantity = Number(
    document.getElementById("maximumQuantity").value || 999999
);

const estimatedDelivery =
    document.getElementById("estimatedDelivery").value.trim();
    
    const apiEnabled =
    document.getElementById("apiEnabled").checked;

const apiUrl =
    document.getElementById("apiUrl").value.trim();

const apiServiceId =
    document.getElementById("apiServiceId").value.trim();
    
    if(!name || !price){

        showPopup(
    "warning",
    "Warning",
    "Please fill all required fields."
);

return;
        return;

    }

const data = {

    name,
    price: Number(price),
    category,
    requiredInfo,
    description,
    active,
    image: image,
    enableQuantity,
    minimumQuantity,
    maximumQuantity,
    estimatedDelivery,
    estimatedDelivery,
apiEnabled,
apiUrl,
apiServiceId

};

    if(editId){

const oldSnap = await getDoc(doc(db,"services",editId));
const oldService = oldSnap.data();

        await updateDoc(doc(db,"services",editId),data);

if (Number(oldService.price) !== Number(price)) {

    const users = await getDocs(collection(db, "users"));

    for (const userDoc of users.docs) {

        const u = userDoc.data();

        if (u.role === "admin") continue;

        await sendNotification(
            userDoc.id,
            "💲 Service Price Updated",
            `${name} এর মূল্য ৳${oldService.price} থেকে ৳${price} করা হয়েছে।`,
            "service"
        );

    }

}

        showPopup(
    "success",
    "Updated",
    "Service updated successfully."
);

        editId = null;
        
        document.getElementById("updateServiceBtn").style.display = "none";
document.getElementById("saveServiceBtn").style.display = "inline-block";

    }else{

        await addDoc(collection(db,"services"),data);
        
        const users = await getDocs(collection(db, "users"));

for (const userDoc of users.docs) {

    const u = userDoc.data();

    if (u.role === "admin") continue;

    await sendNotification(
        userDoc.id,
        "🆕 New Service Added",
        `${name} নামে একটি নতুন সার্ভিস যোগ করা হয়েছে।`,
        "service"
    );

}

        showPopup(
    "success",
    "Success",
    "Service added successfully."
);

    }
    

    document.getElementById("serviceName").value="";
    document.getElementById("servicePrice").value="";
    document.getElementById("serviceCategory").value = "";
    document.getElementById("requiredInfo").value="";
    document.getElementById("serviceDescription").value="";
    document.getElementById("serviceActive").checked=true;

    loadServiceList();

};

// ===============================
// EDIT SERVICE
// ===============================

window.editService = async function(id){

    const snap = await getDoc(doc(db,"services",id));

    if(!snap.exists()) return;

    const service = snap.data();

    document.getElementById("serviceName").value = service.name;
    document.getElementById("servicePrice").value = service.price;
    document.getElementById("serviceCategory").value = service.category || "";
    document.getElementById("requiredInfo").value = service.requiredInfo || "";
    document.getElementById("serviceDescription").value = service.description || "";
    document.getElementById("serviceImage").value = service.image || "";
    document.getElementById("serviceActive").checked = service.active;
    document.getElementById("enableQuantity").checked = service.enableQuantity || false;
    
    document.getElementById("minimumQuantity").value =
    service.minimumQuantity || "";

document.getElementById("maximumQuantity").value =
    service.maximumQuantity || "";

document.getElementById("estimatedDelivery").value =
    service.estimatedDelivery || "";
    
    document.getElementById("apiEnabled").checked =
    service.apiEnabled || false;

document.getElementById("apiUrl").value =
    service.apiUrl || "";

document.getElementById("apiServiceId").value =
    service.apiServiceId || "";

document.getElementById("apiSettings").style.display =
    service.apiEnabled ? "block" : "none";

    editId = id;
    
    document.getElementById("updateServiceBtn").style.display = "inline-block";
document.getElementById("saveServiceBtn").style.display = "none";

};

// ===============================
// DELETE SERVICE
// ===============================

window.deleteService = async function(id){

  showConfirmPopup(
    "Delete Service",
    "Are you sure you want to delete this service?",
    async () => {

        await deleteDoc(doc(db,"services",id));

        showPopup(
            "success",
            "Deleted",
            "Service deleted successfully."
        );

        loadServiceList();
        
        const users = await getDocs(collection(db, "users"));

for (const userDoc of users.docs) {

    const u = userDoc.data();

    if (u.role === "admin") continue;

    await sendNotification(
        userDoc.id,
        "🗑️ Service Removed",
        "একটি সার্ভিস Admin দ্বারা সরিয়ে দেওয়া হয়েছে।",
        "service"
    );

}

    }
);

};
// ===============================
// LOAD ORDERS
// ===============================

async function loadOrders(){

    const table = document.getElementById("orderTable");
    const keyword = document.getElementById("orderSearch")?.value.toLowerCase() || "";

    if(!table) return;

    table.innerHTML = "";

    const snapshot = await getDocs(collection(db,"orders"));

    snapshot.forEach((orderDoc)=>{

        const order = orderDoc.data();

        let info = "";

        const searchText = JSON.stringify(order).toLowerCase();

if(keyword && !searchText.includes(keyword)){
    return;
}

        if(order.userInfo){

            Object.entries(order.userInfo).forEach(([key,value])=>{

                info += `
                <div style="margin-bottom:8px">
                    <b>${key}</b><br>
                    ${value}
                </div>
                `;

            });

        }

        table.innerHTML += `
        <tr>

            <td>${order.serviceName}</td>

            <td>${info}</td>

            <td>৳ ${order.price}</td>

            <td>${order.status}</td>

            <td>

                <button onclick="updateStatus('${orderDoc.id}','Approved')">
                    ✅
                </button>

                <button onclick="updateStatus('${orderDoc.id}','Processing')">
                    ⏳
                </button>

                <button onclick="updateStatus('${orderDoc.id}','Rejected')">
                    ❌
                </button>

                <button onclick="goToUpload('${orderDoc.id}')">
                    📤
                </button>

                <button onclick="viewOrder('${orderDoc.id}')">
    👁
</button>

            </td>

        </tr>
        `;

    });

}
// ===============================
// LOAD BALANCE REQUESTS
// ===============================

async function loadBalanceRequests(){

    const table = document.getElementById("balanceRequestTable");

    if(!table) return;

    table.innerHTML = "";

    const snapshot = await getDocs(collection(db,"balanceRequests"));

    snapshot.forEach((requestDoc)=>{

        const request = requestDoc.data();

        table.innerHTML += `
        <tr>

            <td>${request.email}</td>

            <td>৳ ${request.amount}</td>

            <td>${request.method}</td>

            <td>${request.trxId}</td>

            <td>${request.status}</td>

            <td>

                <button onclick="approveBalance('${requestDoc.id}')">
                    ✅ Approve
                </button>

                <button onclick="rejectBalance('${requestDoc.id}')">
                    ❌ Reject
                </button>

            </td>

        </tr>
        `;

    });

}
// ===============================
// APPROVE BALANCE
// ===============================

window.approveBalance = async function(id){

    const requestRef = doc(db,"balanceRequests",id);

    const requestSnap = await getDoc(requestRef);

    if(!requestSnap.exists()){
        showPopup(
    "error",
    "Error",
    "Request not found."
);

return;
        return;
    }

    const request = requestSnap.data();

    const userRef = doc(db,"users",request.uid);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()){
        showPopup(
    "error",
    "Error",
    "User not found."
);

return;
        return;
    }

    const user = userSnap.data();

    await updateDoc(userRef,{
        balance:(user.balance || 0) + Number(request.amount)
    });

    await updateDoc(requestRef,{
        status:"Approved"
    });
    
    await sendNotification(
    request.uid,
    "💰 Balance Added",
    `আপনার Wallet-এ ৳${request.amount} সফলভাবে যোগ করা হয়েছে।`,
    "balance"
);

    showPopup(
    "success",
    "Approved",
    "Balance approved successfully."
);

    loadBalanceRequests();

}

// ===============================
// REJECT BALANCE
// ===============================

window.rejectBalance = async function(id){

    const requestRef = doc(db,"balanceRequests",id);

    const requestSnap = await getDoc(requestRef);

    if(!requestSnap.exists()){
        alert("Request not found");
        return;
    }

    await updateDoc(requestRef,{
        status:"Rejected"
    });
    
    await sendNotification(
    requestSnap.data().uid,
    "❌ Balance Request Rejected",
    `৳${requestSnap.data().amount} Balance Request বাতিল করা হয়েছে।`,
    "balance"
);

    showPopup(
    "success",
    "Rejected",
    "Balance request rejected."
);

    loadBalanceRequests();

}

// ===============================
// GO TO UPLOAD
// ===============================

window.goToUpload = function(orderId){

    window.location.href = `admin-upload.html?id=${orderId}`;

};
// ===============================
// UPDATE ORDER STATUS
// ===============================

window.updateStatus = async function(id, status){

    try{

        const orderRef = doc(db,"orders",id);

        const orderSnap = await getDoc(orderRef);
        
    if (!orderSnap.exists()) {
    showPopup(
        "error",
        "Error",
        "Order not found."
    );
    return;
}

const order = orderSnap.data();
        
        let title = "";
let message = "";

switch (status) {

    case "Approved":
        title = "✅ Order Accepted";
        message = `আপনার ${order.serviceName} Order গ্রহণ করা হয়েছে।`;
        break;

    case "Processing":
        title = "⏳ Order Processing";
        message = `আপনার ${order.serviceName} Order Processing-এ আছে।`;
        break;

    case "Rejected":
        title = "❌ Order Rejected";
        message = `আপনার ${order.serviceName} Order বাতিল করা হয়েছে।`;
        break;

    case "Completed":
        title = "🎉 Order Completed";
        message = `আপনার ${order.serviceName} Order সফলভাবে সম্পন্ন হয়েছে।`;
        break;

}

        

        // Refund Only Once
        if(status === "Rejected" && order.status !== "Rejected"){

            const userRef = doc(db,"users",order.userId);

            await updateDoc(userRef,{
                balance: increment(Number(order.price))
            });

        }

        await updateDoc(orderRef,{
            status: status
        });
        
        if (title) {
    await sendNotification(
        order.userId,
        title,
        message,
        "order"
    );
}

        showPopup(
    "success",
    "Success",
    "Order status updated."
);

        loadOrders();

    }catch(err){

        console.error(err);

        showPopup(
    "error",
    "Error",
    err.message
);

    }

};

// =========================
// CATEGORY MANAGEMENT
// =========================

async function loadCategories() {

    const list = document.getElementById("categoryList");

    if (!list) return;

    list.innerHTML = "<p>Loading categories...</p>";

    try {

        const snapshot = await getDocs(
            collection(db, "categories")
        );

        // প্রথমবার হলে default categories তৈরি করবে
        if (snapshot.empty) {

            const defaultCategories = [
                {
                    name: "Social Media",
                    icon: "📱"
                },
                {
                    name: "Graphics Design",
                    icon: "🎨"
                },
                {
                    name: "Website",
                    icon: "🌐"
                },
                {
                    name: "AI Services",
                    icon: "🤖"
                },
                {
                    name: "Digital Services",
                    icon: "💻"
                },
                {
                    name: "Other",
                    icon: "📦"
                }
            ];

            for (const category of defaultCategories) {

                await addDoc(
                    collection(db, "categories"),
                    {
                        name: category.name,
                        icon: category.icon,
                        createdAt: Date.now()
                    }
                );

            }

            // আবার load করবে
            return loadCategories();

        }

        list.innerHTML = "";

        snapshot.forEach((categoryDoc) => {

            const category = categoryDoc.data();

            list.innerHTML += `

                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    gap:10px;
                    padding:12px;
                    margin-bottom:10px;
                    background:#1f2937;
                    border-radius:10px;
                ">

                    <div style="font-size:16px;font-weight:bold;">

                        ${category.icon || "📦"}
                        ${category.name}

                    </div>

                    <div style="display:flex;gap:8px;">

                        <button
                            class="action-btn"
                            onclick="editCategory('${categoryDoc.id}')">

                            ✏️

                        </button>

                        <button
                            class="action-btn"
                            onclick="deleteCategory('${categoryDoc.id}')">

                            🗑️

                        </button>

                    </div>

                </div>

            `;

        });

    } catch (error) {

        console.error(error);

        list.innerHTML =
            "<p>Failed to load categories.</p>";

    }

}


// =========================
// ADD CATEGORY
// =========================

window.saveCategory = async function () {

    const name =
        document.getElementById("categoryName")
        .value
        .trim();

    const icon =
        document.getElementById("categoryIcon")
        .value
        .trim();

    if (!name) {

        showPopup(
            "warning",
            "Warning",
            "Please enter category name."
        );

        return;

    }

    await addDoc(
        collection(db, "categories"),
        {
            name: name,
            icon: icon || "📦",
            createdAt: Date.now()
        }
    );

    document.getElementById("categoryName").value = "";
    document.getElementById("categoryIcon").value = "";

    await loadCategories();

    showPopup(
        "success",
        "Success",
        "Category added successfully."
    );

};

// =========================
// BEAUTIFUL EDIT CATEGORY
// =========================

window.editCategory = async function (id) {

    const snap = await getDoc(
        doc(db, "categories", id)
    );

    if (!snap.exists()) return;

    const category = snap.data();

    const oldName = category.name;
    const oldIcon = category.icon || "📦";

    // Remove old modal if already exists
    document.getElementById("editCategoryModal")?.remove();

    // Create modal
    const modal = document.createElement("div");

    modal.id = "editCategoryModal";

    modal.innerHTML = `
        <div class="edit-category-overlay">

            <div class="edit-category-box">

                <button
                    type="button"
                    class="edit-category-close"
                    id="editCategoryClose">
                    ✕
                </button>

                <div class="edit-category-icon">
                    ✏️
                </div>

                <h2>Edit Category</h2>

                <p class="edit-category-subtitle">
                    Update your category information
                </p>

                <label>Category Name</label>

                <input
                    type="text"
                    id="editCategoryName"
                    value="${oldName.replace(/"/g, "&quot;")}"
                    placeholder="Category name"
                >

                <label>Category Icon / Emoji</label>

                <input
                    type="text"
                    id="editCategoryIcon"
                    value="${oldIcon.replace(/"/g, "&quot;")}"
                    placeholder="📱"
                    maxlength="5"
                >

                <div class="edit-category-preview">
                    <span>Preview</span>

                    <div id="editCategoryPreview">
                        ${oldIcon} ${oldName}
                    </div>
                </div>

                <div class="edit-category-buttons">

                    <button
                        type="button"
                        class="edit-category-cancel"
                        id="editCategoryCancel">
                        Cancel
                    </button>

                    <button
                        type="button"
                        class="edit-category-save"
                        id="editCategorySave">
                        ✓ Update Category
                    </button>

                </div>

            </div>

        </div>
    `;

    document.body.appendChild(modal);

    // =========================
    // ADD CSS
    // =========================

    if (!document.getElementById("editCategoryStyle")) {

        const style = document.createElement("style");

        style.id = "editCategoryStyle";

        style.textContent = `

            .edit-category-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.72);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                z-index: 999999;
            }

            .edit-category-box {
                width: 100%;
                max-width: 430px;
                background: #111827;
                border: 1px solid #26364d;
                border-radius: 22px;
                padding: 25px;
                box-sizing: border-box;
                position: relative;
                box-shadow: 0 25px 70px rgba(0,0,0,.55);
                animation: editCategoryPop .22s ease;
            }

            @keyframes editCategoryPop {
                from {
                    opacity: 0;
                    transform: scale(.92) translateY(15px);
                }

                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .edit-category-close {
                position: absolute;
                top: 14px;
                right: 14px;
                width: 38px;
                height: 38px;
                border: none;
                border-radius: 50%;
                background: #1f2937;
                color: #fff;
                font-size: 18px;
                cursor: pointer;
            }

            .edit-category-icon {
                width: 58px;
                height: 58px;
                border-radius: 17px;
                background: #22c55e;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                margin-bottom: 14px;
            }

            .edit-category-box h2 {
                color: #fff;
                margin: 0;
                font-size: 24px;
            }

            .edit-category-subtitle {
                color: #94a3b8;
                margin: 7px 0 22px;
                font-size: 14px;
            }

            .edit-category-box label {
                display: block;
                color: #e5e7eb;
                font-weight: 600;
                margin: 15px 0 8px;
            }

            .edit-category-box input {
                width: 100%;
                box-sizing: border-box;
                padding: 14px;
                border-radius: 12px;
                border: 1px solid #334155;
                outline: none;
                background: #1e293b;
                color: #fff;
                font-size: 16px;
            }

            .edit-category-box input:focus {
                border-color: #22c55e;
                box-shadow: 0 0 0 3px rgba(34,197,94,.12);
            }

            .edit-category-preview {
                margin-top: 18px;
                padding: 13px;
                border-radius: 13px;
                background: #0b1220;
                border: 1px solid #26364d;
            }

            .edit-category-preview span {
                display: block;
                color: #64748b;
                font-size: 12px;
                margin-bottom: 6px;
            }

            #editCategoryPreview {
                color: #fff;
                font-size: 18px;
                font-weight: 700;
            }

            .edit-category-buttons {
                display: flex;
                gap: 10px;
                margin-top: 22px;
            }

            .edit-category-buttons button {
                flex: 1;
                border: none;
                padding: 14px 10px;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 700;
                cursor: pointer;
            }

            .edit-category-cancel {
                background: #1f2937;
                color: #cbd5e1;
            }

            .edit-category-save {
                background: #22c55e;
                color: #fff;
            }

            .edit-category-save:active,
            .edit-category-cancel:active {
                transform: scale(.97);
            }

        `;

        document.head.appendChild(style);
    }

    const nameInput =
        document.getElementById("editCategoryName");

    const iconInput =
        document.getElementById("editCategoryIcon");

    const preview =
        document.getElementById("editCategoryPreview");

    const closeModal = () => {
        modal.remove();
    };

    // =========================
    // LIVE PREVIEW
    // =========================

    function updatePreview() {

        const name =
            nameInput.value.trim() || "Category Name";

        const icon =
            iconInput.value.trim() || "📦";

        preview.textContent =
            `${icon} ${name}`;
    }

    nameInput.addEventListener(
        "input",
        updatePreview
    );

    iconInput.addEventListener(
        "input",
        updatePreview
    );

    // =========================
    // CLOSE
    // =========================

    document
        .getElementById("editCategoryClose")
        .addEventListener("click", closeModal);

    document
        .getElementById("editCategoryCancel")
        .addEventListener("click", closeModal);

    // Click outside modal
    modal
        .querySelector(".edit-category-overlay")
        .addEventListener("click", (e) => {

            if (
                e.target.classList.contains(
                    "edit-category-overlay"
                )
            ) {
                closeModal();
            }

        });

    // =========================
    // UPDATE CATEGORY
    // =========================

    document
        .getElementById("editCategorySave")
        .addEventListener("click", async () => {

            const finalName =
                nameInput.value.trim();

            const finalIcon =
                iconInput.value.trim() || "📦";

            if (!finalName) {

                showPopup(
                    "warning",
                    "Warning",
                    "Please enter category name."
                );

                return;
            }

            const saveButton =
                document.getElementById(
                    "editCategorySave"
                );

            saveButton.disabled = true;
            saveButton.textContent =
                "Updating...";

            try {

                // =========================
                // UPDATE CATEGORY
                // =========================

                await updateDoc(
                    doc(db, "categories", id),
                    {
                        name: finalName,
                        icon: finalIcon
                    }
                );

                // =========================
                // UPDATE OLD SERVICES
                // =========================

                const servicesSnap =
                    await getDocs(
                        collection(db, "services")
                    );

                for (
                    const serviceDoc
                    of servicesSnap.docs
                ) {

                    const service =
                        serviceDoc.data();

                    if (
                        service.category === oldName
                    ) {

                        await updateDoc(
                            doc(
                                db,
                                "services",
                                serviceDoc.id
                            ),
                            {
                                category: finalName
                            }
                        );

                    }

                }

                closeModal();

                await loadCategories();

                showPopup(
                    "success",
                    "Updated",
                    "Category and related services updated successfully."
                );

            } catch (error) {

                console.error(error);

                saveButton.disabled = false;

                saveButton.textContent =
                    "✓ Update Category";

                showPopup(
                    "error",
                    "Error",
                    error.message
                );

            }

        });

};

// =========================
// DELETE CATEGORY
// =========================

window.deleteCategory = async function (id) {

    showConfirmPopup(
        "Delete Category",
        "Are you sure you want to delete this category?",
        async () => {

            await deleteDoc(
                doc(db, "categories", id)
            );

            await loadCategories();

            showPopup(
                "success",
                "Deleted",
                "Category deleted successfully."
            );

        }
    );

};

// ===============================
// PAGE LOAD
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    await loadServiceList();
    await loadOrders();
    await loadBalanceRequests();
    await loadUsers();
    await loadDashboardStats();
    await loadCategories();
    await loadServiceCategories();

});
// =========================
// LOAD ALL USERS
// =========================

async function loadUsers(){

    const table = document.getElementById("usersTable");

    const keyword = document.getElementById("userSearch")?.value.toLowerCase() || "";

    if(!table) return;

    table.innerHTML = "";

    const snapshot = await getDocs(collection(db,"users"));

    snapshot.forEach((doc)=>{

        const user = doc.data();
        
const searchText = JSON.stringify(user).toLowerCase();

if(keyword && !searchText.includes(keyword)){
    return;
}

        table.innerHTML += `


        <tr>

            <td>${user.name || "No Name"}</td>

            <td>${user.email}</td>

            <td>৳ ${user.balance || 0}</td>

            <td>🟢 Active</td>

         <td>

    <button class="plus-btn"
    onclick="addBalance('${doc.id}')">
        ➕
    </button>

    <button class="minus-btn"
    onclick="minusBalance('${doc.id}')">
        ➖
    </button>

    <button class="view-btn"
    onclick="viewUser('${doc.id}')">
        👁
    </button>

</td>

        </tr>

        `;

    });

}

// =========================
// MANAGE USER
// =========================

window.manageUser = async function(userId){

    alert("Manage User: " + userId);

};
// =========================
// ADD BALANCE
// =========================

window.addBalance = async function(userId){

    showInputPopup(
    "Add Balance",
    "Enter Balance Amount",
    async (amount) => {

        if(!amount) return;

        if(isNaN(amount) || Number(amount) <= 0){

            showPopup(
                "warning",
                "Warning",
                "Please enter a valid amount."
            );
            return;
        }

        const userRef = doc(db,"users",userId);

        const userSnap = await getDoc(userRef);

        if(!userSnap.exists()) return;

        const user = userSnap.data();

        await updateDoc(userRef,{
            balance:(user.balance || 0)+Number(amount)
        });
        
        await sendNotification(
    userId,
    "💰 Balance Added",
    `Admin আপনার Wallet-এ ৳${amount} যোগ করেছেন।`,
    "balance"
);


        loadUsers();

        showPopup(
            "success",
            "Success",
            "Balance added successfully."
        );

    }
);

return;

    const userRef = doc(db,"users",userId);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()) return;

    const user = userSnap.data();

    await updateDoc(userRef,{
        balance:(user.balance || 0)+Number(amount)
    });

    loadUsers();

    showPopup(
    "success",
    "Success",
    "Balance added successfully."
);

};
// =========================
// MINUS BALANCE
// =========================

window.minusBalance = async function(userId){

    showInputPopup(
    "Deduct Balance",
    "Enter Balance Amount",
    async (amount) => {

        if(!amount) return;

        if(isNaN(amount) || Number(amount) <= 0){

            showPopup(
                "warning",
                "Warning",
                "Please enter a valid amount."
            );
            return;
        }

        const userRef = doc(db,"users",userId);

        const userSnap = await getDoc(userRef);

        if(!userSnap.exists()) return;

        const user = userSnap.data();

        const currentBalance = user.balance || 0;

        if(Number(amount) > currentBalance){

            showPopup(
                "error",
                "Insufficient Balance",
                "User has insufficient balance."
            );
            return;
        }

        await updateDoc(userRef,{
            balance: currentBalance - Number(amount)
        });
        
        await sendNotification(
    userId,
    "💸 Balance Deducted",
    `Admin আপনার Wallet থেকে ৳${amount} কেটে নিয়েছেন।`,
    "balance"
);

        loadUsers();

        showPopup(
            "success",
            "Success",
            "Balance deducted successfully."
        );

    }
);

return;

    const userRef = doc(db,"users",userId);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()) return;

    const user = userSnap.data();

    const currentBalance = user.balance || 0;

    if(Number(amount) > currentBalance){

        showPopup(
    "error",
    "Insufficient Balance",
    "User has insufficient balance."
);

return;

        return;

    }

    await updateDoc(userRef,{

        balance: currentBalance - Number(amount)

    });

    loadUsers();

    showPopup(
    "success",
    "Success",
    "Balance deducted successfully."
);

};
// =========================
// VIEW USER
// =========================

window.viewUser = async function(userId){

    const userRef = doc(db,"users",userId);

    const userSnap = await getDoc(userRef);

    if(!userSnap.exists()) return;

    const user = userSnap.data();

    document.getElementById("userDetails").innerHTML = `

        <p><b>👤 Name:</b> ${user.name || "-"}</p>

        <p><b>📧 Email:</b> ${user.email || "-"}</p>

        <p><b>💰 Balance:</b> ৳ ${user.balance || 0}</p>

        <p><b>🟢 Status:</b> Active</p>

    `;

    document.getElementById("userModal").style.display = "block";

};

// =========================
// CLOSE USER MODAL
// =========================

window.closeUserModal = function(){

    document.getElementById("userModal").style.display = "none";

};
// =========================
// VIEW ORDER
// =========================

window.viewOrder = async function(orderId){

    const orderRef = doc(db,"orders",orderId);

    const orderSnap = await getDoc(orderRef);

    if(!orderSnap.exists()){

        showPopup(
    "error",
    "Error",
    "Order not found."
);

return;

        return;

    }

const order = orderSnap.data();

    let info = "";

    if(order.userInfo){

        Object.entries(order.userInfo).forEach(([key,value])=>{

            info += `
                <p><b>${key}:</b> ${value}</p>
            `;

        });

    }

    document.getElementById("orderDetails").innerHTML = `

    <p><b>📦 Service:</b> ${order.serviceName}</p>

    <p><b>💰 Price:</b> ৳ ${order.price}</p>

${order.quantity ? `<p><b>🔢 Quantity:</b> ${order.quantity}</p>` : ""}

<p><b>📌 Status:</b> ${order.status}</p>

    <hr>

    <h4>User Information</h4>

    ${info}

    <hr>

    <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">

        <button onclick="updateStatus('${orderId}','Approved')">
            ✅ Approve
        </button>

        <button onclick="updateStatus('${orderId}','Processing')">
            ⏳ Processing
        </button>

        <button onclick="updateStatus('${orderId}','Rejected')">
            ❌ Reject
        </button>

        <button onclick="goToUpload('${orderId}')">
            📤 Upload
        </button>

    </div>

`;

    document.getElementById("orderModal").style.display = "block";

};

// =========================
// CLOSE ORDER MODAL
// =========================

window.closeOrderModal = function(){

    document.getElementById("orderModal").style.display = "none";

};
// =========================
// DASHBOARD STATS
// =========================

async function loadDashboardStats(){

    // Total Users
    const usersSnap = await getDocs(collection(db,"users"));
    document.getElementById("totalUsers").innerText = usersSnap.size;

    // Total Orders
    const ordersSnap = await getDocs(collection(db,"orders"));
    document.getElementById("totalOrders").innerText = ordersSnap.size;

    // Total Services
    const servicesSnap = await getDocs(collection(db,"services"));
    document.getElementById("totalServices").innerText = servicesSnap.size;

    // =========================
// TOTAL REVENUE
// =========================

let revenue = 0;

ordersSnap.forEach((doc)=>{

    const order = doc.data();

    if(order.status === "Completed"){

        revenue += Number(order.price || 0);

    }

});

document.getElementById("totalRevenue").innerText = "৳" + revenue;

// =========================
// TODAY & MONTH REVENUE
// =========================

let todayRevenue = 0;
let monthRevenue = 0;

const today = new Date();

ordersSnap.forEach((doc)=>{

    const order = doc.data();

    if(order.status !== "Completed") return;

    const orderDate = new Date(
    order.createdAt ||
    order.date ||
    order.timestamp ||
    order.orderDate ||
    Date.now()
);
console.log(orderDate);
console.log(today);

    // Today
    if (orderDate.toDateString() === today.toDateString()) {
        todayRevenue += Number(order.price || 0);
    }

    // This Month
    if(
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getFullYear() === today.getFullYear()
    ){
        monthRevenue += Number(order.price || 0);
    }

});

document.getElementById("todayRevenue").innerText = "৳" + todayRevenue;
document.getElementById("monthRevenue").innerText = "৳" + monthRevenue;

drawRevenueChart(todayRevenue, monthRevenue, revenue);

// =========================
// TOTAL USER BALANCE
// =========================

let totalBalance = 0;

usersSnap.forEach((doc)=>{

    const user = doc.data();

    totalBalance += Number(user.balance || 0);

});

function drawMonthlyRevenueChart(monthlyData){

    const canvas = document.getElementById("monthlyRevenueChart");

    if(!canvas) return;

    if(monthlyRevenueChart){

        monthlyRevenueChart.destroy();

    }

    monthlyRevenueChart = new Chart(canvas,{

        type:"line",

        data:{

            labels:[
                "Jan","Feb","Mar","Apr","May","Jun",
                "Jul","Aug","Sep","Oct","Nov","Dec"
            ],

            datasets:[{

                label:"Monthly Revenue",

                data:monthlyData,

                borderColor:"#22c55e",

                backgroundColor:"rgba(34,197,94,.20)",

                fill:true,

                tension:.4

            }]

        },

        options:{

            responsive:true,

            plugins:{

                legend:{

                    labels:{

                        color:"#fff"

                    }

                }

            },

            scales:{

                x:{
                    ticks:{
                        color:"#fff"
                    }
                },

                y:{
                    ticks:{
                        color:"#fff"
                    }
                }

            }

        }

    });

}

// =========================
// MONTHLY REVENUE
// =========================

const monthlyRevenue = new Array(12).fill(0);

ordersSnap.forEach((doc)=>{

    const order = doc.data();

    if(order.status !== "Completed") return;

    const orderDate = new Date(
    order.createdAt ||
    order.date ||
    order.timestamp ||
    order.orderDate ||
    Date.now()
);

    const month = orderDate.getMonth();

    monthlyRevenue[month] += Number(order.price || 0);

});

drawMonthlyRevenueChart(monthlyRevenue);


document.getElementById("pendingBalance").innerText = "৳" + totalBalance;


// =========================
// PENDING REQUESTS
// =========================

const balanceSnap = await getDocs(collection(db,"balanceRequests"));

let pending = 0;

balanceSnap.forEach((doc)=>{

    const data = doc.data();

    if(data.status !== "Approved"){

        pending++;

    }

});

document.getElementById("pendingRequests").innerText = pending;

}

// =========================
// USER SEARCH
// =========================

document.getElementById("userSearch")?.addEventListener("input", function(){

    loadUsers();

});

// =========================
// ORDER SEARCH
// =========================

document.getElementById("orderSearch")?.addEventListener("input", function(){

    loadOrders();

});

// =========================
// REVENUE CHART
// =========================

let revenueChart = null;

let monthlyRevenueChart = null;

function drawRevenueChart(todayRevenue, monthRevenue, totalRevenue){

    const canvas = document.getElementById("revenueChart");

    if(!canvas) return;

    if(revenueChart){

        revenueChart.destroy();

    }

    revenueChart = new Chart(canvas,{

        type:"bar",

        data:{

            labels:[
                "Today",
                "This Month",
                "Total"
            ],

            datasets:[{

                label:"Revenue (৳)",

                data:[
                    todayRevenue,
                    monthRevenue,
                    totalRevenue
                ],

                backgroundColor:[
                    "#22c55e",
                    "#3b82f6",
                    "#f59e0b"
                ],

                borderRadius:8

            }]

        },

        options:{

            responsive:true,

            plugins:{
                legend:{
                    display:false
                }
            },

            scales:{
                y:{
                    beginAtZero:true
                }
            }

        }

    });

}
window.savePaymentSettings = async function () {

    await setDoc(doc(db,"settings","payment"),{

        bkash: document.getElementById("bkashNumber").value,

        nagad: document.getElementById("nagadNumber").value,

        rocket: document.getElementById("rocketNumber").value

    });

    showPopup(
    "success",
    "Success",
    "Payment settings saved successfully."
);

}
async function loadPaymentSettings(){

    const snap = await getDoc(doc(db,"settings","payment"));

    if(!snap.exists()) return;

    const data = snap.data();

    document.getElementById("bkashNumber").value = data.bkash || "";

    document.getElementById("nagadNumber").value = data.nagad || "";

    document.getElementById("rocketNumber").value = data.rocket || "";

}

loadPaymentSettings();

// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.onclick = () => {

        showConfirmPopup(
            "Logout",
            "Are you sure you want to logout?",
            async () => {

                await auth.signOut(); // অথবা await signOut(auth);

                localStorage.removeItem("admin");

                window.location.href = "login.html";

            }
        );

    };

}
// =========================
// ADMIN NOTICE
// =========================

window.postNotice = async function () {

    const text = document.getElementById("noticeText").value.trim();

    if (!text) {

        showPopup(
            "warning",
            "Warning",
            "Please write a notice."
        );
        return;
    }

    await setDoc(doc(db, "settings", "notice"), {
        text: text,
        updatedAt: Date.now()
    });
    
    const users = await getDocs(collection(db, "users"));

for (const userDoc of users.docs) {

    const user = userDoc.data();

    if (user.role === "admin") continue;

    await sendNotification(
        userDoc.id,
        "📢 New Notice",
        text,
        "notice"
    );

}

    document.getElementById("noticeText").value = "";

    loadNotice();

    showPopup(
        "success",
        "Success",
        "Notice posted successfully."
    );
};

async function loadNotice() {

    const latest = document.getElementById("latestNotice");

    if (!latest) return;

    const snap = await getDoc(doc(db, "settings", "notice"));

    if (!snap.exists()) {

        latest.innerHTML = "No notice posted.";
        return;
    }

    latest.innerHTML = snap.data().text;
}

loadNotice();

document.getElementById("apiEnabled")?.addEventListener("change", function () {

    const box =
        document.getElementById("apiSettings");

    if (!box) return;

    box.style.display =
        this.checked ? "block" : "none";

});