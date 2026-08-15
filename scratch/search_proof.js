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
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('payment_proof_url') || content.includes('paymentProofUrl') || content.includes('proof_url')) {
        console.log(`Found keyword in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('payment_proof') || line.includes('paymentProof') || line.includes('proof_url')) {
            if (line.length < 150) {
              console.log(`  Line ${idx+1}: ${line.trim()}`);
            }
          }
        });
      }
    }
  }
}

search('src');
