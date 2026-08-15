# Walkthrough: Fitur Repack Varian Stok, Pricelist Umum, & Filtrasi Produk Customer

Dokumen ini merinci perubahan dan cara pengujian untuk fitur-fitur utama yang telah diselesaikan: **Repack Varian Stok**, **Pricelist Umum**, **Filtrasi Produk Customer**, **Penyederhanaan Alur Kerja Purchase Order (3 Tahap)**, **Metode Pembayaran (Tunai/Kredit & TOP)**, **Pengiriman Multi-Trip (Opsi 2) dengan Surat Jalan & Goods Receipt Parsial**, **Integrasi Database Penuh untuk Purchase Order**, **Pembersihan Data Dummy**, serta **Sinkronisasi Dinamis & Filtrasi Varian Produk Berdasarkan Supplier Terpilih**.

---

## Bagian A: Fitur Repack Varian Stok

Fitur **Repack Varian Stok** telah berhasil diimplementasikan. Sekarang, pengelola gudang dapat memecah stok kemasan besar (misal 25 Kg) secara parsial ke kemasan yang lebih kecil (1 Kg atau 5 Kg) dengan presisi desimal 1 Kg tanpa meng-override sisa stok batch sumber (misalnya menyisakan 24 Kg).

---

## Bagian B: Fitur Pricelist Umum

Fitur **Pricelist Umum** telah ditambahkan sebagai tab baru pada halaman **Master Data** untuk memungkinkan Super Admin mengatur harga jual dasar per KG untuk masing-masing varian (25 Kg, 5 Kg, 1 Kg) dalam mata uang Rupiah (IDR) dan Dollar Amerika (USD).

---

### 3. Uji Coba Filtrasi Produk di Harga Khusus
1. Buka menu **Master Data** -> tab **CUSTOMER**.
2. Klik tombol **Aksi** -> **Edit** pada salah satu customer.
3. Buka tab **Harga Khusus** di dalam modal tersebut.
4. Pastikan produk yang tampil hanya produk yang diizinkan untuk customer tersebut (atau seluruh produk jika tidak ada batas allowed_product_ids).
5. (Pengaturan allowed_product_ids dilakukan melalui model data customer).

---

## Bagian C: Filtrasi & Visibilitas Produk Customer di Tab Harga Khusus

Fitur ini membatasi daftar produk yang muncul di tab **Harga Khusus** (pada form/modal **Tambah Customer** dan **Edit Customer**) agar hanya menampilkan produk-produk yang terdaftar di dalam `allowed_product_ids` milik customer tersebut.

---

## Bagian D: Perbaikan Catatan Pembatalan Purchase Order

Fitur pembatalan PO telah ditambahkan dengan penyimpanan terstruktur ke database MySQL agar alasan, tanggal, dan inisiator pembatalan dapat dipulihkan/ditampilkan dengan benar bahkan setelah halaman di-refresh.

### Perubahan yang Dilakukan
1. **Database**: 
   - Menambahkan kolom `cancellation_note` (TEXT), `cancelled_at` (DATETIME), dan `cancelled_by` (VARCHAR(100)) ke tabel `purchase_orders` di MySQL.
2. **API Backend (`src/app/api/purchase-orders/route.ts`)**:
   - Memperbarui query `GET` untuk mengambil dan memetakan data pembatalan tersebut ke respons API.
   - Memperbarui query `PUT` untuk menyimpan nilai-nilai pembatalan saat PO di-cancel.
3. **Frontend (`src/app/admin/procurement/[id]/page.tsx`)**:
   - Memperbarui handler `savePOUpdate` agar meneruskan payload pembatalan ke API.
   - Memperbarui UI banner pembatalan agar menampilkan alasan, inisiator, dan tanggal pembatalan dengan *fallback* aman (`Tidak ada catatan alasan`, `ADMIN PROCUREMENT`) untuk data PO lama yang dibatalkan sebelum migrasi skema tabel.

---

## Bagian D: Alur Kerja Purchase Order (3 Tahap)

Alur kerja Purchase Order (PO) telah disederhanakan dari sebelumnya 6 tahap menjadi **3 tahapan ringkas**:
1. **Buat Email** (`BUAT_EMAIL`): Tahap awal pembuatan dan pengiriman dokumen PO ke distributor resmi.
2. **Pesanan Dikirim** (`DIKIRIM`): Pesanan dalam perjalanan oleh cargo/distributor.
3. **Pesanan Diterima** (`DITERIMA`): Barang sampai di gudang dan dicatat dalam inventaris / Goods Receipt.

---

## Bagian E: Metode Pembayaran & Syarat TOP Purchase Order (Tunai & Kredit)

Admin dapat menentukan **Metode Pembayaran** saat membuat Purchase Order baru ke distributor/vendor dengan pilihan **TUNAI** (Cash) atau **KREDIT** (Credit / Tempo). Jika opsi **Kredit** dipilih, kolom **TOP (Hari)** akan muncul secara dinamis untuk menentukan jangka waktu kredit (Terms of Payment).

---

## Bagian F: Pengiriman Multi-Trip (Opsi 2) & Goods Receipt Parsial

Kini sistem mendukung penanganan pengiriman sebagian (**Partial Shipment**) melalui metode **Multi-Trip** pada satu dokumen PO yang sama.

---

## Bagian G: Integrasi Database Penuh untuk Purchase Order (Update & Persist)

Kini seluruh data pembuatan, kemajuan alur status, trip pengiriman (shipment), serta pencatatan Goods Receipt pada Purchase Order telah terintegrasi penuh ke database MySQL secara persisten melalui REST API.

---

## Bagian H: Pembersihan Data Dummy PO

Untuk memastikan sistem siap digunakan dengan data riil yang bersih (clean slate):
1. **Pembersihan Mock Data Frontend (`src/lib/mock-data.ts`)**:
   - Menghapus semua item di dalam konstanta `initialPurchaseOrders` sehingga diinisialisasi sebagai array kosong (`[]`).
2. **Pembersihan Database MySQL (`fragrance_hub`)**:
   - Menjalankan perintah `TRUNCATE TABLE po_items` dan `TRUNCATE TABLE purchase_orders` secara aman.

---

## Bagian I: Sinkronisasi Dinamis & Filtrasi Varian Produk Berdasarkan Supplier Terpilih

Dropdown **Varian Produk** pada form pembuatan Purchase Order kini terfiltrasi secara cerdas berdasarkan distributor yang dipilih oleh pengguna sesuai dengan data pemetaan master suplier:
1. **Database Schema & Seeding (`scratch_sync.js`)**:
   - Menambahkan kolom `supplied_product_ids` (`TEXT`) ke tabel `distributors`.
   - Mengubah proses seeding distributor dengan looping data terstruktur dari `mock-data.ts` untuk mengaitkan produk-produk yang disuplai oleh masing-masing suplier secara nyata (misal: PT Givaudan Fragrances Indonesia hanya menyuplai produk ID `prod-001` (Vanilla Bourbon) dan `prod-009` (aman jiwa)).
2. **REST API Endpoint (`src/app/api/distributors/route.ts`)**:
   - Memparse data array string `supplied_product_ids` dari format JSON string di database kembali menjadi array Javascript asli pada respons API GET.
3. **Cerdas Menyaring Varian Produk di Form (`src/components/admin/po-modal.tsx`)**:
   - Saat pengguna memilih distributor tertentu, state di `<CreatePOModal>` secara otomatis menyaring (`filter`) daftar varian produk yang disajikan pada form.
   - Pilihan dropdown **Varian Produk** hanya menampilkan varian-varian produk yang disuplai oleh distributor tersebut (Contoh: jika memilih **PT Givaudan Fragrances Indonesia**, pilihan produk yang muncul hanyalah **Vanilla Bourbon Super Pure** dan **aman jiwa**).
   - Apabila distributor diubah saat proses pengisian, sistem secara otomatis melakukan re-evaluasi baris item yang telah terisi. Jika ada produk terpilih sebelumnya yang tidak disediakan oleh distributor yang baru dipilih, produk tersebut akan dialihkan secara otomatis ke produk pertama yang disediakan oleh suplier tersebut demi menjaga validitas data transaksi.

---

## Bagian J: Pengaturan Profil & Warehouse Perusahaan (Penerima PO)

Kini, Anda dapat mengubah data profil perusahaan, alamat warehouse utama, UP logistik (PIC), dan ketentuan jadwal terima barang langsung dari antarmuka aplikasi. Perubahan yang Anda simpan akan disimpan secara permanen di database dan secara dinamis digunakan sebagai data **Penerima** pada dokumen Purchase Order (PO) baru maupun yang sudah ada.

### Langkah-langkah Mengedit Data Penerima / Warehouse:
1. Buka menu **Master Data** pada navigasi bar atas.
2. Klik tab **PENGATURAN** di ujung kanan menu tab Master Data.
3. Anda akan melihat form **Pengaturan Profil & Warehouse Perusahaan** berisi data profil aktif saat ini.
4. Ubah data sesuai kebutuhan:
   * **Nama Perusahaan / Penerima**
   * **Alamat Lengkap Warehouse Utama**
   * **UP Logistik (PIC Gudang)**
   * **Ketentuan Jadwal Terima Barang PO**
5. Klik tombol **Simpan Perubahan** (ikon Simpan).
6. Sistem akan memperbarui data langsung ke database MySQL, dan data Penerima di semua detail PO Anda akan otomatis terupdate menggunakan data terbaru tersebut.

---

## Bagian K: Penyambungan Tombol Terima Stok PO Vendor dengan Halaman PO

Tombol **"1. Terima Stok PO Vendor"** di halaman **Lihat Stok** (Stock & Inventory) kini telah terhubung langsung dengan halaman Purchase Order / Procurement.

### Rationale & Langkah Alur Kerja Baru:
1. **Latar Belakang**: Penerimaan stok (Goods Receipt) saat ini dikelola secara dinamis, bertahap, dan terintegrasi per-pengiriman (*multi-trip*) di halaman detail Purchase Order masing-masing.
2. **Pembaruan Aksi**: Tombol manual lot input sebelumnya diganti dengan tautan (`Link`) langsung ke `/admin/procurement`.
3. **Langkah Penerimaan Barang**:
   - Pengelola gudang membuka halaman **Lihat Stok**.
   - Klik tombol **1. Terima Stok PO Vendor**.
   - Sistem secara otomatis mengarahkan ke daftar **Purchase Order**.
   - Pilih PO aktif yang berstatus **DIKIRIM** atau **DIKIRIM SEBAGIAN**.
   - Klik **Input Goods Receipt (Masuk Gudang)** pada trip pengiriman yang aktif untuk mengunggah nomor batch, tanggal kedaluwarsa (FEFO), dan memasukkan stok secara akurat ke dalam inventaris gudang.

---

## Bagian L: Halaman Audit & Penyesuaian Stok Opname (MySQL Persisted)

Kami telah membuat halaman **Stok Opname** baru yang terintegrasi secara dinamis dengan database MySQL. Tombol **"3. Stok Opname (Audit)"** di halaman Lihat Stok kini terhubung langsung ke antarmuka audit terpusat ini.

### Perubahan Teknis:
1. **API Endpoint (`PUT /api/stock-batches`)**:
   - Menambahkan metode `PUT` pada API stock-batches untuk menerima array pembaruan `batch_updates: { id, current_qty_kg }[]` dan memproses perubahan tersebut secara aman ke dalam baris database.
2. **Halaman Frontend Baru (`/admin/stock/opname`)**:
   - Buka menu **Lihat Stok** -> klik **3. Stok Opname (Audit)**.
   - Halaman akan memuat daftar lengkap batch aktif yang ada di gudang dengan struktur **Pengelompokan Produk Induk (Parent Product Grouping)**:
      * **Baris Header Produk Induk**: Menampilkan Nama Produk Induk, SKU Induk, Keluarga Aroma (Fragrance Family), dan jumlah batch aktif di bawahnya dengan warna abu-abu terang yang khas.
      * **Baris Varian Batch di Bawahnya**: Menampilkan kemasan varian yang spesifik (misal: *Kemasan 25 Kg*, *Kemasan 1 Kg*), nomor batch, tanggal kedaluwarsa (FEFO), stok aplikasi, kolom input stok riil, perhitungan selisih real-time, dan catatan penyesuaian.
   - Tombol **Simpan Audit Stok Opname** di bagian bawah memproses semua baris yang memiliki selisih ke database secara massal dan mengarahkan kembali ke halaman stok utama.

---

## Bagian M: Sinkronisasi Jumlah Unit Kemasan saat Stok Opname

Kami menemukan isu di mana pengelola gudang melakukan Stok Opname (misalnya pada produk *aman jiwa* varian 1 Kg yang bertambah menjadi 9.0 Kg), tetapi jumlah **unit** di database tetap bernilai 1.

### Solusi & Perbaikan:
1. **Perhitungan Otomatis Backend (`PUT /api/stock-batches`)**:
   - Backend sekarang secara otomatis mengambil data `pack_size_kg` (kemasan satuan) untuk batch yang disesuaikan.
   - Menghitung ulang jumlah unit baru menggunakan formula: `new_unit_count = Math.ceil(new_qty_kg / pack_size_kg)`.
   - Menyimpan hasil pembaruan `current_qty_kg` (berat aktual) sekaligus `unit_count` (jumlah unit fisik) ke database MySQL.
2. **Skrip Penyelarasan Database (`scratch/align_units.js`)**:
   - Kami membuat dan menjalankan skrip penyelarasan database untuk langsung membenahi data unit yang tidak sinkron pada batch-batch lama di database Anda (termasuk batch *aman jiwa* 1 Kg yang kini sukses terupdate menjadi 9 Unit @ 1 Kg).

3. **Satuan Terkecil Penyesuaian Input (Step = 1 Kg)**:
   - Mengubah properti `step` pada kolom input **Stok Riil** menjadi `1`. Hal ini membuat tombol spinner atas-bawah (up/down arrows) melakukan penyesuaian dengan interval presisi bulat sebesar 1 Kg sehingga memudahkan pengisian stok opname di lapangan.

---

## Bagian N: Riwayat / Log Audit Stok Opname Bulanan (MySQL Persisted)

Kini seluruh aktivitas penyesuaian stok opname tercatat secara permanen di database MySQL. Anda dapat memantau kapan audit dilakukan, siapa yang melakukan audit, varian produk yang disesuaikan, serta selisih stoknya.

### Implementasi Teknis:
1. **Skema Database (`stock_opname_history`)**:
   - Membuat tabel baru `stock_opname_history` dengan kolom: `id`, `batch_id`, `product_id`, `variant_sku`, `batch_number`, `system_qty_kg`, `physical_qty_kg`, `difference_qty_kg`, `notes`, `created_at`, dan `created_by`.
2. **Backend API (`GET /api/stock-opname/history`)**:
   - Endpoint baru untuk memuat log audit historis terurut dari yang terbaru (`created_at DESC`), lengkap dengan join nama produk untuk tampilan frontend.
3. **Penyimpanan Log Otomatis**:
   - Setiap kali form *Stok Opname* disimpan, untuk setiap batch yang memiliki selisih berat, sistem secara otomatis memasukkan entri log ke tabel `stock_opname_history` sebelum memperbarui kuantitas batch di `stock_batches`.
4. **Antarmuka Frontend**:
   - Di bagian atas halaman Stok Opname (`/admin/stock/opname`), terdapat dua sub-tab:
     * **Lakukan Audit Opname**: Formulir input audit aktif dengan pengelompokan produk induk.
     * **Riwayat Audit & Penyesuaian**: Menampilkan log historis penyesuaian lengkap dengan indikator warna selisih (hijau untuk bertambah, merah untuk berkurang), nomor batch lot, catatan alasan penyesuaian, dan timestamp audit.

---

## Bagian O: Perbaikan Penyesuaian Stok Nol (0) pada Stok Opname

Kami telah memperbaiki isu di mana ketika pengelola gudang memasukkan angka `0` untuk mengosongkan stok fisik suatu batch pada Stok Opname, sistem gagal merubah status unit stok menjadi `0` dan terus menampilkan `1 Unit (1.0 kg)` (seperti pada varian *aman jiwa - 1 K*).

### Perbaikan yang Dilakukan:
1. **Perbaikan Fallback Logic Backend (`PUT /api/stock-batches`)**:
   - Memodifikasi perhitungan unit count di backend agar jika berat stok riil yang diinput adalah `0`, jumlah unit kemasan (`newUnitCount`) diset menjadi `0` (bukan default minimal `1`).
2. **Perbaikan Endpoint GET (`GET /api/stock-batches`)**:
   - Memperbaiki logika fallback `exactQtyKg = dbCurrentQty || (unitCount * packSize)`. Karena `0` bernilai *falsy*, logika ini sebelumnya memaksa stok bernilai `0` dari database untuk tertimpa oleh hitungan `unitCount * packSize` (yaitu `1.0 kg`).
   - Logika ini telah diubah agar mendeteksi secara eksplisit jika `dbCurrentQty === 0` untuk melewatkan perhitungan fallback dan mengembalikan berat `0.0 kg` dan `0 unit` secara akurat sesuai isi database riil.
3. **Perbaikan Render Evaluasi Frontend (`src/app/admin/stock/page.tsx`)**:
   - Memperbaiki pengecekan ternary reaktif `b.unit_count ?` yang keliru memperlakukan angka `0` sebagai *falsy value* dan mengarahkan render ke fallback minimal `1 Unit`. 
   - Sekarang, sistem secara presisi mendeteksi `b.unit_count !== undefined && b.unit_count !== null` untuk menyajikan visualisasi `0 Unit (0.0 Kg)` secara tepat di seluruh ringkasan produk induk maupun baris rincian batch.
4. **Penyelarasan Data Langsung**:
   - Menjalankan migrasi data untuk menyesuaikan batch lama di database Anda yang bernilai `0.0 Kg` agar unit count-nya sinkron menjadi `0 Unit`.

---

## Bagian P: Pembersihan Tampilan (Sembunyikan Batch Lot yang Sudah Habis / 0)

Untuk meminimalkan kerancuan visual bagi pengelola gudang, batch lot fisik yang jumlah beratnya telah habis (bernilai `0` Kg) kini otomatis disembunyikan dari tabel rincian batch di halaman **Lihat Stok**.

### Implementasi:
* **Penyaringan Aktif (`src/app/admin/stock/page.tsx`)**:
  - Kami memodifikasi filter pencarian data `variantBatches` untuk memilah dan mengecualikan batch lot yang bernilai `0` Kg (`Number(b.current_qty_kg || 0) > 0`).
  - Varian yang stoknya kosong atau telah di-stok opname menjadi `0` kini akan langsung menampilkan teks informatif: **"Belum ada batch lot fisik untuk varian X Kg ini"** (misal pada *aman jiwa - 1 K*). Hal ini membuat daftar batch lot aktif di gudang menjadi sangat rapi dan bebas dari baris kosong tak berguna.

---

## Bagian Q: Penambahan Batch Baru untuk Material Kosong di Halaman Stok Opname

Untuk memudahkan pendaftaran barang fisik baru (material yang sempat kosong / memiliki 0 batch aktif di sistem), kami telah menambahkan tombol pintasan pendaftaran batch langsung di samping nama produk induk di halaman **Stok Opname**.

### Fitur & Implementasi:
1. **Tombol "+ Tambah Batch" di Baris Produk Induk**:
   - Di halaman Stok Opname (`/admin/stock/opname`), setiap produk induk (termasuk yang tidak memiliki batch aktif sama sekali) kini tetap dimunculkan dalam baris header abu-abu.
   - Di samping SKU dan nama produk induk, terdapat tombol berwarna biru: **"+ Tambah Batch"**.
2. **Modal Pendaftaran Batch Interaktif**:
   - Mengeklik tombol tersebut akan membuka modal popup formulir untuk menginput data batch baru, di mana ID produk induk otomatis terisi (pre-filled).
   - Input yang didukung: *Nomor Batch (Lot Number)* (dengan auto-generate default format FEFO), *Kemasan Satuan* (25 Kg drum, 5 Kg jerry can, 1 Kg alum bottle), *Berat Stok Fisik* (dalam kg), *Tanggal Produksi*, dan *Tanggal Kedaluwarsa*.
3. **Pemberitahuan & Sinkronisasi MySQL Otomatis**:
   - Saat disimpan, sistem mengirim permintaan `POST` ke API `/api/stock-batches` untuk menyimpannya ke MySQL, menghitung unit kemasan secara otomatis, menutup modal, dan memuat ulang data tabel secara real-time.
4. **Pencarian Cepat & Baris Placeholder Kosong**:
   - Menambahkan kotak pencarian (*Search Bar*) **"Cari nama produk / SKU..."** di bagian atas tabel untuk memudahkan filter.
   - Jika suatu produk tidak memiliki batch, di bawah nama produk akan muncul baris bantuan: *"Belum ada batch lot fisik untuk varian produk ini. Klik '+ Tambah Batch' di samping nama produk untuk mendaftarkan stok."*

---

## Bagian R: Integrasi Riwayat Log untuk Pendaftaran Batch Baru via Stok Opname

Agar selaras dengan proses audit ketat FEFO, setiap kali pengelola gudang mendaftarkan batch baru menggunakan tombol "+ Tambah Batch" di halaman Stok Opname, sistem kini secara otomatis mencatatkan aktivitas pendaftaran tersebut ke dalam **Riwayat Audit & Penyesuaian** (`stock_opname_history`).

### Detail Teknis Penambahan Log:
1. **Parameter `is_opname`**:
   - Backend `POST /api/stock-batches` kini menerima parameter opsional boolean `is_opname`.
2. **Penyimpanan Log**:
   - Jika `is_opname: true` terkirim dari formulir modal Stok Opname, backend secara instan memasukkan entri log ke tabel `stock_opname_history` dengan properti:
     * **Stok Sistem (A)**: `0.0 kg` (karena barang tersebut belum terdaftar sebelumnya).
     * **Stok Fisik (B)**: `initial_qty_kg` yang diinput oleh user.
     * **Selisih (B - A)**: `+initial_qty_kg` (menunjukkan penambahan stok baru).
     * **Catatan Audit**: `"Pendaftaran batch baru via Stok Opname"`.
     * **Oleh**: `"ADMIN GUDANG"`.

---

## Bagian S: Pengurutan Tampilan Stok Opname Berdasarkan Varian (Kemasan Satuan & FEFO)

Agar proses pencocokan barang lebih teratur dan runut bagi pengelola gudang saat melakukan stock opname fisik, daftar batch lot di bawah produk induk kini diurutkan secara rapi berdasarkan kelompok varian kemasannya.

### Logika Pengurutan:
- **Prioritas Utama (Varian Ukuran)**:
  - Batch diurutkan berdasarkan ukuran kemasan secara menurun/descending: **25 Kg** (drum) terlebih dahulu, diikuti **5 Kg** (Jerry Can), dan terakhir **1 Kg** (botol aluminium).
- **Prioritas Kedua (FEFO)**:
  - Untuk batch lot dengan ukuran kemasan yang sama, sistem mengurutkannya berdasarkan tanggal kedaluwarsa paling awal (*earliest expiry date first* / FEFO).

---

## Bagian T: Penghubungan Tombol Menyiapkan Barang ke Halaman Sales Order

Kami telah menghubungkan tombol aksi gudang **"3. Menyiapkan Barang (Pick/Pack)"** agar langsung mengarah ke halaman pengelolaan Sales Order (`/admin/sales-orders`).

### Implementasi:
- **Navigasi Langsung**:
  - Mengubah tombol trigger modal `isPackingOpen` pada halaman Manajemen Stok (`src/app/admin/stock/page.tsx`) menjadi tautan router Next.js `Link` dengan properti `href="/admin/sales-orders"`.
  - Hal ini mempermudah alur kerja pengelola gudang agar dapat langsung melakukan pemenuhan pesanan penjualan (Pick/Pack) berdasarkan pesanan distributor aktif.

---

## Bagian U: Penyederhanaan Tahapan Sales Order (SO) Menjadi 5 Alur Utama

Kami telah menyederhanakan siklus hidup / tahapan Sales Order (SO) dari semula 6 tahap menjadi **5 tahap utama** yang lebih ringkas dan efisien sesuai dengan instruksi operasional perusahaan Anda.

### Alur Tahapan Baru:
1. **"Diajukan"**
   - Customer B2B mengajukan pesanan & mengunggah bukti bayar transfer (jika metode pembayaran Tunai / Cash Before Delivery).
2. **"Dikonfirmasi"**
   - Tim Keuangan memvalidasi nominal/bukti bayar, menyetujui detail pesanan, dan menerbitkan Surat Jalan (Delivery Order) untuk dikirim ke gudang.
3. **"Proses Gudang"**
   - Petugas gudang memilihkan varian stok dan nomor batch lot berdasarkan FEFO. 
   - Di tahap ini, petugas gudang dapat memilih:
     * **Serahkan ke Customer (Ambil Langsung)**: Status pesanan langsung selesai menjadi **"Diterima"**.
     * **Serahkan ke Kurir (Kirim Kurir)**: Status pesanan berubah menjadi **"Dikirim"**.
4. **"Dikirim"** (Khusus Pengiriman Kurir)
   - Kurir membawa muatan dalam perjalanan pengiriman ke lokasi customer.
5. **"Diterima"**
   - Kurir/petugas menyerahkan barang, customer memeriksa isi bawaan, dan menandatangani laporan penerimaan (TTD POD digital).

### Detail Perubahan Kode:
- **Tampilan Stepper & Indikator**:
  - Menyederhanakan baris timeline stepper visual di detail pesanan admin (`src/app/admin/orders/[id]/page.tsx`) dan halaman portal customer B2B (`src/app/customer/orders/page.tsx`) menjadi 5 kolom grid (`sm:grid-cols-5`) dengan menyingkirkan status *DIBAYAR* yang kini melebur ke dalam konfirmasi keuangan.
- **Eksekusi Logika**:
  - Mengintegrasikan tombol aksi Tim Keuangan di tahap **Dikonfirmasi** agar langsung meneruskan status order ke **Proses Gudang**.
  - Menyediakan 2 tombol pilihan penyerahan stok di panel gudang (**Serahkan ke Kurir** vs **Serahkan ke Customer**) untuk mendukung pengambilan langsung secara instan.

---

## Bagian V: Tampilan Harga Produk Varian di Halaman Customer

Kami telah memperbaiki masalah penampilan harga yang sebelumnya menampilkan nilai `RpNaN` dan `Base: $NaN USD` di halaman Katalog B2B Customer karena struktur database produk sekarang menyimpan harga per kilogram (IDR & USD) langsung di level varian kemasan satuan (`product_variants`), bukan di level produk induk.

### Solusi & Implementasi:
- **Tampilan Harga per Varian Kemasan**:
  - Mengganti visualisasi satu harga di kolom **Harga Jual / Kg (Rupiah)** pada tabel katalog (`src/app/customer/catalog/page.tsx`) dengan kartu rincian harga untuk masing-masing ukuran kemasan varian yang aktif (**25 Kg**, **5 Kg**, dan **1 Kg**).
  - Mengambil data harga (`selling_price_per_kg` & `selling_price_usd_per_kg`) secara dinamis dari sub-item `product.variants` yang cocok dengan ukuran kemasan.
- **Pencegahan Error NaN (Fallback)**:
  - Membuat fungsi pembantu `getProductReferencePrice` untuk memetakan harga referensi yang aman jika salah satu varian tidak terisi atau kosong, sehingga sistem terhindar dari pembagian nilai `undefined` yang menghasilkan `NaN`.
  - Menggunakan fungsi ini untuk menghitung estimasi subtotal dan total tagihan saat customer B2B mengirim/mengajukan order baru melalui modal Checkout.

---

## Bagian W: Rincian Varian, Total Harga, dan Kewajiban Upload Bukti Pembayaran di Checkout

Kami telah meningkatkan fungsionalitas dan memperketat alur pengajuan pesanan B2B pada modal Checkout (`src/components/customer/checkout-modal.tsx`) guna memenuhi alur operasional terbaru yang Anda minta.

### Rincian Peningkatan:
1. **Rincian Varian Kemasan & Subtotal**:
   - Di daftar pesanan modal Checkout, sistem sekarang menampilkan secara spesifik nama varian kemasan yang dipilih (misal: *Vanilla Bourbon Super Pure 25K*) beserta harga per kilogramnya (`formatIDR`).
   - Menampilkan total nominal subtotal per item pesanan berdasarkan perkalian kuantitas Kg dengan harga varian kemasan yang dipilih.
2. **Total Harga yang Harus Dibayar (Grand Total)**:
   - Menambahkan baris informasi berwarna biru di bagian bawah daftar pesanan yang menampilkan total akumulasi harga yang harus dibayar customer untuk seluruh item di keranjang belanja.
3. **Kewajiban Bukti Transfer untuk Metode Pembayaran Tunai**:
   - Jika customer memilih metode pembayaran **Transfer Bank (Tunai)**, modal Checkout mewajibkan pengunggahan berkas bukti transfer resi bank (`JPG`, `PNG`, atau `PDF`).
   - Tombol **"Ajukan Pesanan ke Admin"** otomatis terkunci (disabled) selama berkas bukti transfer pembayaran belum diunggah.
   - Apabila pesanan tunai diajukan, berkas bukti transfer langsung terintegrasi ke data Invoice baru dengan status `PENDING` verifikasi finance, sehingga tahapan pengajuan status **Diajukan** dapat langsung ditindaklanjuti secara lengkap oleh Keuangan.

---

## Bagian Y: Integrasi Nomor Rekening PT Artaroma dari Master Data di Modal Checkout

Kami telah menambahkan fungsionalitas pengambilan data rekening bank resmi PT Artaroma secara dinamis dari database master settings (`company_settings`) dan menampilkannya di dalam modal Checkout.

### Solusi & Penerapan:
- **Penyimpanan Master Data Bank (MySQL Migration)**:
  - Membuat dan mengeksekusi skrip migrasi `scratch/add_bank_settings.js` untuk meregistrasikan data rekening bank resmi (**BCA** dan **Mandiri**) ke dalam tabel `company_settings` di database MySQL.
  - Memperluas API Route `/api/company-settings` (pada request `GET` dan `PUT`) agar mendukung pengembalian dan pembaruan kolom `bank_bca` dan `bank_mandiri`.
- **Integrasi di Tampilan Customer**:
  - Di dalam komponen `CheckoutModal`, sistem secara asinkron mengambil data rekening dari endpoint `/api/company-settings` saat komponen dimuat (mount).
  - Jika metode pembayaran **Transfer Bank (Tunai)** dipilih, rincian nomor rekening resmi (**BCA** & **Mandiri**) langsung dimunculkan di atas area upload bukti transfer, sehingga customer B2B tahu persis nomor tujuan transfer yang benar sebelum mengunggah bukti transaksi.

---

## Bagian Z: Pemisahan Item Keranjang & Perhitungan Harga Spesifik Tingkat Varian Kemasan

Kami telah memperbarui arsitektur pengelolaan keranjang belanja B2B (`cartItems`) agar mendeteksi dan mengelola pesanan pada tingkat **varian kemasan spesifik** (kombinasi produk + ukuran kemasan), bukan lagi digabungkan (merge) di tingkat produk induk.

### Solusi & Penerapan:
- **Pemisahan Entri Keranjang (Variant-Level Cart)**:
  - Mengubah struktur data state `cartItems` di halaman katalog dari `{ product, qtyKg }` menjadi `{ product, packSizeKg, quantity }` (jumlah unit kemasan).
  - Menghapus logika akumulasi kilogram global produk. Dengan struktur baru, jika customer memilih `25 Kg` dan `5 Kg` untuk produk yang sama, entri tersebut akan disimpan sebagai dua baris item terpisah yang memiliki harga dan kuantitas masing-masing.
- **Rincian Harga Spesifik di Halaman Katalog & Checkout**:
  - Di halaman katalog, kami mengubah antarmuka pemilihan kuantitas menjadi widget kontrol terpisah untuk masing-masing ukuran kemasan (**25 Kg**, **5 Kg**, dan **1 Kg**) yang dilengkapi tombol tambah/kurang unit secara independen.
  - Di halaman detail pesanan modal Checkout, sistem menampilkan rincian harga per Kg yang sesuai dengan masing-masing varian yang dipilih (misal: *Oud Royale Intense 25K* seharga *Rp 2.843.060 / Kg* dan *Oud Royale Intense 5K* seharga harga variannya).
  - Menghitung subtotal per item dengan perkalian tepat `harga_varian * (pack_size * quantity_unit)`, sehingga nominal total yang harus dibayar customer menjadi 100% akurat.
- **Integrasi Backend Sales Order**:
  - Saat order diajukan, item pesanan disimpan di database MySQL dengan nama produk yang menyertakan kode varian kemasan (misal: `Vanilla Bourbon Super Pure 25K`), sehingga pemrosesan stok FEFO di gudang dan verifikasi oleh keuangan berjalan konsisten.

---

## Bagian AA: Fitur Edit Varian Finansial & Penerbitan Surat Jalan (SBBK) di Dashboard Admin

Kami telah mengimplementasikan fitur lengkap bagi tim Keuangan (Finance) pada halaman detail pesanan admin ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx)) untuk mengelola item pesanan serta memicu alur logistik dengan benar.

### Rincian Fitur & Solusi Teknis:
1. **Interactive Finance Editor (`DIKONFIRMASI` State)**:
   - Pada status **Dikonfirmasi**, admin Keuangan disajikan dengan panel editor interaktif yang memungkinkan mereka untuk:
     - Mengubah kuantitas item pesanan (Kg) dan harga per Kg secara fleksibel.
     - Menghapus item dari pesanan.
     - Menambahkan varian kemasan baru (25 Kg, 5 Kg, 1 Kg) secara langsung dari daftar master produk yang disinkronkan dari database MySQL.
     - Melihat estimasi total tagihan baru secara real-time berdasarkan hasil perubahan.
2. **Penerbitan Surat Jalan (SBBK)**:
   - Menyediakan form input nomor Surat Jalan (Delivery Order) dan Nama Kurir Pengirim.
   - Mengklik **"Terbitkan Surat Jalan & Kirim ke Gudang"** akan menyimpan perubahan item dan nominal pesanan, mencatat nomor Surat Jalan, serta menggeser status alur kerja pesanan ke **Proses Gudang** (`PROSES_GUDANG`).
3. **Seleksi Batch di Gudang Berdasarkan Surat Jalan**:
   - Pada status **Proses Gudang**, petugas gudang kini ditampilkan kartu visual Surat Jalan resmi yang merinci daftar varian kemasan dan kuantitas final yang telah disetujui tim Keuangan sebagai dasar fisik untuk menyeleksi batch lot (FEFO).
4. **Pembaruan Skema Database & Sinkronisasi API**:
  - Menambahkan kolom `surat_jalan_number` dan `courier_name` pada tabel `sales_orders` di database MySQL.
  - Membuat API Endpoint baru `PUT /api/sales-orders/[id]` yang menangani pembaruan status order, nominal, serta melakukan transaksi relasi untuk memperbarui record item pesanan (`so_items`) secara aman.
  - Memodifikasi helper status `updateSalesOrderStatus` agar melakukan sinkronisasi asinkron ke database MySQL setiap kali terjadi perubahan status pada UI.

---

## Bagian AB: Seleksi Nomor Batch Manual & Pemotongan Stok Otomatis pada Tahap Proses Gudang

Kami telah memperluas panel kerja petugas gudang pada tahap **Proses Gudang** (`PROSES_GUDANG`) agar dapat menentukan (memilih) nomor batch fisik yang dialokasikan untuk setiap produk varian sebelum barang diserahkan ke kurir atau customer.

### Fitur & Implementasi Teknis:
1. **Dropdown Seleksi Batch Dinamis**:
   - Di dalam kartu visual Surat Jalan, setiap item pesanan varian kini memiliki menu dropdown **"Pilih No Batch"** yang memuat seluruh batch aktif (`current_qty_kg > 0` dan tidak kedaluwarsa) untuk produk tersebut langsung dari database MySQL.
   - Dropdown menampilkan informasi nomor batch, tanggal kedaluwarsa, serta sisa kuantitas stok yang tersedia di gudang.
2. **Pre-seleksi FEFO Otomatis (Rekomendasi)**:
   - Saat halaman dimuat pertama kali pada status **Proses Gudang**, sistem secara otomatis mengurutkan batch berdasarkan tanggal kedaluwarsa terdekat (prinsip FEFO) dan mempre-seleksi batch terbaik. Petugas gudang dapat langsung menyetujuinya atau memilih batch lain secara manual bila diperlukan.
3. **Penyimpanan Alokasi Batch**:
   - Saat petugas mengklik **"Serahkan ke Kurir"** atau **"Serahkan ke Customer"**, batch yang dipilih akan disimpan ke dalam properti `assigned_batches` di baris item pesanan. Hal ini menggantikan data batch keras (hardcoded) yang sebelumnya statis di tabel ringkasan item pesanan.
4. **Pemotongan Stok Otomatis di Database MySQL**:
   - Menghubungkan tombol serah-terima dengan API `PUT /api/stock-batches` untuk memotong sisa kuantitas stok (`current_qty_kg`) dari batch yang dipilih secara real-time di database MySQL. Log audit mutasi stok secara otomatis dicatat pada tabel `stock_opname_history`.

---

## Bagian AC: Filter Dropdowns Sesuai Varian Kemasan & Input Jumlah Keluar Kustom pada Tahap Proses Gudang

Kami telah menyempurnakan fitur seleksi batch pada langkah **Proses Gudang** (`PROSES_GUDANG`) pada halaman detail pesanan admin ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx)) agar membatasi kesalahan input dan mendukung pencatatan logistik secara presisi.

### Solusi & Penerapan Teknis:
1. **Filtering Batch Sesuai Varian Kemasan**:
   - Menambahkan logika parsing ukuran kemasan dari `product_name` (menggunakan regex `/(\d+)K$/`, contoh: `Oud Royale Intense (Agarwood) 25K` -> `25`).
   - Memfilter dropdown **Pilih No Batch** untuk masing-masing item pesanan agar **hanya menampilkan batch** yang memiliki `pack_size_kg` yang sesuai dengan varian kemasan yang dipesan (25, 5, atau 1). Batch dari kemasan lain secara otomatis disembunyikan.
2. **Input Kuantitas Jumlah Keluar Kustom (`Jumlah Sesuai (Kg)`)**:
   - Menambahkan input field tipe numerik untuk memasukkan jumlah berat keluar yang terpilih secara kustom (`batchQuantities` state).
   - Input diinisialisasi secara otomatis ke berat kuantitas pesanan yang dibutuhkan, namun petugas gudang dapat menyesuaikannya secara langsung sebelum melakukan serah-terima.
3. **Pencatatan & Pemotongan Stok Akurat**:
   - Nilai kuantitas kustom yang diinput petugas gudang digunakan sebagai kuantitas pemotongan stok (`qty_taken_kg`) pada properti `assigned_batches` item order.
   - Panggilan background API `PUT /api/stock-batches` secara dinamis menggunakan nilai kuantitas kustom ini untuk memotong stok fisik batch di database MySQL secara akurat.

---

## Bagian AD: Validasi Keselarasan Berat & Blokir Alur Pengiriman pada Kesalahan Batching Gudang

Kami telah memperketat validasi keamanan logistik pada tahap **Proses Gudang** (`PROSES_GUDANG`) sebelum pesanan dapat berpindah status ke **Dikirim** (`DIKIRIM`) atau **Diterima** (`DITERIMA`).

### Aturan Validasi Baru & Solusi:
1. **Mandatory Batch Assignment (Wajib Pilih Batch)**:
   - Tombol pengiriman akan memblokir proses jika terdapat produk varian dalam pesanan yang belum dipilihkan nomor batch fisiknya secara manual oleh petugas gudang.
2. **Kesesuaian Kuantitas (Ordered vs Fulfilled Weight Validation)**:
   - Berat kuantitas fisik yang dipenuhi gudang (`Jumlah Sesuai (Kg)`) harus bernilai **sama persis** dengan berat kuantitas yang dipesan oleh customer.
   - Jika petugas menginput jumlah keluar yang lebih kecil atau lebih besar dari kebutuhan pesanan, sistem akan memicu dialog peringatan (`alert`) dan memblokir perpindahan status alur kerja untuk mencegah ketidakcocokan tagihan invoice dan data inventaris.

---

## Bagian AE: Integrasi Penuh Halaman Daftar & Detail Sales Order dengan Database MySQL

Kami telah menyambungkan halaman antarmuka Sales Order secara penuh dengan database MySQL agar data pesanan tersinkronisasi secara real-time di seluruh dashboard admin dan customer.

### Solusi & Penerapan Teknis:
1. **Pengambilan Child Items di Endpoint GET `/api/sales-orders`**:
   - Memodifikasi method `GET` pada API route utama [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/sales-orders/route.ts) untuk melakukan `LEFT JOIN` dengan tabel `customers` (untuk mendapatkan nama PIC & nama perusahaan) serta melakukan iterasi query ke tabel `so_items` untuk mengambil seluruh rincian item pesanan dari database MySQL.
2. **Penyediaan Endpoint GET `/api/sales-orders/[id]`**:
   - Menambahkan method `GET` di API route detail [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/sales-orders/[id]/route.ts) agar mendukung pemanggilan detail pesanan tunggal secara spesifik dari database MySQL (menggunakan filter `id` maupun `so_number`).
3. **Koneksi Live Halaman List Sales Order Admin & Customer**:
   - Memperbarui halaman [Daftar SO Admin](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/sales-orders/page.tsx) dan [Daftar SO Customer](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/customer/orders/page.tsx) agar memicu `fetch('/api/sales-orders')` saat komponen dimuat.
   - Menyelaraskan hasil response database MySQL dengan state lokal UI dan menyinkronkan data terbaru tersebut ke dalam localStorage (`saveStoredOrders`) agar transisi fungsionalitas visual tetap berjalan instan.
4. **Validasi Satuan Terkecil SO adalah Kg**:
   - Memastikan seluruh modul (termasuk catalog, order store, dan order detail modals) secara konsisten mengelola kuantitas pesanan dalam unit Kilogram (`qty_kg` & `formatKg`).

---

## Bagian AF: Perbaikan Dukungan Status PENDING_APPROVAL pada Form Aksi Alur Kerja Admin

Kami telah menyelaraskan status pesanan awal antara database MySQL (`PENDING_APPROVAL`) dan alur kerja admin (`DIAJUKAN`) agar tombol eksekusi untuk melangkah ke tahapan selanjutnya (Konfirmasi Harga & Invoice) selalu muncul dengan benar.

### Solusi & Penerapan Teknis:
1. **Penyelarasan Logika Form Eksekusi**:
   - Memperbarui file [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) untuk menangani status `'PENDING_APPROVAL'` secara setara dengan `'DIAJUKAN'`.
   - Mengubah kondisi rendering panel aksi Langkah 1 agar memunculkan form input harga dan tombol konfirmasi tagihan jika status pesanan adalah `'DIAJUKAN'` maupun `'PENDING_APPROVAL'`.
2. **Penyelarasan Indikator Stepper & Waktu**:
   - Memperbarui logika highlight dan format waktu pada stepper horizontal agar tidak terjadi lompatan visual ketika pesanan yang dimuat dari database MySQL memiliki status `'PENDING_APPROVAL'`.

---

## Bagian AG: Penanganan Runtime TypeError 'Cannot read properties of undefined (reading match)'

Kami telah memperbaiki kegagalan runtime (crash) yang dipicu oleh properti `product_name` bernilai undefined pada pesanan mock lama atau data relasi yang belum terisi.

### Solusi & Penerapan Teknis:
1. **Penerapan Fallback String**:
   - Memperbarui pencocokan regex di [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) dengan menyisipkan fallback string kosong: `(item.product_name || '').match(/(\d+)K$/)`.
   - Hal ini mencegah method `.match` dipanggil pada nilai `undefined` atau `null`, sehingga halaman detail pesanan dapat dirender dengan aman dan lancar di semua kondisi data pesanan.

---

## Bagian AH: Penanganan Kolom Nama Produk Varian Kosong / Undefined di MySQL & UI Fallback

Kami telah mendeteksi dan menyelesaikan akar masalah mengapa nama produk varian (seperti *Vanilla Bourbon Super Pure 25K*) tidak muncul atau blank pada antarmuka detail pesanan admin.

### Solusi & Penerapan Teknis:
1. **Penambahan Kolom Database & Migrasi Data**:
   - Menyadari bahwa tabel `so_items` di database MySQL awalnya tidak memiliki kolom `product_name` sehingga nama produk gagal disimpan saat checkout.
   - Membuat dan mengeksekusi skrip migrasi [`add_product_name_column.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/add_product_name_column.js) untuk menambahkan kolom `product_name` (VARCHAR(255)) di database MySQL.
   - Mengisi otomatis nilai kolom `product_name` pada seluruh baris item lama berdasarkan lookup ke tabel `products` dan kalkulasi estimasi kemasannya.
   - Memperbarui method `POST` di endpoint API `/api/sales-orders` untuk secara konsisten menuliskan nama produk varian ke kolom `product_name` saat pesanan baru diajukan.
2. **Implementasi UI Fallback Helper (`getProductName`)**:
   - Di halaman [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx), kami menambahkan helper function `getProductName(item)` yang secara dinamis melakukan pencarian (lookup) nama produk dari daftar master `products` jika properti `product_name` di database bernilai kosong atau string `'undefined'`.
   - Menghubungkan helper ini ke baris loop item panel gudang serta tabel ringkasan utama detail pesanan untuk menjamin nama produk varian selalu muncul 100% dengan benar di UI.

---

## Bagian AI: Validasi Ketat Saringan Ukuran Varian Kemasan pada Dropdown Batch Gudang

Kami telah memperbaiki logika penyaringan dropdown **Pilih No Batch** agar membatasi nomor batch yang tampil secara ketat hanya pada varian ukuran kemasan yang sesuai (misal: jika pesanan adalah kemasan 25K, dropdown hanya menampilkan batch 25 Kg saja).

### Solusi & Penerapan Teknis:
1. **Pemicu Masalah**:
   - Penyaringan dropdown sebelumnya mengambil referensi dari kolom `item.product_name` di database. Karena kolom ini pada transaksi transisi bernilai kosong atau string `'undefined'`, fungsi regex `.match(/(\d+)K$/)` menghasilkan nilai `null`.
   - Ketika parsing ukuran kemasan menghasilkan `null`, sistem secara default mematikan filter kemasan sehingga memunculkan seluruh batch dari semua ukuran (25K, 5K, 1K) milik produk tersebut.
2. **Implementasi Perbaikan**:
   - Mengubah target parsing ukuran kemasan agar merujuk ke nama produk teresolusi dari helper fallback `getProductName(item)` ketimbang langsung ke properti `item.product_name` mentah.
   - Karena `getProductName(item)` dijamin selalu mengembalikan nama varian kemasan yang lengkap dengan suffix-nya (contoh: `"Vanilla Bourbon Super Pure 25K"`), penentuan pack size (`itemPackSize`) selalu sukses diekstrak.
   - Dropdown sekarang menyaring secara presisi dan hanya menampilkan batch dengan ukuran kemasan yang sesuai persis dengan item pesanan.

---

## Bagian AJ: Penyelarasan Pre-seleksi FEFO Otomatis Berbasis Ukuran Kemasan Varian

Kami telah menyelaraskan logika auto-FEFO (pre-selection) pada inisialisasi halaman dengan filter kemasan di UI untuk menghilangkan notifikasi peringatan palsu ("Harap pilih nomor batch...").

### Solusi & Penerapan Teknis:
1. **Pemicu Masalah**:
   - Fungsi pre-seleksi FEFO otomatis di `useEffect` awalnya hanya menyaring berdasarkan `product_id`. Jika batch terdekat yang akan kedaluwarsa adalah ukuran kemasan 5K (misalnya `LOT-2026-VAN-5K-B2`), sistem akan menyimpannya ke React state `selectedBatches` sebagai batch terpilih untuk item tersebut.
   - Namun, karena dropdown UI untuk item 25K disaring ketat hanya untuk menampilkan batch 25 Kg, batch 5K tersebut tidak terdaftar dalam pilihan opsi dropdown. Akibatnya, browser secara default merender opsi pertama yang tersedia (membuat seolah-olah batch 25K terpilih di mata user), sedangkan state React sebenarnya masih memegang ID batch 5K.
   - Ketika tombol "Serahkan ke Kurir" diklik, validasi mendeteksi ketidaksesuaian ID state ini, menduga batch belum terpilih, dan memicu notifikasi peringatan.
2. **Implementasi Perbaikan**:
   - Memperbarui `useEffect` pre-seleksi FEFO otomatis agar menerapkan filter kemasan (`pack_size_kg === itemPackSize`) yang sama persis dengan yang digunakan oleh filter dropdown di UI.
   - Menambahkan pengaman `if (!initialSelection[item.id])` untuk memastikan sinkronisasi data database berkala (background interval) tidak menimpa atau merusak nomor batch yang telah dipilih secara manual oleh petugas gudang.

---

## Bagian AK: Pembatasan Satuan Terkecil Kuantitas Realisasi Gudang Menjadi Bulat (1 Kg)

Kami telah membatasi kolom input realisasi kuantitas gudang agar hanya menerima bilangan bulat (integer) dalam Kg, memastikan satuan terkecil transaksi adalah 1 Kg tanpa adanya pecahan desimal.

### Solusi & Penerapan Teknis:
1. **Penyesuaian Atribut Input & Logika Stepper**:
   - Memodifikasi input field realisasi kuantitas gudang (`Jumlah Sesuai (Kg)`) di [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) dengan mengubah nilai atribut `step` dari `"0.1"` menjadi `"1"`.
   - Menambahkan atribut batas minimum `min="0"`.
2. **Enforcement Bilangan Bulat pada State React**:
   - Memodifikasi fungsi `onChange` input kuantitas tersebut agar membungkus input dengan `Math.round(Number(e.target.value)) || 0` untuk secara otomatis membulatkan desimal yang diketik/di-paste oleh operator ke Kg bulat terdekat.
   - Menyelaraskan default fallback value menggunakan `Math.round(item.qty_kg)` sebagai jaminan integrasi data.

---

## Bagian AL: Pemilihan Nama Kurir Pengirim Dinamis dari Database Master Data

Kami telah mengubah kolom input "Nama Kurir Pengirim" di tahap penerbitan Surat Jalan (SBBK) admin dari text input bebas menjadi dropdown selector (`<select>`) yang memuat data live kurir aktif dari database MySQL.

### Solusi & Penerapan Teknis:
1. **Pembuatan Endpoint API Kurir**:
   - Membuat endpoint API baru di [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/couriers/route.ts) untuk melayani query `GET` dari tabel database `couriers` (mengambil seluruh kurir dengan status `is_active = 1`).
2. **Pemuatan Data di Halaman Detail Order**:
   - Menambahkan state `courierList` dan `useEffect` pada halaman [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) untuk memanggil `/api/couriers` secara berkala dengan fallback data `initialCouriers` jika database belum siap.
3. **Penyelarasan Input Dropdown Selector**:
   - Mengubah text input `courierNameInput` pada form penerbitan Surat Jalan menjadi select dropdown dinamis.
   - Masing-masing pilihan kurir memetakan nama lengkap beserta plat/jenis armada kendaraan (contoh: *Budi Gunawan (Kurir Cargo) (B 7721 KFP)*) secara otomatis untuk langsung disimpan sebagai atribut `courier_name` Surat Jalan.

---

## Bagian AM: Sinkronisasi Penuh Manajemen Kurir di Halaman Master Data dengan Database MySQL

Kami telah menyambungkan tab Manajemen Kurir pada halaman Master Data secara penuh ke database MySQL via RESTful API CRUD, menyelesaikan masalah perbedaan isi kurir antara dropdown transaksi dan tabel Master Data.

### Solusi & Penerapan Teknis:
1. **Penyediaan API CRUD Kurir Lengkap**:
   - Melengkapi endpoint [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/couriers/route.ts) dengan request handler `POST` untuk menyimpan data kurir baru ke MySQL.
   - Membuat API route dinamis baru di [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/couriers/[id]/route.ts) untuk menangani request `PUT` (update) dan `DELETE` (hapus) kurir spesifik berdasarkan `id`. Menggunakan konvensi Next.js 15/16 dengan meng-await objek parameter `params` (Promise).
2. **Koneksi Live Tab Kurir Master Data**:
   - Memperbarui halaman Master Data [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx) untuk melakukan pemanggilan `fetch('/api/couriers')` saat memuat data.
   - Menghubungkan fungsi aksi tambah, edit, dan hapus pada UI Master Data kurir agar memicu request POST/PUT/DELETE ke MySQL, kemudian melakukan reload data terbaru (`fetchCouriers`).
3. **Seeder Data Kurir Default**:
   - Membuat dan mengeksekusi skrip [`seed_couriers.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/seed_couriers.js) untuk memasukkan 3 kurir bawaan (*Rian Pratama*, *Agus Subandi*, *Doni Setiawan*) ke dalam tabel `couriers` MySQL.
   - Hal ini membuat isi data kurir di Master Data dan pilihan dropdown di halaman rincian transaksi sinkron dan identik.

---

## Bagian AN: Implementasi Form Penerimaan Barang (Proof of Delivery - POD) Lengkap

Kami telah menambahkan Form/Modal Penerimaan Barang (POD) yang memuat input Nama Penerima, unggah Foto Bukti Penerimaan, serta Tanda Tangan Digital berbasis kanvas interaktif. Data POD ini kemudian disimpan langsung ke database dan ditampilkan kembali secara visual saat pesanan telah selesai (`DITERIMA`).

### Solusi & Penerapan Teknis:
1. **Migrasi Kolom Database POD**:
   - Menambahkan kolom `received_by` (VARCHAR), `received_photo` (LONGTEXT), dan `received_signature` (LONGTEXT) pada tabel `sales_orders` di MySQL lewat skrip [`add_pod_columns.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/add_pod_columns.js).
   - Menyelaraskan interface `SalesOrder` di [`types.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/lib/types.ts) dan pemetaan update payload di [`order-store.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/lib/order-store.ts) serta API router [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/sales-orders/[id]/route.ts).
2. **Modal Interaktif POD (Kanvas Tanda Tangan & Foto)**:
   - Membuat modal popup Proof of Delivery di [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) yang dipicu saat menekan tombol "Serahkan ke Customer" (di status `PROSES_GUDANG`) maupun tombol "Selesaikan Serah Terima POD" (di status `DIKIRIM`).
   - **Nama Penerima**: Diisi dengan default nama customer, dapat diubah.
   - **Foto Bukti**: Dilengkapi tombol unggah file asli (otomatis dikonversi ke Base64 via `FileReader`) dan tombol simulasi kamera (menghasilkan SVG mock image).
   - **Tanda Tangan**: Menggunakan elemen HTML5 `<canvas>` interaktif dengan event listener Mouse & Touch, tombol "Bersihkan" kanvas, serta tombol "Tanda Tangan Cepat" yang otomatis menggambar tanda tangan kursif estetis untuk mempercepat uji coba.
3. **Penyajian Data POD Terkirim**:
   - Memodifikasi kartu status `DITERIMA` untuk menampilkan data serah terima yang valid: tanggal penerimaan, nama penerima, beserta preview gambar bukti foto dan tanda tangan digital penerima secara side-by-side.

---

## Bagian AO: Implementasi Dialog Konfirmasi Muatan Kurir (Handover Checklist)

Kami telah menambahkan Dialog/Modal Konfirmasi Muatan Kurir saat menekan tombol "Serahkan ke Kurir" di status `PROSES_GUDANG`. Modal ini mengharuskan kurir menandai/memeriksa check-list setiap produk varian beserta nomor batch dan kuantitasnya sebelum status berganti menjadi `DIKIRIM`.

### Solusi & Penerapan Teknis:
1. **Modal Handover Checklist**:
   - Membuat popup modal interaktif untuk serah terima muatan di [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) yang dipicu saat menekan tombol "Serahkan ke Kurir".
   - Menampilkan ringkasan kurir pengirim beserta daftar seluruh item varian dalam pesanan. Untuk setiap item, modal memaparkan detail nama varian, nomor batch terpilih (FEFO), dan kuantitas (Kg) yang dibawa.
2. **Validasi Interaktif Keamanan Muatan**:
   - Setiap item produk dilengkapi checkbox interaktif.
   - Tombol utama **"Konfirmasi & Kirim"** di-disable secara default dan hanya akan aktif jika kurir telah mencentang/memverifikasi semua item varian yang akan dimuat ke dalam armada kendaraan.
   - Saat dikonfirmasi, barulah sistem menjalankan fungsi `handleDispatchOrder()` untuk memproses pemotongan stok di database dan mengubah status transaksi menjadi `DIKIRIM`.

---

## Bagian AP: Pemisahan Menu Dropdown "Pesanan" Menjadi Menu "Purchase Order (PO)" dan "Sales Order (SO)" Mandiri

Kami telah merombak tata letak bar navigasi utama admin agar menghapus dropdown "Pesanan" dan menggantinya dengan dua menu top-level yang berdiri sendiri: **Purchase Order (PO)** dan **Sales Order (SO)**.

### Solusi & Penerapan Teknis:
1. **Pembaruan Bar Navigasi Utama** ([`admin-topnav.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/components/navigation/admin-topnav.tsx)):
   - Menghapus pembungkus dropdown `<div ref={pesananRef}>` beserta status `isPesananOpen` dan `setIsPesananOpen`.
   - Menambahkan dua elemen `<Link>` mandiri yang masing-masing mengarah ke halaman PO `/admin/procurement` (dilengkapi ikon `FileText`) dan halaman SO `/admin/sales-orders` (dilengkapi ikon `ShoppingCart`).
2. **Pembersihan Kode & Uji Tipe**:
   - Menghapus event listener `handleClickOutside` untuk `pesananRef` dan membersihkan variabel state/konstanta yang tidak digunakan lagi seperti `isPesananActive` dan `setIsPesananOpen(false)` pada klik menu Finance.
   - Menjalankan uji kompilasi TypeScript untuk memastikan tidak ada import gantung atau error tipe pada navigasi (Exit Code 0).

---

## Bagian AQ: Perbaikan Link "Kembali ke Daftar Pesanan" di Halaman Detail Sales Order (SO)

Kami telah memperbaiki link navigasi kembali (back button) pada bagian atas halaman detail Sales Order admin agar mengarah ke daftar Sales Order, bukan ke halaman Finance & Invoice.

### Solusi & Penerapan Teknis:
1. **Penyesuaian Tujuan Link & Label** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx)):
   - Mengubah atribut `href` pada tombol kembali dari `/admin/finance` menjadi `/admin/sales-orders`.
   - Memperbarui teks tautan dari `"Kembali ke Daftar Pesanan"` menjadi `"Kembali ke Sales Order (SO)"` agar selaras dengan menu mandiri baru yang telah dipisah.

---

## Bagian AR: Reset Database MySQL (Pembersihan Data Transaksi & Pemulihan Master Data)

Kami telah membersihkan seluruh data transaksi akumulasi pada database MySQL (Sales Orders, Purchase Orders, Invoices, Payments, Deliveries, dsb.) dan memulihkan master data bawaan sistem ke kondisi awal yang bersih untuk keperluan pengujian baru.

### Solusi & Penerapan Teknis:
1. **Pembersihan Data Transaksi Akumulasi**:
   - Menulis dan mengeksekusi skrip pembersihan transaksi [`reset_mysql_transactions.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/reset_mysql_transactions.js). Skrip ini mematikan pemeriksaan foreign key, melakukan `TRUNCATE TABLE` pada tabel transaksi, dan memulihkan nilai `current_qty_kg` dari batch stok kembali ke nilai `initial_qty_kg`.
2. **Pemulihan Master Data Utama**:
   - Menulis dan mengeksekusi skrip pemulihan master data [`restore_all_master_data.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/restore_all_master_data.js) untuk membersihkan dan mengisi kembali tabel master data dengan skema kolom yang tepat (termasuk kolom dinamis `pack_sizes` dan `variant_prices` bertipe JSON pada tabel `products`).
   - Menyediakan kembali akun default pengguna (Super Admin, Customer, Distributor, Kurir) dan data rekening bank resmi pada tabel `company_settings` untuk menjamin semua fungsi aplikasi tetap berjalan sempurna setelah database di-reset.

---

## Bagian AS: Perbaikan Hydration Mismatch Nilai Tukar Kurs di Dashboard Admin

Kami telah menyelesaikan error *Hydration mismatch* pada Dashboard Admin yang terjadi akibat inkonsistensi locale formatting angka ribuan (koma `,` vs titik `.`) antara sisi server (SSR) dan sisi client (browser).

### Solusi & Penerapan Teknis:
1. **Penetapan Format Locale Konsisten** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/page.tsx)):
   - Mengubah pemanggilan format angka bawaan `activeRate.toLocaleString()` menjadi bentuk berformat eksplisit `new Intl.NumberFormat("id-ID").format(activeRate)` pada baris info alert sukses dan teks rate simulasi.
   - Perubahan ini memaksa Node.js server (SSR) dan browser (client) untuk secara seragam menggunakan pemisah ribuan berupa titik `.` khas locale Indonesia (`16.250`), menghilangkan perbedaan render HTML statis selama proses hydrasi Next.js.

---

## Bagian AT: Penggantian Master Produk Induk & Penyesuaian Batch Stok Bawaan

Kami telah memperbarui seluruh daftar produk induk di database dan mock data sistem untuk digantikan dengan 4 produk utama baru sesuai kebutuhan operasional.

### Solusi & Penerapan Teknis:
1. **Daftar Produk Induk Baru**:
   - **ACASIA** (`prod-001`, SKU: `FO-ACA-001`, Aroma: Floral, Densitas: 1.010)
   - **BOUGENVILLE** (`prod-002`, SKU: `FO-BOU-002`, Aroma: Floral, Densitas: 0.990)
   - **AQUA FRESH** (`prod-003`, SKU: `FO-AQU-003`, Aroma: Fresh, Densitas: 0.980)
   - **CITRONELLA OIL** (`prod-004`, SKU: `FO-CIT-004`, Aroma: Citrus, Densitas: 0.890)
2. **Penerapan Database & Sinkronisasi Kode** ([`change_master_products.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/change_master_products.js) & [`mock-data.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/lib/mock-data.ts)):
   - Mengeksekusi pembersihan dan penyisipan data baru di MySQL yang mendaftarkan 4 produk tersebut beserta batch stok bawaan (LOT-2025/2026) dengan volume awal penuh (ready).
   - Memodifikasi konstanta `initialProducts` and `initialBatches` di mock data frontend untuk menyamakan data yang tampil di browser dengan data database secara presisi.

---

## Bagian AU: Pembersihan Data Transaksi Mock (Sales Orders, Invoices, Delivery Tasks) di Sisi Client

Kami telah mengosongkan data transaksi tiruan (mock data) yang tersimpan di memori inisialisasi frontend untuk memastikan halaman daftar pesanan benar-benar bersih dan bebas dari data uji coba lawas.

### Solusi & Penerapan Teknis:
1. **Pengosongan Inisialisasi State Transaksi** ([`mock-data.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/lib/mock-data.ts)):
   - Mengosongkan isi array `initialSalesOrders` menjadi `[]` (sebelumnya memuat 6 Sales Order mock).
   - Mengosongkan isi array `initialInvoices` menjadi `[]` (sebelumnya memuat 3 Invoice mock).
   - Mengosongkan isi array `initialDeliveryTasks` menjadi `[]` (sebelumnya memuat 1 Delivery Task mock).
2. **Hasil Uji**:
   - Tampilan daftar Sales Order (SO), Purchase Order (PO), Invoice, dan Delivery pada seluruh dashboard saat ini sepenuhnya kosong dan bersih. Penambahan data hanya akan bersumber dari input transaksi baru yang diisi langsung oleh user atau customer.

---

## Bagian AV: Penghapusan Kolom "Harga Varian /" pada Tabel Master Produk

Kami telah menghilangkan kolom "Harga Varian /" beserta output harga varian di halaman katalog Master Produk admin, karena pengaturan harga varian dialihkan sepenuhnya ke dalam tab "Pricelist Umum".

### Solusi & Penerapan Teknis:
1. **Penyesuaian Tata Letak Tabel** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Menghapus kolom header `<th>Harga Varian /</th>` (baris 1187-1193).
   - Menghapus sel placeholder pada baris master produk induk (baris 1238-1246).
   - Mengubah properti `colSpan` baris pemisah kelompok varian (`PRODUK VARIAN :`) dari `colSpan={5}` menjadi `colSpan={4}` agar sesuai dengan jumlah kolom baru.
   - Menghapus sel rendering nilai harga varian (`formatIDR(vPriceIdr)`) pada baris varian produk (baris 1291-1302).
2. **Hasil Kompilasi**:
   - Halaman `Master Data` saat ini berpenampilan lebih bersih dan tidak menampilkan data harga ganda, mengalokasikan manajemen harga secara terpusat ke tab Pricelist. Sistem terkompilasi dengan bersih (Exit Code 0).

---

## Bagian AW: Penghapusan Kolom Input "Harga Varian" pada Modal Edit Varian Produk

Kami telah menghapus kolom input harga varian beserta konversi kurs USD terkait dari modal "Edit Produk Varian" untuk menyelaraskan dengan aturan tata kelola harga terpusat di Pricelist.

### Solusi & Penerapan Teknis:
1. **Pembaruan Desain Modal** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Menghapus komponen input `Harga Varian / Kg (IDR)` beserta teks konversi nilai tukar USD (sebelumnya berada di baris 3617-3635).
   - Menghapus properti baris harga varian dari rangkuman kartu ungu `Detail Varian` (sebelumnya berada di baris 3658-3663).
   - Menambahkan kotak informasi pemberitahuan berwarna biru yang menjelaskan bahwa harga varian dikelola secara terpusat pada tab **Pricelist Umum** guna mengedukasi admin.
2. **Pembaruan Tombol Aksi Footer**:
   - Menyembunyikan tombol `"Simpan Perubahan Data"` ketika tipe item yang diedit adalah `variant`.
   - Mengubah label tombol penutup dari `"Batal"` menjadi `"Tutup"` demi kenyamanan interaksi pengguna.

---

## Bagian AX: Pengaktifan Pengeditan Nama dan SKU Varian Produk Berbasis Database

Kami telah mengaktifkan kembali kolom input serta fungsionalitas pengeditan Nama Varian dan Kode SKU Varian secara mandiri melalui modal "Edit Produk Varian" dan menyimpannya secara permanen ke database MySQL.

### Solusi & Penerapan Teknis:
1. **Migrasi Kolom Database MySQL** ([`add_variant_columns.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/add_variant_columns.js)):
   - Menambahkan kolom baru `variant_names` (TEXT, NULL) dan `variant_skus` (TEXT, NULL) pada tabel `products` di database MySQL.
2. **Pembaruan API Endpoint** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Memodifikasi metode `GET` untuk menarik dan mengonversi kolom JSON `variant_names` dan `variant_skus`.
   - Memodifikasi metode `PUT` agar menerima parameter baru `variant_names` dan `variant_skus` untuk diupdate secara aman ke database menggunakan klausa `COALESCE`.
3. **Penyelarasan Antarmuka & Logika Frontend** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Menambahkan state `variantNameInput` dan `variantSkuInput` pada form edit.
   - Menyisipkan komponen input teks untuk `Nama Varian` dan `Kode SKU Varian` di dalam modal.
   - Mengaktifkan kembali tombol `"Simpan Perubahan Data"` (dan label tombol `"Batal"`) pada footer modal.
   - Memodifikasi handler `handleEditSubmit` agar mengirimkan payload `PUT` ke `/api/products` untuk menyimpan perubahan varian (maupun produk induk) secara persisten.
   - Merender nama dan SKU varian di tabel secara dinamis: jika terdapat nama/SKU kustom di database, tampilkan nilai tersebut, jika tidak, gunakan format default.

---

## Bagian AY: Perbaikan Input Pricelist Umum & Seeding Tabel "product_variants" MySQL

Kami telah memperbaiki kendala modal "Atur Pricelist Varian" yang kosong ("Tidak ada varian terdaftar") dengan men-populate tabel `product_variants` di MySQL serta menambahkan fitur pembuatan varian otomatis di database.

### Solusi & Penerapan Teknis:
1. **Seeding Awal 12 Produk Varian** ([`seed_product_variants.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/seed_product_variants.js)):
   - Menulis dan menjalankan skrip database untuk mengisi 12 record varian bawaan untuk 4 produk utama (ACASIA, BOUGENVILLE, AQUA FRESH, CITRONELLA OIL) dengan masing-masing kemasan `25 Kg`, `5 Kg`, dan `1 Kg` lengkap dengan harga IDR dan konversi USD yang sesuai.
2. **Pembaruan Logika Simpan Pricelist** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/pricelist/route.ts)):
   - Memodifikasi skema *fallback* pencarian varian produk: jika saat pembaruan harga suatu varian tidak ditemukan barisnya di tabel database, sistem akan secara otomatis mengeksekusi perintah `INSERT INTO product_variants` alih-alih `UPDATE`.
3. **Penyelarasan Form Pembuatan Data Baru** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Menambahkan pengiriman payload API request ke backend saat admin membuat produk template (`POST /api/products` dan inisialisasi 3 varian awal).
   - Menambahkan pengiriman payload API request saat admin mendaftarkan ukuran kemasan varian baru (`PUT /api/products` dan registrasi baris di `product_variants` MySQL).

---

## Bagian AZ: Perbaikan SQL Insert / Update Error pada API Pembuatan Produk Induk

Kami telah mengidentifikasi dan memperbaiki bug query database pada API `/api/products` (metode `POST` dan `PUT`) yang menyebabkan produk induk baru gagal disimpan ke database MySQL.

### Solusi & Penerapan Teknis:
1. **Analisis Masalah**:
   - Query `INSERT` dan `UPDATE` sebelumnya menyertakan kolom `min_stock_kg` dan `selling_price_per_kg` untuk tabel `products`.
   - Kedua kolom tersebut sebenarnya milik tabel `product_variants`, bukan tabel `products`, sehingga database MySQL menolak query dengan error `ER_BAD_FIELD_ERROR` (Unknown column).
2. **Pembaruan Query API** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Menghapus kolom `min_stock_kg` dan `selling_price_per_kg` dari query `INSERT` pada metode `POST` dan query `UPDATE` pada metode `PUT`.
   - Menyimpan informasi harga produk induk bawaan ke dalam kolom JSON `variant_prices` dan metadata pendukung lainnya saat pembuatan produk baru.
3. **Hasil Perbaikan**:
   - Pembuatan produk induk baru via tombol "+ Tambah Data PRODUK Baru" kini sukses disimpan secara utuh ke database MySQL dan persisten setelah halaman direfresh.

---

## Bagian BA: Penghapusan Kolom Input "Harga Varian" pada Form Tambah Varian Baru

Kami telah menghapus kolom input harga varian beserta konversi nilai tukar USD terkait dari tab "2. Produk Varian Baru" pada modal tambah produk, guna konsisten dengan skema pengaturan harga terpusat.

### Solusi & Penerapan Teknis:
1. **Pembaruan Desain Modal Tambah Varian** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Menghapus komponen input `Harga Varian / Kg (IDR)` beserta teks info konversi USD terkait (sebelumnya berada di baris 2671-2690).
   - Menghapus baris tampilan `Harga Varian / Kg` dari rangkuman kartu detail berwarna ungu `Detail Produk Varian Baru (Otomatis Dihasilkan)` (sebelumnya berada di baris 2738-2743).
2. **Hasil Perbaikan**:
   - Pengisian form tambah varian baru kini terfokus hanya pada pemilihan produk induk, penentuan ukuran kemasan, serta ambang batas minimum stok. Seluruh pengisian harga varian baru dilakukan melalui tab **Pricelist Umum**.

---

## Bagian BB: Perbaikan Validasi Browser (Step Mismatch) pada Input Batas Minimum Stok

Kami telah membenahi pesan peringatan kesalahan dari validasi bawaan HTML5 browser (*"Please enter a valid value. The two nearest valid values are..."*) pada input *Min. Stok Warning Threshold*.

### Solusi & Penerapan Teknis:
1. **Analisis Masalah**:
   - Atribut input `step` disetel dinamis mengikuti kelipatan kemasan varian, contohnya `1` untuk varian 1 Kg, atau `25` untuk varian 25 Kg.
   - Namun, atribut `min` disetel tetap `0.1`.
   - Browser menghitung nilai valid dengan rumus `min + n * step`. Untuk kemasan 1 Kg, nilai valid menjadi `0.1`, `1.1`, `2.1`, dst. Angka bulat seperti `1` atau `2` dianggap tidak valid oleh browser sehingga memicu tooltip error.
2. **Penerapan Perbaikan** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Mengubah nilai atribut `min` dari yang sebelumnya bernilai statis `0.1` menjadi dinamis `variantPackSize || 1` (baris 2679).
3. **Hasil Perbaikan**:
   - Browser kini memvalidasi kelipatan bulat yang tepat dari kemasan (misal: `1`, `2`, `3` Kg untuk varian 1 Kg; atau `25`, `50`, `75` Kg untuk varian 25 Kg) secara mulus tanpa ada tooltip penolakan dari browser.

---

## Bagian BC: Penanganan Nilai Undefined pada Parameter Query UPDATE API Produk

Kami telah memperbaiki pesan kesalahan database (*"Bind parameters must not contain undefined. To pass SQL NULL specify JS null"*) yang muncul ketika admin memperbarui produk induk atau mengubah detail varian produk.

### Solusi & Penerapan Teknis:
1. **Analisis Masalah**:
   - Payload pembaruan produk induk atau pembaruan nama/SKU varian mengirimkan JSON parsial (hanya berisi field yang dimodifikasi, misalnya `variant_names` & `variant_skus` saja saat edit varian; atau info template saja saat edit produk induk).
   - API `PUT /api/products` mengurai seluruh data dari body, sehingga variabel parameter yang tidak disertakan dalam payload bernilai `undefined` di JavaScript.
   - Pustaka `mysql2` pada Node.js menolak nilai `undefined` pada parameter bind query SQL dan menghentikan eksekusi dengan exception.
2. **Penerapan Perbaikan** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Menambahkan pengecekan tipe data untuk seluruh parameter bind di metode `PUT`.
   - Mengonversi semua nilai parameter yang bertipe `undefined` menjadi `null` sebelum diteruskan ke eksekutor query database.
3. **Hasil Perbaikan**:
   - Perubahan data produk induk maupun data varian kini dapat disimpan secara sukses tanpa kendala parameter SQL `undefined`, baik saat mengedit sebagian kecil properti maupun seluruh properti.

---

## Bagian BD: Inisialisasi Harga Varian ke Rp 0 pada Produk Baru Sebelum Diatur

Kami telah membenahi logika inisialisasi produk baru agar seluruh sub-variannya secara bawaan bernilai `Rp 0` (belum terisi) alih-alih mengadopsi harga acuan template default, guna memberikan kepastian bagi admin untuk mengaturnya sendiri di tab Pricelist.

### Solusi & Penerapan Teknis:
1. **Analisis Masalah**:
   - Saat produk induk baru dibuat (seperti "Tenang Saja" atau "Aman Jaya"), form pendaftaran tidak lagi menanyakan harga karena kolom input tersebut telah dihapus.
   - Namun, kode di frontend dan backend API `POST /api/products` secara otomatis menggunakan nilai harga acuan bawaan state (`1850000`) dan menambahkannya ke sub-varian kemasan `25 Kg`, `5 Kg`, dan `1 Kg` (+ Rp 100rb & Rp 150rb).
2. **Pembaruan Logika Inisialisasi** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts) & [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Memodifikasi inisialisasi state `newProd` dan pemetaan database agar default `selling_price_per_kg` bernilai `0`.
   - Mengubah API backend `POST` agar membolehkan angka `0` sebagai input harga (tidak lagi ditolak oleh pengecekan nilai kosong JavaScript).
   - Mengisi data harga variant prices default awal pada `product_variants` dengan `0` untuk mata uang Rupiah dan USD.
3. **Pembersihan Database & Hasil Akhir** ([`cleanup_new_product_prices.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/cleanup_new_product_prices.js)):
   - Mengeksekusi pembersihan data uji "Tenang Saja" dan "Aman Jaya" di database MySQL dengan mereset seluruh harga sub-variannya menjadi `Rp 0` ($0.00).
   - Di tab **Pricelist Umum**, produk yang baru didaftarkan saat ini tampil bersih dengan harga Rp 0 ($0.00) dan bertombol "Atur Harga" agar admin dapat mengatur harga resminya secara mandiri.

---

## Bagian BE: Penonaktifan Harga / Data Varian dan Produk Induk di Database Setelah Dihapus

Kami telah mengintegrasikan fungsionalitas penghapusan data secara sinkron antara antarmuka (frontend) dan database MySQL (backend) untuk produk induk maupun sub-varian produk yang dihapus.

### Solusi & Penerapan Teknis:
1. **Pembaruan Logika Hapus Varian** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Memodifikasi handler `handleDeleteVariant` agar menghapus entri ukuran kemasan terkait dari properti `pack_sizes`, `variant_prices`, `variant_names`, dan `variant_skus` pada produk induk, serta mengirimkan request `PUT` ke API.
2. **Pembaruan API Endpoint PUT & Deaktivasi Varian** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Menambahkan query SQL otomatis di metode `PUT` produk: saat array `pack_sizes` diperbarui, API akan mengeksekusi query untuk menonaktifkan (`is_active = FALSE`) semua varian produk bersangkutan di tabel `product_variants` yang ukurannya tidak lagi terdaftar dalam `pack_sizes`.
3. **Penerapan API DELETE Produk Induk & Penyelarasan Tombol Hapus**:
   - Menambahkan metode handler `DELETE` baru pada API `/api/products` untuk menonaktifkan produk di tabel `products` (`is_active = FALSE`) dan menonaktifkan seluruh variannya di tabel `product_variants` secara kaskade.
   - Memodifikasi fungsi `handleDelete` di Master Data agar mengirimkan request `DELETE` ke backend saat menghapus produk induk.
4. **Pembersihan Database & Hasil Akhir** ([`deactivate_deleted_product_variants.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/deactivate_deleted_product_variants.js)):
   - Mengeksekusi skrip pembersihan untuk menonaktifkan produk uji "Tenang Saja" (FO-NEW-006) beserta seluruh sub-variannya di database MySQL.
   - Sekarang, daftar produk di Master Data maupun tab **Pricelist Umum** sepenuhnya tersinkronisasi dan tidak menampilkan data atau harga dari produk/varian yang telah dihapus.

---

## Bagian BF: Pengaktifan Kembali (Reaktivasi) Varian yang Ditambahkan Ulang ke Database

Kami telah memperbaiki isu di mana varian produk (seperti "Aman Jaya 1K") yang dihapus lalu ditambahkan kembali ke produk induk tidak langsung muncul di daftar Pricelist Umum.

### Solusi & Penerapan Teknis:
1. **Analisis Masalah**:
   - Menghapus varian menonaktifkannya di database dengan menyetel `is_active = FALSE` pada tabel `product_variants`.
   - Ketika admin menambahkan kembali varian tersebut di Master Data, API backend hanya mendeteksi bahwa baris varian dengan ID bersangkutan (`var-fonew005-1`) sudah ada di database, kemudian memperbarui harganya tetapi lupa menyetel kembali status `is_active = TRUE` (sehingga tetap tersembunyi).
2. **Pembaruan Logika Sinkronisasi Aktif Varian** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)):
   - Memodifikasi API `PUT /api/products`. Saat list `pack_sizes` dikirim, selain menonaktifkan ukuran yang dihapus, sistem kini secara eksplisit mengeksekusi query untuk mengaktifkan kembali (`is_active = TRUE`) semua sub-varian yang ukurannya terdaftar di dalam array tersebut.
3. **Pembaruan Logika PUT Pricelist** ([`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/pricelist/route.ts)):
   - Memodifikasi query update di API pricelist agar secara eksplisit menyertakan `is_active = TRUE` saat harga diperbarui.
4. **Hasil Akhir & Reaktivasi Mandiri** ([`reactivate_aman_jaya_1k.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/reactivate_aman_jaya_1k.js)):
   - Menjalankan perintah reaktivasi database untuk varian "Aman Jaya 1K" (`var-fonew005-1`) ke status aktif.
   - Varian tersebut kini telah muncul secara instan di tabel **Pricelist Umum** dengan status siap diatur harganya.

---

## Bagian BG: Inisialisasi Harga Varian Ditambah Kembali (Re-add) ke Rp 0

Kami telah membenahi logika penambahan varian baru atau penambahan kembali varian yang pernah dihapus agar harga awalnya diatur ke Rp 0 secara bawaan, bukannya mengadopsi harga dasar template lama.

### Solusi & Penerapan Teknis:
1. **Pembaruan Logika Form Tambah Varian** ([`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx)):
   - Memodifikasi handler tambah varian di Master Data (`productEntryType === 'VARIANT'`) untuk memaksa variabel `price` bernilai `0` secara bawaan (sebelumnya mengadopsi fallback `parent.selling_price_per_kg || 1500000` yang menyebabkan harga lama terisi otomatis).
2. **Pembersihan Database & Hasil Akhir** ([`cleanup_aman_jaya_1k_price.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/cleanup_aman_jaya_1k_price.js)):
   - Mengeksekusi skrip pembersihan untuk mereset harga varian "Aman Jaya 1K" (`var-fonew005-1`) di database MySQL (baik di tabel `product_variants` maupun kolom JSON `variant_prices` di tabel `products`) menjadi `Rp 0` ($0.00).
   - Varian tersebut kini tampil bersih dengan harga Rp 0 ($0.00) dan bertombol "Atur Harga" agar admin dapat menetapkan harganya dari awal secara mandiri.

---

## Bagian BH: Dinamisasi & Pengeditan Penuh Data Keuangan & Dokumen Pajak Perusahaan

Kami telah membenahi antarmuka (UI) tab **KEUANGAN & BANK** pada halaman Master Data agar data rekening bank, denda, term pembayaran, dan dokumen pajak perusahaan dapat diedit secara interaktif serta disimpan secara persisten ke database MySQL.

### Solusi & Penerapan Teknis:
1. **Dinamisasi State & Bending Data**:
   - Memodifikasi default state `companyConfig` di [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx) agar memuat struktur awal berisi array `bank_accounts`, objek `payment_settings`, dan objek `tax_documents` dengan data fallback yang aman.
   - Beralih dari penggunaan data statis (hardcoded) pada render tab Keuangan ke pembacaan dinamis dari state `companyConfig`.
2. **Penyediaan Dukungan API company-settings Terbuka**:
   - Memperbarui file handler API [`route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/company-settings/route.ts) agar GET dan PUT mendukung serialisasi otomatis (JSON stringify/parse) untuk menyimpan nilai bertipe objek/array kompleks di MySQL.
3. **Penyediaan Modal Pengeditan Baru**:
   - Menambahkan 3 modal interaktif di bagian bawah JSX halaman:
     - **Modal Kelola Rekening Bank**: Untuk menambahkan rekening baru, mengedit data nama bank, nomor rekening, atas nama, keterangan jenis, dan memilih visual warna badge, serta menghapus rekening yang tidak diperlukan.
     - **Modal Ubah Pengaturan Pembayaran**: Untuk memperbarui batas waktu tempo (TOP) hutang/piutang default, denda keterlambatan, mata uang pelaporan, dan persentase pajak PPN.
     - **Modal Ubah Data Pajak Perusahaan**: Untuk memperbarui NPWP, NPPKP, NIB, nama legal resmi, dan alamat fiskal terdaftar.
4. **Sinkronisasi Database Otomatis (Seeder & Save)**:
   - Membuat skrip database [`seed_finance_settings.js`](file:///c:/Users/undps/Desktop/123/24/artaroma/scratch/seed_finance_settings.js) untuk memindahkan seluruh data default awal ke dalam database MySQL secara instan.
   - Pintu simpan pada form modal secara otomatis mengirimkan request `PUT` ke API `/api/company-settings` untuk sinkronisasi instan ke database.

---

## Bagian BI: Sinkronisasi Allowed Products & Dynamic Session di B2B Customer Portal

Kami telah menyambungkan halaman antarmuka Katalog B2B Customer secara penuh dengan database MySQL sehingga daftar produk yang disajikan di portal customer terfiltrasi secara real-time berdasarkan pemetaan **allowed_product_ids** yang diatur oleh Admin pada Master Data Customer.

### Solusi & Penerapan Teknis:
1. **Dinamisasi Data Customer di Portal**:
   - Memodifikasi [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/customer/catalog/page.tsx) (halaman Katalog) dan [`page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/customer/orders/page.tsx) (halaman Orders) agar memuat daftar customer aktif langsung dari database MySQL (`GET /api/customers`) alih-alih menggunakan mock data statis.
2. **Penyelarasan & Penyimpanan Pilihan Customer (localStorage)**:
   - Saat customer login disimulasikan menggunakan dropdown switch di Navigation Bar, pilihan customer disimpan ke `localStorage` (`artaroma_customer_id`).
   - Ketika halaman di-refresh, sistem otomatis membaca dan merestore customer terpilih yang disimpan pada `localStorage` agar sesi tetap berlanjut secara persisten.
3. **Filter Sesuai Master Data Allowed Products**:
   - Filter produk di Katalog B2B Customer secara asinkron membaca atribut `allowed_product_ids` milik customer yang aktif dari database MySQL.
   - Hanya menyajikan produk-produk yang diizinkan untuk customer tersebut (atau menyajikan semua produk jika `allowed_product_ids` bernilai kosong/null).

---

## Bagian BJ: Perbaikan Alur Simpan Sales Order & Penanganan Crash List SO

Kami telah mengidentifikasi dan memperbaiki masalah di mana pesanan yang diajukan oleh customer tidak muncul di halaman Sales Order (SO) Admin.

### Solusi & Penerapan Teknis:
1. **Penerapan Async Await pada Proses Checkout**:
   - Memodifikasi `onSuccess` pada [`src/app/customer/catalog/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/customer/catalog/page.tsx) dan `handleSubmit` pada [`src/components/customer/checkout-modal.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/components/customer/checkout-modal.tsx) menjadi `async/await` yang sinkron.
   - Sebelumnya, checkout memicu request POST secara asinkron tanpa ditunggu (fire-and-forget) lalu langsung menampilkan alert berhasil dan mengosongkan keranjang. Jika request database gagal di belakang layar (karena credit check, limit, atau kendala jaringan), data hilang dan tidak tersimpan di database MySQL tanpa sepengetahuan user.
   - Sekarang, sistem akan menunggu respons API secara penuh. Jika API gagal (status bukan 200/201), proses dihentikan, keranjang tidak dikosongkan, dan pesan error ditunjukkan secara transparan ke user.
2. **Defensive Programming di Daftar SO Admin**:
   - Memodifikasi [`src/app/admin/sales-orders/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/sales-orders/page.tsx) untuk menangani kemungkinan `so.items` bernilai `null` atau `undefined` dari database.
   - Menambahkan optional chaining `(so.items ?? []).map` serta normalisasi data dari API agar tabel pesanan admin tidak crash saat me-render baris pesanan dari database MySQL.
   - Menambahkan tombol **Refresh** manual di daftar SO untuk memicu fetch data terbaru dari database.
3. **Pemberian Guard Null-check pada Rincian Detail SO Admin**:
   - Memperbaiki crash *Runtime TypeError* `Cannot read properties of undefined (reading 'order_date')` pada [`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx).
   - Masalah ini terjadi karena pada awal halaman dimuat, state `order` bernilai `undefined` sebelum data berhasil tersinkronisasi dari `localStorage` atau API. 
   - Kami menambahkan *early loading return* (`if (!order) { return ... }`) di awal render komponen untuk memastikan halaman tidak crash dan menampilkan loader dengan anggun sampai state siap.
4. **Konsolidasi / Grouping Tampilan Batch di Menu "Lihat Stok"**:
   - Memodifikasi [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx) untuk mengelompokkan (*grouping*) data batch FEFO yang memiliki nomor batch (`batch_number`) yang sama untuk produk varian yang sama pada menu "Lihat Stok".
   - Mengakumulasikan kuantitas stok fisik (`current_qty_kg`) dan jumlah unit (`unit_count`) dari batch-batch yang terduplikasi secara visual tanpa memodifikasi transaksi riwayat kedatangan di database MySQL.
5. **Penghapusan Kolom "Modal / Kg" di Menu "Lihat Stok"**:
   - Menghapus kolom header `MODAL / KG` dan sel datanya dari tabel rincian batch di menu "Lihat Stok" pada file [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx).
   - Menyesuaikan `colSpan` baris ketika data kosong (*empty state*) dari 7 menjadi 6 kolom agar struktur layout tabel tetap solid dan responsif.
   - Sesuai instruksi, harga modal kini hanya dapat dikonfigurasi dan dilihat pada halaman Purchase Order (PO).
6. **Perbaikan API Error Handling (Propagasi Error POST Sales Orders)**:
   - Memodifikasi [`src/app/api/sales-orders/route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/sales-orders/route.ts) agar tidak melakukan *silent warning* ketika query database gagal saat `POST`.
   - Sebelumnya, jika insert ke database MySQL gagal (misal karena constraint key, field null, dll), backend hanya mencetak warning di terminal tapi tetap mengirimkan response `success: true` dan status `201` ke browser. Akibatnya customer merasa pesanan berhasil diajukan, padahal tidak pernah tersimpan di database.
   - Sekarang, jika terjadi kegagalan insert database, backend akan mengembalikan response status `500` lengkap dengan detail pesan kesalahan agar dapat dideteksi dan ditampilkan di browser customer.
7. **Penyelarasan Dinamis Jumlah Unit Berdasarkan Berat Fisik (Kg)**:
   - Memperbaiki ketidaksesuaian jumlah unit stok varian pada menu "Lihat Stok". Sebelumnya, sistem membaca nilai statis `unit_count` dari database (misalnya bernilai `1` meskipun stok fisiknya adalah `50.0 kg` dengan kemasan `25 Kg`, sehingga menampilkan tulisan keliru: `1 Unit (50.0 kg)`).
   - Memodifikasi kalkulasi di [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx) agar jumlah unit selalu dihitung secara dinamis dan presisi menggunakan rumus pembagian berat fisik terhadap kemasan varian: `Math.round(current_qty_kg / sizeKg)`.
   - Hasil kalkulasi dinamis ini diterapkan secara konsisten pada: header ringkasan produk induk (Level 1), subheader ringkasan produk varian (Level 2), tabel rincian batch FEFO (Level 3), serta di dalam modal rincian Repack Batch.
8. **Penonaktifan Varian Stok Habis di Halaman B2B Customer**:
   - Memodifikasi API `/api/products` ([`src/app/api/products/route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts)) untuk menghitung kuantitas stok aktual non-expired per kemasan varian dari MySQL dan melampirkannya sebagai objek `variant_stocks`.
   - Menambahkan field `variant_stocks` pada model interface `Product` ([`src/lib/types.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/lib/types.ts)).
   - Memodifikasi antarmuka Katalog B2B Customer ([`src/app/customer/catalog/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/customer/catalog/page.tsx)) agar membaca data stok real-time tersebut.
   - Jika stok suatu varian bernilai 0 (Habis), tombol tambah `+` dinonaktifkan (`disabled`), diubah stylenya menjadi abu-abu (*cursor-not-allowed*), dan menampilkan badge teks merah **HABIS**.
   - Jika stok tersedia, badge **Stok: X Unit** berwarna hijau ditampilkan secara transparan, dan tombol `+` akan terkunci secara otomatis apabila kuantitas barang di keranjang belanja customer sudah mencapai batas maksimal stok fisik yang ada di gudang.
9. **Revisi Tahap Konfirmasi Order Admin B2B & Penyesuaian Kuantitas Terkonfirmasi**:
   - Memodifikasi Form Eksekusi Aksi Alur Kerja Langkah 1 pada [`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx).
   - Menghapus input penetapan harga modal (`Set Harga / Kg`) saat konfirmasi pesanan. Harga jual yang diajukan oleh customer dari Katalog B2B kini langsung digunakan secara otomatis.
   - Menampilkan sisa stok fisik aktual (jumlah unit & kg) dari gudang secara real-time untuk masing-masing item pesanan, mempermudah admin menganalisis kecukupan stok sebelum pesanan disetujui.
   - Menambahkan input field interaktif `Konfirmasi Jumlah (Kg)` untuk masing-masing item pesanan. Hal ini memungkinkan admin untuk mengedit dan mengubah volume/berat barang yang ingin dikonfirmasi (misal ketika stok di gudang tidak mencukupi permintaan awal customer).
   - Logika status warning merah **STOK TIDAK CUKUP** kini dihitung secara dinamis mengikuti angka jumlah kg yang sedang diinput oleh admin pada kolom konfirmasi tersebut secara real-time.
   - Tombol konfirmasi diubah namanya menjadi `Konfirmasi Pesanan (Status: DIKONFIRMASI)` dan akan menyimpan nilai kuantitas yang telah disesuaikan admin ke dalam database MySQL dan invoice bersangkutan.
10. **Indikator Peringatan Stok Habis & Di Bawah Threshold Minimum (Menu Lihat Stok Admin)**:
    - Memodifikasi logic di [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx) untuk membaca nilai `min_stock_kg` per varian yang dimuat dari tabel `product_variants`. Sebelumnya logic salah membaca `p.min_stock_kg` dari tabel `products` yang tidak memiliki kolom tersebut.
    - Menghitung status ketersediaan secara real-time pada **Level Varian** (25K, 5K, 1K):
      - Jika kuantitas stok $\le 0$: status **STOK HABIS**.
      - Jika kuantitas stok $> 0$ namun $\le \text{min\_stock\_kg}$ varian: status **STOK MINIMUM**.
    - Menerapkan visualisasi indikator warna dan badge di 3 level antarmuka:
      - **Level 1 (Produk Induk)**: Menampilkan badge merah berkedip **`STOK HABIS`** jika semua varian kosong, badge merah outline **`ADA VARIAN HABIS`** jika salah satu varian kosong, dan badge amber **`STOK MINIMUM`** jika ada varian di bawah batas aman.
      - **Level 1 (Capsule Ringkasan)**: Mengubah warna capsule ukuran kemasan menjadi merah redup jika kosong, dan amber jika berada di bawah batas minimum.
      - **Level 2 (Header Varian)**: Mengubah badge hijau stok menjadi badge peringatan merah **`Stok Habis (0.0 Kg)`** dengan ikon berkedip, atau badge amber **`Stok Minimum (Limit: X Kg)`** beserta ikon peringatan.
11. **Penghapusan Teks Harga di Menu Lihat Stok**:
    - Menghapus label dan nilai `Harga: Sesuai Varian Kemasan` dari baris detail metadata Produk Induk (Level 1) pada file [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx) agar tampilan menjadi lebih bersih dan fokus pada ketersediaan stok fisik saja.
12. **Tombol Koreksi Tahap Sebelumnya pada Alur Kerja Order Admin**:
    - Menambahkan fungsi `handleGoBackToPreviousStage` pada [`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx).
    - Menampilkan tombol **`← Koreksi Tahap Sebelumnya`** berwarna amber di sebelah kanan header Form Eksekusi Aksi Alur Kerja jika status pesanan adalah `DIKONFIRMASI`, `PROSES_GUDANG`, atau `DIKIRIM`.
    - Khusus untuk status **`DITERIMA`** (pesanan telah sukses sampai di tangan customer), tombol koreksi status sengaja disembunyikan/dinonaktifkan sepenuhnya demi integritas data dan mencegah perubahan pada transaksi yang sudah selesai.
    - Tombol ini memungkinkan admin mengembalikan status transaksi pesanan ke tahap sebelumnya (misal dari `DIKONFIRMASI` ke `DIAJUKAN`) untuk memperbaiki kesalahan input (seperti konfirmasi jumlah kg atau harga) secara asinkron ke database MySQL.
13. **Fitur Pembatalan Pesanan Sales Order B2B (Status: CANCELLED)**:
    - Menambahkan tombol **`✕ Batalkan Pesanan`** berwarna merah di dalam panel aksi Step 1 (`DIAJUKAN`) dan Step 2 (`DIKONFIRMASI`) pada [`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx).
    - Mengintegrasikan fungsi `handleCancelOrder` yang akan merubah status pesanan menjadi `'CANCELLED'` dan menyimpannya secara permanen ke database MySQL.
    - Menampilkan panel informasi status berwarna merah khusus **`Pesanan Ini Telah Dibatalkan / Ditolak`** apabila pesanan bersangkutan berstatus `'CANCELLED'`.
    - Memodifikasi horizontal stepper status bar agar mendeteksi di mana pesanan dibatalkan (jika belum dikonfirmasi maka step `Diajukan` berubah menjadi **`Dibatalkan`** berwarna merah; jika sudah dikonfirmasi maka step `Dikonfirmasi` berubah menjadi **`Dibatalkan`** berwarna merah).
    - Status badge `STATUS SAAT INI` pada form alur kerja juga berubah warna menjadi merah solid (`bg-red-600`) saat pesanan berstatus `CANCELLED`.
14. **Perbaikan Tampilan Stok Varian pada Form Purchase Order (PO)**:
    - Memperbaiki bug pada [`src/components/admin/po-modal.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/components/admin/po-modal.tsx) di mana data stok masing-masing kemasan varian (25K, 5K, 1K) salah menampilkan total akumulasi stok produk induk (`total_stock_kg` sebesar 1 Kg).
    - Menghubungkan pembacaan stok varian langsung ke `variant_stocks` objek agar menampilkan ketersediaan fisik secara presisi (25K $\rightarrow$ 0 Kg, 5K $\rightarrow$ 0 Kg, 1K $\rightarrow$ 1 Kg).
15. **Efek Visual Micro-Animation & Auto-Scroll saat Tambah Baris PO**:
    - Menambahkan `newlyAddedIndex` state dan `itemsContainerRef` pada [`src/components/admin/po-modal.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/components/admin/po-modal.tsx).
    - Ketika tombol **`+ Tambah Baris`** diklik, baris item baru yang muncul akan mendapatkan efek transisi visual membesar perlahan (`scale-[1.02]`), perubahan border berwarna hijau emerald cerah (`border-emerald-400`), efek cahaya ring hijau transparan, dan background yang lebih terang selama 1 detik, sebelum kembali memudar menjadi normal secara mulus (`duration-500`).
    - Sekaligus mengimplementasikan auto-scroll vertikal yang mulus (`scrollTo` dengan `behavior: 'smooth'`) ke posisi paling bawah kontainer agar baris baru tersebut selalu terlihat jika baris item sudah melebihi kapasitas scroll kontainer.
16. **Pembatasan Satuan Terkecil Input Kuantitas PO ke 1 Kg (Tanpa Desimal)**:
    - Memodifikasi file [`src/app/admin/procurement/[id]/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/procurement/[id]/page.tsx) dan [`src/components/admin/po-modal.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/components/admin/po-modal.tsx).
    - Mengubah semua attribute input field `step="0.01"` pada kuantitas pengiriman PO & modal penerimaan barang (Goods Receipt) menjadi **`step="1"`** agar hanya menerima bilangan bulat (integers).
    - Menerapkan fungsi `Math.round` pada inisialisasi visual dan handler input `onChange` guna memastikan seluruh data kuantitas dikonversi secara presisi ke kelipatan unit terkecil yaitu 1 Kg (misalnya membulatkan angka desimal seperti `74.99` $\rightarrow$ `75`, `14.99` $\rightarrow$ `15`, `3.99` $\rightarrow$ `4` Kg).
17. **Standardisasi Global Satuan Berat Terkecil 1 Kg (Tanpa Desimal)**:
    - Mengubah implementasi fungsi `formatKg` di [`src/lib/utils.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/lib/utils.ts) agar secara otomatis melakukan pembulatan (`Math.round`) untuk seluruh parameter numerik berat yang diterimanya, dan menyajikannya dalam format bilangan bulat tanpa desimal (misal: `75 kg`, `13 kg`, `4 kg`, `0 kg`).
    - Hal ini menjamin seluruh representasi kuantitas berat di dashboard admin (PO, SBBK/Surat Jalan, Stok, Rincian Trip) konsisten dengan kelipatan terkecil 1 Kg.
18. **Pembaruan Teks Status Cancelled Menjadi Dibatalkan (Menu Daftar Sales Order)**:
    - Memodifikasi fungsi `getStatusBadge` di [`src/app/admin/sales-orders/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/sales-orders/page.tsx).
    - Menambahkan case `'CANCELLED'` secara eksplisit untuk me-render badge status berwarna merah solid (`bg-red-50 text-red-700 border-red-200`) dengan tulisan teks **`Dibatalkan`** (sebelumnya berstatus mentah warna abu-abu default dengan tulisan `CANCELLED`).
19. **Variasi Warna Stepper Alur Kerja Sales Order (SO)**:
    - Memodifikasi stepper alur kerja pesanan di [`src/app/admin/orders/[id]/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/orders/[id]/page.tsx) agar setiap tahapan yang telah dilalui (passed/active) memiliki warna visual khas dan berbeda (sama seperti alur kerja PO):
      - **Diajukan**: Warna Biru (`bg-blue-100 text-blue-800 border-blue-300`)
      - **Dikonfirmasi**: Warna Ungu (`bg-purple-100 text-purple-800 border-purple-300`)
      - **Proses Gudang**: Warna Indigo (`bg-indigo-100 text-indigo-800 border-indigo-300`)
      - **Dikirim**: Warna Amber/Oranye (`bg-amber-100 text-amber-800 border-amber-300`)
      - **Diterima**: Warna Hijau Emerald (`bg-emerald-100 text-emerald-800 border-emerald-300`)
20. **Aturan Proteksi Penghapusan Produk & Varian dengan Stok Aktif**:
    - **Frontend**: Memodifikasi `handleDelete` dan `handleDeleteVariant` di [`src/app/admin/master/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/master/page.tsx) agar memeriksa saldo stok produk/varian sebelum mengonfirmasi penghapusan. Jika stok $> 0$, aksi digagalkan dan memunculkan dialog peringatan (alert) berisi info berat stok aktif tersisa.
    - **Backend**: Memperbarui endpoint `DELETE` dan `PUT` di [`src/app/api/products/route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts) untuk melakukan pemeriksaan saldo ke tabel `stock_batches`. Jika ditemukan stok aktif untuk produk induk atau ukuran kemasan yang akan dihapus, API mengembalikan response error `400 Bad Request` sebagai pagar pengaman integritas data database MySQL.
21. **Perbaikan Simpan Perubahan Pilihan Aplikasi Produk Induk**:
    - Memperbaiki bug pada backend endpoint `PUT` `/api/products` di [`src/app/api/products/route.ts`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/api/products/route.ts).
    - Sebelumnya, body parameter `applications` dan `application` tidak dideklarasikan dan dilewatkan dalam query UPDATE database, sehingga pengeditan kategori aplikasi (seperti *Fine Fragrance*, *Industry*) dari form admin tidak tersimpan.
    - Menambahkan parsing payload dan pemetaan field `applications` & `application` ke dalam query MySQL UPDATE agar perubahan data tersimpan secara permanen.
22. **Grafik Monitoring Stok Real-time Terbanyak di Dashboard Overview**:
    - Memodifikasi [`src/app/admin/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/page.tsx) agar memuat data produk, stok batch, dan aging finance secara real-time via API (`/api/products`, `/api/stock-batches`, `/api/dashboard/finance`).
    - Merancang komponen visualisasi grafik level stok berbasis horizontal progress bar yang diurutkan dinamis dari stok terbanyak ke tersisa terkecil (`sort((a, b) => b.stock - a.stock)`).
    - Menerapkan pewarnaan gradasi tematik: gradasi biru-indigo-ungu untuk stok aman, gradasi amber untuk stok minimum (dibawah `min_stock_kg`), dan warna merah solid disertai lencana "HABIS" untuk produk dengan saldo 0 Kg.
23. **Standardisasi Pengurutan Daftar Stok Berdasarkan Abjad**:
    - Memodifikasi [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx) agar seluruh daftar produk di halaman **Lihat Stok** diurutkan secara alfabetis berdasarkan nama produk (`A-Z`).
    - Menerapkan pengurutan alfabetis (`localeCompare`) baik pada list state global maupun selector `filteredProducts`. Ini juga merapikan urutan opsi produk pada dropdown form pencatatan Goods Receipt dan Stock Opname agar seragam mengikuti urutan abjad.
24. **Perubahan Lencana Nomor Urut Tampilan pada Halaman Lihat Stok**:
    - Memperbarui komponen render kartu produk di [`src/app/admin/stock/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/stock/page.tsx).
    - Mengganti logika pembacaan 3 digit terakhir SKU (`p.sku.slice(-3)`) yang sebelumnya menghasilkan nomor acak statis (seperti `001`, `005`, `003`, `002`, `004`) menjadi nomor urutan tampilan dinamis (`01`, `02`, `03`, `04`, `05`...) berbasis parameter index iterasi list.
25. **Fitur Filter Toggle Tampilan Grafik Dashboard (Stok Terbanyak vs Produk Terlaris)**:
    - Menambahkan `chartFilter` dan state pemuatan data order ke [`src/app/admin/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/page.tsx) agar menghitung jumlah akumulasi kuantitas penjualan (`qty_ordered_kg`) masing-masing produk dari seluruh Sales Order yang tidak dibatalkan.
    - Menambahkan tombol filter toggle interaktif ("Stok Terbanyak" dan "Produk Terlaris") di bagian header grafik.
    - Ketika memilih **Stok Terbanyak**, grafik menunjukkan level stok fisik saat ini (gradasi biru/indigo/purple).
    - Ketika memilih **Produk Terlaris**, grafik menunjukkan total volume penjualan per produk (gradasi orange/pink/rose) diurutkan dari yang paling laku ke bawah, lengkap dengan label kuantitas terjual (misal: `X kg terjual`).
26. **Tambahan Opsi Filter "Mendekati Kadaluwarsa" pada Grafik Dashboard**:
    - Memperluas state `chartFilter` di [`src/app/admin/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/page.tsx) dengan opsi `'near_expiry'`.
    - Sistem menghitung secara real-time volume batch stok aktif per produk yang memiliki sisa masa kadaluwarsa $\le 3$ bulan.
    - Ketika filter **Mendekati Kadaluwarsa** diaktifkan, grafik diurutkan dinamis dari produk dengan sisa stok kadaluwarsa terbanyak ke tersedikit.
    - Menampilkan lencana kuantitas dalam format `X kg mendekati kadaluwarsa` dengan warna bar gradasi peringatan kritis merah-oranye (`bg-gradient-to-r from-amber-550 via-orange-500 to-red-500`).
27. **Pemindahan Letak Grafik Stok/Penjualan ke Bawah Pengaturan Kurs**:
    - Memindahkan letak komponen grafik monitoring stok & penjualan di [`src/app/admin/page.tsx`](file:///c:/Users/undps/Desktop/123/24/artaroma/src/app/admin/page.tsx).
    - Memposisikannya tepat di bawah widget form "Pengaturan Kurs Harian" (Base Purchasing Rate) dan simulasi harga produk induk, serta di atas panel 4 kartu KPI utama (Omset, Gross Margin, Piutang AR, FEFO Alert).
    - Menambahkan margin bottom (`mb-6`) pada kontainer grafik agar alur tata letak antarmuka admin tetap rapi, seimbang, dan proporsional.
















