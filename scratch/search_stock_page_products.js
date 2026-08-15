const fs = require('fs');

const content = fs.readFileSync('src/app/admin/stock/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('products.map') || line.includes('products.filter') || line.includes('setProducts') || line.includes('api/products') || line.includes('sort(')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
