const fs = require('fs');
const content = fs.readFileSync('src/lib/mock-data.ts', 'utf8');

const matches = [];
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('BCA') || line.includes('8830') || line.includes('bank') || line.includes('rekening')) {
    matches.push(`${idx + 1}: ${line.trim()}`);
  }
});

console.log('Matches in mock-data.ts:');
console.log(matches.slice(0, 20).join('\n'));
