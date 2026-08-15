const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  try {
    console.log('⚡ Seeding company_settings table with default financial & tax values...');

    const defaultBankAccounts = [
      { bank: 'Bank Central Asia (BCA)', no: '3450-099-887', atas_nama: 'PT Artaroma Fragrance Indonesia', jenis: 'Rekening Operasional', badge: 'bg-blue-100 text-blue-800' },
      { bank: 'Bank Mandiri', no: '122-00-776655-4', atas_nama: 'PT Artaroma Fragrance Indonesia', jenis: 'Rekening Giro Bisnis', badge: 'bg-yellow-100 text-yellow-800' },
      { bank: 'Bank BNI', no: '009-445-8876', atas_nama: 'PT Artaroma Fragrance Indonesia', jenis: 'Rekening Cadangan', badge: 'bg-orange-100 text-orange-800' },
    ];

    const defaultPaymentSettings = {
      top_payable: '30 Hari',
      top_receivable: '30 Hari',
      late_fee: '1.5%',
      currency: 'IDR (Rupiah Indonesia)',
      ppn: '11%'
    };

    const defaultTaxDocuments = {
      npwp: '01.987.654.3-041.000',
      nppkp: '01.987.654.3-041.000',
      nib: '1234567890123',
      legal_name: 'PT Artaroma Fragrance Indonesia',
      address: 'Jl. Industri Parfum No. 88, Jakarta Barat'
    };

    // Insert keys
    await pool.query(
      `INSERT INTO company_settings (key_name, value_text, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ['bank_accounts', JSON.stringify(defaultBankAccounts), 'Daftar Rekening Bank Resmi Perusahaan']
    );

    await pool.query(
      `INSERT INTO company_settings (key_name, value_text, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ['payment_settings', JSON.stringify(defaultPaymentSettings), 'Pengaturan Term Pembayaran Default']
    );

    await pool.query(
      `INSERT INTO company_settings (key_name, value_text, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ['tax_documents', JSON.stringify(defaultTaxDocuments), 'Dokumen Legal & Pajak Perusahaan']
    );

    // Let's also update company_name to 'PT Artaroma Fragrance Indonesia' to be consistent!
    await pool.query(
      `INSERT INTO company_settings (key_name, value_text, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text)`,
      ['company_name', 'PT Artaroma Fragrance Indonesia', 'Nama Perusahaan Resmi']
    );

    console.log('✓ Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

run();
