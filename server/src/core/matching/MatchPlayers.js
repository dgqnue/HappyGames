const MatchRoomState = require('./MatchRoomState');
const DisconnectTracker = require('../../gamecore/DisconnectTracker');
const MatchingRules = require('./MatchingRules');

/**
 * 玩家匹配管理器 (MatchPlayers)
 * 
 * 负责处理游戏桌的玩家匹配、准备、倒计时等逻辑。
 * 从 MatchableGameTable 中提取，以便复用和解耦。
 */
class MatchPlayers {
    /**
     * @param {Object} table - 游戏桌实例 (必须包含 io, roomId, gameType, maxPlayers, broadcast 方法)
     */
    constructor(table) {
        this.table = table;
        this.io = table.io;
        this.roomId = table.roomId;
        this.gameType = table.gameType;
        this.maxPlayers = table.maxPlayers;

        // 使用匹配状态管理器
        this.matchState = new MatchRoomState(this.roomId, this.maxPlayers);

        // 倒计时锁定状态
        this.isLocked = false;
        this.countdownTimer = null;

        // 启动僵尸桌检查
        this.startZombieCheck();
    }

    /**
     * 获取当前玩家列表
     */
    get players() {
        return this.matchState.players;
    }

    /**
     * 获取当前观众列表
     */
    get spectators() {
        return this.matchState.spectators;
    }

    /**
     * 获取当前状态
     */
    get status() {
        // 如果满座但未开始，且未进入准备倒计时，视为 matching
        if (this.matchState.players.length === this.maxPlayers &&
            this.matchState.status === MatchingRules.TABLE_STATUS.WAITING) {
            return MatchingRules.TABLE_STATUS.MATCHING;
        }
        return this.matchState.status;
    }

    set status(value) {
        this.matchState.status = value;
    }

    /**
     * 玩家尝试入座
     */
    async playerJoin(socket, matchSettings = null) {
        console.log(`[MatchPlayers] playerJoin() called for room ${this.roomId}`);

        const userId = socket.user._id.toString();

        // 获取玩家统计数据
        const UserGameStats = require('../../models/UserGameStats');
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
                message: '不符合游戏桌匹配条件'
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

        // 广播游戏桌状态更新
        this.table.broadcastRoomState();

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

        // 记录之前的状态
        const wasMatching = this.matchState.status === MatchingRules.TABLE_STATUS.MATCHING;

        // 从玩家列表移除
        const wasPlayer = this.matchState.removePlayer(userId);

        // 从观众列表移除
        const wasSpectator = this.matchState.removeSpectator(userId);

        if (wasPlayer || wasSpectator) {
            socket.leave(this.roomId);
            this.table.broadcastRoomState();

            // 如果之前是匹配中，现在取消了，通知客户端取消倒计时
            if (wasMatching && this.matchState.status !== MatchingRules.TABLE_STATUS.MATCHING) {
                this.table.broadcast('ready_check_cancelled', {
                    reason: '玩家离开，匹配中断',
                    remainingPlayers: this.matchState.players.length
                });
            }

            // 如果正在游戏倒计时，取消它
            if (this.countdownTimer) {
                this.cancelGameCountdown();
            }
        }

        return wasPlayer || wasSpectator;
    }

    /**
     * 处理玩家断线
     */
    async handlePlayerDisconnect(socket) {
        const userId = socket.user._id.toString();
        console.log(`[MatchPlayers] Player ${socket.user.username} disconnected from room ${this.roomId}`);

        // 检查玩家是否在游戏中
        const wasInGame = this.matchState.status === MatchingRules.TABLE_STATUS.PLAYING;

        // 如果在游戏中断线，记录掉线统计
        if (wasInGame) {
            try {
                await DisconnectTracker.recordDisconnect(
                    socket.user._id,
                    this.gameType,
                    true
                );
            } catch (error) {
                console.error(`[MatchPlayers] Failed to record disconnect:`, error);
            }
        }

        // 移除玩家
        this.playerLeave(socket);

        // 如果是游戏中断线，通知游戏桌处理（如判负）
        if (wasInGame && typeof this.table.onPlayerDisconnectDuringGame === 'function') {
            this.table.onPlayerDisconnectDuringGame(userId);
        }
    }

    /**
     * 玩家准备
     */
    playerReady(socket) {
        if (this.isLocked) {
            socket.emit('error', { message: '游戏即将开始，无法改变状态' });
            return;
        }

        const userId = socket.user._id.toString();
        const result = this.matchState.setPlayerReady(userId, true);

        this.table.broadcastRoomState();

        if (result === 'all_ready') {
            this.startGameCountdown();
        }
    }

    /**
     * 玩家取消准备
     */
    playerUnready(socket) {
        if (this.isLocked) {
            socket.emit('error', { message: '游戏即将开始，无法改变状态' });
            return;
        }

        const userId = socket.user._id.toString();
        this.matchState.setPlayerReady(userId, false);
        this.matchState.cancelReadyCheck();

        if (this.countdownTimer) {
            this.cancelGameCountdown();
        }

        this.table.broadcast('ready_check_cancelled', {
            reason: '玩家取消准备',
            remainingPlayers: this.matchState.players.length
        });

        this.table.broadcastRoomState();
    }

    /**
     * 开始准备检查（30秒倒计时）
     */
    startReadyCheck() {
        const result = this.matchState.startReadyCheck();
        if (!result) return;

        this.table.broadcast('ready_check_start', {
            timeout: this.matchState.readyTimeout,
            message: '所有玩家请在30秒内点击"开始"按钮'
        });

        this.matchState.readyTimer = setTimeout(() => {
            this.onReadyTimeout();
        }, this.matchState.readyTimeout);

        this.table.broadcastRoomState();
    }

    /**
     * 准备超时处理
     */
    onReadyTimeout() {
        const unreadyPlayers = this.matchState.getUnreadyPlayers();

        unreadyPlayers.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.emit('kicked', {
                    reason: '未在规定时间内准备',
                    code: 'READY_TIMEOUT'
                });
                this.playerLeave(socket);
            } else {
                this.matchState.removePlayer(player.userId);
                this.table.broadcastRoomState();
            }
        });

        this.matchState.cancelReadyCheck();
        this.matchState.resetReadyStatus();
        this.table.broadcastRoomState();

        this.table.broadcast('ready_check_cancelled', {
            reason: '部分玩家未在规定时间内准备',
            remainingPlayers: this.matchState.players.length
        });
    }

    /**
     * 开始游戏倒计时 (3-2-1)
     */
    startGameCountdown() {
        this.isLocked = true;

        this.table.broadcast('game_locked', {
            message: '所有玩家已就绪，游戏即将开始',
            locked: true
        });

        let countdown = 3;
        this.table.broadcast('game_countdown', { count: countdown });

        this.countdownTimer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                this.table.broadcast('game_countdown', { count: countdown });
            } else {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;

                this.table.broadcast('game_countdown', { count: 0, message: '游戏开始！' });

                setTimeout(() => {
                    this.startGame();
                }, 500);
            }
        }, 1000);
    }

    /**
     * 取消游戏倒计时
     */
    cancelGameCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        this.isLocked = false;

        this.table.broadcast('game_countdown_cancelled', {
            message: '倒计时已取消',
            locked: false
        });
    }

    /**
     * 开始游戏
     */
    startGame() {
        this.isLocked = false;
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }

        this.matchState.status = MatchingRules.TABLE_STATUS.PLAYING;
        this.matchState.cancelReadyCheck();

        // 停止僵尸桌检查
        if (this.matchState.zombieTimer) {
            clearTimeout(this.matchState.zombieTimer);
            this.matchState.zombieTimer = null;
        }

        // 通知游戏桌开始游戏
        if (typeof this.table.startGame === 'function') {
            this.table.startGame();
        } else {
            console.error('[MatchPlayers] Table does not implement startGame()');
        }
    }

    /**
     * 游戏结束重置
     */
    reset() {
        this.matchState.resetReadyStatus();
        this.matchState.status = MatchingRules.TABLE_STATUS.WAITING;
        this.startZombieCheck();
    }

    /**
     * 启动僵尸桌检查
     */
    startZombieCheck() {
        if (this.matchState.zombieTimer) clearTimeout(this.matchState.zombieTimer);

        this.matchState.zombieTimer = setTimeout(() => {
            if (this.matchState.isZombieRoom()) {
                console.log(`[MatchPlayers] Room ${this.roomId} is a zombie room, cleaning up...`);
                // 可以在这里实现自动清理逻辑
            }
        }, this.matchState.zombieTimeout);
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.matchState.cleanup();
        if (this.countdownTimer) clearInterval(this.countdownTimer);
    }
}

module.exports = MatchPlayers;
