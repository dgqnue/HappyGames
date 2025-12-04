const socketIo = require('socket.io');
const { verifyToken } = require('../../gamecore/auth'); // 暂时引用旧位置，后续可移动
const lobbyHandler = require('../../socket/lobbyHandler'); // 暂时引用旧位置

/**
 * Socket通信服务模块
 * 负责处理底层Socket连接、鉴权和消息分发
 * 
 * 主要职责：
 * 1. 初始化 Socket.IO 服务器
 * 2. 处理跨域配置 (CORS)
 * 3. 用户连接鉴权 (Authentication)
 * 4. 基础事件分发 (Event Dispatching)
 */
class SocketServer {
    constructor(server) {
        this.io = null;
        this.gameCenters = new Map(); // 存储注册的游戏中心
        this.init(server);
    }

    /**
     * 初始化 Socket.IO
     * @param {Object} server - HTTP Server 实例
     */
    init(server) {
        this.io = socketIo(server, {
            cors: {
                origin: (origin, callback) => {
                    const allowedOrigins = [
                        'https://www.happygames.online',
                        'https://happygames.online',
                        'http://localhost:3000',
                        'http://localhost:3001'
                    ];
                    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
                        callback(null, true);
                    } else {
                        console.warn(`[SocketServer] 非白名单来源连接: ${origin}`);
                        callback(null, true);
                    }
                },
                methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupMiddleware();
        this.setupConnectionHandler();

        console.log('[SocketServer] Socket服务已启动');
    }

    /**
     * 配置中间件（鉴权）
     */
    setupMiddleware() {
        this.io.use(async (socket, next) => {
            const token = socket.handshake.auth.token;

            // 测试环境跳过鉴权
            if (process.env.SKIP_AUTH === 'true') {
                socket.user = { _id: 'test_user', username: 'TestUser' };
                return next();
            }

            try {
                const user = await verifyToken(token);
                if (!user) {
                    return next(new Error("S001: Unauthorized - 鉴权失败"));
                }
                socket.user = user;
                next();
            } catch (err) {
                console.error('[SocketServer] 鉴权错误:', err);
                next(new Error("S001: Unauthorized - 内部错误"));
            }
        });
    }

    /**
     * 注册游戏中心
     * @param {String} gameType - 游戏类型标识
     * @param {Object} center - 游戏中心实例
     */
    registerGameCenter(gameType, center) {
        this.gameCenters.set(gameType, center);
        console.log(`[SocketServer] 游戏中心已注册: ${gameType}`);
    }

    /**
     * 设置连接处理器
     */
    setupConnectionHandler() {
        this.io.on('connection', (socket) => {
            console.log(`[SocketServer] 用户已连接: ${socket.user.username} (${socket.id})`);

            // 集成大厅处理器 (Lobby Handler)
            // TODO: 后续应完全解耦，通过事件总线处理
            lobbyHandler(this.io, socket);

            // 监听开始游戏请求
            socket.on('start_game', (gameType) => {
                this.handleStartGame(socket, gameType);
            });

            // 监听断开连接
            socket.on('disconnect', () => {
                this.handleDisconnect(socket);
            });
        });
    }

    /**
     * 处理开始游戏请求
     */
    handleStartGame(socket, gameType) {
        const center = this.gameCenters.get(gameType);
        if (!center) {
            console.error(`[SocketServer] 未找到游戏中心: ${gameType}`);
            return socket.emit('system_error', { code: 404, message: '游戏服务未找到' });
        }

        // 转发给对应的游戏中心
        center.playerJoinGameCenter(socket);
    }

    /**
     * 处理断开连接
     */
    handleDisconnect(socket) {
        console.log(`[SocketServer] 用户已断开: ${socket.user.username}`);

        // 如果玩家在游戏中，通知对应的中心
        if (socket.currentGameId) {
            const center = this.gameCenters.get(socket.currentGameId);
            if (center) {
                center.onPlayerDisconnect(socket);
            }
        }
    }
}

module.exports = SocketServer;
