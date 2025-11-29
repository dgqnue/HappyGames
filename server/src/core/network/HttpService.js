const SocketServer = require('./network/SocketServer');
const GameLoader = require('./game/GameLoader');

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

        console.log('[HttpService] HTTP 路由已配置');
    }

    /**
     * 处理获取房间列表请求
     */
    handleGetRooms(req, res) {
        const { gameId } = req.params;
        const { tier } = req.query;

        try {
            const manager = this.gameLoader.getManager(gameId);

            if (!manager) {
                console.warn(`[HttpService] 游戏不存在: ${gameId}`);
                return res.status(404).json({ message: '游戏不存在' });
            }

            const tierObj = manager.tiers.get(tier || 'free');
            if (!tierObj) {
                return res.status(400).json({ message: '无效的游戏室' });
            }

            const rooms = tierObj.getTableList();
            res.json(rooms);

        } catch (error) {
            console.error('[HttpService] 获取房间列表失败:', error);
            res.status(500).json({ message: '服务器错误', error: error.message });
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
}

module.exports = HttpService;
