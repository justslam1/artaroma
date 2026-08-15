const fs = require('fs');

const content = fs.readFileSync('src/lib/mock-data.ts', 'utf8');
const lines = content.split('\n');
let print = false;
lines.forEach((line, idx) => {
  if (line.includes('initialProducts')) {
    print = true;
  }
  if (print) {
    console.log(`${idx + 1}: ${line}`);
    if (line.includes('];')) {
      print = false;
    }
  }
});
