const fs = require('fs');

const content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');
console.log('Lines 235 to 255:');
for (let i = 234; i < 254; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
