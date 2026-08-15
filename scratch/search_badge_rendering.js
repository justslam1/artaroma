const fs = require('fs');

const content = fs.readFileSync('src/app/admin/stock/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('rounded-full') && (line.includes('sku') || line.includes('p.sku') || line.includes('substring') || line.includes('slice') || line.includes('split'))) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
