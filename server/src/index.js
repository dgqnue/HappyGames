require('dotenv').config();
const express = require('express');
const http = require('http');
// const cors = require('cors'); // Remove cors package usage to avoid conflicts
const connectDB = require('./config/db');
const SocketDispatcher = require('./gamecore/socket');
const initCronJobs = require('./cron/eloCron');

const app = express();
const server = http.createServer(app);

console.log('[Server] Starting HappyGames server...');

// Global Middleware for CORS and Logging
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // List of allowed origins
    const allowedOrigins = [
        'https://www.happygames.online',
        'https://happygames.online',
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    // Allow if origin is in the list, or allow all for development
    if (allowedOrigins.includes(origin) || !origin || process.env.NODE_ENV === 'development') {
        res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
        res.header('Access-Control-Allow-Origin', 'https://www.happygames.online');
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    // Simple request logging
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

// Initialize Socket Dispatcher
console.log('[Server] Initializing Socket Dispatcher...');
const socketDispatcher = new SocketDispatcher(server);

// Initialize Cron Jobs
console.log('[Server] Initializing Cron Jobs...');
try {
    initCronJobs();
} catch (err) {
    console.error('[Server] Failed to init cron jobs:', err);
}

// Connect Database
console.log('[Server] Connecting to database...');
connectDB().catch(err => {
    console.error('[Server] Database connection failed:', err);
    // Don't exit process, let it retry or run without DB for static parts
});

// Routes
app.get('/', (req, res) => {
    res.send('HappyGames API is running');
});

// API Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api', require('./routes/settle'));

// [NEW] HTTP Endpoint to get rooms (Fallback for Socket.io)
app.get('/api/games/:gameId/rooms', (req, res) => {
    const { gameId } = req.params;
    const { tier } = req.query;

    try {
        const game = socketDispatcher.games[gameId];
        if (!game) {
            console.warn(`[API] Game not found: ${gameId}`);
            return res.status(404).json({ message: 'Game not found' });
        }

        const rooms = game.getRoomList(tier || 'free');
        res.json(rooms);
    } catch (error) {
        console.error('[API] Error fetching rooms:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('[Server] Unhandled Error:', err);
    res.status(500).json({ message: 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`[Server] ✓ Server running on port ${PORT}`);
    console.log(`[Server] ✓ Ready to accept connections`);
});
