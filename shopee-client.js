const crypto = require('crypto');
const fetch = require('node-fetch'); // Certifique-se de ter node-fetch instalado ou use o fetch nativo do Node 18+

const SHOPEE_PARTNER_ID = process.env.SHOPEE_PARTNER_ID || '2008642';
const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || '';
const SHOPEE_BASE_URL = process.env.SHOPEE_BASE_URL || 'https://partner.shopeemobile.com';

const SHOPEE_SECRET = SHOPEE_PARTNER_KEY;

function toHexHmacSHA256(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function getShopeeServerTimestamp() {
  try {
    const res = await fetch(`${SHOPEE_BASE_URL}/api/v2/public/get_shopee_openapi_time`);
    if (!res.ok) throw new Error(`time fetch failed ${res.status}`);
    const data = await res.json();
    if (data?.timestamp && Number.isFinite(data.timestamp)) {
      return data.timestamp;
    }
    throw new Error('invalid time payload');
  } catch (e) {
    return Math.floor(Date.now() / 1000);
  }
}

async function shopeeFetch(args) {
  const { path, method = 'GET', query, body, access_token, shop_id } = args;
  
  const finalPath = path.startsWith('/') ? path : `/${path}`;
  const timestamp = await getShopeeServerTimestamp();
  
  // Base String para assinatura
  const baseString = `${SHOPEE_PARTNER_ID}${finalPath}${timestamp}${access_token}${shop_id}`;
  const sign = toHexHmacSHA256(baseString, SHOPEE_SECRET);
  
  const search = new URLSearchParams();
  search.set('partner_id', String(SHOPEE_PARTNER_ID));
  search.set('timestamp', String(timestamp));
  search.set('sign', sign);
  search.set('shop_id', String(shop_id));
  search.set('access_token', access_token);
  
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) {
        if (Array.isArray(v)) {
          v.forEach(item => search.append(k, String(item)));
        } else {
          search.set(k, String(v));
        }
      }
    }
  }
  
  const url = `${SHOPEE_BASE_URL}${finalPath}?${search.toString()}`;
  
  const requestBody = method === 'POST' && body ? JSON.stringify(body) : undefined;
  
  // console.log(`[shopeeFetch] ${method} ${finalPath}`);
  
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: requestBody,
  });
  
  const responseText = await res.text();
  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = responseText;
  }
  
  if (!res.ok) {
    throw new Error(`Shopee API ${finalPath} failed: ${res.status} ${responseText}`);
  }
  
  return responseData;
}

module.exports = {
  shopeeFetch,
  SHOPEE_PARTNER_ID,
  SHOPEE_BASE_URL
};
