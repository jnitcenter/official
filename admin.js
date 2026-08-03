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
    increment,
    arrayUnion,
    onSnapshot
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

        if (service.isSpecial === true) return;

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

            option.textContent = category.name;

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
    const ratePer1000 = Number(document.getElementById("serviceRatePer1000")?.value || 0);
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
    
    if(!name || (!price && ratePer1000 <= 0)){

        showPopup(
    "warning",
    "Warning",
    "Please fill Service Name and at least one pricing field (Price or Rate per 1000)."
);

        return;

    }

const data = {

    name,
    price: Number(price || 0),
    ratePer1000,
    category,
    requiredInfo,
    description,
    active,
    image: image,
    enableQuantity,
    minimumQuantity,
    maximumQuantity,
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
    if (document.getElementById("serviceRatePer1000")) document.getElementById("serviceRatePer1000").value="";
    document.getElementById("serviceCategory").value = "";
    document.getElementById("requiredInfo").value="";
    document.getElementById("serviceDescription").value="";
    document.getElementById("serviceActive").checked=true;
    document.getElementById("enableQuantity").checked=false;
    document.getElementById("quantitySettings").style.display="none";

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
    if (document.getElementById("serviceRatePer1000")) document.getElementById("serviceRatePer1000").value = service.ratePer1000 || "";
    document.getElementById("serviceCategory").value = service.category || "";
    document.getElementById("requiredInfo").value = service.requiredInfo || "";
    document.getElementById("serviceDescription").value = service.description || "";
    document.getElementById("serviceImage").value = service.image || "";
    document.getElementById("serviceActive").checked = service.active;
    document.getElementById("enableQuantity").checked = service.enableQuantity || false;
    document.getElementById("quantitySettings").style.display = service.enableQuantity ? "block" : "none";
    
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
// SPECIAL SERVICES MANAGEMENT
// ===============================

let specialEditId = null;

async function loadSpecialServiceList(){

    const table = document.getElementById("specialServiceList");
    if(!table) return;

    table.innerHTML = "";

    const search = (document.getElementById("specialSearchBox")?.value || "")
        .toLowerCase()
        .trim();

    const snapshot = await getDocs(collection(db,"services"));

    snapshot.forEach((serviceDoc)=>{

        const service = serviceDoc.data();

        if(service.isSpecial !== true) return;

        if(search && !(service.name || "").toLowerCase().includes(search)) return;

        table.innerHTML += `
        <tr>
            <td>
                <img
                    src="${service.image || 'images/no-image.png'}"
                    style="width:60px;height:60px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 5px;">
                ${service.name || ""}
            </td>
            <td>৳ ${service.price || 0}</td>
            <td>${service.active ? "Active" : "Inactive"}</td>
            <td class="action-cell">
                <button class="action-btn" onclick="editSpecialService('${serviceDoc.id}')">✏️</button>
                <button class="action-btn" onclick="deleteSpecialService('${serviceDoc.id}')">🗑️</button>
            </td>
        </tr>`;
    });
}

window.saveSpecialService = async function(){

    const name = document.getElementById("specialServiceName").value.trim();
    const price = Number(document.getElementById("specialServicePrice").value || 0);
    const requiredInfo = document.getElementById("specialRequiredInfo").value.trim();
    const description = document.getElementById("specialServiceDescription").value.trim();
    const image = document.getElementById("specialServiceImage").value.trim();
    const active = document.getElementById("specialServiceActive").checked;
    const enableQuantity = document.getElementById("specialEnableQuantity").checked;
    const minimumQuantity = Number(document.getElementById("specialMinimumQuantity").value || 1);
    const maximumQuantity = Number(document.getElementById("specialMaximumQuantity").value || 999999);
    const estimatedDelivery = document.getElementById("specialEstimatedDelivery").value.trim();

    if(!name){
        showPopup("warning","Missing Information","Please enter a special service name.");
        return;
    }

    const data = {
        name,
        price,
        requiredInfo,
        description,
        image,
        active,
        enableQuantity,
        minimumQuantity,
        maximumQuantity,
        estimatedDelivery,
        isSpecial: true,
        createdAt: new Date()
    };

    try{

        if(specialEditId){

            await updateDoc(doc(db,"services",specialEditId),data);

            showPopup("success","Updated","Special service updated successfully.");

            specialEditId = null;
            document.getElementById("updateSpecialServiceBtn").style.display = "none";
            document.getElementById("saveSpecialServiceBtn").style.display = "inline-block";

        }else{

            await addDoc(collection(db,"services"),data);

            showPopup("success","Added","Special service added successfully.");
        }

        clearSpecialServiceForm();
        await loadSpecialServiceList();
        await loadServiceList();

    }catch(err){

        console.error(err);
        showPopup("error","Error",err.message);

    }
};

window.editSpecialService = async function(id){

    try{

        const snap = await getDoc(doc(db,"services",id));

        if(!snap.exists()) return;

        const service = snap.data();

        specialEditId = id;

        document.getElementById("specialServiceName").value = service.name || "";
        document.getElementById("specialServicePrice").value = service.price || "";
        document.getElementById("specialRequiredInfo").value = service.requiredInfo || "";
        document.getElementById("specialServiceDescription").value = service.description || "";
        document.getElementById("specialServiceImage").value = service.image || "";
        document.getElementById("specialServiceActive").checked = service.active !== false;
        document.getElementById("specialEnableQuantity").checked = service.enableQuantity || false;
        document.getElementById("specialMinimumQuantity").value = service.minimumQuantity || "";
        document.getElementById("specialMaximumQuantity").value = service.maximumQuantity || "";
        document.getElementById("specialEstimatedDelivery").value = service.estimatedDelivery || "";

        document.getElementById("specialQuantitySettings").style.display =
            service.enableQuantity ? "block" : "none";

        document.getElementById("saveSpecialServiceBtn").style.display = "none";
        document.getElementById("updateSpecialServiceBtn").style.display = "inline-block";

        document.querySelector(".special-service-management")?.scrollIntoView({
            behavior:"smooth",
            block:"start"
        });

    }catch(err){

        console.error(err);
        showPopup("error","Error",err.message);

    }
};

window.deleteSpecialService = async function(id){

    const ok = confirm("Delete this special service?");

    if(!ok) return;

    try{

        await deleteDoc(doc(db,"services",id));

        showPopup("success","Deleted","Special service deleted successfully.");

        await loadSpecialServiceList();

    }catch(err){

        console.error(err);
        showPopup("error","Error",err.message);

    }
};

function clearSpecialServiceForm(){

    document.getElementById("specialServiceName").value = "";
    document.getElementById("specialServicePrice").value = "";
    document.getElementById("specialRequiredInfo").value = "";
    document.getElementById("specialServiceDescription").value = "";
    document.getElementById("specialServiceImage").value = "";
    document.getElementById("specialServiceActive").checked = true;
    document.getElementById("specialEnableQuantity").checked = false;
    document.getElementById("specialMinimumQuantity").value = "";
    document.getElementById("specialMaximumQuantity").value = "";
    document.getElementById("specialEstimatedDelivery").value = "";
    document.getElementById("specialQuantitySettings").style.display = "none";
}

document.getElementById("specialEnableQuantity")?.addEventListener("change", function(){

    const box = document.getElementById("specialQuantitySettings");

    if(box){
        box.style.display = this.checked ? "block" : "none";
    }

});

document.getElementById("specialSearchBox")?.addEventListener("input", loadSpecialServiceList);

document.addEventListener("DOMContentLoaded", () => {
    loadSpecialServiceList();
});

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

        if (snapshot.empty) {

            const defaultCategories = [
                { name: "Social Media" },
                { name: "Graphics Design" },
                { name: "Website" },
                { name: "AI Services" },
                { name: "Digital Services" },
                { name: "Other" }
            ];

            for (const category of defaultCategories) {

                await addDoc(
                    collection(db, "categories"),
                    {
                        name: category.name,
                        createdAt: Date.now()
                    }
                );

            }

            return loadCategories();
        }

        list.innerHTML = "";

        snapshot.forEach((categoryDoc) => {

            const category = categoryDoc.data();

            let categoryImage = String(
                category.image ||
                category.imageUrl ||
                category.picture ||
                category.categoryImage ||
                category.iconUrl ||
                category.iconImage ||
                ""
            ).trim();

            const safeImage = categoryImage
                .replace(/&/g,"&amp;")
                .replace(/"/g,"&quot;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;");

            const safeName = String(
                category.name || ""
            )
                .replace(/&/g,"&amp;")
                .replace(/</g,"&lt;")
                .replace(/>/g,"&gt;");

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

                    <div style="
                        display:flex;
                        align-items:center;
                        gap:10px;
                        font-size:16px;
                        font-weight:bold;
                        min-width:0;
                    ">

                        ${
                            categoryImage
                            ? `<img
                                src="${safeImage}"
                                alt=""
                                style="
                                    width:42px;
                                    height:42px;
                                    object-fit:cover;
                                    border-radius:12px;
                                    border:1px solid #334155;
                                    background:#0f172a;
                                "
                                onerror="this.style.display='none'"
                            >`
                            : ""
                        }

                        <span>${safeName}</span>

                    </div>

                    <div style="
                        display:flex;
                        gap:8px;
                    ">

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

    const imageInput =
        document.getElementById("categoryImage");

    const image =
        imageInput?.value.trim() || "";

    // Category name required
    if (!name) {

        showPopup(
            "warning",
            "Warning",
            "Please enter category name."
        );

        return;
    }

    // Add category to Firestore
    await addDoc(
        collection(db, "categories"),
        {
            name: name,
            image: image,
            imageUrl: image,
            iconUrl: image,
            createdAt: Date.now()
        }
    );

    // Clear inputs
    document.getElementById("categoryName").value = "";

    if (imageInput) {
        imageInput.value = "";
    }

    // Reload category list
    await loadCategories();

    showPopup(
        "success",
        "Success",
        "Category added successfully."
    );
};

// =========================
// EDIT CATEGORY
// =========================

window.editCategory = async function (id) {

    const snap = await getDoc(
        doc(db, "categories", id)
    );

    if (!snap.exists()) return;

    const category = snap.data();

    const oldName = String(
        category.name || ""
    ).trim();

    const oldImage = String(
        category.image ||
        category.imageUrl ||
        category.picture ||
        category.categoryImage ||
        category.iconUrl ||
        category.iconImage ||
        ""
    ).trim();

    // Remove old modal
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

                <label>Category Picture URL</label>

                <input
                    type="url"
                    id="editCategoryImage"
                    value="${oldImage.replace(/"/g, "&quot;")}"
                    placeholder="https://example.com/category-image.jpg"
                >

                <div class="edit-category-preview">

                    <span>Preview</span>

                    <div id="editCategoryPreview">

                        ${
                            oldImage
                            ? `
                                <div style="
                                    display:flex;
                                    align-items:center;
                                    gap:10px;
                                ">

                                    <img
                                        src="${oldImage.replace(/"/g, "&quot;")}"
                                        alt=""
                                        style="
                                            width:42px;
                                            height:42px;
                                            object-fit:cover;
                                            border-radius:12px;
                                            background:#19314a;
                                        "
                                        onerror="this.style.display='none'"
                                    >

                                    <span>${oldName}</span>

                                </div>
                            `
                            : `
                                <span>${oldName}</span>
                            `
                        }

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
    width: min(480px, 92%);
    max-height: 82vh;
    overflow-y: auto;
    background: #111827;
    border: 1px solid #334155;
    border-radius: 24px;
    padding: 24px;
    position: relative;
    box-shadow: 0 25px 70px rgba(0,0,0,.5);
}

            .edit-category-close {
                position: absolute;
                top: 26px;
                right: 26px;
                width: 74px;
                height: 74px;
                border: none;
                border-radius: 50%;
                background: #1e293b;
                color: white;
                font-size: 36px;
                cursor: pointer;
            }

            .edit-category-icon {
    width: 80px;
    height: 80px;
    border-radius: 22px;
    background: #22c55e;
    display: grid;
    place-items: center;
    font-size: 38px;
    margin-bottom: 20px;
}

            .edit-category-box h2 {
                margin: 0;
                color: white;
                font-size: 32px;
            }

            .edit-category-subtitle {
    color: #94a3b8;
    font-size: 17px;
    margin: 8px 0 25px;
}

            .edit-category-box label {
    display: block;
    color: #e5e7eb;
    font-size: 17px;
    font-weight: bold;
    margin: 14px 0 8px;
}

            .edit-category-box input {
                width: 100%;
                box-sizing: border-box;
                padding: 15px;
                border-radius: 16px;
                border: 1px solid #334155;
                background: #1e293b;
                color: white;
                font-size: 17px;
                outline: none;
            }

            .edit-category-box input:focus {
                border-color: #22c55e;
            }

            .edit-category-preview {
                margin-top: 15px;
                padding: 15px;
                border: 1px solid #334155;
                border-radius: 20px;
                background: #0b1220;
            }

            .edit-category-preview > span {
                display: block;
                color: #64748b;
                margin-bottom: 12px;
            }

            #editCategoryPreview {
                color: white;
                font-size: 22px;
                font-weight: bold;
            }

            .edit-category-buttons {
                display: flex;
                gap: 18px;
                margin-top: 30px;
            }

            .edit-category-buttons button {
    flex: 1;
    min-height: 58px;
    border: none;
    border-radius: 16px;
    font-size: 17px;
    font-weight: bold;
    cursor: pointer;
}

            .edit-category-cancel {
                background: #1e293b;
                color: white;
            }

            .edit-category-save {
                background: #22c55e;
                color: white;
            }

            @media (max-width: 600px) {

    .edit-category-box {
        width: 90%;
        max-height: 82vh;
        padding: 20px 18px;
        border-radius: 22px;
    }

    .edit-category-close {
        width: 52px;
        height: 52px;
        top: 16px;
        right: 16px;
        font-size: 26px;
    }

    .edit-category-icon {
        width: 70px;
        height: 70px;
        border-radius: 18px;
        font-size: 32px;
        margin-bottom: 16px;
    }

    .edit-category-box h2 {
        font-size: 30px;
        line-height: 1.15;
        margin: 0;
    }

    .edit-category-subtitle {
        font-size: 16px;
        margin: 7px 0 20px;
    }

    .edit-category-box label {
        font-size: 16px;
        margin: 12px 0 7px;
    }

    .edit-category-box input {
        padding: 14px;
        border-radius: 15px;
        font-size: 16px;
    }

    .edit-category-preview {
        margin-top: 13px;
        padding: 13px;
        border-radius: 16px;
    }

    .edit-category-buttons {
        gap: 10px;
        margin-top: 20px;
    }

    .edit-category-buttons button {
        min-height: 54px;
        border-radius: 15px;
        font-size: 16px;
    }
            }

        `;

        document.head.appendChild(style);
    }


    // =========================
    // INPUTS
    // =========================

    const nameInput =
        document.getElementById("editCategoryName");

    const imageInput =
        document.getElementById("editCategoryImage");

    const preview =
        document.getElementById("editCategoryPreview");


    // =========================
    // CLOSE MODAL
    // =========================

    const closeModal = () => {
        modal.remove();
    };


    // =========================
    // LIVE PREVIEW
    // =========================

    function updatePreview() {

        const name =
            nameInput.value.trim() ||
            "Category Name";

        const image =
            imageInput?.value.trim() || "";

        preview.innerHTML = image
            ? `
                <div style="
                    display:flex;
                    align-items:center;
                    gap:10px;
                ">

                    <img
                        src="${image.replace(/"/g, "&quot;")}"
                        alt=""
                        style="
                            width:42px;
                            height:42px;
                            object-fit:cover;
                            border-radius:12px;
                            background:#19314a;
                        "
                        onerror="this.style.display='none'"
                    >

                    <span>${name}</span>

                </div>
            `
            : `<span>${name}</span>`;
    }


    nameInput.addEventListener(
        "input",
        updatePreview
    );

    imageInput?.addEventListener(
        "input",
        updatePreview
    );


    // =========================
    // CLOSE BUTTONS
    // =========================

    document
        .getElementById("editCategoryClose")
        .addEventListener(
            "click",
            closeModal
        );

    document
        .getElementById("editCategoryCancel")
        .addEventListener(
            "click",
            closeModal
        );


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
        .addEventListener(
            "click",
            async () => {

                const finalName =
                    nameInput.value.trim();

                const finalImage =
                    imageInput?.value.trim() || "";


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

                    // Update category
                    await updateDoc(
                        doc(
                            db,
                            "categories",
                            id
                        ),
                        {
                            name: finalName,
                            image: finalImage,
                            imageUrl: finalImage,
                            iconUrl: finalImage
                        }
                    );


                    // Update old services
                    const servicesSnap =
                        await getDocs(
                            collection(
                                db,
                                "services"
                            )
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

            }
        );

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

document.getElementById("enableQuantity")?.addEventListener("change", function () {

    const box = document.getElementById("quantitySettings");
    if (!box) return;

    box.style.display = this.checked ? "block" : "none";

});

// Keep quantity settings hidden until the admin enables quantity.
const quantityToggle = document.getElementById("enableQuantity");
const quantitySettings = document.getElementById("quantitySettings");
if (quantityToggle && quantitySettings) {
    quantitySettings.style.display = quantityToggle.checked ? "block" : "none";
}

document.getElementById("apiEnabled")?.addEventListener("change", function () {

    const box =
        document.getElementById("apiSettings");

    if (!box) return;

    box.style.display =
        this.checked ? "block" : "none";

});

// ===============================
// LIVE SUPPORT CENTER
// ===============================
let adminSupportChatsUnsub = null;
let adminSupportActiveUnsub = null;
let adminSupportActiveId = null;

function supportEsc(value){
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}

function renderAdminSupportMessages(messages){
    const box=document.getElementById("supportAdminMessages");
    if(!box) return;
    if(!messages.length){
        box.innerHTML='<div class="support-admin-empty">No messages yet.</div>';
        return;
    }
    box.innerHTML=messages.map(m=>`
        <div class="support-admin-msg ${m.senderRole === "admin" ? "admin" : "user"}">
            <div class="support-admin-bubble">${supportEsc(m.text)}</div>
            <small>${m.senderRole === "admin" ? "You (Admin)" : "Customer"}</small>
        </div>
    `).join("");
    box.scrollTop=box.scrollHeight;
}

function openAdminSupportChat(id, chat){
    adminSupportActiveId=id;
    document.querySelectorAll('.support-chat-item').forEach(el=>el.classList.toggle('active',el.dataset.chatId===id));
    const header=document.getElementById('supportAdminHeaderText');
    const conversation=document.querySelector('.support-admin-conversation');
    conversation?.classList.remove('admin-support-hidden');
    if(header) header.innerHTML=`🎧 ${supportEsc(chat.userName || chat.userEmail || 'Customer')} <small style="color:#94a3b8">${supportEsc(chat.userEmail || '')}</small>`;
    if(adminSupportActiveUnsub) adminSupportActiveUnsub();
    adminSupportActiveUnsub=onSnapshot(doc(db,'supportChats',id),snap=>{
        renderAdminSupportMessages((snap.data()?.messages)||[]);
    });
}

function loadAdminSupportChats(){
    const list=document.getElementById('supportChatList');
    if(!list) return;
    if(adminSupportChatsUnsub) adminSupportChatsUnsub();
    adminSupportChatsUnsub=onSnapshot(collection(db,'supportChats'),snap=>{
        const chats=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
        if(!chats.length){list.innerHTML='<div class="support-admin-empty">No support conversations yet.</div>';return;}
        list.innerHTML=chats.map(c=>{
            const last=(c.messages||[]).slice(-1)[0];
            const lastSender = last?.senderRole === 'admin' ? 'You (Admin)' : 'Customer';
            const lastClass = last?.senderRole === 'admin' ? 'last-from-admin' : 'last-from-user';
            return `<button class="support-chat-item ${lastClass} ${adminSupportActiveId===c.id?'active':''}" data-chat-id="${c.id}" type="button">
                <strong>🎧 ${supportEsc(c.userName || c.userEmail || 'Customer')}</strong>
                <small><span class="support-last-sender">${last ? supportEsc(lastSender) + ':' : ''}</span>${supportEsc(last?.text || 'New conversation')}</small>
            </button>`;
        }).join('');
        list.querySelectorAll('.support-chat-item').forEach(btn=>btn.addEventListener('click',()=>{
            const c=chats.find(x=>x.id===btn.dataset.chatId);
            if(c) openAdminSupportChat(c.id,c);
        }));
        if(!adminSupportActiveId && chats[0]) openAdminSupportChat(chats[0].id,chats[0]);
    });
}

window.closeAdminSupportChat = function(){
    const conversation = document.querySelector('.support-admin-conversation');
    conversation?.classList.add('admin-support-hidden');

    if(adminSupportActiveUnsub){
        adminSupportActiveUnsub();
        adminSupportActiveUnsub = null;
    }

    adminSupportActiveId = null;

    document.querySelectorAll('.support-chat-item').forEach(el => el.classList.remove('active'));

    const header = document.getElementById('supportAdminHeaderText');
    if(header) header.textContent = 'Select a customer';

    const box = document.getElementById('supportAdminMessages');
    if(box) box.innerHTML = '<div class="support-admin-empty">Select a conversation to reply.</div>';
};

window.sendAdminSupportMessage=async function(){
    const input=document.getElementById('supportAdminInput');
    const text=(input?.value||'').trim();
    const user=auth.currentUser;
    if(!text || !user || !adminSupportActiveId) return;
    const chatRef=doc(db,'supportChats',adminSupportActiveId);
    await updateDoc(chatRef,{
        messages:arrayUnion({
            id:crypto.randomUUID(),
            senderId:user.uid,
            senderRole:'admin',
            text,
            createdAt:Date.now()
        }),
        updatedAt:Date.now(),
        lastSender:'admin'
    });

    try {
        await sendNotification(adminSupportActiveId,"🎧 Admin Replied", "Admin replied to your support message.", "support");
    } catch (notifyError) {
        console.warn("Support reply notification failed:", notifyError);
    }

    input.value='';
};

window.addEventListener('DOMContentLoaded',()=>{
    loadAdminSupportChats();
    document.getElementById('supportAdminInput')?.addEventListener('keydown',e=>{
        if(e.key==='Enter' && !e.shiftKey){e.preventDefault();window.sendAdminSupportMessage();}
    });
    document.getElementById('closeAdminSupportBtn')?.addEventListener('click', window.closeAdminSupportChat);
});
