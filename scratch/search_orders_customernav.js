const fs = require('fs');

if (fs.existsSync('src/app/customer/orders/page.tsx')) {
  const content = fs.readFileSync('src/app/customer/orders/page.tsx', 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('CustomerNav') || line.includes('currentCustomer') || line.includes('initialCustomers')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}
