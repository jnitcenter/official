import { auth, db } from "./firebase-config.js";


import {
    doc,
    getDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    onAuthStateChanged,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// =========================
// LOAD PROFILE
// =========================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) return;

    const data = snap.data();

    document.getElementById("profileName").value = data.name || "";
    document.getElementById("profileUsername").value = data.username || "";
    document.getElementById("profileEmail").value = data.email || "";
    document.getElementById("profilePhone").value = data.phone || "";

});

// =========================
// SAVE PROFILE
// =========================

document.getElementById("saveProfileBtn").addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user) return;

    const newUsername = document
    .getElementById("profileUsername")
    .value
    .trim()
    .toLowerCase();

const q = query(
    collection(db, "users"),
    where("username", "==", newUsername)
);

const snap = await getDocs(q);

let usernameTaken = false;

snap.forEach((d) => {

    if (d.id !== user.uid) {

        usernameTaken = true;

    }

});

if (usernameTaken) {

    showPopup(
    "error",
    "Username Exists",
    "This username is already taken."
);

    return;

}

    await updateDoc(doc(db, "users", user.uid), {

        name: document.getElementById("profileName").value.trim(),
        username: newUsername,
        phone: document.getElementById("profilePhone").value.trim()

    });

    showPopup(
    "success",
    "Success",
    "Profile Updated Successfully."
);

});
// =========================
// CHANGE PASSWORD
// =========================

document.getElementById("changePasswordBtn").addEventListener("click", async () => {

    const user = auth.currentUser;

    if (!user) return;

    const currentPassword = document.getElementById("currentPassword").value.trim();
    const newPassword = document.getElementById("newPassword").value.trim();
    const confirmPassword = document.getElementById("confirmPassword").value.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
        showPopup(
    "warning",
    "Warning",
    "Please fill all password fields."
);
        return;
    }

    if (newPassword !== confirmPassword) {
        showPopup(
    "warning",
    "Warning",
    "New password and Confirm password do not match."
);
        return;
    }

    if (newPassword.length < 6) {
        showPopup(
    "warning",
    "Warning",
    "Password must be at least 6 characters."
);
        return;
    }

    try {

        const credential = EmailAuthProvider.credential(
            user.email,
            currentPassword
        );

        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);

        showPopup(
    "success",
    "Success",
    "Password changed successfully."
);

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";

    } catch (error) {

        if (
            error.code === "auth/wrong-password" ||
            error.code === "auth/invalid-credential"
        ) {
            showPopup(
    "error",
    "Wrong Password",
    "Current password is incorrect."
);
        } else {
            showPopup(
    "error",
    "Error",
    error.message
);
        }

    }

});
