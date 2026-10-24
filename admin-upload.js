
import { db, storage } from "./firebase-config.js";

import { sendNotification } from "./notification.js";

import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    ref,
    uploadBytesResumable,
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
            const progressWrap = document.getElementById("uploadProgressWrap");
            const progressBar = document.getElementById("uploadProgressBar");
            const progressDetails = document.getElementById("uploadProgressDetails");
            if (progressWrap) progressWrap.style.display = "block";
            if (uploadStatus) uploadStatus.textContent = "Uploading PDF... 0%";
            if (progressBar) progressBar.style.width = "0%";
            if (progressDetails) progressDetails.textContent = `0 MB of ${(pdfFile.size / (1024 * 1024)).toFixed(1)} MB uploaded`;
            const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const storagePath = `order-results/${orderId}/${Date.now()}-${safeName}`;
            const fileRef = ref(storage, storagePath);
            // Show upload progress and surface Firebase Storage errors clearly.
            const uploadTask = uploadBytesResumable(fileRef, pdfFile, { contentType: "application/pdf" });
            await new Promise((resolve, reject) => {
                uploadTask.on("state_changed",
                    (snapshot) => {
                        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                        const uploadedMB = (snapshot.bytesTransferred / (1024 * 1024)).toFixed(2);
                        const totalMB = (snapshot.totalBytes / (1024 * 1024)).toFixed(2);
                        if (uploadStatus) uploadStatus.textContent = `Uploading PDF... ${percent}%`;
                        if (progressBar) progressBar.style.width = `${percent}%`;
                        if (progressDetails) progressDetails.textContent = `${uploadedMB} MB of ${totalMB} MB uploaded`;
                    },
                    (uploadError) => reject(uploadError),
                    () => resolve()
                );
            });
            resultLink = await getDownloadURL(fileRef);
            if (uploadStatus) uploadStatus.textContent = "PDF uploaded successfully. Saving result...";
            if (progressBar) progressBar.style.width = "100%";
            if (progressDetails) progressDetails.textContent = `${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB of ${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB uploaded`;

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
        const code = err?.code ? ` (${err.code})` : "";
        if (uploadStatus) uploadStatus.textContent = `Upload/save failed${code}: ${err?.message || "Unknown error"}`;
        showPopup("⚠️", "Save Failed", `${err?.message || "Unable to save result."}${code}. Check Firebase Storage bucket, Storage Rules, and admin permissions.`);
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
