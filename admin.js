import { auth, db } from "./firebase-config.js";

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

// ===============================
// SAVE SERVICE
// ===============================

window.saveService = async function(){

    const name = document.getElementById("serviceName").value.trim();
    const price = document.getElementById("servicePrice").value.trim();
    const requiredInfo = document.getElementById("requiredInfo").value.trim();
    const description = document.getElementById("serviceDescription").value.trim();
    const active = document.getElementById("serviceActive").checked;

const image = document.getElementById("serviceImage").value.trim();

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
    requiredInfo,
    description,
    active,
    image: image

};

    if(editId){

        await updateDoc(doc(db,"services",editId),data);

        showPopup(
    "success",
    "Updated",
    "Service updated successfully."
);

        editId = null;

    }else{

        await addDoc(collection(db,"services"),data);

        showPopup(
    "success",
    "Success",
    "Service added successfully."
);

    }

    document.getElementById("serviceName").value="";
    document.getElementById("servicePrice").value="";
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
    document.getElementById("requiredInfo").value = service.requiredInfo || "";
    document.getElementById("serviceDescription").value = service.description || "";
    document.getElementById("serviceImage").value = service.image || "";
    document.getElementById("serviceActive").checked = service.active;

    editId = id;

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
// ===============================
// PAGE LOAD
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    await loadServiceList();
    await loadOrders();
    await loadBalanceRequests();
    await loadUsers();
    await loadDashboardStats();

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

    if(!order.createdAt) return;

    const orderDate = new Date(Number(order.createdAt));

    // Today
    if(
        orderDate.getDate() === today.getDate() &&
        orderDate.getMonth() === today.getMonth() &&
        orderDate.getFullYear() === today.getFullYear()
    ){
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

    if(!order.createdAt) return;

    const orderDate = new Date(order.createdAt);

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

// =========================
// LOGOUT
// =========================

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

    await signOut(auth);

    window.location.href = "login.html";

});

}// =========================
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
