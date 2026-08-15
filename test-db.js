// test-db.js
require('dotenv').config(); // Mengambil konfigurasi dari file .env
const mysql = require('mysql2/promise');

// Daftar 12 tabel wajib dari PRD-Fragrance-Hub.md
const EXPECTED_TABLES = [
    'distributors',
    'customers',
    'products',
    'couriers',
    'purchase_orders',
    'po_items',
    'stock_batches',
    'sales_orders',
    'so_items',
    'so_item_batches',
    'invoices',
    'payments',
    'deliveries'
];

async function testDatabaseConnection() {
    console.log('🔄 Menghubungkan ke database MySQL...\n');

    let connection;
    try {
        // 1. Buat koneksi menggunakan environment variables
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'fragrance_hub',
        });

        console.log('✅ KONEKSI BERHASIL!');
        console.log(`📌 Connected to Database: "${process.env.DB_NAME || 'fragrance_hub'}" on ${process.env.DB_HOST || 'localhost'}\n`);

        // 2. Ambil daftar tabel yang ada di database
        const [rows] = await connection.query('SHOW TABLES');
        const dbTables = rows.map((row) => Object.values(row)[0]);

        console.log(`📋 Ditemukan ${dbTables.length} tabel di database.`);
        console.log('--------------------------------------------------');

        // 3. Verifikasi ketersediaan tabel dari PRD
        let missingCount = 0;
        EXPECTED_TABLES.forEach((tableName) => {
            const exists = dbTables.includes(tableName);
            if (exists) {
                console.log(`  ✓ Table '${tableName}' -> [TERSEDIA]`);
            } else {
                console.log(`  ❌ Table '${tableName}' -> [TIDAK DITEMUKAN]`);
                missingCount++;
            }
        });

        console.log('--------------------------------------------------');
        if (missingCount === 0) {
            console.log('🎉 SELAMAT! Semua tabel dari PRD-Fragrance-Hub.md sudah terbaca sempurna.\n');
        } else {
            console.warn(`⚠️ Ada ${missingCount} tabel yang belum terbuat. Pastikan Anda sudah mengeksekusi seluruh isi DDL DDL PRD.`);
        }

    } catch (error) {
        console.error('❌ GAGAL TERHUBUNG KE DATABASE:');
        console.error(`   Error Code: ${error.code}`);
        console.error(`   Message   : ${error.message}\n`);
        console.log('💡 Tips Troubleshooting:');
        console.log('   1. Pastikan service MySQL/XAMPP/Laragon Anda sudah dalam keadaan berjalan (RUNNING).');
        console.log('   2. Periksa kembali file .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
        console.log('   3. Pastikan database sudah dibuat di MySQL (e.g. CREATE DATABASE fragrance_hub;).');
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testDatabaseConnection();