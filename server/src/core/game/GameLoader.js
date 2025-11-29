const fs = require('fs');
const path = require('path');
const MatchMaker = require('../core/matching/MatchMaker');

/**
 * 游戏加载器
 * 负责动态加载所有游戏模块并注册到系统中
 * 
 * 主要职责：
 * 1. 扫描 games 目录下的所有游戏模块
 * 2. 实例化每个游戏的管理器
 * 3. 将游戏管理器注册到 Socket 服务器
 * 4. 统一管理匹配系统
 */
class GameLoader {
    constructor() {
        // 游戏管理器集合 Map<gameType, GameManager>
        this.managers = new Map();

        // 全局匹配器（所有游戏共享）
        this.matchMaker = new MatchMaker();
    }

    /**
     * 加载所有游戏
     * @param {Object} io - Socket.IO 实例
     */
    loadAll(io) {
        const gamesDir = path.join(__dirname, '../games');

        if (!fs.existsSync(gamesDir)) {
            console.error('[GameLoader] 游戏目录不存在:', gamesDir);
            return;
        }

        const gameFolders = fs.readdirSync(gamesDir);

        console.log('[GameLoader] 开始加载游戏模块...');

        gameFolders.forEach(folder => {
            const gamePath = path.join(gamesDir, folder);

            // 检查是否是目录
            if (!fs.lstatSync(gamePath).isDirectory()) {
                return;
            }

            try {
                this.loadGame(io, folder, gamePath);
            } catch (err) {
                console.error(`[GameLoader] 加载游戏失败: ${folder}`, err.message);
            }
        });

        console.log(`[GameLoader] 游戏加载完成，共加载 ${this.managers.size} 个游戏`);
    }

    /**
     * 加载单个游戏
     * @param {Object} io - Socket.IO 实例
     * @param {String} gameType - 游戏类型标识
     * @param {String} gamePath - 游戏目录路径
     */
    loadGame(io, gameType, gamePath) {
        // 查找游戏管理器文件
        // 支持两种命名方式：
        // 1. <GameName>Manager.js (推荐)
        // 2. index.js (兼容旧版)

        const managerFiles = [
            path.join(gamePath, `${this.capitalize(gameType)}Manager.js`),
            path.join(gamePath, 'index.js')
        ];

        let ManagerClass = null;
        let foundPath = null;

        for (const filePath of managerFiles) {
            if (fs.existsSync(filePath)) {
                ManagerClass = require(filePath);
                foundPath = filePath;
                break;
            }
        }

        if (!ManagerClass) {
            console.warn(`[GameLoader] 未找到游戏管理器: ${gameType}`);
            return;
        }

        // 实例化管理器
        const manager = new ManagerClass(io, this.matchMaker);
        this.managers.set(gameType, manager);

        console.log(`[GameLoader] ✓ 已加载游戏: ${gameType} (${path.basename(foundPath)})`);
    }

    /**
     * 注册所有游戏到 Socket 服务器
     * @param {Object} socketServer - SocketServer 实例
     */
    registerToSocketServer(socketServer) {
        for (const [gameType, manager] of this.managers) {
            socketServer.registerGameManager(gameType, manager);
        }
        console.log('[GameLoader] 所有游戏已注册到 Socket 服务器');
    }

    /**
     * 获取游戏管理器
     * @param {String} gameType 
     */
    getManager(gameType) {
        return this.managers.get(gameType);
    }

    /**
     * 获取所有游戏列表
     */
    getGameList() {
        return Array.from(this.managers.keys());
    }

    /**
     * 首字母大写
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.matchMaker) {
            this.matchMaker.stop();
        }
    }
}

module.exports = GameLoader;
