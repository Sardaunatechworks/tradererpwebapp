const https = require('https');

const supabaseUrl = 'araaxtxpluiicwwvizqf.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyYWF4dHhwbHVpaWN3d3ZpenFmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDYzMTI2MCwiZXhwIjoyMDk2MjA3MjYwfQ.Cwoe6d8ChC-X9-icRleIac88ANAFCkb-TD6g32gkhPA';

function listTables() {
  const options = {
    hostname: supabaseUrl,
    path: '/rest/v1/',
    method: 'GET',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log("Response status:", res.statusCode);
      try {
        const json = JSON.parse(data);
        if (json.definitions) {
          console.log("Tables in database:", Object.keys(json.definitions));
        } else {
          console.log("No definitions found. Keys in response:", Object.keys(json));
        }
      } catch (e) {
        console.error("Failed to parse JSON:", e.message);
        console.log("Raw Response:", data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request failed:', e);
  });

  req.end();
}

listTables();
