import { auth, db, UNIVERSAL_API_PROXY_URL } from "./firebase-config.js";
import { sendNotification } from "./notification.js";
import {
    collection,
    getDocs,
    getDoc,
    doc,
    addDoc,
    updateDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const params = new URLSearchParams(location.search);
const categoryId = String(params.get("id") || "").trim();
let category = null;
let services = [];
let currentService = null;

const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"
}[c]));

function norm(v){ return String(v ?? "").trim().toLowerCase(); }

onAuthStateChanged(auth, user => {
    if(!user){
        location.href = "login.html";
        return;
    }
    loadCategory();
});

async function loadCategory(){
    try{
        if(!categoryId){
            showPopup("error","Category Not Found","Invalid special category link.");
            return;
        }

        const categorySnap = await getDoc(doc(db,"specialCategories",categoryId));
        if(categorySnap.exists()){
            category = {id:categorySnap.id,...categorySnap.data()};
        }else{
            const match = /^special-category-(\d{2})$/i.exec(categoryId);
            if(match && Number(match[1]) >= 1 && Number(match[1]) <= 20){
                category = {id:categoryId,name:`Special Category ${Number(match[1])}`,image:""};
            }else{
                category = {id:categoryId,name:categoryId,image:""};
            }
        }
        if(category.active === false){
            showPopup("error","Category Disabled","This Special Category is currently disabled.");
            return;
        }

        const categoryName = String(category.name || category.title || categoryId).trim();
        $("categoryTitle").textContent = categoryName;
        $("categoryHeading").textContent = categoryName;
        $("categoryDescription").textContent =
            "Select any one service below, then fill in the required information.";

        const snap = await getDocs(collection(db,"services"));
        services = snap.docs.map(d => ({id:d.id,...d.data()})).filter(service => {
            if(service.isSpecial !== true || service.active === false) return false;
            const sid = norm(service.specialCategoryId || service.special_category_id);
            const sname = norm(
                service.specialCategoryName ||
                service.special_category_name ||
                service.specialCategory ||
                service.special_category || ""
            );
            return (sid && sid === norm(category.id)) ||
                   (sname && sname === norm(categoryName));
        });

        renderServices();
    }catch(err){
        console.error(err);
        showPopup("error","Load Failed",err?.message || "Unable to load this special category.");
    }
}

function renderServices(){
    const grid = $("serviceGrid");
    if(!services.length){
        grid.innerHTML = `<div class="empty-card">এই category-তে এখন কোনো Special Service নেই।</div>`;
        return;
    }

    grid.innerHTML = services.map(service => {
        const image = esc(service.image || "images/no-image.png");
        const name = esc(service.name || "Special Service");
        const description = esc(service.description || "এই service ব্যবহার করে order করতে পারবেন।");
        const price = Number(service.price || service.ratePer1000 || 0);
        return `
            <label class="service-card" data-service-id="${esc(service.id)}">
                <input type="radio" name="specialService" value="${esc(service.id)}">
                <div class="service-card-image">
                    <img src="${image}" alt="${name}" onerror="this.src='images/no-image.png'">
                </div>
                <div class="service-card-body">
                    <h3>${name}</h3>
                    <p>${description}</p>
                    <div class="service-price">৳ ${price.toFixed(2)}</div>
                    <div class="select-hint">● Select this service</div>
                </div>
            </label>`;
    }).join("");

    grid.querySelectorAll(".service-card").forEach(card => {
        card.addEventListener("click", () => selectService(card.dataset.serviceId));
    });
}

function selectService(id){
    const service = services.find(x => x.id === id);
    if(!service) return;

    currentService = service;

    document.querySelectorAll(".service-card").forEach(card => {
        card.classList.toggle("selected", card.dataset.serviceId === id);
    });

    const radio = document.querySelector(`.service-card[data-service-id="${CSS.escape(id)}"] input`);
    if(radio) radio.checked = true;

    $("selectedServiceArea").hidden = false;
    $("selectedServiceName").textContent = service.name || "Special Service";
    $("selectedServiceDescription").textContent = service.description || "";
    $("selectedServicePrice").textContent = `৳ ${Number(service.price || service.ratePer1000 || 0).toFixed(2)}`;
    $("selectedServiceDelivery").textContent = service.estimatedDelivery
        ? `Delivery: ${service.estimatedDelivery}` : "Automatic";

    const img = $("selectedServiceImage");
    img.src = service.image || "images/no-image.png";
    img.onerror = () => img.src = "images/no-image.png";

    configureQuantity();
    loadRequiredFields(service.requiredInfo, service.requiredInfoSingleBox);
    updateTotalPrice();

    $("selectedServiceArea").scrollIntoView({behavior:"smooth",block:"start"});
}

function configureQuantity(){
    const enabled = currentService?.enableQuantity === true;
    $("quantitySection").hidden = !enabled;

    if(!enabled){
        $("quantity").value = "1";
        $("quantity").removeAttribute("min");
        $("quantity").removeAttribute("max");
        $("quantityLimit").textContent = "";
        return;
    }

    const min = Math.max(1,Number(currentService.minimumQuantity || 1));
    const max = Math.max(min,Number(currentService.maximumQuantity || 999999));
    $("quantity").min = String(min);
    $("quantity").max = String(max);
    $("quantity").value = String(min);
    $("quantityLimit").textContent = `Minimum: ${min.toLocaleString()} | Maximum: ${max.toLocaleString()}`;
}

function loadRequiredFields(rawValue,singleBox=false){
    const section = $("requiredInfoSection");
    const container = $("dynamicFields");
    const raw = String(rawValue || "").trim();
    container.innerHTML = "";

    if(!raw){
        section.hidden = true;
        return;
    }

    if(singleBox === true){
        container.innerHTML = `
            <div class="required-single-form">
                <textarea id="required_single_box"
                    class="dynamicInput required-single-textarea"
                    data-label="Required Information"
                    required>${esc(raw)}</textarea>
            </div>`;
        section.hidden = false;
        return;
    }

    const fields = raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    container.innerHTML = fields.map((field,index) => `
        <div class="dynamicField">
            <label for="required_${index}">${esc(field)}</label>
            <input id="required_${index}" class="dynamicInput"
                   data-label="${esc(field)}"
                   placeholder="${esc(field.replace(/:$/,"").trim())} লিখুন"
                   autocomplete="off">
        </div>`).join("");

    section.hidden = false;
}

function updateTotalPrice(){
    if(!currentService) return;

    const enabled = currentService.enableQuantity === true;
    const qty = enabled ? Number($("quantity").value || 1) : 1;
    const rate = Number(currentService.ratePer1000 || 0);
    const base = Number(currentService.price || 0);
    const total = enabled && rate > 0 ? (rate * qty) / 1000 :
                  enabled && base > 0 ? base * qty : base;

    $("totalPrice").value = `৳${Number(total || 0).toFixed(2)}`;
}

$("quantity")?.addEventListener("input",updateTotalPrice);
$("quantity")?.addEventListener("change",updateTotalPrice);
$("changeServiceBtn")?.addEventListener("click",() => {
    $("selectedServiceArea").hidden = true;
    document.querySelector(".special-panel")?.scrollIntoView({behavior:"smooth",block:"start"});
});
$("placeOrderBtn")?.addEventListener("click",placeOrder);

async function placeOrder(){
    if(!currentService){
        showPopup("warning","Select Service","Please select a service first.");
        return;
    }

    const user = auth.currentUser;
    if(!user){
        showPopup("error","Login Required","Please login first.");
        return;
    }

    const userInfo = {};
    const requiredInputs = document.querySelectorAll(".dynamicInput");
    let firstEmptyInput = null;

    requiredInputs.forEach(input => {
        const value = input.value.trim();
        const label = input.dataset.label || "Required Information";
        userInfo[label] = value;
        if (!value && !firstEmptyInput) firstEmptyInput = input;
    });

    // Required Information must be completed before an order can be submitted.
    if (firstEmptyInput) {
        requiredInputs.forEach(input => input.classList.remove("required-input-error"));
        firstEmptyInput.classList.add("required-input-error");
        firstEmptyInput.focus();
        showPopup(
            "warning",
            "Required Information Missing",
            `Please fill in "${firstEmptyInput.dataset.label || "Required Information"}" before submitting the order.`
        );
        return;
    }

    const quantityEnabled = currentService.enableQuantity === true;
    const quantity = quantityEnabled ? Number($("quantity").value || 1) : 1;

    if(quantityEnabled){
        const min = Math.max(1,Number(currentService.minimumQuantity || 1));
        const max = Math.max(min,Number(currentService.maximumQuantity || 999999));
        if(!Number.isFinite(quantity) || quantity < min || quantity > max){
            showPopup("warning","Invalid Quantity",`Quantity must be between ${min} and ${max}.`);
            return;
        }
    }

    const rate = Number(currentService.ratePer1000 || 0);
    const base = Number(currentService.price || 0);
    const price = quantityEnabled
        ? (rate > 0 ? (rate * quantity) / 1000 : base * quantity)
        : base;

    if(!Number.isFinite(price) || price < 0){
        showPopup("error","Invalid Price","This service has an invalid price.");
        return;
    }

    try{
        const userRef = doc(db,"users",user.uid);
        const userSnap = await getDoc(userRef);
        if(!userSnap.exists()){
            showPopup("error","Error","User account not found.");
            return;
        }

        const userData = userSnap.data() || {};
        const balance = Number(userData.balance || 0);
        if(balance < price){
            showPopup("error","Insufficient Balance","Your balance is not enough.");
            return;
        }

        let apiOrderId = null;
        let finalStatus = "Pending";

        if(currentService.apiEnabled === true){
            const apiUrl = String(currentService.apiUrl || "").trim();
            const apiServiceId = String(currentService.apiServiceId || "").trim();
            const apiKey = String(currentService.apiKey || "").trim();

            if(!apiUrl || !apiServiceId || !apiKey){
                showPopup("error","API Configuration Missing","This service's automatic API settings are incomplete.");
                return;
            }

            const link = findApiLink(userInfo);
            const comments = findApiComments(userInfo);
            if(!link){
                showPopup("error","Target Link Missing","Add a required Link or URL field with the target link.");
                return;
            }

            const gateway = buildApiEndpoint("order");
            const response = await fetch(gateway,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    providerUrl:apiUrl,
                    apiKey,
                    service:apiServiceId,
                    link,
                    quantity,
                    comments:comments || ""
                })
            });

            const data = await response.json().catch(()=>({}));
            if(!response.ok || data.error || !data.order){
                throw new Error(data.error || "Automatic API order could not be created.");
            }
            apiOrderId = String(data.order);
            finalStatus = "Processing";
        }

        await updateDoc(userRef,{balance:balance-price});

        await addDoc(collection(db,"orders"),{
            userId:user.uid,
            userEmail:user.email,
            serviceId:currentService.serviceId || currentService.id,
            apiServiceId:currentService.apiServiceId || "",
            serviceName:currentService.name || "Special Service",
            price,
            quantity,
            quantityEnabled,
            userInfo,
            status:finalStatus,
            delivery:"Automatic",
            apiEnabled:currentService.apiEnabled === true,
            apiOrderId,
            apiProxyUrl:UNIVERSAL_API_PROXY_URL || "",
            apiProviderUrl:currentService.apiUrl || "",
            apiKey:currentService.apiKey || "",
            apiServiceId:currentService.apiServiceId || "",
            specialCategoryId:currentService.specialCategoryId || "",
            specialCategoryName:currentService.specialCategoryName || category?.name || "",
            createdAt:Date.now()
        });

        await sendNotification(
            user.uid,
            "📦 Order Submitted",
            `Your ${currentService.name || "special service"} order has been received successfully.`,
            "order"
        );

        const admins = await getDocs(query(collection(db,"users"),where("role","==","admin")));
        for(const admin of admins.docs){
            await sendNotification(
                admin.id,
                "📥 New Order Received",
                `${userData.name || user.email} placed a new ${currentService.name || "special service"} order.`,
                "order"
            );
        }

        showPopup("success","Order Placed","Your order has been submitted successfully.");
    }catch(err){
        console.error("Special order error:",err);
        showPopup("error","Order Failed",err?.message || "Unable to place the order.");
    }
}

function findApiLink(info){
    for(const [label,value] of Object.entries(info || {})){
        if(/link|url|profile|target|username|user name/i.test(label) &&
           /^https?:\/\//i.test(String(value).trim())){
            return String(value).trim();
        }
    }
    for(const value of Object.values(info || {})){
        if(/^https?:\/\//i.test(String(value || "").trim())) return String(value).trim();
    }
    return "";
}

function findApiComments(info){
    for(const [label,value] of Object.entries(info || {})){
        if(/comment|comments|keyword/i.test(label)) return String(value || "").trim();
    }
    return "";
}

function buildApiEndpoint(action){
    let gateway = String(UNIVERSAL_API_PROXY_URL || "").trim();
    if(!gateway) throw new Error("Universal API Gateway is not configured.");
    if(!/^https?:\/\//i.test(gateway)) gateway = "https://" + gateway;

    const url = new URL(gateway);
    const path = url.pathname.replace(/\/+$/,"");
    const cleanAction = action === "status" ? "status" : "order";
    if(!path.toLowerCase().endsWith("/"+cleanAction)){
        url.pathname = (path || "") + "/" + cleanAction;
    }
    return url.toString();
}
