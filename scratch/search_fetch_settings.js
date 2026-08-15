const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('company-settings') || line.includes('companySettings')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
