require('dotenv').config();
const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const initCronJobs = require('./cron/eloCron');

// 🔧 全局错误处理：防止未捕获异常导致服务器崩溃
process.on('uncaughtException', (err) => {
    console.error('[Server] ⚠️ 未捕获的异常 (进程继续运行):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] ⚠️ 未处理的 Promise 拒绝:', reason);
});

// 引入新的核心模块
const SocketServer = require('./core/network/SocketServer');
const GameLoader = require('./core/game/GameLoader');
const HttpService = require('./core/network/HttpService');

const app = express();
const server = http.createServer(app);

console.log('[Server] 启动 HappyGames 服务器...');

// 调试环境变量
console.log('[EnvDebug] 环境变量检查:');
console.log(`[EnvDebug] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[EnvDebug] MONGODB_URI exists: ${!!process.env.MONGODB_URI}`);
console.log(`[EnvDebug] MONGO_URI exists: ${!!process.env.MONGO_URI}`);
if (process.env.MONGO_URI) {
    console.log(`[EnvDebug] MONGO_URI length: ${process.env.MONGO_URI.length}`);
    console.log(`[EnvDebug] MONGO_URI starts with: ${process.env.MONGO_URI.substring(0, 15)}...`);
}


// ============================================
// 全局中间件 - CORS 和日志
// ============================================
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://www.happygames.online',
        'https://happygames.online',
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    if (allowedOrigins.includes(origin) || !origin || process.env.NODE_ENV === 'development') {
        res.header('Access-Control-Allow-Origin', origin || '*');
    } else {
        res.header('Access-Control-Allow-Origin', 'https://www.happygames.online');
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

// ============================================
// 初始化核心模块
// ============================================

// 1. 初始化 Socket 服务器
console.log('[Server] 初始化 Socket 服务器...');
const socketServer = new SocketServer(server);

// 2. 初始化游戏加载器并加载所有游戏
console.log('[Server] 初始化游戏加载器...');
const gameLoader = new GameLoader();
gameLoader.loadAll(socketServer.io);

// 3. 将游戏中心注册到 Socket 服务器
gameLoader.registerToSocketServer(socketServer);

// 4. 初始化 HTTP 服务（提供游戏相关的 HTTP API）
console.log('[Server] 初始化 HTTP 服务...');
const httpService = new HttpService(app, gameLoader);

// ============================================
// 初始化定时任务
// ============================================
console.log('[Server] 初始化定时任务...');
try {
    initCronJobs();
} catch (err) {
    console.error('[Server] 定时任务初始化失败:', err);
}

// ============================================
// 连接数据库
// ============================================
console.log('[Server] 连接数据库...');
connectDB().catch(err => {
    console.error('[Server] 数据库连接失败:', err);
});

// ============================================
// 静态文件服务
// ============================================
const path = require('path');
const fs = require('fs');

const imagesDir = path.join(__dirname, '../public/images');
console.log('[Server] 图片目录:', imagesDir);

try {
    if (fs.existsSync(imagesDir)) {
        console.log('[Server] 图片目录存在');
        const files = fs.readdirSync(imagesDir);
        console.log('[Server] 图片文件:', files);
    } else {
        console.error('[Server] 图片目录不存在！');
    }
} catch (err) {
    console.error('[Server] 检查图片目录时出错:', err);
}

app.use('/images', express.static(imagesDir));

// 调试 Uploads 目录
const uploadsDir = path.join(__dirname, '../public/uploads');
console.log('[Server] Uploads 目录:', uploadsDir);
if (fs.existsSync(uploadsDir)) {
    console.log('[Server] Uploads 目录存在');
    // 递归列出文件用于调试
    try {
        const avatarsDir = path.join(uploadsDir, 'avatars');
        if (fs.existsSync(avatarsDir)) {
            console.log('[Server] Avatars 目录文件:', fs.readdirSync(avatarsDir));
        } else {
            console.log('[Server] Avatars 目录不存在');
        }
    } catch (e) {
        console.log('[Server] 读取 Avatars 目录失败:', e.message);
    }
} else {
    console.error('[Server] Uploads 目录不存在！');
}

app.use('/uploads', (req, res, next) => {
    console.log(`[Static] 请求 Uploads 资源: ${req.url}`);
    next();
});
app.use('/uploads', express.static(uploadsDir));

// ============================================
// API 路由
// ============================================
app.get('/', (req, res) => {
    res.send('HappyGames API 正在运行');
});

// 健康检查端点
app.get('/health', (req, res) => {
    const mongoose = require('mongoose');
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        games: gameLoader ? gameLoader.getGameList() : [],
        uptime: process.uptime()
    };
    res.json(health);
});


// 用户相关路由
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/user', require('./routes/user'));

// 钱包相关路由
app.use('/api/wallet', require('./routes/walletRoutes'));

// 结算相关路由
app.use('/api', require('./routes/settle'));

// ============================================
// 错误处理中间件
// ============================================
app.use((err, req, res, next) => {
    console.error('[Server] 未处理的错误:', err);
    res.status(500).json({ message: '内部服务器错误' });
});

// ============================================
// 启动服务器
// ============================================
const PORT = process.env.PORT || 5000;
// 显式监听 0.0.0.0 以允许局域网访问
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] ✓ 服务器运行在端口 ${PORT} (0.0.0.0)`);
    console.log(`[Server] ✓ 准备接受连接`);
    console.log('[Server] ============================================');
    console.log('[Server] 模块加载状态:');
    console.log('[Server]   - Socket 服务器: ✓');
    console.log('[Server]   - 游戏加载器: ✓');
    console.log('[Server]   - HTTP 服务: ✓');
    console.log(`[Server]   - 已加载游戏: ${gameLoader.getGameList().join(', ')}`);
    console.log('[Server] ============================================');
});
