const fs = require('fs');

const content = fs.readFileSync('src/app/customer/catalog/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('fetch(') || line.includes('products') || line.includes('allowed_product_ids') || line.includes('Stock')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
