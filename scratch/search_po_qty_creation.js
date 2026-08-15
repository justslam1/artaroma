const fs = require('fs');

const content = fs.readFileSync('src/components/admin/po-modal.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('qty_ordered_kg') || line.includes('jumlah') || line.includes('qty')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
