const fs = require('fs');

const content = fs.readFileSync('src/app/api/products/route.ts', 'utf8');
const lines = content.split('\n');
let foundPost = false;
lines.forEach((line, idx) => {
  if (line.includes('export async function POST')) {
    foundPost = true;
  }
  if (foundPost && idx < 210) {
    if (line.includes('applications') || line.includes('insert') || line.includes('INSERT') || line.includes('body')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
