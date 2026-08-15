const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('handleDeleteVariant') || line.includes('deleteVariant') || (line.includes('pack_sizes') && line.includes('filter'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
