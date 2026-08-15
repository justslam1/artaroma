const fs = require('fs');

const content = fs.readFileSync('src/app/admin/procurement/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Jumlah dikirim') || line.includes('qty_kg') || line.includes('step=') || line.includes('shipped_qty_kg') || line.includes('step')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
