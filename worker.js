export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if (request.method === 'OPTIONS') return new Response('', {headers:cors});
    if (request.method !== 'POST') return new Response('Not found', {status:404, headers:cors});

    const url = new URL(request.url);
    if (!env.SAFOLLOW_API_KEY) return json({error:'SAFOLLOW_API_KEY is not configured'}, 500, cors);

    try {
      const body = await request.json();
      const form = new URLSearchParams();
      form.set('key', env.SAFOLLOW_API_KEY);

      if (url.pathname === '/order') {
        form.set('action','add');
        form.set('service',String(body.service));
        form.set('link',String(body.link));
        form.set('quantity',String(body.quantity));
        if (body.comments) form.set('comments',String(body.comments));
      } else if (url.pathname === '/status') {
        form.set('action','status');
        form.set('order',String(body.order));
      } else {
        return new Response('Not found',{status:404,headers:cors});
      }

      const r = await fetch('https://www.safollow.com/api/v2', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:form
      });
      const text = await r.text();
      return new Response(text,{status:r.status,headers:{...cors,'Content-Type':'application/json'}});
    } catch(e) {
      return json({error:e.message},500,cors);
    }
  }
};

function json(data,status,cors){
  return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
}
