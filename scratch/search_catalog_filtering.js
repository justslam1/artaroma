const fs = require('fs');
const path = require('path');

function findCatalogPages(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findCatalogPages(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (fullPath.includes('customer')) {
        console.log(`Checking customer file: ${fullPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('products') || content.includes('catalog') || content.includes('allowed')) {
          console.log(`  Contains keywords!`);
          // Search for fetches or filters
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('fetch') || line.includes('filter') || line.includes('session') || line.includes('user')) {
              if (line.length < 150) {
                console.log(`    Line ${idx+1}: ${line.trim()}`);
              }
            }
          });
        }
      }
    }
  }
}

findCatalogPages('src');
