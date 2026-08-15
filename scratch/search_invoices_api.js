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
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('invoices') || content.includes('Invoice') || content.includes('createTable')) {
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('CREATE TABLE') && (line.includes('invoices') || line.includes('sales_orders'))) {
              console.log(`${fullPath}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

search('src');
