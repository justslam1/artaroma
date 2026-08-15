const fs = require('fs');

const content = fs.readFileSync('src/app/admin/procurement/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('shippedQtys') || line.includes('useState')) {
    if (line.length < 150 && (line.includes('shippedQtys') || line.includes('ShippedQtys'))) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
