const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\ROYAL\\.gemini\\antigravity-ide\\brain\\791ce6bb-de96-44ca-952d-44c70cccb4e8\\.system_generated\\tasks\\task-388.log';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log("Last 50 lines of logs:");
  console.log(lines.slice(-50).join('\n'));
} else {
  console.log("Log file does not exist at path:", logPath);
}
