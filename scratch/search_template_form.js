const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('1. Produk Induk Baru') || line.includes('selling_price_per_kg') || line.includes('Harga Jual Dasar')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
