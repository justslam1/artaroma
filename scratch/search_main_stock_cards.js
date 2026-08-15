const fs = require('fs');

const content = fs.readFileSync('src/app/admin/stock/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('filteredProducts.map') || line.includes('filteredProducts.length') || line.includes('filteredProducts')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
