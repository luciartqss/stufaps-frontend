const { execSync } = require('child_process');
const token = execSync('jq -r ".auth_token // empty" /home/luciii/Downloads/StuFAPs/frontend/node_modules/.cache 2>/dev/null || echo ""').toString().trim();
console.log("Token:", token);
