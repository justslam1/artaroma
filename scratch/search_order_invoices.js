const fs = require('fs');

const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('invoices') || line.includes('invoice') || line.includes('getStoredInvoices') || line.includes('saveStoredInvoices')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
