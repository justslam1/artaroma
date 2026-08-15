const fs = require('fs');

const content = fs.readFileSync('src/lib/mock-data.ts', 'utf8');
const idx = content.indexOf('initialCustomers');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 800));
}
