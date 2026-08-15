const fs = require('fs');

const content = fs.readFileSync('src/components/admin/po-modal.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Tambah Baris') || line.includes('handleAddRow') || line.includes('items') || line.includes('setItems')) {
    if (line.length < 150 && (line.includes('add') || line.includes('Add') || line.includes('push') || line.includes('concat') || line.includes('setItems'))) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
