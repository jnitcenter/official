/**
 * JN IT CENTER - Universal SMM API Gateway + Waitmark Payment Webhook
 *
 * Existing SMM API actions are kept unchanged.
 *
 * Waitmark payment flow:
 *   GET/POST https://pay.waitmark.com/checkout
 *   public_key, amount, order_id, success_url
 *
 * The success_url points back to this Worker. The Worker verifies the
 * X-Waitmark-Signature HMAC SHA256 before redirecting the customer to
 * payment-success.html. The browser then updates the authenticated user's
 * Firebase balance exactly once using paymentReceipts/order_id.
 *
 * SECURITY:
 * For production, set a Cloudflare Worker Secret named WAITMARK_SECRET.
 * The fallback reads settings/payment from Firestore only for compatibility
 * with the existing project. Prefer the Worker Secret.
 */

const FIREBASE_PROJECT_ID = "jn-it-center-5db46";
const FIREBASE_API_KEY = "AIzaSyDtUWE4wGBNxYdD8zTpwxOg89Ej_NHn0Sk";

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Waitmark-Signature",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    };

    if (request.method === "OPTIONS") return new Response("", { headers: cors });

    const url = new URL(request.url);
    const action = String(url.searchParams.get("action") || "").toLowerCase();

    if (action === "waitmark-webhook") {
      return handleWaitmarkWebhook(request, env, url);
    }

    // Keep the existing universal SMM API gateway contract.
    if (request.method !== "POST") {
      return json({ ok: true, service: "JN IT CENTER API Gateway" }, 200, cors);
    }

    try {
      const body = await request.json();
      const providerUrl = String(body.providerUrl || "").trim();
      const apiKey = String(body.apiKey || "").trim();
      const smmAction = String(body.action || (body.order ? "status" : "add")).toLowerCase();

      if (!providerUrl) return json({ error: "Provider API URL is missing" }, 400, cors);
      if (!apiKey) return json({ error: "API key is missing" }, 400, cors);
      if (!/^https?:\/\//i.test(providerUrl)) return json({ error: "Provider API URL must start with http:// or https://" }, 400, cors);

      const target = new URL(providerUrl);
      if (!/^https?:$/i.test(target.protocol)) return json({ error: "Invalid provider URL" }, 400, cors);

      const form = new URLSearchParams();
      form.set("key", apiKey);

      if (smmAction === "add" || smmAction === "order") {
        const service = String(body.service || "").trim();
        const link = String(body.link || "").trim();
        const quantity = String(body.quantity || "1").trim() || "1";
        if (!service || !link) return json({ error: "service and link are required" }, 400, cors);
        form.set("action", "add");
        form.set("service", service);
        form.set("link", link);
        form.set("quantity", quantity);
        if (body.comments) form.set("comments", String(body.comments));
      } else if (smmAction === "status") {
        const order = String(body.order || "").trim();
        if (!order) return json({ error: "order is required" }, 400, cors);
        form.set("action", "status");
        form.set("order", order);
      } else {
        return json({ error: "Unsupported action" }, 400, cors);
      }

      const response = await fetch(target.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form
      });

      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { ...cors, "Content-Type": response.headers.get("content-type") || "application/json" }
      });
    } catch (error) {
      return json({ error: error?.message || "Universal API gateway error" }, 500, cors);
    }
  }
};

async function handleWaitmarkWebhook(request, env, url) {
  if (request.method !== "POST") {
    return new Response("Waitmark webhook endpoint is ready.", { status: 200 });
  }

  let rawBody = "";
  try {
    rawBody = await request.text();
    const payload = JSON.parse(rawBody);
    const signature = request.headers.get("X-Waitmark-Signature") || "";

    const secret = await getWaitmarkSecret(env);
    if (!secret) {
      return new Response("Payment webhook secret is not configured.", { status: 500 });
    }

    const expected = await hmacSha256Hex(rawBody, secret);

    if (!timingSafeEqual(expected, signature)) {
      return new Response("Unauthorized", { status: 403 });
    }

    if (String(payload.status || "").toLowerCase() !== "completed") {
      return new Response("OK", { status: 200 });
    }

    const orderId = String(payload.order_id || "").trim();
    const amount = Number(payload.amount || 0);
    const trxId = String(payload.trx_id || "").trim();
    const uid = String(url.searchParams.get("uid") || extractUidFromOrderId(orderId) || "").trim();

    if (!orderId || !uid || !Number.isFinite(amount) || amount <= 0) {
      return new Response("Invalid payment payload.", { status: 400 });
    }

    // Bind the callback to the order's UID when the client generated our format.
    const embeddedUid = extractUidFromOrderId(orderId);
    if (embeddedUid && embeddedUid !== uid) {
      return new Response("Payment user mismatch.", { status: 400 });
    }

    const returnUrl = safeReturnUrl(url.searchParams.get("return_url"));
    const redirect =
      `${returnUrl}?order_id=${encodeURIComponent(orderId)}` +
      `&uid=${encodeURIComponent(uid)}` +
      `&amount=${encodeURIComponent(amount.toFixed(2))}` +
      `&trx_id=${encodeURIComponent(trxId)}` +
      `&status=completed`;

    // HTML redirect works when the payment provider posts back through the
    // customer's browser. A normal HTTP redirect is also included.
    return new Response(
      `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${escapeHtmlAttr(redirect)}"></head>` +
      `<body><script>location.replace(${JSON.stringify(redirect)});</script>` +
      `Payment verified. Redirecting...</body></html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Waitmark webhook error:", error);
    return new Response("Invalid webhook request.", { status: 400 });
  }
}

async function getWaitmarkSecret(env) {
  if (env && env.WAITMARK_SECRET) return String(env.WAITMARK_SECRET).trim();

  // Compatibility fallback for this existing Firebase project.
  // Prefer WAITMARK_SECRET as a Cloudflare Worker Secret.
  try {
    const endpoint =
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
      `/databases/(default)/documents/settings/payment?key=${encodeURIComponent(FIREBASE_API_KEY)}`;

    const response = await fetch(endpoint, { method: "GET" });
    if (!response.ok) return "";

    const data = await response.json();
    return String(data?.fields?.paymentApiSecret?.stringValue || "").trim();
  } catch {
    return "";
  }
}

async function hmacSha256Hex(message, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return [...new Uint8Array(signature)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function extractUidFromOrderId(orderId) {
  // Format: JNIC.<base64url(uid)>.<timestamp>.<random>
  const parts = String(orderId).split(".");
  if (parts.length < 4 || parts[0] !== "JNIC") return "";
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    return atob(padded);
  } catch {
    return "";
  }
}

function safeReturnUrl(value) {
  const fallback = "https://jnitcenter.top/payment-success.html";
  if (!value) return fallback;

  try {
    const u = new URL(value);
    const allowedHosts = new Set([
      "jnitcenter.top",
      "www.jnitcenter.top",
      "localhost",
      "127.0.0.1"
    ]);
    if (!allowedHosts.has(u.hostname)) return fallback;
    if (!/^https?:$/.test(u.protocol)) return fallback;
    return u.toString();
  } catch {
    return fallback;
  }
}

function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}
