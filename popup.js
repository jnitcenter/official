function showPopup(type, title, message) {

    document.querySelectorAll(".popup-overlay").forEach(p => p.remove());

    let icon = "✓";
    let color = "popup-success";

    if (type === "error") {
        icon = "✕";
        color = "popup-error";
    }

    if (type === "warning") {
        icon = "!";
        color = "popup-warning";
    }

    const popup = `
    <div class="popup-overlay">

        <div class="popup-box">

            <div class="popup-icon ${color}">
                ${icon}
            </div>

            <div class="popup-title">
                ${title}
            </div>

            <div class="popup-message">
                ${message}
            </div>

            <button class="popup-btn" onclick="closePopup()">
                OK
            </button>

        </div>

    </div>
    `;

    document.body.insertAdjacentHTML("beforeend", popup);

}

function closePopup() {

    document.querySelectorAll(".popup-overlay").forEach(p => p.remove());

}

window.showPopup = showPopup;
window.closePopup = closePopup;