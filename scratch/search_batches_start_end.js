const fs = require('fs');

const content = fs.readFileSync('src/lib/mock-data.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('export const initialProducts') || line.includes('export const initialBatches') || line.includes('export const initialStockBatches') || line.includes('export const initialCustomers')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
