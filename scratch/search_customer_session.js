const fs = require('fs');
const path = require('path');

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        search(fullPath);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (fullPath.includes('customer')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('localStorage') || content.includes('session') || content.includes('currentUser') || content.includes('currentUserRole')) {
          console.log(`Found session keyword in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('localStorage') || line.includes('session') || line.includes('currentUser') || line.includes('User')) {
              if (line.length < 150) {
                console.log(`  Line ${idx + 1}: ${line.trim()}`);
              }
            }
          });
        }
      }
    }
  }
}

search('src');
