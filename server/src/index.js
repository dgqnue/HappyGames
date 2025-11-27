require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const SocketDispatcher = require('./gamecore/socket');
const initCronJobs = require('./cron/eloCron');

const app = express();
const server = http.createServer(app);

// Initialize Socket Dispatcher (handles IO and game logic)
new SocketDispatcher(server);

// Initialize Cron Jobs
initCronJobs();

// Middleware
// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'https://www.happygames.online',
    'https://happygames.online', // Allow without www
    process.env.FRONTEND_URL
];

app.use(cors({
    origin: (origin, callback) => {
        // 允许所有来源（用于调试）
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Handle preflight requests for all routes
app.options('*', cors());
app.use(express.json());

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
    console.log(`Server running on port ${PORT}`);
});
