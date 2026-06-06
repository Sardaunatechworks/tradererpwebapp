const fs = require('fs');
const path = require('path');
const https = require('https');

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'araaxtxpluiicwwvizqf.supabase.co';
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Dynamically load environment variables from .env.local
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = value;
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') serviceRoleKey = value;
    }
  });
}

// Clean URL for hostname usage
if (supabaseUrl) {
  supabaseUrl = supabaseUrl.replace(/^https?:\/\//, '');
}

function listTables() {
  if (!serviceRoleKey) {
    console.error("Error: SUPABASE_SERVICE_ROLE_KEY not found in environment or .env.local");
    return;
  }

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
