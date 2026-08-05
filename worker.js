/**
 * JN IT CENTER - Universal SMM API Gateway
 *
 * Deploy this worker once. It accepts a provider API URL from the website and
 * forwards standard SMM Panel API v2 requests to that provider.
 *
 * Supported provider contract:
 *   POST form-urlencoded: key, action=add, service, link, quantity, comments
 *   POST form-urlencoded: key, action=status, order
 *
 * This removes the need to create a new worker/file for every provider.
 * Providers that do not implement the common SMM Panel API v2 contract need
 * a custom adapter/format and cannot be made universal from only URL/key/ID.
 */
export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (request.method === 'OPTIONS') return new Response('', { headers: cors });
    if (request.method !== 'POST') return json({ error: 'Not found' }, 404, cors);

    try {
      const body = await request.json();
      const providerUrl = String(body.providerUrl || '').trim();
      const apiKey = String(body.apiKey || '').trim();
      const action = String(body.action || (body.order ? 'status' : 'add')).toLowerCase();

      if (!providerUrl) return json({ error: 'Provider API URL is missing' }, 400, cors);
      if (!apiKey) return json({ error: 'API key is missing' }, 400, cors);
      if (!/^https?:\/\//i.test(providerUrl)) return json({ error: 'Provider API URL must start with http:// or https://' }, 400, cors);

      const target = new URL(providerUrl);
      if (!/^https?:$/i.test(target.protocol)) return json({ error: 'Invalid provider URL' }, 400, cors);

      const form = new URLSearchParams();
      form.set('key', apiKey);

      if (action === 'add' || action === 'order') {
        const service = String(body.service || '').trim();
        const link = String(body.link || '').trim();
        const quantity = String(body.quantity || '1').trim() || '1';
        if (!service || !link) return json({ error: 'service and link are required' }, 400, cors);
        form.set('action', 'add');
        form.set('service', service);
        form.set('link', link);
        form.set('quantity', quantity);
        if (body.comments) form.set('comments', String(body.comments));
      } else if (action === 'status') {
        const order = String(body.order || '').trim();
        if (!order) return json({ error: 'order is required' }, 400, cors);
        form.set('action', 'status');
        form.set('order', order);
      } else {
        return json({ error: 'Unsupported action' }, 400, cors);
      }

      const response = await fetch(target.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: form
      });

      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { ...cors, 'Content-Type': response.headers.get('content-type') || 'application/json' }
      });
    } catch (error) {
      return json({ error: error?.message || 'Universal API gateway error' }, 500, cors);
    }
  }
};

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}
