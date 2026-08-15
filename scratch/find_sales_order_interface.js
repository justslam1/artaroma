const fs = require('fs');

const content = fs.readFileSync('src/lib/types.ts', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('interface SalesOrder')) {
    start = idx;
  }
});

if (start !== -1) {
  for (let i = start; i < start + 25; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('interface SalesOrder NOT found');
}
