const fs = require('fs');
const path = require('path');

function searchInDir(dir, query) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath, query);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes(query)) {
            console.log(`  ${idx + 1}: ${line.trim()}`);
          }
        });
      }
    }
  });
}

searchInDir('src/app', 'HARGA VARIAN');
searchInDir('src/components', 'HARGA VARIAN');
searchInDir('src/app', 'Harga Varian');
searchInDir('src/components', 'Harga Varian');
