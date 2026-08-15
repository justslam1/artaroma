const fs = require('fs');

if (fs.existsSync('src/app/admin/orders/[id]/page.tsx')) {
  const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('courier') || line.includes('kurir') || line.includes('Assign') || line.includes('assign')) {
      if (line.length < 150) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    }
  });
}
