const http = require('http');

http.get('http://localhost:3000/api/stock-batches', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('API Response count:', json.count);
      const van25k = json.data.filter(b => b.batch_number.includes('VAN'));
      console.log('Vanilla batches in API response:');
      console.log(van25k);
    } catch (e) {
      console.error('Failed to parse JSON:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Request failed:', err.message);
});
