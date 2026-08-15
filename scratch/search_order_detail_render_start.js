const fs = require('fs');

const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('return (') && idx > 500 && idx < 1000) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
