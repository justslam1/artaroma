const fs = require('fs');

const content = fs.readFileSync('src/app/admin/stock/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('MODAL / KG') || line.includes('Modal / Kg') || line.includes('unit_cost_per_kg')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
