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
        if (content.includes('DELETE') || content.includes('delete') || content.includes('handleDelete')) {
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if ((line.includes('deleteProduct') || line.includes('deleteVariant') || line.includes('handleDeleteProduct') || line.includes('handleDeleteVariant') || (line.includes('DELETE') && line.includes('products'))) && line.length < 150) {
              console.log(`${fullPath}:${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

search('src');
