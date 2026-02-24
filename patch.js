const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');
code = code.replace(
    /res\.json\(response\.data\);/,
    `console.log("Board Data:", response.data); res.json(response.data);`
);
fs.writeFileSync('server.js', code);
