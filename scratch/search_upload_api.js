const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (file.toLowerCase().includes('upload') || fullPath.includes('upload')) {
        console.log(`Found upload file: ${fullPath}`);
      }
    }
  }
}

search('src');
