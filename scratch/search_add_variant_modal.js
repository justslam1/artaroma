const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Produk Varian Baru') || line.includes('Harga Varian / Kg (IDR)')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
