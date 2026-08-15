const mysql = require('mysql2/promise');

async function updateSuppliersTableMySQL() {
  console.log('🔄 Connecting to MySQL fragrance_hub to add new Supplier fields...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fragrance_hub',
  });

  const columnsToAdd = [
    { name: 'top_payable_days', type: 'INT DEFAULT 30' },
    { name: 'bank_account', type: 'VARCHAR(255)' },
    { name: 'npwp', type: 'VARCHAR(100)' },
    { name: 'notes', type: 'TEXT' },
    { name: 'supplied_product_ids', type: 'JSON' },
  ];

  for (const col of columnsToAdd) {
    try {
      await conn.query(`ALTER TABLE distributors ADD COLUMN ${col.name} ${col.type};`);
      console.log(`  ✓ Column added: ${col.name}`);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  ℹ Column already exists: ${col.name}`);
      } else {
        console.warn(`  ⚠️ Error adding column ${col.name}:`, err.message);
      }
    }
  }

  // Update existing suppliers with rich data
  const suppliersUpdates = [
    {
      id: 'dist-001',
      top_payable_days: 30,
      bank_account: 'BCA 0883-992-111 a.n PT Givaudan Fragrances Indonesia',
      npwp: '01.234.567.8-012.000',
      notes: 'Suplier utama untuk bibit parfum kategori Gourmand (Vanilla) & Fine Fragrance.',
      supplied_product_ids: JSON.stringify(['prod-001', 'prod-009']),
    },
    {
      id: 'dist-002',
      top_payable_days: 45,
      bank_account: 'Mandiri 122-00-998877-6 a.n PT Firmenich Aromatics',
      npwp: '02.345.678.9-023.000',
      notes: 'Spesialis bibit parfum Floral (Lavender Provençal). Syarat pengiriman minimal 1 Drum 25 Kg.',
      supplied_product_ids: JSON.stringify(['prod-002']),
    },
    {
      id: 'dist-003',
      top_payable_days: 60,
      bank_account: 'BNI 009-887-6655 a.n PT IFF Indonesia',
      npwp: '03.456.789.0-034.000',
      notes: 'Suplier bibit parfum Woody (Oud Royale Intense) & Oriental.',
      supplied_product_ids: JSON.stringify(['prod-003']),
    },
  ];

  for (const s of suppliersUpdates) {
    await conn.query(
      `UPDATE distributors SET top_payable_days = ?, bank_account = ?, npwp = ?, notes = ?, supplied_product_ids = ? WHERE id = ?`,
      [s.top_payable_days, s.bank_account, s.npwp, s.notes, s.supplied_product_ids, s.id]
    );
    console.log(`  ✓ Updated Supplier details for ID: ${s.id}`);
  }

  await conn.end();
  console.log('\n🎉 MySQL Distributors / Suppliers Table schema & seed updated successfully!');
}

updateSuppliersTableMySQL().catch(console.error);
