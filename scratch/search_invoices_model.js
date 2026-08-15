const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules') {
        search(fullPath);
      }
    } else {
      if (fullPath.includes('route.ts') || fullPath.includes('db.ts') || fullPath.includes('lib/types.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.toLowerCase().includes('invoice')) {
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.toLowerCase().includes('invoice') && line.length < 150) {
              console.log(`${fullPath}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

search('src');
