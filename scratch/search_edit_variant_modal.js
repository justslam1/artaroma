const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
let print = false;
let brackets = 0;
lines.forEach((line, idx) => {
  if (line.includes('Edit Produk Varian') || line.includes('EditVariantModal') || line.includes('editVariantModal')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
