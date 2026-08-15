const fs = require('fs');

const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Form Eksekusi Aksi Alur Kerja') || line.includes('Langkah 1: Teliti Pesanan') || line.includes('Set Harga / Kg') || line.includes('DIKONFIRMASI')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
