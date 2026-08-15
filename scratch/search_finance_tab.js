const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Rekening Bank Perusahaan') || line.includes('Ubah Pengaturan Pembayaran') || line.includes('Ubah Data Pajak Perusahaan') || line.includes('bank_name')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
