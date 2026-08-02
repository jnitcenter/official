import { auth, db } from "./firebase-config.js";
import { sendNotification } from "./notification.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    query,
    where,
    addDoc,
    orderBy,
    setDoc,
    updateDoc,
    arrayUnion,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =========================
// Go To Order
// =========================

window.goToOrder = function (id) {

    if (!id) {

        showPopup(
            "error",
            "Error",
            "Invalid Service."
        );

        return;

    }

    window.location.href = `user.html?id=${id}`;

};

// =========================
// Load Dashboard
// =========================
window.addEventListener("DOMContentLoaded", async () => {

    async function loadServices() {

        const serviceList = document.getElementById("serviceList");
        const filter = document.getElementById("categoryFilter");
        if (!serviceList) return;

        serviceList.innerHTML = `<div class="smm-loading">Loading services...</div>`;

        try {
            const snapshot = await getDocs(collection(db, "services"));
            const searchInput = document.getElementById("serviceSearch");
            const searchText = (searchInput?.value || "").toLowerCase().trim();
            const activeCategory =
                document.querySelector(".category-btn.active")?.dataset.category || "all";

            // Load every normal service first. A service is hidden only when it is
            // explicitly marked inactive or special. This keeps older service
            // records (where "active" was never stored) visible.
            const allNormalServices = [];
            snapshot.forEach((docSnap) => {
                const service = { id: docSnap.id, ...docSnap.data() };
                if (service.isSpecial === true) return;
                if (service.active === false) return;
                allNormalServices.push(service);
            });

            // Backward compatibility: some older projects may have all legacy
            // services marked inactive. If that happens, show them rather than
            // leaving the user's service area empty.
            let sourceServices = allNormalServices;
            if (!sourceServices.length) {
                snapshot.forEach((docSnap) => {
                    const service = { id: docSnap.id, ...docSnap.data() };
                    if (service.isSpecial === true) return;
                    sourceServices.push(service);
                });
            }

            // Build categories independently from the currently filtered
            // service list, so all existing categories remain visible.
            const categories = new Map();

            sourceServices.forEach(service => {
                const category = String(service.category || "Other").trim() || "Other";
                const icon = String(service.categoryIcon || "📦");
                if (!categories.has(category)) categories.set(category, icon);
            });

            // Also read the optional categories collection if it exists.
            // Failure is ignored so the existing services still work.
            try {
                const categorySnap = await getDocs(collection(db, "categories"));
                categorySnap.forEach(categoryDoc => {
                    const c = categoryDoc.data() || {};
                    const name = String(c.name || c.title || c.category || "").trim();
                    if (name && !categories.has(name)) {
                        categories.set(name, String(c.icon || c.categoryIcon || "📦"));
                    }
                });
            } catch (categoryError) {
                console.warn("Categories collection unavailable:", categoryError);
            }

            if (filter) {
                filter.innerHTML =
                    `<button type="button" class="category-btn ${activeCategory === "all" ? "active" : ""}" data-category="all"><span data-i18n="all">All</span></button>` +
                    Array.from(categories.entries()).map(([category, icon]) =>
                        `<button type="button" class="category-btn ${activeCategory === category ? "active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(icon)} ${escapeHtml(category)}</button>`
                    ).join("");

                filter.querySelectorAll(".category-btn").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        filter.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                        await loadServices();
                    });
                });
            }

            const services = sourceServices.filter(service => {
                const name = String(service.name || "").toLowerCase();
                const category = String(service.category || "Other").trim() || "Other";
                if (searchText && !name.includes(searchText)) return false;
                if (activeCategory !== "all" && category !== activeCategory) return false;
                return true;
            });

            if (!services.length) {
                serviceList.innerHTML = `
                    <div class="smm-empty">
                        <div style="font-size:34px;">📭</div>
                        <strong>No services found</strong>
                        <p>Try another category or search.</p>
                    </div>`;
                if (typeof applyTranslations === "function") applyTranslations();
                return;
            }

            serviceList.innerHTML = services.map(service => {
                const rate = Number(service.ratePer1000 || 0);
                const legacyPrice = Number(service.price || 0);
                const rateText = rate > 0
                    ? `৳ ${rate.toLocaleString()} / 1000`
                    : `৳ ${legacyPrice.toLocaleString()}`;

                const min = Number(service.minimumQuantity || 1);
                const max = Number(service.maximumQuantity || 999999);
                const delivery = "Automatic";
                const description = String(service.description || "").trim();
                const category = String(service.category || "Other");

                return `
                <div class="smm-service-row">
                    <div class="smm-service-main">
                        ${service.image ? `<img class="smm-service-image" src="${escapeHtml(service.image)}" alt="">` : ""}
                        <div>
                            <div class="smm-category-label">${escapeHtml(category)}</div>
                            <h3>${escapeHtml(service.name || "Unnamed Service")}</h3>
                            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
                        </div>
                    </div>
                    <div class="smm-meta">Rate<strong class="smm-rate">${rateText}</strong></div>
                    ${service.enableQuantity ? `<div class="smm-meta">Min / Max<strong>${min.toLocaleString()} / ${max.toLocaleString()}</strong></div>` : ""}
                    <div class="smm-meta">Delivery<strong>${escapeHtml(delivery)}</strong></div>
                    <button class="smm-order-btn" onclick="goToOrder('${service.id}')">
                        <span data-i18n="orderNow">Order Now</span>
                    </button>
                </div>`;
            }).join("");

            if (typeof applyTranslations === "function") applyTranslations();

        } catch (err) {
            console.error("Service loading error:", err);
            serviceList.innerHTML = `
                <div class="smm-empty">
                    <div style="font-size:34px;">⚠️</div>
                    <strong>Could not load services</strong>
                    <p>${escapeHtml(err.message || "Please try again.")}</p>
                </div>`;
            if (typeof showPopup === "function") {
                showPopup("error", "Database Error", err.message);
            }
        }
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
        }[ch]));
    }

    // Initial service load
    // IMPORTANT: keep the existing Firebase categories/services visible.
    await loadServices();

    // Live service search
    const serviceSearch = document.getElementById("serviceSearch");
    if (serviceSearch) {
        serviceSearch.addEventListener("input", async () => {
            await loadServices();
        });
    }

    // User Login Data Load
    onAuthStateChanged(auth, (user) => {

        if (!user) return;

        loadMyOrders(user.uid);
        syncApiOrderStatuses(user.uid);
        setInterval(() => syncApiOrderStatuses(user.uid), 30000);
        loadUserBalance(user.uid);
        loadTransactionHistory(user.uid);

    });

});

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
// SYNC AUTOMATIC API ORDER STATUS
// =========================
async function syncApiOrderStatuses(uid){
    const q = query(collection(db,"orders"), where("userId","==",uid));
    const snapshot = await getDocs(q);
    for (const orderDoc of snapshot.docs){
        const order = orderDoc.data();
        if (!order.apiEnabled || !order.apiOrderId || !order.apiProxyUrl) continue;
        if (["Completed","Rejected","Canceled","Partial"].includes(order.status)) continue;
        try {
            const base = String(order.apiProxyUrl).replace(/\/$/,"");
            const r = await fetch(base + "/status", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({order:order.apiOrderId})
            });
            const data = await r.json().catch(()=>({}));
            const providerStatus = String(data.status || "").toLowerCase();
            let mapped = null;
            if (providerStatus === "completed") mapped="Completed";
            else if (providerStatus === "partial") mapped="Partial";
            else if (providerStatus === "canceled" || providerStatus === "cancelled") mapped="Rejected";
            else if (providerStatus === "processing" || providerStatus === "in progress" || providerStatus === "pending") mapped="Processing";
            if (mapped && mapped !== order.status) {
                await updateDoc(doc(db,"orders",orderDoc.id),{status:mapped, providerStatus:data.status || ""});
                if (mapped === "Completed") {
                    await sendNotification(uid,"🎉 Order Completed",`${order.serviceName} order has been completed automatically by the provider.`,"order");
                }
            }
        } catch (e) {
            console.warn("API status sync failed:", e);
        }
    }
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

    const method =
        document.getElementById("paymentMethod").value;

    const amount =
        document.getElementById("balanceAmount").value.trim();

    const trxId =
        document.getElementById("trxId").value.trim();

    if (!amount || !trxId) {

        showPopup(
            "warning",
            "Warning",
            "Please fill all fields."
        );

        return;

    }

    const user = auth.currentUser;

    if (!user) {

        showPopup(
            "error",
            "Session Expired",
            "Please login again."
        );

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
        
        // Notify all admins
const adminQuery = query(
    collection(db, "users"),
    where("role", "==", "admin")
);

const adminSnap = await getDocs(adminQuery);

for (const adminDoc of adminSnap.docs) {

    await sendNotification(
        adminDoc.id,
        "💰 New Balance Request",
        `${user.email} requested ৳${amount} balance via ${method}.`,
        "balance"
    );

}

        showPopup(
            "success",
            "Request Submitted",
            "Balance request submitted successfully."
        );

        document.getElementById("balanceAmount").value = "";
        document.getElementById("trxId").value = "";

        closeBalancePopup();

    } catch (err) {

        console.error(err);

        showPopup(
            "error",
            "Request Failed",
            err.message
        );

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

    logoutBtn.onclick = () => {

        showConfirmPopup(
            "Logout",
            "Are you sure you want to logout?",
            async () => {

                await auth.signOut();

                localStorage.removeItem("user");

                window.location.href = "login.html";

            }
        );

    };

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


// =========================================
// DASHBOARD MENU + SPECIAL SERVICES
// =========================================

async function loadSpecialServiceMenu(){

    const list = document.getElementById("specialServiceMenuList");
    if(!list) return;

    list.innerHTML = "";

    try{
        const snapshot = await getDocs(collection(db,"services"));
        const services = [];

        snapshot.forEach(docSnap => {
            const service = { id: docSnap.id, ...docSnap.data() };
            if(service.isSpecial === true && service.active !== false){
                services.push(service);
            }
        });

        list.innerHTML = services.map(service => `
            <button
                type="button"
                class="special-service-menu-item"
                data-service-id="${service.id}"
                title="${service.name || "Special Service"}">
                <span class="special-service-menu-icon">⭐</span>
                <span class="special-service-menu-name">${service.name || "Special Service"}</span>
            </button>
        `).join("");

        list.querySelectorAll(".special-service-menu-item").forEach(button => {
            button.addEventListener("click", () => {
                const id = button.dataset.serviceId;
                closeSpecialMenu();
                goToOrder(id);
            });
        });

    }catch(err){
        console.error("Special service menu error:", err);
        list.innerHTML = "";
    }
}

function openSpecialMenu(){
    loadSpecialServiceMenu();
    document.getElementById("specialMenu")?.classList.add("show");
    document.getElementById("specialMenuOverlay")?.classList.add("show");
    document.body.classList.add("menu-open");
}

function closeSpecialMenu(){
    document.getElementById("specialMenu")?.classList.remove("show");
    document.getElementById("specialMenuOverlay")?.classList.remove("show");
    document.body.classList.remove("menu-open");
}

function scrollToSection(id){
    closeSpecialMenu();
    const el=document.getElementById(id);
    if(el) el.scrollIntoView({behavior:"smooth", block:"start"});
}

document.getElementById("menuBtn")?.addEventListener("click", openSpecialMenu);
document.getElementById("closeSpecialMenu")?.addEventListener("click", closeSpecialMenu);
document.getElementById("specialMenuOverlay")?.addEventListener("click", closeSpecialMenu);

document.getElementById("menuDashboardBtn")?.addEventListener("click", () => {
    closeSpecialMenu();
    window.scrollTo({top:0, behavior:"smooth"});
});

document.getElementById("menuProfileBtn")?.addEventListener("click", () => {
    closeSpecialMenu();
    document.getElementById("profileBtn")?.click();
});

document.getElementById("menuPlaceOrderBtn")?.addEventListener("click", () => {
    scrollToSection("allServicesSection");
});

document.getElementById("menuOrdersBtn")?.addEventListener("click", () => {
    scrollToSection("myOrdersSection");
});

document.getElementById("menuBalanceBtn")?.addEventListener("click", () => {
    closeSpecialMenu();
    if(typeof window.openBalancePopup === "function") window.openBalancePopup();
});

document.getElementById("menuSupportBtn")?.addEventListener("click", () => {
    closeSpecialMenu();
    if (typeof window.openSupportChat === "function") window.openSupportChat();
});

document.getElementById("menuAnnouncementsBtn")?.addEventListener("click", () => {
    scrollToSection("noticeBoardSection");
});

document.getElementById("menuLogoutBtn")?.addEventListener("click", () => {
    document.getElementById("logoutBtn")?.click();
});

window.addEventListener("DOMContentLoaded", () => {
    loadSpecialServiceMenu();
});



// =========================
// THEME + LANGUAGE
// =========================
const i18n = {
    en: {
        support:"🎧 Support", announcements:"📢 Announcements", dark:"Dark Mode", light:"Light Mode", bangla:"বাংলা", english:"English",
        dashboard:"🏠 Dashboard", profile:"👤 My Profile", placeOrder:"🛒 Place Order", orders:"📜 Order History", balance:"💰 Add Balance", logout:"🚪 Logout",
        userDashboard:"User Dashboard", userPanel:"User Panel", welcome:"👋 Welcome", welcomeText:"Welcome to JN IT CENTER Dashboard", walletBalance:"💰 Wallet Balance", addBalance:"Add Balance",
        myAccount:"👤 My Account", statusActive:"Status : Active", role:"Role", panel:"Panel", allServices:"🛠 All Services", socialServices:"📱 Social Services", socialServicesSub:"SMM-style services — choose a service and place your order directly.", searchService:"🔍 Search Service...", all:"All",
        transactionStatement:"💳 Transaction Statement", dateTime:"Date & Time", type:"Type", method:"Method", trxId:"TRX ID", amount:"Amount", status:"Status", action:"Action",
        myOrders:"📦 My Orders", service:"Service", price:"Price", result:"Result", noticeBoard:"📢 Notice Board", noticeWelcome:"✅ Welcome to JN IT CENTER.", noticeLatest:"📌 Latest updates will appear here.",
        recentActivity:"📊 Recent Activity", loginSuccessful:"🟢 Login Successful", walletReady:"💰 Wallet Ready", orderSubmitted:"📦 Order Submitted", notifications:"Notifications", notificationCount:"0 Notifications",
        addBalanceTitle:"Add Balance", paymentMethod:"Payment Method", enterAmount:"Enter Amount", enterTrxId:"Enter TRX ID", submitRequest:"Submit Request", transactionDetails:"Transaction Details", date:"Date",
        orderNow:"Order Now", supportTitle:"🎧 Live Support", supportSubtitle:"Message Admin — replies appear instantly", supportEmpty:"Start a conversation with Admin.", supportPlaceholder:"Write your message...", send:"Send"
    },
    bn: {
        support:"🎧 সাপোর্ট", announcements:"📢 ঘোষণা", dark:"ডার্ক মোড", light:"লাইট মোড", bangla:"English", english:"বাংলা",
        dashboard:"🏠 ড্যাশবোর্ড", profile:"👤 আমার প্রোফাইল", placeOrder:"🛒 অর্ডার করুন", orders:"📜 অর্ডার হিস্টোরি", balance:"💰 ব্যালেন্স যোগ করুন", logout:"🚪 লগআউট",
        userDashboard:"ইউজার ড্যাশবোর্ড", userPanel:"ইউজার প্যানেল", welcome:"👋 স্বাগতম", welcomeText:"JN IT CENTER ড্যাশবোর্ডে স্বাগতম", walletBalance:"💰 ওয়ালেট ব্যালেন্স", addBalance:"ব্যালেন্স যোগ করুন",
        myAccount:"👤 আমার অ্যাকাউন্ট", statusActive:"স্ট্যাটাস : সক্রিয়", role:"রোল", panel:"প্যানেল", allServices:"🛠 সকল সার্ভিস", socialServices:"📱 সোশ্যাল সার্ভিস", socialServicesSub:"SMM প্যানেলের মতো সার্ভিস বেছে সরাসরি অর্ডার করুন।", searchService:"🔍 সার্ভিস খুঁজুন...", all:"সব",
        transactionStatement:"💳 লেনদেনের বিবরণ", dateTime:"তারিখ ও সময়", type:"ধরন", method:"মাধ্যম", trxId:"TRX ID", amount:"পরিমাণ", status:"স্ট্যাটাস", action:"অ্যাকশন",
        myOrders:"📦 আমার অর্ডার", service:"সার্ভিস", price:"মূল্য", result:"ফলাফল", noticeBoard:"📢 নোটিশ বোর্ড", noticeWelcome:"✅ JN IT CENTER-এ স্বাগতম।", noticeLatest:"📌 সর্বশেষ আপডেট এখানে দেখা যাবে।",
        recentActivity:"📊 সাম্প্রতিক কার্যক্রম", loginSuccessful:"🟢 লগইন সফল হয়েছে", walletReady:"💰 ওয়ালেট প্রস্তুত", orderSubmitted:"📦 অর্ডার জমা দেওয়া হয়েছে", notifications:"নোটিফিকেশন", notificationCount:"০টি নোটিফিকেশন",
        addBalanceTitle:"ব্যালেন্স যোগ করুন", paymentMethod:"পেমেন্ট মাধ্যম", enterAmount:"পরিমাণ লিখুন", enterTrxId:"TRX ID লিখুন", submitRequest:"রিকোয়েস্ট জমা দিন", transactionDetails:"লেনদেনের বিস্তারিত", date:"তারিখ",
        orderNow:"অর্ডার করুন", supportTitle:"🎧 লাইভ সাপোর্ট", supportSubtitle:"অ্যাডমিনকে মেসেজ করুন — রিপ্লাই সাথে সাথে দেখাবে", supportEmpty:"অ্যাডমিনের সাথে কথোপকথন শুরু করুন।", supportPlaceholder:"আপনার মেসেজ লিখুন...", send:"পাঠান"
    }
};

function applyLanguage(lang){
    const L=i18n[lang]||i18n.en;
    document.documentElement.lang=lang==='bn'?'bn':'en';
    document.querySelectorAll('[data-i18n]').forEach(el=>{
        const key=el.getAttribute('data-i18n');
        if(L[key]!==undefined) el.textContent=L[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
        const key=el.getAttribute('data-i18n-placeholder');
        if(L[key]!==undefined) el.placeholder=L[key];
    });
    const ids={
      menuSupportBtn:L.support, menuAnnouncementsBtn:L.announcements,
      supportTitle:L.supportTitle, supportSubtitle:L.supportSubtitle, supportEmpty:L.supportEmpty,
      supportSendBtn:L.send, menuDashboardBtn:L.dashboard, menuProfileBtn:L.profile,
      menuPlaceOrderBtn:L.placeOrder, menuOrdersBtn:L.orders, menuBalanceBtn:L.balance, menuLogoutBtn:L.logout
    };
    Object.entries(ids).forEach(([id,value])=>{const el=document.getElementById(id); if(el) el.textContent=value;});
    const input=document.getElementById('supportMessageInput'); if(input) input.placeholder=L.supportPlaceholder;
    const langBtn=document.getElementById('languageBtnText'); if(langBtn) langBtn.textContent=lang==='en'?'বাংলা':'English';
    const themeBtn=document.getElementById('themeBtnText'); if(themeBtn) themeBtn.textContent=document.body.classList.contains('light-mode')?L.light:L.dark;
    const count=document.getElementById('notificationCount'); if(count && !count.dataset.dynamic) count.textContent=L.notificationCount;
    localStorage.setItem('jn_language',lang);
}

function applyTheme(theme){
    document.body.classList.toggle('light-mode',theme==='light');
    localStorage.setItem('jn_theme',theme);
    applyLanguage(localStorage.getItem('jn_language')||'en');
}
function initThemeLanguage(){
    applyTheme(localStorage.getItem('jn_theme')||'dark');
    document.getElementById('menuThemeBtn')?.addEventListener('click',()=>{
        applyTheme(document.body.classList.contains('light-mode')?'dark':'light');
    });
    document.getElementById('menuLanguageBtn')?.addEventListener('click',()=>{
        const next=(localStorage.getItem('jn_language')||'en')==='en'?'bn':'en';
        applyLanguage(next);
    });
}

// =========================
// LIVE SUPPORT CHAT
// =========================
let supportUnsubscribe = null;
let supportChatReady = false;

function escapeSupportText(value){
    return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
}

window.openSupportChat = async function(){
    const modal = document.getElementById("supportChatModal");
    if (!modal) return;
    modal.classList.add("show");
    document.body.classList.add("support-open");
    const user = auth.currentUser;
    if (!user) return;

    const chatRef = doc(db, "supportChats", user.uid);
    const snap = await getDoc(chatRef);
    if (!snap.exists()) {
        await setDoc(chatRef, {
            userId:user.uid,
            userEmail:user.email || "",
            userName:user.displayName || "",
            messages:[],
            status:"open",
            updatedAt:Date.now()
        });
    }
    if (supportUnsubscribe) supportUnsubscribe();
    supportUnsubscribe = onSnapshot(chatRef, chatSnap => {
        const data = chatSnap.data() || {};
        renderSupportMessages(data.messages || []);
    });
    supportChatReady = true;
};

window.closeSupportChat = function(){
    document.getElementById("supportChatModal")?.classList.remove("show");
    document.body.classList.remove("support-open");
};

function renderSupportMessages(messages){
    const box=document.getElementById("supportMessages");
    if(!box) return;
    box.innerHTML = messages.map(m => `
        <div class="support-msg ${m.senderRole === "admin" ? "admin" : "user"}">
            <div class="support-msg-bubble">${escapeSupportText(m.text)}</div>
            <small>${m.senderRole === "admin" ? "Admin" : "You"}</small>
        </div>
    `).join("");
    box.scrollTop = box.scrollHeight;
}

window.sendSupportMessage = async function(){
    const input=document.getElementById("supportMessageInput");
    const text=(input?.value || "").trim();
    const user=auth.currentUser;
    if(!text || !user) return;
    const chatRef=doc(db,"supportChats",user.uid);
    await setDoc(chatRef,{
        userId:user.uid,
        userEmail:user.email || "",
        userName:user.displayName || "",
        status:"open",
        updatedAt:Date.now()
    },{merge:true});
    await updateDoc(chatRef,{
        messages:arrayUnion({
            id:crypto.randomUUID(),
            senderId:user.uid,
            senderRole:"user",
            text,
            createdAt:Date.now()
        }),
        updatedAt:Date.now(),
        lastSender:"user"
    });

    try {
        const admins = await getDocs(query(collection(db,"users"), where("role","==","admin")));
        for (const adminDoc of admins.docs) {
            await sendNotification(adminDoc.id,"🎧 New Support Message",`${user.email || "Customer"} sent a new support message.`,"support");
        }
    } catch (notifyError) {
        console.warn("Support notification failed:", notifyError);
    }

    input.value="";
};

window.addEventListener("DOMContentLoaded",()=>{
    initThemeLanguage();
    document.getElementById("supportMessageInput")?.addEventListener("keydown",e=>{
        if(e.key==="Enter" && !e.shiftKey){e.preventDefault();window.sendSupportMessage();}
    });
});
