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
function showConfirmPopup(title, message, yesCallback) {

    document.querySelectorAll(".popup-overlay").forEach(p => p.remove());

    const popup = `
    <div class="popup-overlay">
        <div class="popup-box">

            <div class="popup-icon popup-warning">!</div>

            <div class="popup-title">${title}</div>

            <div class="popup-message">${message}</div>

            <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;">

                <button class="popup-btn"
                onclick="closePopup()">
                    Cancel
                </button>

                <button class="popup-btn"
                onclick="confirmPopupYes()">
                    Logout
                </button>

            </div>

        </div>
    </div>
    `;

    window.confirmPopupYes = function () {
        closePopup();
        yesCallback();
    };

    document.body.insertAdjacentHTML("beforeend", popup);
}

window.showConfirmPopup = showConfirmPopup;

function showInputPopup(title, placeholder, callback) {

    document.querySelectorAll(".popup-overlay").forEach(p => p.remove());

    const popup = `
    <div class="popup-overlay">
        <div class="popup-box">

            <div class="popup-icon popup-success">৳</div>

            <div class="popup-title">${title}</div>

            <input id="popupInput"
                type="number"
                placeholder="${placeholder}"
                style="width:100%;padding:12px;margin:15px 0;border-radius:10px;border:1px solid #ccc;">

            <div style="display:flex;gap:10px;justify-content:center;">

                <button class="popup-btn" onclick="closePopup()">Cancel</button>

                <button class="popup-btn" onclick="confirmInputPopup()">OK</button>

            </div>

        </div>
    </div>
    `;

    window.confirmInputPopup = function () {
        const value = document.getElementById("popupInput").value;
        closePopup();
        callback(value);
    };

    document.body.insertAdjacentHTML("beforeend", popup);
}

window.showInputPopup = showInputPopup;
