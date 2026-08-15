const fs = require('fs');

if (fs.existsSync('src/lib/types.ts')) {
  const content = fs.readFileSync('src/lib/types.ts', 'utf8');
  const idx = content.indexOf('export interface Courier');
  if (idx !== -1) {
    console.log(content.substring(idx, idx + 300));
  }
}
