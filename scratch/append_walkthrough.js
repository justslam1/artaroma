const fs = require('fs');

const path = 'C:\\Users\\undps\\Desktop\\123\\24\\artaroma\\walkthrough.md';
let content = fs.readFileSync(path, 'utf8');

const newSection = `
---

## Bagian BE: Penonaktifan Harga / Data Varian dan Produk Induk di Database Setelah Dihapus

Kami telah mengintegrasikan fungsionalitas penghapusan data secara sinkron antara antarmuka (frontend) dan database MySQL (backend) untuk produk induk maupun sub-varian produk yang dihapus.

### Solusi & Penerapan Teknis:
1. **Pembaruan Logika Hapus Varian** ([\`page.tsx\`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Memodifikasi handler \`handleDeleteVariant\` agar menghapus entri ukuran kemasan terkait dari properti \`pack_sizes\`, \`variant_prices\`, \`variant_names\`, dan \`variant_skus\` pada produk induk, serta mengirimkan request \`PUT\` ke API.
2. **Pembaruan API Endpoint PUT & Deaktivasi Varian** ([\`route.ts\`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Menambahkan query SQL otomatis di metode \`PUT\` produk: saat array \`pack_sizes\` diperbarui, API akan mengeksekusi query untuk menonaktifkan (\`is_active = FALSE\`) semua varian produk bersangkutan di tabel \`product_variants\` yang ukurannya tidak lagi terdaftar dalam \`pack_sizes\`.
3. **Penerapan API DELETE Produk Induk & Penyelarasan Tombol Hapus**:
   - Menambahkan metode handler \`DELETE\` baru pada API \`/api/products\` untuk menonaktifkan produk di tabel \`products\` (\`is_active = FALSE\`) dan menonaktifkan seluruh variannya di tabel \`product_variants\` secara kaskade.
   - Memodifikasi fungsi \`handleDelete\` di Master Data agar mengirimkan request \`DELETE\` ke backend saat menghapus produk induk.
4. **Pembersihan Database & Hasil Akhir** ([\`deactivate_deleted_product_variants.js\`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/deactivate_deleted_product_variants.js)):
   - Mengeksekusi skrip pembersihan untuk menonaktifkan produk uji "Tenang Saja" (FO-NEW-006) beserta seluruh sub-variannya di database MySQL.
   - Sekarang, daftar produk di Master Data maupun tab **Pricelist Umum** sepenuhnya tersinkronisasi dan tidak menampilkan data atau harga dari produk/varian yang telah dihapus.
`;

fs.writeFileSync(path, content.trim() + '\n' + newSection, 'utf8');
console.log('✓ walkthrough.md updated successfully.');
