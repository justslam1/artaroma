const fs = require('fs');
const filepath = 'src/components/customer/customer-order-detail-modal.tsx';
if (fs.existsSync(filepath)) {
  const content = fs.readFileSync(filepath, 'utf8');
  const matches = [];
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('qty_kg') || line.includes('formatKg') || line.includes('qty') || line.includes('quantity')) {
      matches.push(`${idx + 1}: ${line.trim()}`);
    }
  });
  console.log('Matches in customer-order-detail-modal.tsx:');
  console.log(matches.join('\n'));
} else {
  console.log('File does not exist:', filepath);
}
