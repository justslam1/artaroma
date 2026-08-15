const fs = require('fs');

const path = 'C:\\Users\\undps\\Desktop\\123\\24\\artaroma\\walkthrough.md';
let content = fs.readFileSync(path, 'utf8');

const newSection = `
---

## Bagian BG: Inisialisasi Harga Varian Ditambah Kembali (Re-add) ke Rp 0

Kami telah membenahi logika penambahan varian baru atau penambahan kembali varian yang pernah dihapus agar harga awalnya diatur ke Rp 0 secara bawaan, bukannya mengadopsi harga dasar template lama.

### Solusi & Penerapan Teknis:
1. **Pembaruan Logika Form Tambah Varian** ([\`page.tsx\`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Memodifikasi handler tambah varian di Master Data (\`productEntryType === 'VARIANT'\`) untuk memaksa variabel \`price\` bernilai \`0\` secara bawaan (sebelumnya mengadopsi fallback \`parent.selling_price_per_kg || 1500000\` yang menyebabkan harga lama terisi otomatis).
2. **Pembersihan Database & Hasil Akhir** ([\`cleanup_aman_jaya_1k_price.js\`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/cleanup_aman_jaya_1k_price.js)):
   - Mengeksekusi skrip pembersihan untuk mereset harga varian "Aman Jaya 1K" (\`var-fonew005-1\`) di database MySQL (baik di tabel \`product_variants\` maupun kolom JSON \`variant_prices\` di tabel \`products\`) menjadi \`Rp 0\` ($0.00).
   - Varian tersebut kini tampil bersih dengan harga Rp 0 ($0.00) dan bertombol "Atur Harga" agar admin dapat menetapkan harganya dari awal secara mandiri.
`;

fs.writeFileSync(path, content.trim() + '\n' + newSection, 'utf8');
console.log('✓ walkthrough.md updated successfully.');
