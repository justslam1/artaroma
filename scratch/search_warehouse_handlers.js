const fs = require('fs');

const content = fs.readFileSync('src/app/admin/orders/[id]/page.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('handleConfirmAndIssueSuratJalan') || line.includes('handleOpenCourierModal') || line.includes('handleOpenPODModal') || line.includes('handleCompletePOD') || line.includes('handleDeliver')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
