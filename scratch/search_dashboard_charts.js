const fs = require('fs');

const content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('chart') || line.includes('Chart') || line.includes('grafik') || line.includes('Grafik') || line.includes('stok') || line.includes('Stok') || line.includes('BarChart') || line.includes('ResponsiveContainer')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
