const fs = require('fs');

const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 100; i < 150; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
