const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('stock_batches') && (content.includes('UPDATE') || content.includes('current_qty_kg'))) {
          console.log(fullPath);
        }
      }
    }
  }
}

search('src');
