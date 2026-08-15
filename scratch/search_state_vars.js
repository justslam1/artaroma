const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('const [') && (line.includes('product') || line.includes('stock') || line.includes('variant'))) {
    if (idx < 250 && line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
