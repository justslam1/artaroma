const fs = require('fs');

const content = fs.readFileSync('src/app/admin/procurement/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('products') || line.includes('api/products') || line.includes('POModal')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
