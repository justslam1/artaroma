const fs = require('fs');

const content = fs.readFileSync('src/lib/order-store.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('updateSalesOrderStatus') || line.includes('fetch(')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
