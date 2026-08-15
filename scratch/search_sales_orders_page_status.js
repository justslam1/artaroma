const fs = require('fs');

const content = fs.readFileSync('src/app/admin/sales-orders/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('status') || line.includes('STATUS') || line.includes('CANCELLED') || line.includes('DIBATALKAN') || line.includes('Dibatalkan')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
