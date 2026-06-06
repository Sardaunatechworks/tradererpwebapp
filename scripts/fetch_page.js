const http = require('http');

http.get('http://localhost:3000/_next/static/chunks/%5Broot-of-the-server%5D__1givhd-._.css', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    // Find all occurrences of '--color-slate-950'
    let pos = 0;
    while (true) {
      pos = data.indexOf('--color-slate-950', pos);
      if (pos === -1) break;
      console.log(`Occurrence at position ${pos}:`);
      console.log(data.slice(pos - 100, pos + 100));
      pos += 1;
    }
  });
}).on('error', (err) => {
  console.error("Error fetching CSS:", err.message);
});
