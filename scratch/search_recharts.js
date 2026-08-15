const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log('Dependencies:', pkg.dependencies);
console.log('DevDependencies:', pkg.devDependencies);
