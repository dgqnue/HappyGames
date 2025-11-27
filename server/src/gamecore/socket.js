const socketIo = require('socket.io');
const { verifyToken } = require('./auth');
const fs = require('fs');
const path = require('path');
const lobbyHandler = require('../socket/lobbyHandler'); // Import existing lobby handler
const UserGameStats = require('../models/UserGameStats');

class SocketDispatcher {
    constructor(server) {
        this.io = socketIo(server, {
            cors: {
                origin: (origin, callback) => {
                    // 允许所有来源（用于调试）
                    callback(null, true);
                },
                methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                credentials: true,
                allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
            },
            allowEIO3: true,
            transports: ['websocket', 'polling']
        });
        this.games = {}; // 存储游戏管理器实例
        this.loadGames();
        this.init();
    }

    // 动态加载所有游戏管理器
    loadGames() {
        const gamesDir = path.join(__dirname, '../games');
        if (fs.existsSync(gamesDir)) {
            const gameFolders = fs.readdirSync(gamesDir);
            gameFolders.forEach(folder => {
                const gamePath = path.join(gamesDir, folder);
                if (fs.lstatSync(gamePath).isDirectory()) {
                    try {
                        // Check if index.js exists
                        if (fs.existsSync(path.join(gamePath, 'index.js'))) {
                            const GameManager = require(gamePath);
                            this.games[folder] = new GameManager(this.io);
                            console.log(`Loaded game manager: ${folder}`);
                        }
                    } catch (err) {
                        console.error(`Failed to load game ${folder}:`, err);
                    }
                }
            });
        }
    }

    init() {
        // 鉴权中间件
        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token;

            // Allow skipping auth if explicitly requested for testing (optional, but good for dev)
            if (process.env.SKIP_AUTH === 'true') {
                socket.user = { _id: 'test_user', username: 'TestUser' };
                return next();
            }

            const user = await verifyToken(token);
            if (!user) {
                return next(new Error("S001: Unauthorized"));
            }
            socket.user = user;
            next();
        });

        this.io.on('connection', (socket) => {
            console.log(`User ${socket.user.username} connected.`);

            // Integrate existing Lobby Handler
            lobbyHandler(this.io, socket);

            // Handle User Stats Request
            socket.on('get_stats', async ({ gameType }) => {
                try {
                    if (!socket.user) return;
                    let stats = await UserGameStats.findOne({ userId: socket.user._id, gameType });
                    if (!stats) {
                        stats = await UserGameStats.create({
                            userId: socket.user._id,
                            gameType,
                            rating: 1200,
                            title: '初出茅庐',
                            gamesPlayed: 0,
                            wins: 0,
                            losses: 0,
                            draws: 0
                        });
                    }
                    socket.emit('user_stats', stats);
                } catch (err) {
                    console.error('Error fetching stats:', err);
                    socket.emit('error', 'Failed to fetch stats');
                }
            });

            // 监听玩家请求开始游戏事件
            socket.on('start_game', (gameId) => {
                const manager = this.games[gameId];
                if (!manager) {
                    return socket.emit('system_error', { code: 404, message: 'S002: Game not found' });
                }
                // 交由游戏管理器处理玩家加入/匹配逻辑
                manager.onPlayerJoin(socket, socket.user);
            });

            socket.on('disconnect', () => {
                console.log(`User ${socket.user.username} disconnected.`);
                // **[优化]** 通知当前玩家所在的游戏房间处理断线逻辑
                if (socket.currentRoomId && socket.currentGameId && this.games[socket.currentGameId]) {
                    this.games[socket.currentGameId].onPlayerLeave(socket.user, socket.currentRoomId);
                }
            });
        });
    }
}

module.exports = SocketDispatcher;
