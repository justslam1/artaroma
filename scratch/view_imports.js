const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 14; i < 55; i++) {
  console.log(`${i+1}: ${lines[i].trim()}`);
}
