const fs = require('fs');

const content = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
const lines = content.split('\n');
console.log('Lines 335 to 355:');
for (let i = 334; i < 354; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
console.log('\nLines 440 to 521:');
for (let i = 439; i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
