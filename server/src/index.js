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
    'https://www.happygames.online', // Replace with actual Vercel domain if different
    process.env.FRONTEND_URL // Allow setting via env var
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
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
