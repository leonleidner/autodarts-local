const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for IP if not provided by query
let autodartsIp = '127.0.0.1';

app.get('/api/board', async (req, res) => {
    try {
        const ip = req.query.ip || autodartsIp;
        // The autodarts local Board Manager runs on port 3180
        const url = `http://${ip}:3180/api/state`;
        
        const response = await axios.get(url, { timeout: 2000 });
        console.log("Board Data:", JSON.stringify(response.data, null, 2)); res.json(response.data);
    } catch (error) {
        // Return 503 instead of crashing to allow frontend to show "Offline" state
        res.status(503).json({ error: 'Board Offline', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`[Autodarts Local] Server running at http://localhost:${PORT}`);
});
