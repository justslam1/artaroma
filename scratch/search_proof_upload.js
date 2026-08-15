const fs = require('fs');

const content = fs.readFileSync('src/components/customer/checkout-modal.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('File') || line.includes('Reader') || line.includes('upload') || line.includes('handleFileChange')) {
    if (line.length < 150) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
