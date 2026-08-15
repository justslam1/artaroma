const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fragrance_hub',
});

async function main() {
  try {
    const bankBca = {
      key_name: 'bank_bca',
      value_text: '8830-192-888',
      description: 'Nomor Rekening BCA PT Artaroma Fragrance Indonesia',
    };
    const bankMandiri = {
      key_name: 'bank_mandiri',
      value_text: '122-00-8899-7711',
      description: 'Nomor Rekening Mandiri PT Artaroma Fragrance Indonesia',
    };

    await pool.execute(
      `INSERT INTO company_settings (key_name, value_text, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), description = VALUES(description)`,
      [bankBca.key_name, bankBca.value_text, bankBca.description]
    );

    await pool.execute(
      `INSERT INTO company_settings (key_name, value_text, description) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value_text = VALUES(value_text), description = VALUES(description)`,
      [bankMandiri.key_name, bankMandiri.value_text, bankMandiri.description]
    );

    console.log('Successfully inserted bank accounts into company_settings table!');
    
    const [rows] = await pool.execute("SELECT * FROM company_settings");
    console.log(rows);
  } catch (error) {
    console.error('Failed to insert settings:', error);
  } finally {
    await pool.end();
  }
}

main();
