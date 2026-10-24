
import { db, storage } from "./firebase-config.js";

import { sendNotification } from "./notification.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// URL থেকে Order ID
const params = new URLSearchParams(window.location.search);
const orderId = params.get("id");

// Hidden Input
document.getElementById("orderId").value = orderId;

// Order Load
async function loadOrder(){

    const snap = await getDoc(doc(db,"orders",orderId));

    if(!snap.exists()){
        alert("Order Not Found");
        return;
    }

    const order = snap.data();

    console.log(order);

}

loadOrder();

// Upload Result

 window.saveResult = async function () {

    let resultLink = document.getElementById("resultLink").value.trim();
    const pdfInput = document.getElementById("resultPdf");
    const pdfFile = pdfInput?.files?.[0] || null;
    const adminNote = document.getElementById("adminNote").value.trim();
    const uploadStatus = document.getElementById("uploadStatus");

    if (!orderId) {
        showPopup("⚠️", "Order ID Missing", "Open this page from an order in the admin panel.");
        return;
    }
    if (resultLink && pdfFile) {
        showPopup("⚠️", "Choose One Method", "Use either a Google Drive link or upload a PDF, not both.");
        return;
    }
    if (!resultLink && !pdfFile) {
        showPopup("⚠️", "Result Required", "Paste a Google Drive link or select a PDF file first.");
        return;
    }
    if (pdfFile && (pdfFile.type !== "application/pdf" || !pdfFile.name.toLowerCase().endsWith(".pdf"))) {
        showPopup("⚠️", "PDF Only", "Please select a PDF file.");
        return;
    }
    if (pdfFile && pdfFile.size > 10 * 1024 * 1024) {
        showPopup("⚠️", "File Too Large", "PDF must be 10 MB or smaller.");
        return;
    }

    const button = document.querySelector('button[onclick="saveResult()"]');
    if (button) { button.disabled = true; button.textContent = "Saving..."; }

    try {
        if (pdfFile) {
            if (uploadStatus) uploadStatus.textContent = "Uploading PDF...";
            const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const storagePath = `order-results/${orderId}/${Date.now()}-${safeName}`;
            const fileRef = ref(storage, storagePath);
            await uploadBytes(fileRef, pdfFile, { contentType: "application/pdf" });
            resultLink = await getDownloadURL(fileRef);
            if (uploadStatus) uploadStatus.textContent = "PDF uploaded. Saving order result...";
        }

        await updateDoc(doc(db, "orders", orderId), {
            resultLink,
            resultType: pdfFile ? "pdf-upload" : "google-drive",
            resultFileName: pdfFile ? pdfFile.name : "",
            adminNote,
            status: "Completed"
        });

        const orderSnap = await getDoc(doc(db, "orders", orderId));
        const order = orderSnap.data();
        try {
            await sendNotification(
                order.userId,
                "🎉 Order Completed",
                `আপনার ${order.serviceName || "order"} সফলভাবে সম্পন্ন হয়েছে।`,
                "order"
            );
        } catch (notificationError) {
            console.warn("Result saved, but notification failed:", notificationError);
        }

        document.getElementById("successPopup").classList.add("show");
        setTimeout(() => { window.location.href = "admin.html?view=orders"; }, 2000);
    } catch (err) {
        console.error(err);
        showPopup("⚠️", "Save Failed", err?.message || "Unable to save result. Check Firebase Storage and Firestore rules.");
    } finally {
        if (button) { button.disabled = false; button.textContent = "📤 Upload Result"; }
    }
};

function showPopup(icon, title, text){

    document.getElementById("popupIcon").innerHTML = icon;
    document.getElementById("popupTitle").innerHTML = title;
    document.getElementById("popupText").innerHTML = text;

    const popup = document.getElementById("messagePopup");

    popup.classList.add("show");

    setTimeout(()=>{
        popup.classList.remove("show");
    },2000);

}
