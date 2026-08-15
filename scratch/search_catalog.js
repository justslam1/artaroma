const fs = require('fs');
const content = fs.readFileSync('src/app/customer/catalog/page.tsx', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('sales-orders') || line.includes('cartItems') || line.includes('handleSubmit') || line.includes('post') || line.includes('body:')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('Matches in catalog/page.tsx:');
console.log(matches.slice(0, 40).join('\n'));
