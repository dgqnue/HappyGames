require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const SocketDispatcher = require('./gamecore/socket');
const initCronJobs = require('./cron/eloCron');

const app = express();
const server = http.createServer(app);

console.log('[Server] Starting HappyGames server...');

// CORS配置必须在所有中间件之前
app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log(`[CORS] Request from origin: ${origin}`);
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());

console.log('[Server] Initializing Socket Dispatcher...');
// Initialize Socket Dispatcher (handles IO and game logic)
new SocketDispatcher(server);

console.log('[Server] Initializing Cron Jobs...');
// Initialize Cron Jobs
initCronJobs();

console.log('[Server] Connecting to database...');
// Connect Database
connectDB();

// Routes
app.get('/', (req, res) => {
    res.send('HappyGames API is running');
});
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api', require('./routes/settle')); // Register settlement route

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`[Server] ✓ Server running on port ${PORT}`);
    console.log(`[Server] ✓ Ready to accept connections`);
});
