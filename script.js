import { auth, db, UNIVERSAL_API_PROXY_URL } from "./firebase-config.js";
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

    const category =
        String(service.category || "Other").trim() || "Other";

    const image =
        String(
            service.categoryImage ||
            service.categoryImageUrl ||
            ""
        ).trim();

    if (!categories.has(category)) {
        categories.set(category, {
            image: image
        });
    }

});

            // Also read the optional categories collection if it exists.
            // Failure is ignored so the existing services still work.
            try {
                const categorySnap = await getDocs(collection(db, "categories"));
                categorySnap.forEach(categoryDoc => {
                    const c = categoryDoc.data() || {};
                    const name = String(c.name || c.title || c.category || "").trim();
                    if (!name) return;

                    // Category Management is the source of truth for the
                    // customer-facing category icon/image. This intentionally
                    // overwrites service-level fallback data when available.
                    let image = String(
                        c.image || c.imageUrl || c.picture || c.categoryImage ||
                        c.iconUrl || c.iconImage || ""
                    ).trim();
                    // Customer category cards use only the image saved by
                    // Category Management. No default emoji/icon fallback.
                    const rawIcon = String(c.icon || c.categoryIcon || "").trim();
                    // If admin pasted an image URL into the icon field, treat it
                    // as the category picture automatically.
                    if (!image && /^https?:\/\//i.test(rawIcon)) image = rawIcon;
                    categories.set(name, { image });
                });
            } catch (categoryError) {
                console.warn("Categories collection unavailable:", categoryError);
            }

            // Build the optional sub-category picker directly below the main category picker.
            // It is populated from service.subCategory (also accepts older field spellings).
            const subCategoryBox = document.getElementById("subCategoryBox");
            const subCategorySelect = document.getElementById("subCategoryFilter");
            const selectedSubCategory = String(subCategorySelect?.value || "").trim();
            const subCategorySet = new Set();
            if (activeCategory !== "all") {
                sourceServices.forEach(service => {
                    const category = String(service.category || "Other").trim() || "Other";
                    if (category !== activeCategory) return;
                    const sub = String(
                        service.subCategory ?? service.subcategory ?? service.sub_category ?? ""
                    ).trim();
                    if (sub) subCategorySet.add(sub);
                });
            }
            const subCategories = Array.from(subCategorySet).sort((a,b) => a.localeCompare(b));
            if (subCategoryBox && subCategorySelect) {
                if (subCategories.length) {
                    subCategoryBox.style.display = "block";
                    subCategorySelect.innerHTML = `<option value="">Select Sub Category</option>` +
                        subCategories.map(sub => `<option value="${escapeHtml(sub)}">${escapeHtml(sub)}</option>`).join("");
                    if (subCategories.includes(selectedSubCategory)) subCategorySelect.value = selectedSubCategory;
                } else {
                    subCategoryBox.style.display = "none";
                    subCategorySelect.innerHTML = `<option value="">Select Sub Category</option>`;
                }
                subCategorySelect.onchange = async () => {
                    await loadServices();
                };
            }

            if (filter) {
                // Customer-facing category picker: show a compact 5-card preview
                // first, then let the user expand to see every category. The
                // picture always comes from Admin Category Management when set.
                const categoryEntries = Array.from(categories.entries());

                const expanded = filter.dataset.expanded === "true";
                const visibleEntries = expanded ? categoryEntries : categoryEntries.slice(0, 7);

                const categoryCards = visibleEntries.map(([category, data]) => {
                    const image = String(data?.image || "").trim();
                    const visual = image
                        ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(category)}" class="category-pick-image" loading="lazy">`
                        : "";
                    return `<button type="button" class="category-btn ${activeCategory === category ? "active" : ""}" data-category="${escapeHtml(category)}" title="${escapeHtml(category)}" aria-label="${escapeHtml(category)}">${visual}<span class="category-pick-name">${escapeHtml(category)}</span></button>`;
                }).join("");

                // Exact customer-facing layout: five category cards first,
                // followed by one full-width "View All Services" button.
                // There is intentionally NO separate "All Services" card here.
                const viewAllButton = `<button type="button" class="category-view-all-btn" id="categoryViewAllBtn" title="View All Services" aria-label="View All Services"><span class="category-all-icon">✦</span><span>View All Services</span></button>`;

                filter.innerHTML = categoryCards + viewAllButton;

                filter.querySelectorAll(".category-btn").forEach(btn => {
                    btn.addEventListener("click", async () => {
                        filter.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                        const sub = document.getElementById("subCategoryFilter");
                        if (sub) sub.value = "";
                        await loadServices();
                    });
                });

                const viewAllBtn = document.getElementById("categoryViewAllBtn");
                if (viewAllBtn) {
                    viewAllBtn.addEventListener("click", async () => {
                        // "View All Services" means show all services and expand
                        // the category strip when more than five categories exist.
                        filter.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
                        filter.dataset.expanded = "true";
                        await loadServices();
                        document.getElementById("serviceList")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                }
            }

            const currentSubCategory = String(document.getElementById("subCategoryFilter")?.value || "").trim();
            const services = sourceServices.filter(service => {
                const name = String(service.name || "").toLowerCase();
                const category = String(service.category || "Other").trim() || "Other";
                const subCategory = String(
                    service.subCategory ?? service.subcategory ?? service.sub_category ?? ""
                ).trim();
                if (searchText && !name.includes(searchText)) return false;
                if (activeCategory !== "all" && category !== activeCategory) return false;
                if (currentSubCategory && subCategory !== currentSubCategory) return false;
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


    // =====================================
    // NEW ORDER PICKER
    // =====================================
    async function loadNewOrderPicker() {
        const categorySelect = document.getElementById("newOrderCategory");
        const subSelect = document.getElementById("newOrderSubCategory");
        const serviceSelect = document.getElementById("newOrderService");

        const categoryPicker = document.getElementById("newOrderCategoryPicker");
        const categorySelected = document.getElementById("newOrderCategorySelected");
        const categorySelectedText = categorySelected?.querySelector(".new-order-picker-selected-text");
        const categorySelectedIcon = categorySelected?.querySelector(".new-order-picker-selected-icon");
        const categoryList = document.getElementById("newOrderCategoryList");

        const subPicker = document.getElementById("newOrderSubCategoryPicker");
        const subSelected = document.getElementById("newOrderSubCategorySelected");
        const subSelectedText = subSelected?.querySelector(".new-order-picker-selected-text");
        const subSelectedIcon = subSelected?.querySelector(".new-order-picker-selected-icon");
        const subList = document.getElementById("newOrderSubCategoryList");

        const servicePicker = document.getElementById("newOrderServicePicker");
        const serviceSelected = document.getElementById("newOrderServiceSelected");
        const serviceSelectedText = serviceSelected?.querySelector(".new-order-service-selected-text");
        const serviceSelectedIcon = serviceSelected?.querySelector(".new-order-service-selected-icon");
        const serviceList = document.getElementById("newOrderServiceList");

        const subBox = document.getElementById("newOrderSubCategoryBox");
        const serviceBox = document.getElementById("newOrderServiceBox");
        const continueBtn = document.getElementById("newOrderContinueBtn");

        if (!categorySelect || !subSelect || !serviceSelect) return;

        let services = [];
        let categoryMeta = new Map();

        try {
            const snapshot = await getDocs(collection(db, "services"));

            snapshot.forEach(docSnap => {
                const service = { id: docSnap.id, ...docSnap.data() };
                if (service.isSpecial === true) return;
                if (service.active === false) return;
                services.push(service);
            });

            // Keep older service records visible if all active flags are absent.
            if (!services.length) {
                snapshot.forEach(docSnap => {
                    const service = { id: docSnap.id, ...docSnap.data() };
                    if (service.isSpecial === true) return;
                    services.push(service);
                });
            }

            // Category images/details from the categories collection.
            try {
                const categorySnap = await getDocs(collection(db, "categories"));
                categorySnap.forEach(categoryDoc => {
                    const c = categoryDoc.data() || {};
                    const name = String(c.name || c.title || c.category || "").trim();
                    if (!name) return;

                    const image = String(
                        c.image || c.imageUrl || c.picture || c.categoryImage ||
                        c.iconUrl || c.iconImage || ""
                    ).trim();

                    categoryMeta.set(name, { image });
                });
            } catch (e) {
                console.warn("Category collection unavailable:", e);
            }

            const categoryNames = new Set();
            services.forEach(service => {
                const name = String(service.category || "Other").trim();
                if (name) categoryNames.add(name);
            });
            categoryMeta.forEach((_, name) => categoryNames.add(name));

            categorySelect.innerHTML =
                `<option value="">Select Category</option>` +
                Array.from(categoryNames)
                    .sort((a,b) => a.localeCompare(b))
                    .map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
                    .join("");

            // ---------- Shared picker helpers ----------
            function closePicker(picker, button) {
                picker?.classList.remove("is-open");
                button?.setAttribute("aria-expanded", "false");
            }

            function togglePicker(picker, button) {
                if (!picker || picker.classList.contains("is-disabled")) return;
                const shouldOpen = !picker.classList.contains("is-open");

                [categoryPicker, subPicker, servicePicker].forEach(p => p?.classList.remove("is-open"));
                [categorySelected, subSelected, serviceSelected].forEach(b => b?.setAttribute("aria-expanded", "false"));

                if (shouldOpen) {
                    picker.classList.add("is-open");
                    button?.setAttribute("aria-expanded", "true");
                }
            }

            function getPlatformVisual(category, image = "") {
                const img = String(image || "").trim();
                if (img) {
                    return `<img src="${escapeHtml(img)}" alt="" class="new-order-picker-row-icon" loading="lazy">`;
                }

                const value = String(category || "").toLowerCase();
                if (value.includes("facebook")) return `<span class="new-order-picker-row-icon emoji-icon">f</span>`;
                if (value.includes("instagram")) return `<span class="new-order-picker-row-icon emoji-icon">◎</span>`;
                if (value.includes("youtube")) return `<span class="new-order-picker-row-icon emoji-icon">▶</span>`;
                if (value.includes("telegram")) return `<span class="new-order-picker-row-icon emoji-icon">➤</span>`;
                if (value.includes("tiktok")) return `<span class="new-order-picker-row-icon emoji-icon">♪</span>`;
                if (value.includes("premium")) return `<span class="new-order-picker-row-icon emoji-icon">♛</span>`;
                return `<span class="new-order-picker-row-icon emoji-icon">★</span>`;
            }

            function getServiceVisual(service) {
                const image = String(
                    service.image || service.serviceImage || service.iconUrl ||
                    service.categoryImage || service.categoryImageUrl || ""
                ).trim();

                if (image) {
                    return `<img src="${escapeHtml(image)}" alt="" class="new-order-service-row-icon" loading="lazy">`;
                }
                return getPlatformVisual(service.category, "");
                    }

            function setCategorySelected(name) {
                categorySelect.value = name || "";
                if (categorySelectedText) categorySelectedText.textContent = name || "Select Category";
                if (categorySelectedIcon) {
                    categorySelectedIcon.innerHTML = getPlatformVisual(name, categoryMeta.get(name)?.image || "");
                }
                closePicker(categoryPicker, categorySelected);
            }

            function setSubSelected(name, options = {}) {
                const noSub = options.noSub === true;
                subSelect.value = noSub ? "" : (name || "");

                if (subSelectedText) {
                    subSelectedText.textContent = noSub ? "No Sub Category" : (name || "Select Sub Category");
                }
                if (subSelectedIcon) {
                    subSelectedIcon.innerHTML = noSub
                        ? `<span class="new-order-picker-row-icon emoji-icon">—</span>`
                        : getPlatformVisual(options.category || categorySelect.value, options.image || "");
                }
                closePicker(subPicker, subSelected);
            }

            function setSelectedService(service) {
                if (!service) {
                    serviceSelect.value = "";
                    continueBtn.dataset.serviceId = "";
                    continueBtn.disabled = true;
                    if (serviceSelectedText) serviceSelectedText.textContent = "Select Service";
                    if (serviceSelectedIcon) serviceSelectedIcon.innerHTML = "🛒";
                    serviceList?.querySelectorAll(".new-order-service-row").forEach(row => row.classList.remove("selected"));
                    closePicker(servicePicker, serviceSelected);
                    return;
                }

                serviceSelect.value = service.id;
                continueBtn.dataset.serviceId = service.id;
                continueBtn.disabled = false;

                if (serviceSelectedText) {
                    serviceSelectedText.textContent = `ID: ${service.serviceId || service.id} — ${service.name || "Service"}`;
                }
                if (serviceSelectedIcon) {
                    serviceSelectedIcon.innerHTML = getServiceVisual(service);
                }

                serviceList?.querySelectorAll(".new-order-service-row").forEach(row => {
                    row.classList.toggle("selected", row.dataset.serviceId === service.id);
                });

                // IMPORTANT: after selecting a service, show ONLY the selected service.
                closePicker(servicePicker, serviceSelected);
            }

            // ---------- Category picker ----------
            function renderCategoryList() {
                if (!categoryList) return;

                categoryList.innerHTML = Array.from(categoryNames)
                    .sort((a,b) => a.localeCompare(b))
                    .map(category => {
                        const count = services.filter(s =>
                            String(s.category || "Other").trim() === category
                        ).length;

                        return `
                            <button type="button" class="new-order-picker-row" data-category="${escapeHtml(category)}">
                                <span class="new-order-picker-row-left">
                                    ${getPlatformVisual(category, categoryMeta.get(category)?.image || "")}
                                    <span class="new-order-picker-row-info">
                                        <span class="new-order-picker-row-name">${escapeHtml(category)}</span>
                                        <span class="new-order-picker-row-meta">${count} service${count === 1 ? "" : "s"}</span>
                                    </span>
                                </span>
                            </button>`;
                    }).join("");

                categoryList.querySelectorAll(".new-order-picker-row").forEach(row => {
                    row.addEventListener("click", () => {
                        const category = row.dataset.category || "";
                        setCategorySelected(category);
                        refreshSubCategories();
                    });
                });
            }

            // ---------- Sub Category picker ----------
            function refreshSubCategories() {
                const category = String(categorySelect.value || "").trim();

                subSelect.value = "";
                serviceSelect.value = "";
                continueBtn.dataset.serviceId = "";
                continueBtn.disabled = true;

                setSubSelected("");
                closePicker(subPicker, subSelected);
                closePicker(servicePicker, serviceSelected);

                if (!category) {
                    subPicker?.classList.add("is-disabled");
                    subSelect.disabled = true;
                    subSelect.innerHTML = `<option value="">Select Sub Category</option>`;
                    if (subSelectedText) subSelectedText.textContent = "Select Sub Category";
                    if (subSelectedIcon) subSelectedIcon.innerHTML = "★";

                    serviceSelect.disabled = true;
                    serviceSelect.innerHTML = `<option value="">Select Service</option>`;
                    if (serviceList) serviceList.innerHTML = `<div class="new-order-service-empty">Select a Category first.</div>`;
                    setSelectedService(null);
                    return;
                }

                const subs = new Map();
                services.forEach(service => {
                    const serviceCategory = String(service.category || "Other").trim() || "Other";
                    const sub = String(
                        service.subCategory ?? service.subcategory ?? service.sub_category ?? ""
                    ).trim();

                    if (serviceCategory !== category || !sub) return;
                    if (!subs.has(sub)) subs.set(sub, service);
                });

                subBox.style.display = "block";
                serviceBox.style.display = "block";

                if (!subs.size) {
                    // Keep the box visible even when the category has no sub-category.
                    subSelect.disabled = true;
                    subSelect.innerHTML = `<option value="">No Sub Category</option>`;
                    subPicker?.classList.add("is-disabled");
                    if (subSelectedText) subSelectedText.textContent = "No Sub Category";
                    if (subSelectedIcon) subSelectedIcon.innerHTML = `<span class="new-order-picker-row-icon emoji-icon">—</span>`;
                    refreshServices();
                    return;
                }

                subSelect.disabled = false;
                subPicker?.classList.remove("is-disabled");

                const sortedSubs = Array.from(subs.keys()).sort((a,b) => a.localeCompare(b));
                subSelect.innerHTML =
                    `<option value="">Select Sub Category</option>` +
                    sortedSubs.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

                subList.innerHTML = sortedSubs.map(sub => {
                    const matching = services.filter(service => {
                        const serviceCategory = String(service.category || "Other").trim() || "Other";
                        const serviceSub = String(
                            service.subCategory ?? service.subcategory ?? service.sub_category ?? ""
                        ).trim();
                        return serviceCategory === category && serviceSub === sub;
                    });
                    const representative = matching[0] || {};
                    return `
                        <button type="button" class="new-order-picker-row" data-sub-category="${escapeHtml(sub)}">
                            <span class="new-order-picker-row-left">
                                ${getPlatformVisual(category, representative.image || representative.serviceImage || "")}
                                <span class="new-order-picker-row-info">
                                    <span class="new-order-picker-row-name">${escapeHtml(sub)}</span>
                                    <span class="new-order-picker-row-meta">${matching.length} service${matching.length === 1 ? "" : "s"}</span>
                                </span>
                            </span>
                        </button>`;
                }).join("");

                subList.querySelectorAll(".new-order-picker-row").forEach(row => {
                    row.addEventListener("click", () => {
                        const sub = row.dataset.subCategory || "";
                        setSubSelected(sub, { category });
                        refreshServices();
                    });
                });

                serviceSelect.disabled = true;
                serviceSelect.innerHTML = `<option value="">Select Service</option>`;
                if (serviceList) serviceList.innerHTML = `<div class="new-order-service-empty">Select a Sub Category first.</div>`;
            }

            // ---------- Service picker ----------
            function renderServiceList(filtered) {
                if (!serviceList) return;

                if (!filtered.length) {
                    serviceList.innerHTML = `<div class="new-order-service-empty">No services found for this selection.</div>`;
                    serviceSelect.disabled = true;
                    setSelectedService(null);
                    return;
                }

                serviceSelect.disabled = false;
                serviceSelect.innerHTML =
                    `<option value="">Select Service</option>` +
                    filtered.map(service =>
                        `<option value="${escapeHtml(service.id)}">${escapeHtml(service.name || "Service")}</option>`
                    ).join("");

                serviceList.innerHTML = filtered.map(service => {
                    const sub = String(
                        service.subCategory ?? service.subcategory ?? service.sub_category ?? ""
                    ).trim();
                    const category = String(service.category || "Other").trim() || "Other";
                    const rate = Number(service.ratePer1000 || 0);
                    const price = Number(service.price || 0);
                    const priceText = rate > 0
                        ? `৳${rate.toLocaleString()} / 1000`
                        : `৳${price.toLocaleString()}`;

                    return `
                        <button type="button"
                            class="new-order-service-row"
                            data-service-id="${escapeHtml(service.id)}">
                            <span class="new-order-service-row-left">
                                ${getServiceVisual(service)}
                                <span class="new-order-service-row-info">
                                    <span class="new-order-service-row-name">${escapeHtml(service.name || "Unnamed Service")}</span>
                                    <span class="new-order-service-row-id">ID: ${escapeHtml(service.serviceId || service.id)}</span>
                                    ${sub
                                        ? `<span class="new-order-service-row-sub">${escapeHtml(category)} → ${escapeHtml(sub)}</span>`
                                        : `<span class="new-order-service-row-sub">${escapeHtml(category)}</span>`}
                                </span>
                            </span>
                            <span class="new-order-service-row-price">${escapeHtml(priceText)}</span>
                        </button>`;
                }).join("");

                serviceList.querySelectorAll(".new-order-service-row").forEach(row => {
                    row.addEventListener("click", () => {
                        const service = filtered.find(item => item.id === row.dataset.serviceId);
                        setSelectedService(service);
                    });
                });

                // Do not keep the list open. User opens it by clicking the selected box.
                closePicker(servicePicker, serviceSelected);
                setSelectedService(null);
            }

            function refreshServices() {
                const category = String(categorySelect.value || "").trim();
                const sub = String(subSelect.value || "").trim();

                if (!category) {
                    subBox.style.display = "block";
                    serviceBox.style.display = "block";
                    subSelect.disabled = true;
                    serviceSelect.disabled = true;
                    subSelect.innerHTML = `<option value="">Select Sub Category</option>`;
                    serviceSelect.innerHTML = `<option value="">Select Service</option>`;
                    if (subSelectedText) subSelectedText.textContent = "Select Sub Category";
                    if (subSelectedIcon) subSelectedIcon.innerHTML = "★";
                    if (serviceList) serviceList.innerHTML = `<div class="new-order-service-empty">Select a Category first.</div>`;
                    setSelectedService(null);
                    return;
                }

                const filtered = services.filter(service => {
                    const serviceCategory = String(service.category || "Other").trim() || "Other";
                    const serviceSub = String(
                        service.subCategory ?? service.subcategory ?? service.sub_category ?? ""
                    ).trim();

                    if (serviceCategory !== category) return false;
                    if (sub && serviceSub !== sub) return false;
                    return true;
                }).sort((a,b) => String(a.name || "").localeCompare(String(b.name || "")));

                serviceBox.style.display = "block";
                renderServiceList(filtered);
            }

            // Initial state: all three boxes are visible, but their lists are closed.
            subBox.style.display = "block";
            serviceBox.style.display = "block";
            subPicker?.classList.add("is-disabled");
            subSelect.disabled = true;
            serviceSelect.disabled = true;
            continueBtn.disabled = true;
            continueBtn.dataset.serviceId = "";

            if (categorySelectedText) categorySelectedText.textContent = "Select Category";
            if (categorySelectedIcon) categorySelectedIcon.innerHTML = "★";
            if (subSelectedText) subSelectedText.textContent = "Select Sub Category";
            if (subSelectedIcon) subSelectedIcon.innerHTML = "★";
            if (serviceSelectedText) serviceSelectedText.textContent = "Select Service";
            if (serviceSelectedIcon) serviceSelectedIcon.innerHTML = "🛒";

            renderCategoryList();

            categorySelected?.addEventListener("click", (event) => {
                event.stopPropagation();
                togglePicker(categoryPicker, categorySelected);
            });

            subSelected?.addEventListener("click", (event) => {
                event.stopPropagation();
                togglePicker(subPicker, subSelected);
            });

            serviceSelected?.addEventListener("click", (event) => {
                event.stopPropagation();
                togglePicker(servicePicker, serviceSelected);
            });

            categorySelect.onchange = () => {
                setCategorySelected(categorySelect.value);
                refreshSubCategories();
            };

            subSelect.onchange = () => {
                const value = String(subSelect.value || "").trim();
                if (value) setSubSelected(value, { category: categorySelect.value });
                refreshServices();
            };

            serviceSelect.onchange = () => {
                const id = serviceSelect.value;
                const selected = services.find(service => service.id === id);
                setSelectedService(selected || null);
            };

            // Close all open pickers when clicking outside.
            if (!window.__newOrderPickerOutsideHandler) {
                window.__newOrderPickerOutsideHandler = (event) => {
                    const inside = event.target.closest?.(
                        "#newOrderCategoryPicker, #newOrderSubCategoryPicker, #newOrderServicePicker"
                    );
                    if (inside) return;

                    [categoryPicker, subPicker, servicePicker].forEach(p => p?.classList.remove("is-open"));
                    [categorySelected, subSelected, serviceSelected].forEach(b => b?.setAttribute("aria-expanded", "false"));
                };
                document.addEventListener("click", window.__newOrderPickerOutsideHandler);
            }

            continueBtn.onclick = () => {
                const id = continueBtn.dataset.serviceId;
                if (id) window.goToOrder(id);
            };

        } catch (error) {
            console.error("New Order picker error:", error);
            if (categoryList) categoryList.innerHTML = `<div class="new-order-picker-empty">Unable to load categories.</div>`;
            categorySelect.innerHTML = `<option value="">Unable to load categories</option>`;
        }
    }

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
        }[ch]));
    }

    // Initial service load. The legacy service area is hidden on the
    // homepage, but keeping this load preserves compatibility with the
    // existing Firebase/category/service code.
    await loadServices();
    await loadNewOrderPicker();

    // New Order quick action
    const newOrderBtn = document.getElementById("newOrderBtn");
    const newOrderPanel = document.getElementById("newOrderPanel");
    if (newOrderBtn && newOrderPanel) {
        // New Order picker stays visible on the homepage.
        // Clicking the button simply refreshes the picker and scrolls to it.
        newOrderPanel.style.display = "block";
        newOrderBtn.addEventListener("click", async () => {
            newOrderPanel.style.display = "block";
            await loadNewOrderPicker();
            newOrderPanel.scrollIntoView({behavior:"smooth", block:"start"});
        });
    }

    // Addfunds quick action keeps the existing balance popup.
    const newOrderBalanceBtn = document.getElementById("newOrderBalanceBtn");
    if (newOrderBalanceBtn) {
        newOrderBalanceBtn.addEventListener("click", () => {
            if (typeof window.openBalancePopup === "function") window.openBalancePopup();
            else document.getElementById("balancePopup")?.classList.add("active");
        });
    }

    // New Order item in the side menu opens the same picker.
    const menuNewOrderBtn = document.getElementById("menuNewOrderBtn");
    if (menuNewOrderBtn) {
        menuNewOrderBtn.addEventListener("click", async () => {
            if (newOrderPanel) {
                newOrderPanel.style.display = "block";
                await loadNewOrderPicker();
                newOrderPanel.scrollIntoView({behavior:"smooth", block:"start"});
            }
            document.getElementById("specialMenu")?.classList.remove("show");
            document.getElementById("specialMenuOverlay")?.classList.remove("show");
        });
    }

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
        loadDashboardStats(user.uid);
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
// Normalize the configured Worker/Proxy URL for order/status calls.
function buildApiEndpoint(providerUrl, action) {
    let gateway = String(UNIVERSAL_API_PROXY_URL || "").trim();

    if (!gateway) {
        throw new Error("Universal API Gateway is not configured.");
    }

    // Always treat the gateway as a web URL, never as a local file path.
    if (!/^https?:\/\//i.test(gateway)) {
        gateway = "https://" + gateway;
    }

    try {
        const url = new URL(gateway);
        if (!/^https?:$/i.test(url.protocol)) {
            throw new Error("Universal API Gateway URL must start with http:// or https://.");
        }

        const cleanAction = action === "status" ? "status" : "order";
        const path = url.pathname.replace(/\/+$/, "");

        if (path.toLowerCase().endsWith("/" + cleanAction)) {
            return url.toString();
        }

        url.pathname = (path || "") + "/" + cleanAction;
        return url.toString();
    } catch (e) {
        if (e instanceof TypeError) {
            throw new Error("Invalid Universal API Gateway URL.");
        }
        throw e;
    }
}

async function syncApiOrderStatuses(uid){
    const q = query(collection(db,"orders"), where("userId","==",uid));
    const snapshot = await getDocs(q);
    for (const orderDoc of snapshot.docs){
        const order = orderDoc.data();
        if (!order.apiEnabled || !order.apiOrderId || !order.apiProxyUrl) continue;
        if (["Completed","Rejected","Canceled","Partial"].includes(order.status)) continue;
        try {
            const statusEndpoint = buildApiEndpoint(order.apiProxyUrl, "status");
            const r = await fetch(statusEndpoint, {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    providerUrl:order.apiProviderUrl || "",
                    order:order.apiOrderId,
                    apiKey:order.apiKey || ""
                })
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
// DASHBOARD QUICK STATS
// =========================
async function loadDashboardStats(uid){
    try {
        const snap = await getDocs(query(collection(db, "orders"), where("userId", "==", uid)));
        let spent = 0;
        snap.forEach(d => {
            const o = d.data() || {};
            spent += Number(o.price || o.totalPrice || 0) || 0;
        });
        const ordersEl = document.getElementById("totalUserOrders");
        const spentEl = document.getElementById("totalUserSpent");
        if (ordersEl) ordersEl.innerText = snap.size.toLocaleString();
        if (spentEl) spentEl.innerText = "৳ " + spent.toLocaleString(undefined, {maximumFractionDigits: 2});
    } catch (e) {
        console.warn("Dashboard stats load failed:", e);
    }
}

// =========================
// LOAD USER BALANCE
// =========================

async function loadUserBalance(uid){

    const balanceText = document.getElementById("userBalance");
    if(!balanceText) return;

    try {
        // Primary storage: users/{Firebase Auth UID}.
        let userSnap = await getDoc(doc(db,"users",uid));

        // Backward compatibility: some older user records were saved with an
        // auto-generated document ID and kept the UID inside a `uid` field.
        if(!userSnap.exists()){
            const q = query(collection(db,"users"), where("uid","==",uid));
            const fallback = await getDocs(q);
            if(!fallback.empty) userSnap = fallback.docs[0];
        }

        // Final fallback for older records that only stored the email.
        if(!userSnap.exists() && auth.currentUser?.email){
            const q = query(collection(db,"users"), where("email","==",auth.currentUser.email));
            const fallback = await getDocs(q);
            if(!fallback.empty) userSnap = fallback.docs[0];
        }

        if(!userSnap.exists()){
            balanceText.innerText = "৳ 0";
            return;
        }

        const user = userSnap.data() || {};
        const rawBalance = user.balance ?? user.walletBalance ?? user.currentBalance ?? user.balanceAmount ?? 0;
        const balance = Number(rawBalance);
        balanceText.innerText = "৳ " + (Number.isFinite(balance) ? balance.toLocaleString(undefined,{maximumFractionDigits:2}) : "0");

        const userName = document.getElementById("userName");
        if(userName) userName.innerText = user.name || "User";

    } catch(error){
        console.warn("User balance load failed:", error);
    }

}

window.openBalancePopup = function () {

    document.getElementById("balancePopup").style.display = "flex";

    loadPaymentNumber();

};

window.closeBalancePopup = function () {

    document.getElementById("balancePopup").style.display = "none";

};

async function getPaymentSettings(){
    const snap = await getDoc(doc(db,"settings","payment"));
    return snap.exists() ? snap.data() : {};
}

function isWaitmarkAutomaticPayment(data){
    const enabled = data?.paymentApiEnabled === true;
    const url = String(data?.paymentApiUrl || "").trim().toLowerCase();
    return enabled && url.includes("pay.waitmark.com/checkout");
}

function updatePaymentUi(data){
    const auto = isWaitmarkAutomaticPayment(data);
    const method = document.getElementById("paymentMethod")?.value || "Bkash";
    const box = document.getElementById("paymentNumber");
    const trxBox = document.getElementById("manualTrxBox");
    const note = document.getElementById("automaticPaymentNote");
    const button = document.getElementById("payBalanceBtn");

    if(auto){
        if(box) {
            box.style.display = "none";
            box.innerHTML = "";
        }
        if(trxBox) trxBox.style.display = "none";
        if(note) note.style.display = "block";
        if(button) button.innerText = "⚡ Pay Now";
        return;
    }

    if(trxBox) trxBox.style.display = "block";
    if(note) note.style.display = "none";
    if(button) button.innerText = "Submit Request";
    if(box) box.style.display = "block";

    if(!box) return;
    if(method==="Bkash") box.innerHTML="Bkash Number : "+(data.bkash || "");
    if(method==="Nagad") box.innerHTML="Nagad Number : "+(data.nagad || "");
    if(method==="Rocket") box.innerHTML="Rocket Number : "+(data.rocket || "");
}

async function loadPaymentNumber(){
    try{
        const data = await getPaymentSettings();
        updatePaymentUi(data);
    }catch(error){
        console.warn("Payment settings load failed:", error);
    }
}

async function startAutomaticWaitmarkPayment(){
    const amount = Number(document.getElementById("balanceAmount")?.value || 0);
    const user = auth.currentUser;

    if(!user){
        showPopup("error","Session Expired","Please login again.");
        return;
    }

    if(!Number.isFinite(amount) || amount <= 0){
        showPopup("warning","Invalid Amount","Please enter a valid amount.");
        return;
    }

    const settings = await getPaymentSettings();
    if(!isWaitmarkAutomaticPayment(settings)){
        throw new Error("Automatic Waitmark payment is not enabled.");
    }

    const publicKey = String(settings.paymentApiKey || "").trim();
    if(!publicKey){
        throw new Error("Waitmark Public Key is missing in Admin Payment Settings.");
    }

    /*
     * The order ID carries the authenticated user's UID so the success page
     * can credit only the same logged-in account. The Worker verifies the
     * Waitmark signature before allowing the success redirect.
     */
    const uidBase64 = btoa(user.uid).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    const orderId = `JNIC.${uidBase64}.${Date.now()}.${Math.random().toString(36).slice(2,8)}`;
    const webhookBase = String(UNIVERSAL_API_PROXY_URL || "").trim().replace(/\/+$/,"");
    if(!webhookBase) throw new Error("Payment gateway Worker URL is not configured.");

    const successPage = `${window.location.origin}/payment-success.html`;
    const webhookUrl =
        `${webhookBase}/?action=waitmark-webhook` +
        `&return_url=${encodeURIComponent(successPage)}`;

    const checkoutUrl = new URL(String(settings.paymentApiUrl).trim());
    checkoutUrl.searchParams.set("public_key", publicKey);
    checkoutUrl.searchParams.set("amount", amount.toFixed(2));
    checkoutUrl.searchParams.set("order_id", orderId);
    checkoutUrl.searchParams.set("success_url", webhookUrl);

    window.location.href = checkoutUrl.toString();
}

window.submitBalanceRequest = async function () {
    const settings = await getPaymentSettings();

    if(isWaitmarkAutomaticPayment(settings)){
        try{
            await startAutomaticWaitmarkPayment();
        }catch(err){
            console.error("Automatic payment start failed:", err);
            showPopup("error","Payment Failed",err.message || "Could not start payment.");
        }
        return;
    }

    const method = document.getElementById("paymentMethod").value;
    const amount = document.getElementById("balanceAmount").value.trim();
    const trxId = document.getElementById("trxId").value.trim();

    if (!amount || !trxId) {
        showPopup("warning","Warning","Please fill all fields.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        showPopup("error","Session Expired","Please login again.");
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
        showPopup("error","Request Failed",err.message);
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

            // Keep the original working condition.
            if(service.isSpecial === true && service.active !== false){
                services.push(service);
            }
        });

        list.innerHTML = services.map(service => {
            const image = String(service.image || "").trim();

            return `
            <button
                type="button"
                class="special-service-menu-item"
                data-service-id="${service.id}"
                title="${service.name || "Special Service"}">
                ${
                    image
                        ? `<img
                            class="special-service-menu-icon"
                            src="${image}"
                            alt=""
                            loading="lazy"
                            onerror="this.style.display='none';">`
                        : `<span class="special-service-menu-icon">⭐</span>`
                }
                <span class="special-service-menu-name">${service.name || "Special Service"}</span>
            </button>`;
        }).join("");

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
    const profileBtn = document.getElementById("profileBtn");
    if (profileBtn) {
        profileBtn.click();
    } else {
        window.location.href = "profile.html";
    }
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

// Dashboard Telegram Support quick card
document.addEventListener("DOMContentLoaded", () => {
    const card = document.getElementById("dashboardAddBalanceCard");
    if (!card) return;

    const openTelegramSupport = () => {
        window.open("https://t.me/jnitcenter", "_blank", "noopener,noreferrer");
    };

    card.addEventListener("click", openTelegramSupport);
    card.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openTelegramSupport();
        }
    });
});
