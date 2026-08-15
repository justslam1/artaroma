const fs = require('fs');

const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Kurir') || line.includes('courierNameInput') || line.includes('Nama Kurir')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
