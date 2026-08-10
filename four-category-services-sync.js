import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FOUR_CATEGORY_CATALOG } from "./FOUR_CATEGORY_CATALOG.js";

const API_URL = "https://jn-it-api.jnmusicpresentofficial.workers.dev";
const API_KEY = "e2c90c2d73564653de5b9bc444ef98f003032431";

function payload(s) {
  return {
    serviceId: String(s.serviceId),
    apiServiceId: String(s.serviceId),
    name: s.name,
    price: 0,
    ratePer1000: s.ratePer1000 == null ? null : Number(s.ratePer1000),
    category: s.category,
    subCategory: s.subCategory,
    requiredInfo: "Link",
    description: "",
    active: true,
    image: s.image,
    enableQuantity: true,
    minimumQuantity: Number(s.min),
    maximumQuantity: Number(s.max),
    estimatedDelivery: "",
    apiEnabled: true,
    apiUrl: API_URL,
    apiKey: API_KEY,
    bundledSource: "four-category-catalog-2026-08"
  };
}

export async function syncFourCategoryServices() {
  const snap = await getDocs(collection(db, "services"));
  const byKey = new Map();
  for (const d of snap.docs) {
    const x = d.data() || {};
    const cat = String(x.category || "");
    if (!FOUR_CATEGORY_CATALOG[cat]) continue;
    const sid = String(x.serviceId || "");
    if (!sid) continue;
    const key = cat + "::" + sid;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(d);
  }

  let added = 0, updated = 0, removedDuplicates = 0;
  for (const [category, list] of Object.entries(FOUR_CATEGORY_CATALOG)) {
    for (const s of list) {
      const key = category + "::" + String(s.serviceId);
      const matches = byKey.get(key) || [];
      const data = payload(s);

      if (matches.length === 0) {
        await addDoc(collection(db, "services"), data);
        added++;
        continue;
      }

      // Make the first document authoritative, and remove duplicate documents.
      await updateDoc(matches[0].ref, data);
      updated++;
      for (let i = 1; i < matches.length; i++) {
        await deleteDoc(matches[i].ref);
        removedDuplicates++;
      }
    }
  }

  return { added, updated, removedDuplicates };
}
