const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (idx > 1000 && idx < 1060) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
