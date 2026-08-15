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
    const [tables] = await pool.execute("SHOW TABLES");
    console.log('Tables:');
    console.log(tables);

    for (const t of tables) {
      const tableName = Object.values(t)[0];
      const [columns] = await pool.execute(`DESCRIBE ${tableName}`);
      console.log(`\nTable ${tableName} Schema:`);
      console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
    }
  } catch (error) {
    console.error('Failed:', error);
  } finally {
    await pool.end();
  }
}

main();
