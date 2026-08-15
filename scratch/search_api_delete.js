const fs = require('fs');

const content = fs.readFileSync('src/app/api/products/route.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('DELETE') || line.includes('delete') || line.includes('destroy') || line.includes('remove')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
