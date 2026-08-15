const fs = require('fs');

if (fs.existsSync('src/lib/types.ts')) {
  const content = fs.readFileSync('src/lib/types.ts', 'utf8');
  console.log('--- types.ts Courier ---');
  content.split('\n').forEach((line) => {
    if (line.includes('Courier')) {
      console.log(line.trim());
    }
  });
}
