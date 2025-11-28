/**
 * 增强的游戏房间基类 - 集成匹配系统
 * 
 * 在原有 BaseGameRoom 基础上增加：
 * - 匹配条件管理
 * - 准备/开始机制
 * - 僵尸桌清理
 * - 旁观功能
 */

const MatchRoomState = require('./MatchRoomState');
const DisconnectTracker = require('./DisconnectTracker');
const axios = require('axios');
const crypto = require('crypto');
const SECRET_KEY = process.env.SETTLEMENT_SECRET_KEY || 'YOUR_SECURE_KEY';

class MatchableGameRoom {
    constructor(io, roomId, maxPlayers = 2, tier = 'free') {
        this.io = io;
        this.roomId = roomId;
        this.tier = tier;
        this.maxPlayers = maxPlayers;

        // 使用匹配状态管理器
        this.matchState = new MatchRoomState(roomId, maxPlayers);

        // 游戏状态（由子类管理）
        this.gameState = null;

        // 启动僵尸桌检查
        this.startZombieCheck();
    }

    /**
     * 玩家尝试入座
     */
    async playerJoin(socket, matchSettings = null) {
        const userId = socket.user._id.toString();

        // 获取玩家统计数据
        const UserGameStats = require('../models/UserGameStats');
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });

        const playerStats = {
            gamesPlayed: stats?.gamesPlayed || 0,
            wins: stats?.wins || 0,
            disconnects: stats?.disconnects || 0
        };

        // 检查是否符合匹配条件
        if (!this.matchState.canPlayerJoin(playerStats)) {
            socket.emit('join_failed', {
                code: 'MATCH_CRITERIA_NOT_MET',
                message: '不符合房间匹配条件'
            });
            return false;
        }

        // 计算胜率和掉线率
        const winRate = playerStats.gamesPlayed > 0
            ? (playerStats.wins / playerStats.gamesPlayed) * 100
            : 0;
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;

        // 准备玩家数据
        const playerData = {
            userId,
            socketId: socket.id,
            nickname: socket.user.nickname || socket.user.username,
            title: stats?.title || '初出茅庐',
            titleColor: stats?.titleColor || '#000',
            winRate: Math.round(winRate),
            disconnectRate: Math.round(disconnectRate),
            matchSettings: matchSettings
        };

        // 尝试入座
        const result = this.matchState.addPlayer(playerData);
        if (!result.success) {
            socket.emit('join_failed', {
                code: 'ROOM_FULL',
                message: result.error
            });
            return false;
        }

        // 加入 Socket.IO 房间
        socket.join(this.roomId);

        // 广播房间状态更新
        this.broadcastRoomState();

        // 如果满座，自动开始准备检查
        if (this.matchState.players.length === this.maxPlayers) {
            this.startReadyCheck();
        }

        return true;
    }

    /**
     * 玩家离座
     */
    playerLeave(socket) {
        const userId = socket.user._id.toString();

        // 从玩家列表移除
        const wasPlayer = this.matchState.removePlayer(userId);

        // 从观众列表移除
        const wasSpectator = this.matchState.removeSpectator(userId);

        if (wasPlayer || wasSpectator) {
            socket.leave(this.roomId);
            this.broadcastRoomState();
        }

        return wasPlayer || wasSpectator;
    }

    /**
     * 处理玩家断线
     * ⭐ 自动记录掉线统计
     */
    async handlePlayerDisconnect(socket) {
        const userId = socket.user._id.toString();

        console.log(`[MatchRoom] Player ${socket.user.username} disconnected from room ${this.roomId}`);

        // 检查玩家是否在游戏中
        const wasInGame = this.matchState.status === 'playing';

        // 如果在游戏中断线，记录掉线统计
        if (wasInGame) {
            try {
                await DisconnectTracker.recordDisconnect(
                    socket.user._id,
                    this.gameType,
                    true // wasInGame = true
                );
                console.log(`[MatchRoom] Disconnect recorded for player ${socket.user.username}`);
            } catch (error) {
                console.error(`[MatchRoom] Failed to record disconnect:`, error);
            }
        }

        // 移除玩家
        this.playerLeave(socket);

        // 如果是游戏中断线，可能需要特殊处理（如判对手获胜）
        if (wasInGame) {
            this.onPlayerDisconnectDuringGame(userId);
        }
    }

    /**
     * 游戏中断线的特殊处理（子类可重写）
     */
    onPlayerDisconnectDuringGame(userId) {
        // 子类可以重写此方法来处理游戏中断线的逻辑
        // 例如：判对手获胜、暂停游戏等
        console.log(`[MatchRoom] Player ${userId} disconnected during game`);
    }

    /**
     * 玩家准备
     */
    playerReady(socket) {
        const userId = socket.user._id.toString();
        const result = this.matchState.setPlayerReady(userId, true);

        if (result === 'all_ready') {
            // 所有玩家都准备好了，立即开始游戏
            this.startGame();
        } else {
            // 广播准备状态
            this.broadcastRoomState();
        }
    }

    /**
     * 玩家取消准备
     */
    playerUnready(socket) {
        const userId = socket.user._id.toString();
        this.matchState.setPlayerReady(userId, false);
        this.broadcastRoomState();
    }

    /**
     * 开始准备检查（30秒倒计时）
     */
    startReadyCheck() {
        const result = this.matchState.startReadyCheck();
        if (!result) return;

        // 广播准备检查开始
        this.broadcast('ready_check_start', {
            timeout: this.matchState.readyTimeout,
            message: '所有玩家请在30秒内点击"开始"按钮'
        });

        // 设置倒计时
        this.matchState.readyTimer = setTimeout(() => {
            this.onReadyTimeout();
        }, this.matchState.readyTimeout);
    }

    /**
     * 准备超时处理
     */
    onReadyTimeout() {
        const unreadyPlayers = this.matchState.getUnreadyPlayers();

        // 踢出未准备的玩家
        unreadyPlayers.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.emit('kicked', {
                    reason: '未在规定时间内准备',
                    code: 'READY_TIMEOUT'
                });
                this.playerLeave(socket);
            }
        });

        // 重置准备状态
        this.matchState.resetReadyStatus();
        this.matchState.status = 'waiting';

        this.broadcastRoomState();
    }

    /**
     * 开始游戏（由子类实现具体逻辑）
     */
    startGame() {
        this.matchState.status = 'playing';
        this.matchState.cancelReadyCheck();

        // 停止僵尸桌检查
        if (this.matchState.zombieTimer) {
            clearTimeout(this.matchState.zombieTimer);
            this.matchState.zombieTimer = null;
        }

        // 子类应该重写此方法来初始化游戏状态
        this.onGameStart();

        this.broadcast('game_start', {
            players: this.matchState.players.map(p => ({
                userId: p.userId,
                nickname: p.nickname,
                title: p.title
            }))
        });
    }

    /**
     * 游戏开始回调（子类重写）
     */
    onGameStart() {
        // 子类实现
    }

    /**
     * 游戏结束
     */
    endGame(result) {
        this.matchState.status = 'ended';

        // 重置准备状态
        this.matchState.resetReadyStatus();

        // 广播游戏结束
        this.broadcast('game_over', result);

        // 开始新一轮准备检查
        setTimeout(() => {
            if (this.matchState.players.length === this.maxPlayers) {
                this.startReadyCheck();
            }
        }, 3000); // 3秒后开始准备检查
    }

    /**
     * 旁观
     */
    spectatorJoin(socket) {
        const userId = socket.user._id.toString();

        const spectatorData = {
            userId,
            socketId: socket.id,
            nickname: socket.user.nickname || socket.user.username
        };

        const result = this.matchState.addSpectator(spectatorData);
        if (!result.success) {
            socket.emit('spectate_failed', { message: result.error });
            return false;
        }

        socket.join(this.roomId);

        // 发送公共游戏状态（不包含手牌等私密信息）
        socket.emit('spectate_state', this.getPublicGameState());

        this.broadcastRoomState();
        return true;
    }

    /**
     * 获取公共游戏状态（用于旁观，子类重写）
     */
    getPublicGameState() {
        return {
            status: this.matchState.status,
            players: this.matchState.players.length
        };
    }

    /**
     * 启动僵尸桌检查
     */
    startZombieCheck() {
        // 每分钟检查一次
        this.zombieCheckInterval = setInterval(() => {
            if (this.matchState.isZombieRoom()) {
                console.log(`[MatchRoom] Zombie room detected: ${this.roomId}`);
                this.clearZombieRoom();
            }
        }, 60000); // 每分钟检查一次
    }

    /**
     * 清理僵尸桌
     */
    clearZombieRoom() {
        // 踢出所有玩家
        this.matchState.players.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.emit('kicked', {
                    reason: '5分钟内未匹配到其他玩家',
                    code: 'ZOMBIE_ROOM'
                });
                socket.leave(this.roomId);
            }
        });

        // 清空房间
        this.matchState.players = [];
        this.matchState.firstPlayerJoinedAt = null;

        this.broadcastRoomState();
    }

    /**
     * 广播房间状态
     */
    broadcastRoomState() {
        this.broadcast('room_state', this.matchState.getRoomInfo());
    }

    /**
     * 广播消息
     */
    broadcast(event, data) {
        this.io.to(this.roomId).emit(event, data);
    }

    /**
     * 发送消息给特定玩家
     */
    sendToPlayer(socketId, event, data) {
        this.io.to(socketId).emit(event, data);
    }

    /**
     * 签名函数
     */
    sign(data) {
        return crypto.createHmac('sha256', SECRET_KEY)
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * 异步结算
     */
    async settle(result) {
        const batchId = `${this.roomId}-${Date.now()}`;
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');

        const settlementPayload = {
            batchId,
            timestamp,
            nonce,
            result,
        };

        try {
            const signature = this.sign(settlementPayload);
            const apiUrl = process.env.API_URL || 'http://localhost:5000';
            await axios.post(`${apiUrl}/api/settle`, settlementPayload, {
                headers: {
                    "x-signature": signature
                }
            });
        } catch (err) {
            console.error(`Settlement failed for Room ${this.roomId}:`, err);
            this.broadcast('system_error', {
                code: 'W005',
                message: '结算服务请求失败，请联系客服'
            });
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.matchState.cleanup();
        if (this.zombieCheckInterval) {
            clearInterval(this.zombieCheckInterval);
        }
    }
}

module.exports = MatchableGameRoom;
