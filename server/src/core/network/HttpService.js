/**
 * HTTP 通信模块
 * 负责处理 HTTP API 请求
 * 
 * 主要职责：
 * 1. 提供游戏房间列表的 HTTP 接口（作为 Socket.IO 的备用方案）
 * 2. 提供游戏状态查询接口
 * 3. 处理其他需要 HTTP 协议的请求
 */
class HttpService {
    /**
     * @param {Object} app - Express 应用实例
     * @param {GameLoader} gameLoader - 游戏加载器实例
     */
    constructor(app, gameLoader) {
        this.app = app;
        this.gameLoader = gameLoader;
        this.setupRoutes();
    }

    /**
     * 设置路由
     */
    setupRoutes() {
        // 获取游戏房间列表（HTTP 备用接口）
        this.app.get('/api/games/:gameId/rooms', (req, res) => {
            this.handleGetRooms(req, res);
        });

        // 获取游戏列表
        this.app.get('/api/games', (req, res) => {
            this.handleGetGameList(req, res);
        });

        // 调试接口：检查 GameLoader 状态
        this.app.get('/api/debug/gameloader', (req, res) => {
            this.handleDebugGameLoader(req, res);
        });

        console.log('[HttpService] HTTP 路由已配置');
    }

    /**
     * 处理获取房间列表请求
     */
    handleGetRooms(req, res) {
        const { gameId } = req.params;
        const { tier } = req.query;

        console.log(`[HttpService] 收到请求: 获取房间列表 gameId=${gameId}, tier=${tier}`);

        try {
            if (!this.gameLoader) {
                throw new Error('GameLoader not initialized');
            }

            const gameCenter = this.gameLoader.getGameCenter(gameId);

            if (!gameCenter) {
                console.warn(`[HttpService] 游戏不存在: ${gameId}`);
                const availableGames = this.gameLoader.getGameList();
                console.warn(`[HttpService] 当前可用游戏: ${availableGames.join(', ')}`);
                return res.status(404).json({ message: '游戏不存在', availableGames });
            }

            const roomType = tier || 'free';

            // 调试日志
            console.log(`[HttpService] GameCenter 对象:`, {
                exists: !!gameCenter,
                type: typeof gameCenter,
                hasGameRooms: gameCenter && 'gameRooms' in gameCenter,
                gameRoomsType: gameCenter && typeof gameCenter.gameRooms,
                gameRoomsIsMap: gameCenter && gameCenter.gameRooms instanceof Map,
                keys: gameCenter && gameCenter.gameRooms ? Array.from(gameCenter.gameRooms.keys()) : 'N/A'
            });

            if (!gameCenter.gameRooms) {
                throw new Error(`GameCenter.gameRooms is ${gameCenter.gameRooms}. GameCenter keys: ${Object.keys(gameCenter).join(', ')}`);
            }

            const gameRoom = gameCenter.gameRooms.get(roomType);

            if (!gameRoom) {
                console.warn(`[HttpService] 游戏房间不存在: ${roomType}`);
                const availableRooms = Array.from(gameCenter.gameRooms.keys());
                return res.status(400).json({ message: '无效的游戏房间', availableRooms });
            }

            const tables = gameRoom.getTableList();
            console.log(`[HttpService] 成功获取桌子列表: ${tables.length} 个桌子`);
            res.json(tables);

        } catch (error) {
            console.error('[HttpService] 获取房间列表失败:', error);
            res.status(500).json({
                message: '服务器错误',
                error: error.message,
                path: req.path
            });
        }
    }

    /**
     * 处理获取游戏列表请求
     */
    handleGetGameList(req, res) {
        try {
            const games = this.gameLoader.getGameList();
            res.json({ games });
        } catch (error) {
            console.error('[HttpService] 获取游戏列表失败:', error);
            res.status(500).json({ message: '服务器错误' });
        }
    }

    /**
     * 处理 GameLoader 调试请求
     */
    handleDebugGameLoader(req, res) {
        const fs = require('fs');
        const path = require('path');

        const debugInfo = {
            cwd: process.cwd(),
            dirname: __dirname,
            gamesDirResolved: path.join(__dirname, '../../games'),
            gamesDirExists: fs.existsSync(path.join(__dirname, '../../games')),
            gameCenters: this.gameLoader.getGameList(),
            folderContents: {},
            env: {
                NODE_ENV: process.env.NODE_ENV
            }
        };

        try {
            const gamesDir = debugInfo.gamesDirResolved;
            if (debugInfo.gamesDirExists) {
                const folders = fs.readdirSync(gamesDir);
                debugInfo.folders = folders;

                folders.forEach(folder => {
                    const folderPath = path.join(gamesDir, folder);
                    if (fs.lstatSync(folderPath).isDirectory()) {
                        debugInfo.folderContents[folder] = fs.readdirSync(folderPath);
                    }
                });
            }
        } catch (err) {
            debugInfo.error = err.message;
        }

        res.json(debugInfo);
    }
}

module.exports = HttpService;
