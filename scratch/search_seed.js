const fs = require('fs');
const content = fs.readFileSync('src/lib/seed.ts', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('company_settings') || line.includes('BCA') || line.includes('Mandiri')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('Matches in seed.ts:');
console.log(matches.slice(0, 20).join('\n'));
