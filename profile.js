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

    const savedPhoto =
        data.profileImage ||
        data.photoURL ||
        data.photoUrl ||
        data.imageUrl ||
        "";

    if (savedPhoto) {
        document.getElementById("profileImage").src = savedPhoto;
    }

});

// =========================
// PROFILE PHOTO LINK
// =========================

const photoLinkModal = document.getElementById("photoLinkModal");
const photoLinkInput = document.getElementById("photoLinkInput");
const photoLinkCancel = document.getElementById("photoLinkCancel");
const photoLinkSave = document.getElementById("photoLinkSave");
const changePhotoBtn = document.getElementById("changePhotoBtn");
const profileImage = document.getElementById("profileImage");

changePhotoBtn.addEventListener("click", () => {
    photoLinkInput.value = profileImage.src.includes("default-user.png")
        ? ""
        : profileImage.src;

    photoLinkModal.classList.add("show");
    photoLinkModal.setAttribute("aria-hidden", "false");
    setTimeout(() => photoLinkInput.focus(), 50);
});

function closePhotoLinkModal() {
    photoLinkModal.classList.remove("show");
    photoLinkModal.setAttribute("aria-hidden", "true");
}

photoLinkCancel.addEventListener("click", closePhotoLinkModal);

photoLinkModal.addEventListener("click", (e) => {
    if (e.target === photoLinkModal) closePhotoLinkModal();
});

photoLinkSave.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;

    const url = photoLinkInput.value.trim();

    if (!url) {
        showPopup("warning", "Photo Link", "Please enter a photo link.");
        return;
    }

    try {
        const parsed = new URL(url);

        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("Invalid protocol");
        }

        // Test the image before saving it.
        const testImage = new Image();

        testImage.onload = async () => {
            try {
                await updateDoc(doc(db, "users", user.uid), {
                    profileImage: url
                });

                profileImage.src = url;
                closePhotoLinkModal();

                showPopup(
                    "success",
                    "Photo Updated",
                    "Profile photo updated successfully."
                );
            } catch (error) {
                showPopup("error", "Error", error.message);
            }
        };

        testImage.onerror = () => {
            showPopup(
                "error",
                "Invalid Photo",
                "This link does not appear to be a valid image link."
            );
        };

        testImage.src = url;

    } catch (error) {
        showPopup(
            "warning",
            "Invalid Link",
            "Please enter a valid http:// or https:// photo link."
        );
    }
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
