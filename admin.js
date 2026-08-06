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
let subCategoryEditId = null;
// ===============================
// ADMIN PAGINATION HELPERS
// ===============================
const ADMIN_PAGE_SIZE = 10;
const adminPageState = {
    services: 1,
    orders: 1,
    users: 1,
    balanceRequests: 1
};

function renderAdminPagination(containerId, stateKey, totalItems, onPageChange){
    const box = document.getElementById(containerId);
    if(!box) return;

    const totalPages = Math.max(1, Math.ceil(totalItems / ADMIN_PAGE_SIZE));
    let page = Number(adminPageState[stateKey] || 1);
    if(page > totalPages) page = totalPages;
    if(page < 1) page = 1;
    adminPageState[stateKey] = page;

    if(totalItems <= ADMIN_PAGE_SIZE){
        box.innerHTML = '';
        box.style.display = 'none';
        return;
    }

    const buttons = [];
    const addButton = (label, target, disabled=false, active=false) => {
        buttons.push(`<button type="button" class="admin-page-btn${active?' active':''}" ${disabled?'disabled':''} onclick="${disabled?'return false':`adminGoToPage('${stateKey}',${target})`}">${label}</button>`);
    };

    addButton('Previous', page-1, page === 1);

    const pages = [];
    if(totalPages <= 7){
        for(let i=1;i<=totalPages;i++) pages.push(i);
    }else{
        pages.push(1);
        if(page > 4) pages.push('...');
        const start = Math.max(2, page-1);
        const end = Math.min(totalPages-1, page+1);
        for(let i=start;i<=end;i++) pages.push(i);
        if(page < totalPages-3) pages.push('...');
        pages.push(totalPages);
    }

    pages.forEach(p => {
        if(p === '...') buttons.push('<span class="admin-page-ellipsis">...</span>');
        else addButton(String(p), p, false, p === page);
    });

    addButton('Next', page+1, page === totalPages);

    box.innerHTML = `<div class="admin-pagination-controls">${buttons.join('')}</div><div class="admin-pagination-summary">Showing ${((page-1)*ADMIN_PAGE_SIZE)+1} to ${Math.min(page*ADMIN_PAGE_SIZE,totalItems)} of ${totalItems}</div>`;
    box.style.display = 'block';
}

window.adminGoToPage = function(stateKey, page){
    adminPageState[stateKey] = Number(page) || 1;
    const loaders = {
        services: loadServiceList,
        orders: loadOrders,
        users: loadUsers,
        balanceRequests: loadBalanceRequests
    };
    if(loaders[stateKey]) loaders[stateKey]();
};

// ===============================
// LOAD SERVICES
// ===============================

async function loadServiceList(){
    const table = document.getElementById("serviceList");
    if(!table) return;

    table.innerHTML = `<tr><td colspan="5">Loading services...</td></tr>`;

    try{
        const snapshot = await getDocs(collection(db,"services"));
        const services = snapshot.docs
            .filter(serviceDoc => serviceDoc.data()?.isSpecial !== true)
            .map(serviceDoc => ({ docId: serviceDoc.id, ...(serviceDoc.data() || {}) }));

        const keyword = document.getElementById("searchBox")?.value.toLowerCase().trim() || "";
        const filtered = keyword
            ? services.filter(service => JSON.stringify(service).toLowerCase().includes(keyword))
            : services;

        const totalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
        if(adminPageState.services > totalPages) adminPageState.services = totalPages;
        const page = adminPageState.services;
        const start = (page - 1) * ADMIN_PAGE_SIZE;
        const pageItems = filtered.slice(start, start + ADMIN_PAGE_SIZE);

        if(!pageItems.length){
            table.innerHTML = `<tr><td colspan="5">No services found.</td></tr>`;
        }else{
            table.innerHTML = pageItems.map(service => `
                <tr>
                    <td><code class="service-id-cell">${escapeHtmlAdmin(service.serviceId || service.docId)}</code></td>
                    <td>
                        <img src="${escapeHtmlAdmin(service.image || 'images/no-image.png')}"
                             style="width:60px;height:60px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 5px;"
                             onerror="this.style.display='none'">
                        ${escapeHtmlAdmin(service.name || "")}
                    </td>
                    <td>৳ ${escapeHtmlAdmin(service.price || service.ratePer1000 || 0)}</td>
                    <td>${service.active ? "Active" : "Inactive"}</td>
                    <td class="action-cell">
                        <button class="action-btn" onclick="editService('${service.docId}')">✏️</button>
                        <button class="action-btn" onclick="deleteService('${service.docId}')">🗑️</button>
                    </td>
                </tr>`).join('');
        }

        renderAdminPagination('servicePagination','services',filtered.length,loadServiceList);
    }catch(error){
        console.error('Could not load services:', error);
        table.innerHTML = `<tr><td colspan="5">Could not load services.</td></tr>`;
    }
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

    const serviceId = document.getElementById("serviceId")?.value.trim() || "";
    const name = document.getElementById("serviceName").value.trim();
    const price = document.getElementById("servicePrice").value.trim();
    const ratePer1000 = Number(document.getElementById("serviceRatePer1000")?.value || 0);
    const requiredInfo = document.getElementById("requiredInfo").value.trim();
    const description = document.getElementById("serviceDescription").value.trim();
    const active = document.getElementById("serviceActive").checked;
const category = document.getElementById("serviceCategory").value;
const subCategory = document.getElementById("serviceSubCategory")?.value || "";

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

const apiKey =
    document.getElementById("apiKey").value.trim();
    
    if(!serviceId || !name || (!price && ratePer1000 <= 0)){

        showPopup(
    "warning",
    "Warning",
    "Please fill Service Name and at least one pricing field (Price or Rate per 1000)."
);

        return;

    }

// Custom Service ID must be unique.
    const idQuery = query(collection(db, "services"), where("serviceId", "==", serviceId));
    const idSnap = await getDocs(idQuery);
    const duplicate = idSnap.docs.some(d => d.id !== editId);
    if (duplicate) {
        showPopup("warning", "Duplicate Service ID", "এই Service ID already exists. Please use another ID.");
        return;
    }

const data = {

    serviceId: serviceId,
     // Keep the provider/API service ID separate. The customer-facing Service ID is the admin-entered serviceId.
     apiServiceId,
    name,
    price: Number(price || 0),
    ratePer1000,
    category,
    subCategory,
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
    apiServiceId,
    apiKey

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
    

    if (document.getElementById("serviceId")) document.getElementById("serviceId").value="";
    document.getElementById("serviceName").value="";
    document.getElementById("servicePrice").value="";
    if (document.getElementById("serviceRatePer1000")) document.getElementById("serviceRatePer1000").value="";
    document.getElementById("serviceCategory").value = "";
    if (document.getElementById("serviceSubCategory")) document.getElementById("serviceSubCategory").value = "";
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

    document.getElementById("serviceId").value = service.serviceId || id;
    document.getElementById("serviceName").value = service.name;
    document.getElementById("servicePrice").value = service.price;
    if (document.getElementById("serviceRatePer1000")) document.getElementById("serviceRatePer1000").value = service.ratePer1000 || "";
    document.getElementById("serviceCategory").value = service.category || "";
    if (document.getElementById("serviceSubCategory")) document.getElementById("serviceSubCategory").value = service.subCategory || service.subcategory || service.sub_category || "";
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

document.getElementById("apiKey").value =
    service.apiKey || "";

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
    if(!table) return;

    table.innerHTML = `<tr><td colspan="5">Loading orders...</td></tr>`;

    try{
        const keyword = document.getElementById("orderSearch")?.value.toLowerCase().trim() || "";
        const snapshot = await getDocs(collection(db,"orders"));
        const orders = snapshot.docs.map(orderDoc => ({
            docId: orderDoc.id,
            ...(orderDoc.data() || {})
        }));

        const getTime = order => {
            const value = order.createdAt || order.created_at || order.timestamp || order.date || order.orderDate;
            if(value && typeof value.toMillis === 'function') return value.toMillis();
            if(value && typeof value.toDate === 'function') return value.toDate().getTime();
            if(typeof value === 'number') return value;
            if(typeof value === 'string'){
                const parsed = Date.parse(value);
                return Number.isNaN(parsed) ? 0 : parsed;
            }
            return 0;
        };
        orders.sort((a,b)=>getTime(b)-getTime(a));

        const filtered = keyword
            ? orders.filter(order => JSON.stringify(order).toLowerCase().includes(keyword))
            : orders;

        let serviceLookup = [];
        try{
            const serviceSnap = await getDocs(collection(db,"services"));
            serviceLookup = serviceSnap.docs.map(serviceDoc => ({docId:serviceDoc.id,...(serviceDoc.data()||{})}));
        }catch(e){ console.warn('Service lookup skipped for admin orders:',e); }

        const resolveServiceId = order => {
            const raw = String(order.serviceId || '').trim();
            const apiId = String(order.apiServiceId || '').trim();
            const name = String(order.serviceName || order.name || '').trim();
            const match = serviceLookup.find(s =>
                (raw && String(s.serviceId || '').trim() === raw) ||
                (raw && s.docId === raw) ||
                (apiId && String(s.apiServiceId || '').trim() === apiId) ||
                (name && String(s.name || '').trim() === name)
            );
            return String(match?.serviceId || raw || '—').trim() || '—';
        };

        const formatDateTime = order => {
            const value = order.createdAt || order.created_at || order.timestamp || order.date || order.orderDate;
            let date = null;
            if(value && typeof value.toDate === 'function') date=value.toDate();
            else if(value && typeof value.toMillis === 'function') date=new Date(value.toMillis());
            else if(value instanceof Date) date=value;
            else if(typeof value === 'number') date=new Date(value);
            else if(typeof value === 'string'){
                const d=new Date(value); if(!Number.isNaN(d.getTime())) date=d;
            }
            return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
        };

        const totalPages = Math.max(1,Math.ceil(filtered.length/ADMIN_PAGE_SIZE));
        if(adminPageState.orders>totalPages) adminPageState.orders=totalPages;
        const page=adminPageState.orders;
        const pageItems=filtered.slice((page-1)*ADMIN_PAGE_SIZE,page*ADMIN_PAGE_SIZE);

        if(!pageItems.length){
            table.innerHTML=`<tr><td colspan="5">No orders found.</td></tr>`;
        }else{
            table.innerHTML=pageItems.map(order=>{
                let info='';
                if(order.userInfo){
                    Object.entries(order.userInfo).forEach(([key,value])=>{
                        info += `<div style="margin-bottom:8px"><b>${escapeHtmlAdmin(key)}</b><br>${escapeHtmlAdmin(value)}</div>`;
                    });
                }
                const serviceId=resolveServiceId(order);
                const serviceName=order.serviceName || order.name || 'Service';
                const orderId=order.docId;
                return `<tr>
                    <td>
                        <span class="admin-order-id-badge">ID: ${escapeHtmlAdmin(serviceId)}</span>
                        <div class="admin-order-service-name">${escapeHtmlAdmin(serviceName)}</div>
                    </td>
                    <td>${info}</td>
                    <td>৳ ${escapeHtmlAdmin(order.price ?? order.totalPrice ?? 0)}</td>
                    <td class="admin-order-date-time">${escapeHtmlAdmin(formatDateTime(order))}</td>
                    <td>${escapeHtmlAdmin(order.status || 'Pending')}</td>
                    <td>
                        <button onclick="updateStatus('${orderId}','Approved')">✅</button>
                        <button onclick="updateStatus('${orderId}','Processing')">⏳</button>
                        <button onclick="updateStatus('${orderId}','Rejected')">❌</button>
                        <button onclick="goToUpload('${orderId}')">📤</button>
                        <button onclick="viewOrder('${orderId}')">👁</button>
                    </td>
                </tr>`;
            }).join('');
        }
        renderAdminPagination('orderPagination','orders',filtered.length,loadOrders);
    }catch(error){
        console.error('Could not load orders:',error);
        table.innerHTML=`<tr><td colspan="5">Could not load orders.</td></tr>`;
    }
}
// ===============================
// LOAD BALANCE REQUESTS
// ===============================

async function loadBalanceRequests(){
    const table=document.getElementById("balanceRequestTable");
    if(!table) return;
    table.innerHTML=`<tr><td colspan="6">Loading transactions...</td></tr>`;
    try{
        const snapshot=await getDocs(collection(db,"balanceRequests"));
        const requests=snapshot.docs.map(d=>({docId:d.id,...(d.data()||{})}));
        requests.sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
        const totalPages=Math.max(1,Math.ceil(requests.length/ADMIN_PAGE_SIZE));
        if(adminPageState.balanceRequests>totalPages) adminPageState.balanceRequests=totalPages;
        const page=adminPageState.balanceRequests;
        const pageItems=requests.slice((page-1)*ADMIN_PAGE_SIZE,page*ADMIN_PAGE_SIZE);
        if(!pageItems.length){
            table.innerHTML=`<tr><td colspan="6">No transactions found.</td></tr>`;
        }else{
            table.innerHTML=pageItems.map(request=>`<tr>
                <td>${escapeHtmlAdmin(request.email||'')}</td>
                <td>৳ ${escapeHtmlAdmin(request.amount||0)}</td>
                <td>${escapeHtmlAdmin(request.method||'')}</td>
                <td><span class="admin-trx-id-badge">${escapeHtmlAdmin(request.trxId||'—')}</span></td>
                <td>${escapeHtmlAdmin(request.status||'Pending')}</td>
                <td>
                    <button onclick="approveBalance('${request.docId}')">✅ Approve</button>
                    <button onclick="rejectBalance('${request.docId}')">❌ Reject</button>
                </td>
            </tr>`).join('');
        }
        renderAdminPagination('balancePagination','balanceRequests',requests.length,loadBalanceRequests);
    }catch(error){
        console.error('Could not load transactions:',error);
        table.innerHTML=`<tr><td colspan="6">Could not load transactions.</td></tr>`;
    }
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

// =========================
// SUB CATEGORY MANAGEMENT
// =========================

async function loadSubCategoryAdminCategories() {
    const selects = [
        document.getElementById("subCategoryAdminCategory"),
        document.getElementById("serviceCategory")
    ].filter(Boolean);
    if (!selects.length) return;
    const snap = await getDocs(collection(db, "categories"));
    const cats = [];
    snap.forEach(d => { const c=d.data()||{}; if(c.name) cats.push(c.name); });
    cats.sort((a,b)=>a.localeCompare(b));
    selects.forEach(select => {
        const current = select.value;
        const first = select.id === "serviceCategory" ? "<option value=\"\">Select Category</option>" : "<option value=\"\">Select Category</option>";
        select.innerHTML = first + cats.map(n=>`<option value="${escapeHtmlAdmin(n)}">${escapeHtmlAdmin(n)}</option>`).join("");
        if (cats.includes(current)) select.value=current;
    });
}

function escapeHtmlAdmin(value) {
    return String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}

async function loadSubCategoryAdminList() {
    const list=document.getElementById("subCategoryList");
    if(!list) return;
    list.innerHTML="<p>Loading sub categories...</p>";
    try {
        const snap=await getDocs(collection(db,"subCategories"));
        if(snap.empty){ list.innerHTML="<p>No sub categories added yet.</p>"; return; }
        list.innerHTML="";
        snap.forEach(d=>{
            const x=d.data()||{};
            const img=x.image||"";
            list.innerHTML += `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;margin-bottom:10px;background:#1f2937;border-radius:10px;">\n                <div style="display:flex;align-items:center;gap:10px;min-width:0;">\n                ${img?`<img src="${escapeHtmlAdmin(img)}" style="width:42px;height:42px;object-fit:cover;border-radius:12px;" onerror="this.style.display='none'">`:''}\n                <div><strong>${escapeHtmlAdmin(x.name||"")}</strong><div style="font-size:12px;opacity:.75;">${escapeHtmlAdmin(x.category||"")}</div></div></div>\n                <div style="display:flex;gap:8px;"><button class="action-btn" onclick="editSubCategory('${d.id}')">✏️</button><button class="action-btn" onclick="deleteSubCategory('${d.id}')">🗑️</button></div>\n            </div>`;
        });
    } catch(e){ console.error(e); list.innerHTML="<p>Failed to load sub categories.</p>"; }
}

async function loadServiceSubCategoryPicker() {
    const select=document.getElementById("serviceSubCategory");
    if(!select) return;
    const category=document.getElementById("serviceCategory")?.value || "";
    const current=select.value;
    const snap=await getDocs(collection(db,"subCategories"));
    const names=[];
    snap.forEach(d=>{const x=d.data()||{}; if(x.name && (!category || x.category===category)) names.push(x.name);});
    // Also keep legacy subcategories already used by services.
    const servicesSnap=await getDocs(collection(db,"services"));
    servicesSnap.forEach(d=>{const x=d.data()||{}; const c=x.category||""; const n=x.subCategory||x.subcategory||x.sub_category||""; if(n && (!category || c===category)) names.push(n);});
    const unique=[...new Set(names)].sort((a,b)=>a.localeCompare(b));
    select.innerHTML='<option value="">No Sub Category</option>'+unique.map(n=>`<option value="${escapeHtmlAdmin(n)}">${escapeHtmlAdmin(n)}</option>`).join("");
    if(unique.includes(current)) select.value=current;
}

window.saveSubCategory = async function(){
    const category=document.getElementById("subCategoryAdminCategory")?.value.trim()||"";
    const name=document.getElementById("subCategoryAdminName")?.value.trim()||"";
    const image=document.getElementById("subCategoryAdminImage")?.value.trim()||"";
    if(!category||!name){ showPopup("warning","Missing Information","Please select a category and enter a sub category name."); return; }
    const snap=await getDocs(collection(db,"subCategories"));
    const duplicate=snap.docs.some(d=>{const x=d.data()||{}; return d.id!==subCategoryEditId && x.category===category && String(x.name||"").toLowerCase()===name.toLowerCase();});
    if(duplicate){showPopup("warning","Duplicate","This sub category already exists under this category.");return;}
    const data={category,name,image,updatedAt:Date.now()};
    if(subCategoryEditId){ await updateDoc(doc(db,"subCategories",subCategoryEditId),data); showPopup("success","Updated","Sub Category updated successfully."); }
    else { data.createdAt=Date.now(); await addDoc(collection(db,"subCategories"),data); showPopup("success","Added","Sub Category added successfully."); }
    subCategoryEditId=null;
    document.getElementById("subCategoryAdminCategory").value="";
    document.getElementById("subCategoryAdminName").value="";
    document.getElementById("subCategoryAdminImage").value="";
    document.getElementById("saveSubCategoryBtn").style.display="inline-block";
    document.getElementById("updateSubCategoryBtn").style.display="none";
    await loadSubCategoryAdminList(); await loadServiceSubCategoryPicker();
};

window.editSubCategory = async function(id){
    const snap=await getDoc(doc(db,"subCategories",id)); if(!snap.exists()) return;
    const x=snap.data()||{}; subCategoryEditId=id;
    document.getElementById("subCategoryAdminCategory").value=x.category||"";
    document.getElementById("subCategoryAdminName").value=x.name||"";
    document.getElementById("subCategoryAdminImage").value=x.image||"";
    document.getElementById("saveSubCategoryBtn").style.display="none";
    document.getElementById("updateSubCategoryBtn").style.display="inline-block";
    document.getElementById("subCategoryAdminName")?.scrollIntoView({behavior:"smooth",block:"center"});
};

window.deleteSubCategory = async function(id){
    showConfirmPopup("Delete Sub Category","Are you sure you want to delete this sub category?",async()=>{
        await deleteDoc(doc(db,"subCategories",id));
        await loadSubCategoryAdminList(); await loadServiceSubCategoryPicker();
        showPopup("success","Deleted","Sub Category deleted successfully.");
    });
};

document.getElementById("serviceCategory")?.addEventListener("change", loadServiceSubCategoryPicker);

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
    await loadSubCategoryAdminCategories();
    await loadSubCategoryAdminList();
    await loadServiceSubCategoryPicker();

});
// =========================
// LOAD ALL USERS
// =========================

async function loadUsers(){
    const table=document.getElementById("usersTable");
    if(!table) return;
    table.innerHTML=`<tr><td colspan="5">Loading users...</td></tr>`;
    try{
        const keyword=document.getElementById("userSearch")?.value.toLowerCase().trim()||"";
        const snapshot=await getDocs(collection(db,"users"));
        const users=snapshot.docs.map(d=>({docId:d.id,...(d.data()||{})}));
        const filtered=keyword ? users.filter(user=>JSON.stringify(user).toLowerCase().includes(keyword)) : users;
        const totalPages=Math.max(1,Math.ceil(filtered.length/ADMIN_PAGE_SIZE));
        if(adminPageState.users>totalPages) adminPageState.users=totalPages;
        const page=adminPageState.users;
        const pageItems=filtered.slice((page-1)*ADMIN_PAGE_SIZE,page*ADMIN_PAGE_SIZE);
        if(!pageItems.length){
            table.innerHTML=`<tr><td colspan="5">No users found.</td></tr>`;
        }else{
            table.innerHTML=pageItems.map(user=>`<tr>
                <td>${escapeHtmlAdmin(user.name||"No Name")}</td>
                <td>${escapeHtmlAdmin(user.email||"")}</td>
                <td>৳ ${escapeHtmlAdmin(user.balance||0)}</td>
                <td>🟢 Active</td>
                <td>
                    <button class="plus-btn" onclick="addBalance('${user.docId}')">➕</button>
                    <button class="minus-btn" onclick="minusBalance('${user.docId}')">➖</button>
                    <button class="view-btn" onclick="viewUser('${user.docId}')">👁</button>
                </td>
            </tr>`).join('');
        }
        renderAdminPagination('userPagination','users',filtered.length,loadUsers);
    }catch(error){
        console.error('Could not load users:',error);
        table.innerHTML=`<tr><td colspan="5">Could not load users.</td></tr>`;
    }
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


document.getElementById("searchBox")?.addEventListener("input", function(){
    adminPageState.services = 1;
    loadServiceList();
});
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

        bkash: document.getElementById("bkashNumber").value.trim(),
        nagad: document.getElementById("nagadNumber").value.trim(),
        rocket: document.getElementById("rocketNumber").value.trim(),
        paymentApiEnabled: document.getElementById("paymentApiEnabled")?.checked || false,
        paymentApiProvider: document.getElementById("paymentApiProvider")?.value || "Bkash",
        paymentApiUrl: document.getElementById("paymentApiUrl")?.value.trim() || "",
        paymentApiKey: document.getElementById("paymentApiKey")?.value.trim() || "",
        paymentApiSecret: document.getElementById("paymentApiSecret")?.value.trim() || "",
        paymentMerchantId: document.getElementById("paymentMerchantId")?.value.trim() || "",
        paymentApiMode: document.getElementById("paymentApiMode")?.value || "sandbox"

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
    const apiEnabled = document.getElementById("paymentApiEnabled");
    if (apiEnabled) apiEnabled.checked = data.paymentApiEnabled === true;
    const provider = document.getElementById("paymentApiProvider");
    if (provider) provider.value = data.paymentApiProvider || "Bkash";
    const apiUrl = document.getElementById("paymentApiUrl");
    if (apiUrl) apiUrl.value = data.paymentApiUrl || "";
    const apiKey = document.getElementById("paymentApiKey");
    if (apiKey) apiKey.value = data.paymentApiKey || "";
    const apiSecret = document.getElementById("paymentApiSecret");
    if (apiSecret) apiSecret.value = data.paymentApiSecret || "";
    const merchant = document.getElementById("paymentMerchantId");
    if (merchant) merchant.value = data.paymentMerchantId || "";
    const mode = document.getElementById("paymentApiMode");
    if (mode) mode.value = data.paymentApiMode || "sandbox";

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
