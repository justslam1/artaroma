const fs = require('fs');

const content = fs.readFileSync('src/app/admin/procurement/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
let start = -1;
lines.forEach((line, idx) => {
  if (line.includes('steps.map') || line.includes('bg-') || line.includes('isPassed')) {
    if (idx > 450 && idx < 530) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
