const fs = require('fs');

const content = fs.readFileSync('src/components/admin/po-modal.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Stok:') || line.includes('stok') || line.includes('stock') || line.includes('variant') || line.includes('option')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
