const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'fragrance_hub',
  });

  const initialCouriers = [
    {
      id: 'cour-001-default',
      code: 'KUR-01',
      name: 'Rian Pratama',
      phone: '0812-7766-5544',
      vehicle_number: 'B 9482 SXZ (Blind Van)',
      is_active: 1,
    },
    {
      id: 'cour-002-default',
      code: 'KUR-02',
      name: 'Agus Subandi',
      phone: '0857-4433-2211',
      vehicle_number: 'B 3821 KFP (Box Truck)',
      is_active: 1,
    },
    {
      id: 'cour-003-default',
      code: 'KUR-03',
      name: 'Doni Setiawan',
      phone: '0877-2211-9900',
      vehicle_number: 'B 1102 WA (Motor Cargo)',
      is_active: 1,
    },
  ];

  try {
    console.log('Seeding couriers into database...');
    for (const courier of initialCouriers) {
      // Check if code or name exists
      const [existing] = await pool.execute('SELECT * FROM couriers WHERE code = ?', [courier.code]);
      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO couriers (id, code, name, phone, vehicle_number, is_active)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [courier.id, courier.code, courier.name, courier.phone, courier.vehicle_number, courier.is_active]
        );
        console.log(`Inserted courier: ${courier.name}`);
      } else {
        console.log(`Courier ${courier.name} with code ${courier.code} already exists.`);
      }
    }
    console.log('Seeding completed successfully!');
  } catch (e) {
    console.error('Error during seeding:', e);
  } finally {
    await pool.end();
  }
}

run();
