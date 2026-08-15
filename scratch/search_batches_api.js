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
      if (fullPath.includes('route.ts') && (fullPath.includes('batches') || fullPath.includes('stock'))) {
        console.log(fullPath);
      }
    }
  }
}

search('src');
