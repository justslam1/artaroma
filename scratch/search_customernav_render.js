const fs = require('fs');

const content = fs.readFileSync('src/app/customer/catalog/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('CustomerNav')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
