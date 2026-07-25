import { auth, db } from "./firebase-config.js";

import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    addDoc,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =========================
// Go To Order
// =========================

window.goToOrder = function(id){
    window.location.href = `user.html?id=${id}`;
};

// =========================
// Load Dashboard
// =========================

window.onload = async function(){

    // Load Services
    const serviceList = document.getElementById("serviceList");

    if(serviceList){

        serviceList.innerHTML = "";

        const snapshot = await getDocs(collection(db,"services"));

        snapshot.forEach((doc)=>{

            const service = doc.data();

            if(service.active){

               serviceList.innerHTML += `

<div class="service-card">

    <img
        src="${service.image || 'images/no-image.png'}"
        alt="${service.name}"
        class="service-img">

    <h3>${service.name}</h3>

    <p>৳ ${service.price}</p>

    <button
        class="green-btn"
        onclick="goToOrder('${doc.id}')">

        Order Now

    </button>

</div>

`;

            }

        });

    }

    // Load Orders After Login
    onAuthStateChanged(auth,(user)=>{

     if(user){

    loadMyOrders(user.uid);

    loadUserBalance(user.uid);

    loadTransactionHistory(user.uid);

}
    });

};

// =========================
// My Orders
// =========================

async function loadMyOrders(uid){

    const table = document.getElementById("myOrders");

    if(!table) return;

    table.innerHTML = "";

    const q = query(

        collection(db,"orders"),

        where("userId","==",uid)

    );

    const snapshot = await getDocs(q);

    if(snapshot.empty){

        table.innerHTML = `
        <tr>

        <td colspan="3">

        No Orders Found

        </td>

        </tr>
        `;

        return;

    }

    snapshot.forEach((doc)=>{

        const order = doc.data();

  table.innerHTML += `

<tr>

<td>${order.serviceName}</td>

<td>৳ ${order.price}</td>

<td>
${
    order.status === "Pending"
    ? "🟡 Pending"

    : order.status === "Processing"
    ? "🔵 Processing"

    : order.status === "Approved"
    ? "🟢 Approved"

    : order.status === "Completed"
    ? "✅ Completed"

    : "🔴 Rejected"
}
</td>

<td>
${
    order.resultLink
        ? `<a href="${order.resultLink}" target="_blank">📥 Download</a>`
        : "—"
}
</td>

</tr>
`;

    });
    
    }

    // =========================
// LOAD USER BALANCE
// =========================

async function loadUserBalance(uid){

    const balanceText = document.getElementById("userBalance");

    if(!balanceText) return;

    const snap = await getDoc(doc(db,"users",uid));

    if(!snap.exists()) return;

    const user = snap.data();

    document.getElementById("userName").innerText =
    user.name || "User";

    balanceText.innerText = "৳ " + (user.balance || 0);

}

window.openBalancePopup = function () {

    document.getElementById("balancePopup").style.display = "flex";

    loadPaymentNumber();

};

window.closeBalancePopup = function () {

    document.getElementById("balancePopup").style.display = "none";

};

async function loadPaymentNumber(){

    const snap = await getDoc(doc(db,"settings","payment"));

    if(!snap.exists()) return;

    const data = snap.data();

    const method = document.getElementById("paymentMethod").value;

    const box = document.getElementById("paymentNumber");

    if(method==="Bkash"){
        box.innerHTML="Bkash Number : "+data.bkash;
    }

    if(method==="Nagad"){
        box.innerHTML="Nagad Number : "+data.nagad;
    }

    if(method==="Rocket"){
        box.innerHTML="Rocket Number : "+data.rocket;
    }

}

window.submitBalanceRequest = async function () {

    const method = document.getElementById("paymentMethod").value;
    const amount = document.getElementById("balanceAmount").value.trim();
    const trxId = document.getElementById("trxId").value.trim();

    if (!amount || !trxId) {
        alert("Please fill all fields.");
        return;
    }

    const user = auth.currentUser;

    if (!user) {
        alert("Please login again.");
        return;
    }

    try {

        await addDoc(collection(db, "balanceRequests"), {

            uid: user.uid,
            email: user.email,

            method: method,
            amount: Number(amount),
            trxId: trxId,

            status: "Pending",

            createdAt: Date.now()

        });

        alert("✅ Balance Request Submitted");

        document.getElementById("balanceAmount").value = "";
        document.getElementById("trxId").value = "";

        closeBalancePopup();

    } catch (err) {

        console.error(err);
        alert(err.message);

    }

};
function openBalancePopup() {

    document.getElementById("balancePopup").style.display = "flex";

    loadPaymentNumber();

}

function closeBalancePopup() {

    document.getElementById("balancePopup").style.display = "none";

}
// Logout
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {

        await auth.signOut();

        localStorage.removeItem("user");

        window.location.href = "login.html";

    });
}
function updateDateTime(){

    const now = new Date();

    const options = {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric"
    };

    const date = now.toLocaleDateString("en-GB", options);

    const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    const box = document.getElementById("dateTime");

    if(box){
        box.innerHTML = `${date} | ${time}`;
    }

}

updateDateTime();

setInterval(updateDateTime,1000);

window.viewTransaction = async function(id){

    const snap = await getDoc(doc(db,"balanceRequests",id));

    if(!snap.exists()) return;

    const t = snap.data();

    const date = new Date(t.createdAt);

    document.getElementById("tDate").innerText = date.toLocaleString();

    document.getElementById("tType").innerText = "Add Balance";

    document.getElementById("tMethod").innerText = t.method;

    document.getElementById("tTrx").innerText = t.trxId;

    document.getElementById("tAmount").innerText = "৳ " + t.amount;

    document.getElementById("tStatus").innerText = t.status;

    document.getElementById("transactionPopup").style.display="flex";

}

window.closeTransactionPopup=function(){

    document.getElementById("transactionPopup").style.display="none";

}
async function loadTransactionHistory(uid){

    const table = document.getElementById("transactionTable");

    if(!table) return;

    table.innerHTML="";

  const q = query(
    collection(db,"balanceRequests"),
    where("uid","==",uid)
);

    const snapshot=await getDocs(q);

    snapshot.forEach((doc)=>{

        const t=doc.data();

        let badge="";

        if(t.status==="Approved")
            badge='<span class="status-approved">🟢 Approved</span>';

        else if(t.status==="Pending")
            badge='<span class="status-pending">🟡 Pending</span>';

        else
            badge='<span class="status-rejected">🔴 Rejected</span>';

        const date=new Date(t.createdAt);

        table.innerHTML+=`

        <tr>

        <td>${date.toLocaleString()}</td>

        <td>Add Balance</td>

        <td>${t.method}</td>

        <td>${t.trxId}</td>

        <td>+৳${t.amount}</td>

        <td>${badge}</td>

        <td>

            <button class="view-btn"
            onclick="viewTransaction('${doc.id}')">

            👁 View

            </button>

        </td>

        </tr>

        `;

    });

}
window.loadPaymentNumber = async function(){

    const snap = await getDoc(doc(db,"settings","payment"));

    if(!snap.exists()) return;

    const data = snap.data();

    const method = document.getElementById("paymentMethod").value;
    const box = document.getElementById("paymentNumber");

    if(method==="Bkash"){
        box.innerHTML = "📲 Bkash: " + data.bkash;
    }else if(method==="Nagad"){
        box.innerHTML = "📲 Nagad: " + data.nagad;
    }else{
        box.innerHTML = "📲 Rocket: " + data.rocket;
    }

}
// =========================
// PROFILE PAGE
// =========================

const profileBtn = document.getElementById("profileBtn");

if (profileBtn) {

    profileBtn.addEventListener("click", () => {

        window.location.href = "profile.html";

    });

}