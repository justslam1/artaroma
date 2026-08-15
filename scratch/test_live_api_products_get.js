const http = require('http');

http.get('http://localhost:3000/api/products', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Success:', json.success);
      if (json.success && json.data) {
        console.log('Number of products:', json.data.length);
        json.data.slice(0, 3).forEach((p) => {
          console.log(`- ${p.name}:`, p.variant_stocks);
        });
      } else {
        console.log('Response body:', data);
      }
    } catch (e) {
      console.error('Parsing error:', e.message);
      console.log('Raw data:', data);
    }
  });
}).on('error', (e) => {
  console.error('Fetch error:', e.message);
});
