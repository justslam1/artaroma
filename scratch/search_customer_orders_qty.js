const fs = require('fs');
const content = fs.readFileSync('src/app/customer/orders/page.tsx', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('qty_kg') || line.includes('formatKg') || line.includes('item.qty')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('Matches in customer/orders/page.tsx:');
console.log(matches.join('\n'));
