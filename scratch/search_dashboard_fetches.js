const fs = require('fs');

const content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('fetch(') || line.includes('useEffect') || line.includes('useState') || line.includes('dashboard') || line.includes('finance')) {
    if (idx < 250 && line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
