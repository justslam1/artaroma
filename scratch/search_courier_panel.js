const fs = require('fs');

if (fs.existsSync('src/app/courier/page.tsx')) {
  const content = fs.readFileSync('src/app/courier/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('status') || line.includes('State') || line.includes('tugas') || line.includes('Tugas') || line.includes('kirim') || line.includes('Kirim')) {
      if (line.length < 150) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    }
  });
}
