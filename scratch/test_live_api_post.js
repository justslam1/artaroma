// Simulate the exact POST body that the new async checkout flow sends
const http = require('http');

const body = JSON.stringify({
  customer_id: 'cust-001',
  payment_method: 'LUNAS_TRANSFER',
  items: [
    {
      product_id: 'prod-1786028042281',
      product_name: 'Aman  Jaya 1K',
      qty_kg: 1,
      unit_price_per_kg: 0,
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/sales-orders',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error('Request error (is Next.js running?):', e.message);
  console.log('Note: The API requires Next.js dev server to be running on port 3000.');
  console.log('Please test via browser or run: npm run dev');
});

req.write(body);
req.end();
