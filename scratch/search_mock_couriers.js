const fs = require('fs');

const mockContent = fs.readFileSync('src/lib/mock-data.ts', 'utf8');
const mockLines = mockContent.split('\n');
console.log('=== Couriers in mock-data.ts ===');
mockLines.forEach((line, idx) => {
  if (line.includes('courier') || line.includes('Courier') || line.includes('initialCouriers')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

const masterContent = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const masterLines = masterContent.split('\n');
console.log('\n=== References in admin/master/page.tsx ===');
masterLines.forEach((line, idx) => {
  if (line.includes('courier') || line.includes('Courier') || line.includes('fetch') || line.includes('api/')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
