const fs = require('fs');

const content = fs.readFileSync('src/app/admin/sales-orders/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('fetch') || line.includes('sales-orders') || line.includes('initialSalesOrders') || line.includes('orders') || line.includes('setOrders')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
