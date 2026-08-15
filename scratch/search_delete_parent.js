const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('delete') || line.includes('Delete') || line.includes('destroy') || line.includes('remove') || line.includes('Trash')) {
    if (idx > 1150 && idx < 1300) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
    if (idx > 1550 && idx < 1650) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
