const fs = require('fs');

const content = fs.readFileSync('src/app/customer/catalog/page.tsx', 'utf8');
const idx = content.indexOf('onSuccess={');
if (idx !== -1) {
  console.log(content.slice(idx, idx + 1200));
} else {
  console.log('Not found onSuccess');
}
