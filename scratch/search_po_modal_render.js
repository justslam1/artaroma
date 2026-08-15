const fs = require('fs');

const content = fs.readFileSync('src/app/admin/procurement/page.tsx', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('<CreatePOModal')) {
    start = idx;
  }
});

if (start !== -1) {
  for (let i = start - 5; i < start + 15; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} else {
  console.log('CreatePOModal NOT found');
}
