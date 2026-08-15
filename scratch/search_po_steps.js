const fs = require('fs');

const files = ['src/app/admin/procurement/[id]/page.tsx', 'src/components/admin/po-modal.tsx'];
files.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('step=')) {
      console.log(`${file}:${idx + 1}: ${line.trim()}`);
    }
  });
});
