const fs = require('fs');

const content = fs.readFileSync('src/app/admin/sales-orders/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Batal') || line.includes('BATAL') || line.includes('Cancel') || line.includes('DIBATALKAN') || line.includes('CANCEL')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
