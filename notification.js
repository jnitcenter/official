import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  getDocs,
  doc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const panel = document.getElementById("notificationPanel");
const list = document.getElementById("notificationList");
const badge = document.getElementById("notificationCount");
const toast = document.getElementById("toastNotification");

const btn = document.getElementById("notificationBtn");
const closeBtn = document.getElementById("closeNotification");
const markAllBtn = document.getElementById("markAllRead");

btn?.addEventListener("click", () => {
    panel.classList.add("active");
});

closeBtn?.addEventListener("click", () => {
    panel.classList.remove("active");
});

window.addEventListener("click",(e)=>{

    if(
        panel &&
        !panel.contains(e.target) &&
        btn &&
        !btn.contains(e.target)
    ){

        panel.classList.remove("active");

    }

});

export async function sendNotification(
    userId,
    title,
    message,
    type="info"
){

    await addDoc(collection(db,"notifications"),{

        userId,
        title,
        message,
        type,
        read:false,
        time:Date.now()

    });

}
// ===============================
// Real Time Notification Listener
// ===============================

onAuthStateChanged(auth, (user) => {

    if (!user) return;

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
    );

    onSnapshot(q, (snapshot) => {

        if (!list) return;

        list.innerHTML = "";

        let unread = 0;

        const data = snapshot.docs.sort(
            (a, b) => (b.data().time || 0) - (a.data().time || 0)
        );

        if (data.length === 0) {

            list.innerHTML = `
            <div class="empty-notification">
                <div class="empty-icon">🔔</div>
                <h4>No Notifications</h4>
                <p>You're all caught up.</p>
            </div>
            `;

            if (badge) badge.style.display = "none";

            return;
        }

        data.forEach((item) => {

            const n = item.data();

            const id = item.id;

            if (!n.read) unread++;

            list.innerHTML += `

            <div class="notification-item ${n.read ? "" : "unread"}">

                <div class="notification-title">
                    <span>${iconByType(n.type)}</span> ${n.title}
                </div>

                <div class="notification-message">
                    ${n.message}
                </div>

                <div class="notification-time">
                    🕒 ${timeAgo(n.time)}
                </div>

                <div class="notification-actions">

<button class="read-btn"
onclick="markNotificationRead('${id}')">

✅ Read

</button>

<button class="delete-btn"
onclick="deleteNotification('${id}')">

🗑 Delete

</button>

</div>

            </div>

            `;

        });

        if (badge) {

            badge.innerText = unread;

            badge.style.display =
                unread > 0 ? "flex" : "none";

        }

    });

});
// =======================================
// Mark Read
// =======================================

window.markNotificationRead = async function(id){

    try{

        await updateDoc(
            doc(db,"notifications",id),
            {
                read:true
            }
        );

    }catch(e){

        console.log(e);

    }

};

// =======================================
// Delete Notification
// =======================================

window.deleteNotification = async function(id){

    try{

        await deleteDoc(
            doc(db,"notifications",id)
        );

    }catch(e){

        console.log(e);

    }

};

// =======================================
// Mark All Read
// =======================================

markAllBtn?.addEventListener("click",async()=>{

    const user=auth.currentUser;

    if(!user) return;

    const q=query(
        collection(db,"notifications"),
        where("userId","==",user.uid)
    );

    const snap=await getDocs(q);

    for(const d of snap.docs){

        if(!d.data().read){

            await updateDoc(
                doc(db,"notifications",d.id),
                {
                    read:true
                }
            );

        }

    }

    showToast(
        "✅ Success",
        "All notifications marked as read."
    );

});
// =====================================
// Time Ago
// =====================================

function timeAgo(time){

    if(!time) return "Just now";

    const sec=Math.floor((Date.now()-time)/1000);

    if(sec<60) return "Just now";

    const min=Math.floor(sec/60);

    if(min<60) return min+" min ago";

    const hr=Math.floor(min/60);

    if(hr<24) return hr+" hour ago";

    const day=Math.floor(hr/24);

    if(day<7) return day+" day ago";

    return new Date(time).toLocaleDateString();

}

// =====================================
// Icon by Type
// =====================================

function iconByType(type){

    switch(type){

        case "success":
            return "✅";

        case "error":
            return "❌";

        case "warning":
            return "⚠️";

        case "balance":
            return "💰";

        case "order":
            return "📦";

        default:
            return "🔔";

    }

}

// =====================================
// Toast
// =====================================

function showToast(title,message){

    if(!toast) return;

    toast.innerHTML=`
        <strong>${title}</strong><br>
        ${message}
    `;

    toast.style.display="block";
toast.style.opacity="1";

    setTimeout(()=>{

        toast.style.opacity="0";

setTimeout(()=>{

toast.style.display="none";

},300);

    },3500);

}

// =====================================
// Helper Functions
// =====================================

export function notifySuccess(userId,msg){

    return sendNotification(
        userId,
        "Success",
        msg,
        "success"
    );

}

export function notifyError(userId,msg){

    return sendNotification(
        userId,
        "Error",
        msg,
        "error"
    );

}

export function notifyWarning(userId,msg){

    return sendNotification(
        userId,
        "Warning",
        msg,
        "warning"
    );

}

export function notifyBalance(userId,amount){

    return sendNotification(
        userId,
        "Balance Added",
        `৳${amount} Wallet-এ যোগ হয়েছে`,
        "balance"
    );

}

export function notifyOrder(userId,service){

    return sendNotification(
        userId,
        "Order Update",
        `${service} সফলভাবে সম্পন্ন হয়েছে`,
        "order"
    );

}