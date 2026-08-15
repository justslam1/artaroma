const fs = require('fs');

const content = fs.readFileSync('src/app/admin/stock/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('.map') || line.includes('batch_number') || line.includes('batches') || line.includes('LOT-')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
