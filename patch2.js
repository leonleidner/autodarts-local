const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(
    /console\.log\("Board Data:", response\.data\);/,
    `console.log("Board Data:", JSON.stringify(response.data, null, 2));`
);
fs.writeFileSync('server.js', code);
