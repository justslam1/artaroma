const fs = require('fs');
const content = fs.readFileSync('src/lib/mock-data.ts', 'utf8');

// Search for items blocks
const regex = /items:\s*\[([\s\S]*?)\]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('Found items block:\n', match[1].trim());
  console.log('---');
}
