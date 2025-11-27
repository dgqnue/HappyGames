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
    // console.log(`[CORS] Request from origin: ${origin}`);
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
const socketDispatcher = new SocketDispatcher(server);

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

// [NEW] HTTP Endpoint to get rooms (Fallback for Socket.io)
app.get('/api/games/:gameId/rooms', (req, res) => {
    const { gameId } = req.params;
    const { tier } = req.query;

    try {
        const game = socketDispatcher.games[gameId];
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        // Assuming getRoomList returns the list of rooms
        // We need to make sure getRoomList is synchronous or handle promise if async
        // Based on previous code, it seems synchronous but let's check
        const rooms = game.getRoomList(tier || 'free');
        res.json(rooms);
    } catch (error) {
        console.error('[API] Error fetching rooms:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`[Server] ✓ Server running on port ${PORT}`);
    console.log(`[Server] ✓ Ready to accept connections`);
});
