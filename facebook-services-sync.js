import { db } from "./firebase-config.js";
import { collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { FACEBOOK_BULK_SERVICES } from "./facebook-services-bulk.js";

const DEFAULT_FACEBOOK_IMAGE = "https://i.postimg.cc/jSkRSf4c/Facebook-f-logo-(2021)-svg.png";

export async function syncBundledFacebookServices() {
  const existingSnap = await getDocs(collection(db, "services"));
  const existing = new Set(existingSnap.docs.map(d => String((d.data() || {}).serviceId || "")));
  let added = 0;

  for (const s of FACEBOOK_BULK_SERVICES) {
    if (existing.has(String(s.serviceId))) continue;

    const ratePer1000 = Number((Number(s.usd) * 130 * 1.15).toFixed(4));
    await addDoc(collection(db, "services"), {
      serviceId: String(s.serviceId),
      apiServiceId: String(s.serviceId),
      name: s.name,
      price: 0,
      ratePer1000,
      category: s.category,
      subCategory: s.subCategory,
      requiredInfo: "Link",
      description: s.description || "",
      active: true,
      image: s.image || DEFAULT_FACEBOOK_IMAGE,
      enableQuantity: true,
      minimumQuantity: Number(s.min || 1),
      maximumQuantity: Number(s.max || 1000000),
      estimatedDelivery: "",
      apiEnabled: true,
      apiUrl: "https://jn-it-api.jnmusicpresentofficial.workers.dev",
      apiKey: "e2c90c2d73564653de5b9bc444ef98f003032431",
      bundledSource: "social-services-full-catalog-2026-08"
    });

    existing.add(String(s.serviceId));
    added++;
  }

  return {
    total: FACEBOOK_BULK_SERVICES.length,
    added,
    skipped: FACEBOOK_BULK_SERVICES.length - added
  };
}
