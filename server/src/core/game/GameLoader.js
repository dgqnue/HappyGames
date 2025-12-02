const fs = require('fs');
const path = require('path');
const MatchPlayers = require('../matching/MatchPlayers');
const MatchingRules = MatchPlayers.MatchingRules;

/**
 * 游戏加载器
 * 负责动态加载所有游戏模块并注册到系统中
 * 
 * 主要职责：
 * 1. 扫描 games 目录下的所有游戏模块
 * 2. 实例化每个游戏的中心 (GameCenter)
 * 3. 将游戏中心注册到 Socket 服务器
 * 4. 统一管理匹配系统
 */
class GameLoader {
    constructor() {
        // 游戏中心集合 Map<gameType, GameCenter>
        this.gameCenters = new Map();

        // 全局匹配器（所有游戏共享）
        // 注意：MatchMaker 现在是 MatchPlayers 的静态属性，不是 MatchingRules 的
        this.matchMaker = new MatchPlayers.MatchMaker();
    }

    /**
     * 加载所有游戏
     * @param {Object} io - Socket.IO 实例
     */
    loadAll(io) {
        const gamesDir = path.join(__dirname, '../../games');

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

        console.log(`[GameLoader] 游戏加载完成，共加载 ${this.gameCenters.size} 个游戏`);
    }

    /**
     * 加载单个游戏
     * @param {Object} io - Socket.IO 实例
     * @param {String} gameType - 游戏类型标识
     * @param {String} gamePath - 游戏目录路径
     */
    loadGame(io, gameType, gamePath) {
        // 查找游戏中心文件
        // 支持两种命名方式：
        // 1. <GameName>Center.js (推荐)
        // 2. <GameName>Manager.js (兼容旧版)
        // 3. index.js (兼容旧版)

        // 自动查找游戏中心文件
        // 策略：
        // 1. 查找以 Center.js 结尾的文件 (如 ChineseChessCenter.js)
        // 2. 查找以 Manager.js 结尾的文件 (兼容旧版)
        // 3. 查找 index.js

        let CenterClass = null;
        let foundPath = null;

        try {
            const files = fs.readdirSync(gamePath);

            // 优先查找 *Center.js
            let targetFile = files.find(f => f.endsWith('Center.js'));

            // 其次查找 *Manager.js
            if (!targetFile) {
                targetFile = files.find(f => f.endsWith('Manager.js'));
            }

            // 最后尝试 index.js
            if (!targetFile && files.includes('index.js')) {
                targetFile = 'index.js';
            }

            if (targetFile) {
                foundPath = path.join(gamePath, targetFile);
                CenterClass = require(foundPath);
            }
        } catch (err) {
            console.error(`[GameLoader] 查找文件出错: ${gameType}`, err);
        }

        if (!CenterClass) {
            console.warn(`[GameLoader] 未找到游戏中心文件: ${gameType}`);
            return;
        }

        // 实例化游戏中心
        const gameCenter = new CenterClass(io, this.matchMaker);
        this.gameCenters.set(gameType, gameCenter);

        console.log(`[GameLoader] ✓ 已加载游戏: ${gameType} (${path.basename(foundPath)})`);
    }

    /**
     * 注册所有游戏到 Socket 服务器
     * @param {Object} socketServer - SocketServer 实例
     */
    registerToSocketServer(socketServer) {
        for (const [gameType, gameCenter] of this.gameCenters) {
            socketServer.registerGameCenter(gameType, gameCenter);
        }
        console.log('[GameLoader] 所有游戏已注册到 Socket 服务器');
    }

    /**
     * 获取游戏中心
     * @param {String} gameType 
     */
    getGameCenter(gameType) {
        return this.gameCenters.get(gameType);
    }

    /**
     * 获取所有游戏列表
     */
    getGameList() {
        return Array.from(this.gameCenters.keys());
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
