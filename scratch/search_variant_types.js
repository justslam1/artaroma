const fs = require('fs');

const content = fs.readFileSync('src/lib/types.ts', 'utf8');
const lines = content.split('\n');
let print = false;
lines.forEach((line, idx) => {
  if (line.includes('interface Product') || line.includes('type Product')) {
    print = true;
  }
  if (print) {
    console.log(`${idx + 1}: ${line}`);
    if (line.includes('}')) {
      print = false;
    }
  }
});
