const fs = require('fs');

const content = fs.readFileSync('src/lib/types.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('status:') && idx < 150) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
  if (line.includes('SalesOrder') && idx < 150) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
