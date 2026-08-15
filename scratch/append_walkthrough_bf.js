const fs = require('fs');

const path = 'C:\\Users\\undps\\Desktop\\123\\24\\artaroma\\walkthrough.md';
let content = fs.readFileSync(path, 'utf8');

const newSection = `
---

## Bagian BF: Pengaktifan Kembali (Reaktivasi) Varian yang Ditambahkan Ulang ke Database

Kami telah memperbaiki isu di mana varian produk (seperti "Aman Jaya 1K") yang dihapus lalu ditambahkan kembali ke produk induk tidak langsung muncul di daftar Pricelist Umum.

### Solusi & Penerapan Teknis:
1. **Analisis Masalah**:
   - Menghapus varian menonaktifkannya di database dengan menyetel \`is_active = FALSE\` pada tabel \`product_variants\`.
   - Ketika admin menambahkan kembali varian tersebut di Master Data, API backend hanya mendeteksi bahwa baris varian dengan ID bersangkutan (\`var-fonew005-1\`) sudah ada di database, kemudian memperbarui harganya tetapi lupa menyetel kembali status \`is_active = TRUE\` (sehingga tetap tersembunyi).
2. **Pembaruan Logika Sinkronisasi Aktif Varian** ([\`route.ts\`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Memodifikasi API \`PUT /api/products\`. Saat list \`pack_sizes\` dikirim, selain menonaktifkan ukuran yang dihapus, sistem kini secara eksplisit mengeksekusi query untuk mengaktifkan kembali (\`is_active = TRUE\`) semua sub-varian yang ukurannya terdaftar di dalam array tersebut.
3. **Pembaruan Logika PUT Pricelist** ([\`route.ts\`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/pricelist/route.ts)):
   - Memodifikasi query update di API pricelist agar secara eksplisit menyertakan \`is_active = TRUE\` saat harga diperbarui.
4. **Hasil Akhir & Reaktivasi Mandiri** ([\`reactivate_aman_jaya_1k.js\`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/reactivate_aman_jaya_1k.js)):
   - Menjalankan perintah reaktivasi database untuk varian "Aman Jaya 1K" (\`var-fonew005-1\`) ke status aktif.
   - Varian tersebut kini telah muncul secara instan di tabel **Pricelist Umum** dengan status siap diatur harganya.
`;

fs.writeFileSync(path, content.trim() + '\n' + newSection, 'utf8');
console.log('✓ walkthrough.md updated successfully.');
