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
      if (fullPath.includes('api') && fullPath.includes('invoice')) {
        console.log(fullPath);
      }
    }
  }
}

search('src');
