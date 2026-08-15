const fs = require('fs');
const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('DIAJUKAN') || line.includes('PENDING_APPROVAL')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('Matches in page.tsx:');
console.log(matches.join('\n'));
