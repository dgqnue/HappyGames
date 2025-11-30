const axios = require('axios');
const crypto = require('crypto');
const SECRET_KEY = process.env.SETTLEMENT_SECRET_KEY || 'YOUR_SECURE_KEY';

/**
 * 游戏桌基类 (GameTable)
 * 代表一个具体的游戏对局实例
 * 
 * 主要职责：
 * 1. 管理桌内玩家状态 (入座、准备、旁观)
 * 2. 管理游戏状态 (开始、进行中、结束)
 * 3. 处理游戏内通信 (广播、单发)
 * 4. 处理结算逻辑 (Settlement)
 */
class GameTable {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {String} tableId - 游戏桌唯一ID
     * @param {String} gameType - 游戏类型
     * @param {Number} maxPlayers - 最大玩家数
     * @param {String} tier - 游戏室等级 (free/beginner/etc)
     */
    constructor(io, tableId, gameType, maxPlayers = 2, tier = 'free') {
        this.io = io;
        this.tableId = tableId;
        this.gameType = gameType;
        this.maxPlayers = maxPlayers;
        this.tier = tier;

        // 玩家列表 (座位)
        // 格式: [{ userId, socketId, nickname, avatar, ready, ... }]
        this.players = [];

        // 旁观者列表
        this.spectators = [];

        // 游戏状态
        this.status = 'idle'; // idle, playing, finished

        // 游戏管理器引用 (由Manager赋值)
        this.manager = null;
    }

    /**
     * 玩家尝试入座
     * @param {Object} socket - 玩家Socket
     * @param {Object} options - 入座选项
     * @returns {Boolean} 是否成功
     */
    async join(socket, options = {}) {
        if (this.players.length >= this.maxPlayers) {
            return false;
        }

        // 检查是否已经在座
        if (this.players.find(p => p.userId === socket.user._id.toString())) {
            return true; // 已经是玩家，视为重连成功
        }

        const player = {
            userId: socket.user._id.toString(),
            socketId: socket.id,
            nickname: socket.user.username, // 或 nickname
            avatar: socket.user.avatar || '/images/default-avatar.svg',
            ready: false,
            ...options
        };

        this.players.push(player);
        socket.join(this.tableId);

        // 更新桌子状态
        if (this.status === 'idle') {
            this.status = 'waiting';
        }

        // 通知桌内其他人
        this.broadcast('player_joined', {
            tableId: this.tableId,
            player: player
        });

        console.log(`[GameTable] 玩家 ${player.nickname} 加入游戏桌 ${this.tableId}，当前状态: ${this.status}`);
        return true;
    }

    /**
     * 玩家离开
     */
    leave(socket) {
        const userId = socket.user._id.toString();
        const index = this.players.findIndex(p => p.userId === userId);

        if (index !== -1) {
            const player = this.players[index];
            this.players.splice(index, 1);
            socket.leave(this.tableId);

            this.broadcast('player_left', {
                tableId: this.tableId,
                userId: userId
            });

            console.log(`[GameTable] 玩家 ${player.nickname} 离开游戏桌 ${this.tableId}`);

            // 如果所有玩家都离开了，恢复 idle 状态
            if (this.players.length === 0 && this.status === 'waiting') {
                this.status = 'idle';
                console.log(`[GameTable] 游戏桌 ${this.tableId} 恢复空闲状态`);
            }

            // 如果游戏正在进行，可能需要判负
            if (this.status === 'playing') {
                this.onPlayerDisconnectDuringGame(userId);
            }

            return true;
        }

        // 检查旁观者
        const specIndex = this.spectators.findIndex(s => s.userId === userId);
        if (specIndex !== -1) {
            this.spectators.splice(specIndex, 1);
            socket.leave(this.tableId);
            return true;
        }

        return false;
    }

    /**
     * 玩家准备
     */
    playerReady(socket) {
        const player = this.players.find(p => p.userId === socket.user._id.toString());
        if (player) {
            player.ready = true;
            this.broadcast('player_ready', { userId: player.userId });

            // 检查是否所有人都准备好了
            this.checkStart();
        }
    }

    /**
     * 检查是否可以开始游戏
     */
    checkStart() {
        if (this.players.length === this.maxPlayers && this.players.every(p => p.ready)) {
            this.startGame();
        }
    }

    /**
     * 开始游戏
     */
    startGame() {
        this.status = 'playing';
        this.broadcast('game_start', { tableId: this.tableId });
        this.onGameStart();
    }

    /**
     * 游戏结束
     */
    endGame(result) {
        this.status = 'finished';
        this.broadcast('game_over', result);

        // 重置准备状态
        this.players.forEach(p => p.ready = false);
        this.status = 'idle';

        this.onGameEnd(result);
    }

    // --- 钩子方法 (子类实现) ---

    onGameStart() {
        // 子类实现具体游戏开始逻辑
    }

    onGameEnd(result) {
        // 子类实现具体游戏结束逻辑
    }

    onPlayerDisconnectDuringGame(userId) {
        // 子类实现断线判负逻辑
    }

    // --- 通信方法 ---

    broadcast(event, data) {
        this.io.to(this.tableId).emit(event, data);
    }

    sendToPlayer(socketId, event, data) {
        this.io.to(socketId).emit(event, data);
    }

    /**
     * 发送当前状态给指定玩家
     */
    sendState(socket) {
        const state = this.getGameState();
        socket.emit('state', state);
    }

    /**
     * 获取当前游戏状态
     * 子类应该重写此方法以包含游戏特定的数据
     */
    getGameState() {
        return {
            roomId: this.tableId,
            players: this.players,
            spectators: this.spectators,
            status: this.status,
            // 子类可以扩展更多数据
        };
    }

    // --- 结算方法 ---

    /**
     * 结算请求签名
     */
    sign(data) {
        return crypto.createHmac('sha256', SECRET_KEY)
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * 执行结算
     */
    async settle(result) {
        const batchId = `${this.tableId}-${Date.now()}`;
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');

        const payload = {
            batchId,
            timestamp,
            nonce,
            result,
        };

        try {
            const signature = this.sign(payload);
            const apiUrl = process.env.API_URL || 'http://localhost:5000';

            await axios.post(`${apiUrl}/api/settle`, payload, {
                headers: { "x-signature": signature }
            });

            console.log(`[GameTable] 结算成功: ${batchId}`);
        } catch (err) {
            console.error(`[GameTable] 结算失败 ${this.tableId}:`, err.message);
            this.broadcast('system_error', { code: 'W005', message: '结算服务请求失败' });
        }
    }
}

module.exports = GameTable;
