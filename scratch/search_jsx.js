const fs = require('fs');
const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('<table') || line.includes('order.items.map') || line.includes('product_name')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('Matches in page.tsx:');
console.log(matches.slice(0, 30).join('\n'));
