const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('bankAccounts') || line.includes('taxDocuments') || line.includes('paymentSettings') || line.includes('company_settings') || line.includes('activeTab === \'finance\'')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
