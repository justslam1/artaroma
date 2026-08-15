const fs = require('fs');

const content = fs.readFileSync('src/app/admin/sales-orders/page.tsx', 'utf8');
const lines = content.split('\n');
let print = false;
lines.forEach((line, idx) => {
  if (line.includes('salesOrders.map') || line.includes('salesOrders.length')) {
    print = true;
  }
  if (print) {
    console.log(`${idx + 1}: ${line}`);
    if (line.includes(')')) {
      // print a few more lines then stop
      for (let j = 1; j <= 20; j++) {
        console.log(`${idx + 1 + j}: ${lines[idx + j]}`);
      }
      print = false;
    }
  }
});
