// =======================================
// Notification System - Part 1
// =======================================

import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db, auth } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ==========================
// Elements
// ==========================

const panel = document.getElementById("notificationPanel");
const list = document.getElementById("notificationList");
const badge = document.getElementById("notificationCount");

const openBtn = document.getElementById("notificationBtn");
const closeBtn = document.getElementById("closeNotification");
const markAllBtn = document.getElementById("markAllRead");

// ==========================
// Open / Close Panel
// ==========================

openBtn?.addEventListener("click", () => {
    panel?.classList.add("active");
});

closeBtn?.addEventListener("click", () => {
    panel?.classList.remove("active");
});

window.addEventListener("click", (e) => {

    if (
        panel &&
        !panel.contains(e.target) &&
        openBtn &&
        !openBtn.contains(e.target)
    ) {
        panel.classList.remove("active");
    }

});
// ==========================
// Send Notification
// ==========================

export async function sendNotification(
    userId,
    title,
    message,
    type = "info"
){

    return await addDoc(
        collection(db,"notifications"),
        {
            userId,
            title,
            message,
            type,
            read: false,
            time: Date.now()
        }
    );

}
// =======================================
// Real-time Notification Listener
// =======================================

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

        const notifications = snapshot.docs
            .map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }))
            .sort((a, b) => (b.time || 0) - (a.time || 0));
                    if (notifications.length === 0) {

            list.innerHTML = `
                <div class="empty-notification">
                    <div class="empty-icon">🔔</div>
                    <h4 data-notification-i18n="empty">No Notifications</h4>
                    <p data-notification-i18n="caughtUp">You're all caught up.</p>
                </div>
            `;

            if (badge) badge.textContent = "0";
            return;

        }
                notifications.forEach((n) => {

            if (!n.read) unread++;

            list.innerHTML += `
                <div class="notification-item ${n.read ? "read" : "unread"}" data-id="${n.id}">

                    <div class="notification-title">
                        ${iconByType(n.type)} ${n.title}
                    </div>

                    <div class="notification-message">
                        ${n.message}
                    </div>

                    <div class="notification-time">
                        🕒 ${timeAgo(n.time)}
                    </div>

                    <div class="notification-actions">

                        ${
                            !n.read
                            ? `<button class="read-btn" data-id="${n.id}">✅ Read</button>`
                            : ""
                        }

                        <button class="delete-btn" data-id="${n.id}">
                            🗑 Delete
                        </button>

                    </div>

                </div>
            `;

        });

        if (badge) badge.textContent = unread;
    });

});
// =======================================
// Button Events
// =======================================

document.addEventListener("click", async (e) => {

    // Read Notification
    if (e.target.classList.contains("read-btn")) {

        const id = e.target.dataset.id;

        try {

            await updateDoc(
                doc(db, "notifications", id),
                {
                    read: true
                }
            );

        } catch (err) {
            console.error(err);
        }

        return;
    }
        // Delete Notification
    if (e.target.classList.contains("delete-btn")) {

        const id = e.target.dataset.id;

        try {

            await deleteDoc(
                doc(db, "notifications", id)
            );

        } catch (err) {
            console.error(err);
        }

        return;
    }

});

// =======================================
// Mark All Read
// =======================================

markAllBtn?.addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user) return;

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid)
    );

    const snap = await getDocs(q);

    for (const item of snap.docs) {

        if (!item.data().read) {

            await updateDoc(
                doc(db, "notifications", item.id),
                {
                    read: true
                }
            );

        }

    }

});

// =======================================
// Time Ago
// =======================================

function timeAgo(time){

    if(!time) return "Just now";

    const seconds = Math.floor((Date.now() - time) / 1000);

    if(seconds < 60) return "Just now";

    const minutes = Math.floor(seconds / 60);

    if(minutes < 60){
        return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    if(hours < 24){
        return `${hours} hour ago`;
    }

    const days = Math.floor(hours / 24);

    if(days === 1){
        return "Yesterday";
    }

    if(days < 7){
        return `${days} days ago`;
    }

    return new Date(time).toLocaleDateString();
}

// =======================================
// Notification Icon
// =======================================

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

        case "service":
            return "🛠️";

        default:
            return "🔔";
    }

}

// Keep notification UI in sync with the dashboard language.
function syncNotificationLanguage(){
  const lang=localStorage.getItem('jn_language')||'en';
  const count=document.getElementById('notificationCount');
  if(count && !count.dataset.dynamic){
    count.textContent=lang==='bn'?'০টি নোটিফিকেশন':'0 Notifications';
  }
  document.querySelectorAll('[data-notification-i18n="empty"]').forEach(el=>{
    el.textContent=lang==='bn'?'কোনো নোটিফিকেশন নেই':'No Notifications';
  });
  document.querySelectorAll('[data-notification-i18n="caughtUp"]').forEach(el=>{
    el.textContent=lang==='bn'?'সব নোটিফিকেশন দেখা হয়েছে।':'You\'re all caught up.';
  });
}
window.addEventListener('storage',syncNotificationLanguage);
setInterval(syncNotificationLanguage,500);
