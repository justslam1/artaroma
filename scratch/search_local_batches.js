const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('batch-store') || content.includes('stock-batches') || content.includes('getStoredBatches') || content.includes('stored-batches')) {
    console.log(`Found reference in file: ${f}`);
  }
});
