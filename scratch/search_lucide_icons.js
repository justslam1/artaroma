const fs = require('fs');

const content = fs.readFileSync('src/app/admin/master/page.tsx', 'utf8');
const lines = content.split('\n');
lines.slice(0, 100).forEach((line, idx) => {
  if (line.includes('lucide-react')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
// let's print all lines from line 10 to 60 where imports are usually defined
for (let i = 10; i < 60; i++) {
  if (content.split('\n')[i].includes('import')) {
    console.log(`${i+1}: ${content.split('\n')[i].trim()}`);
  }
}
