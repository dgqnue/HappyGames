/**
 * 增强的游戏桌基类 (MatchableGameTable) - 集成匹配系统
 * 
 * 在原有 BaseGameTable 基础上增加：
 * - 匹配条件管理
 * - 准备/开始机制
 * - 僵尸桌清理
 * - 旁观功能
 */

const MatchRoomState = require('./MatchRoomState');
const DisconnectTracker = require('../../gamecore/DisconnectTracker');
const MatchingRules = require('./MatchingRules');
const BaseGameTable = require('../../gamecore/BaseGameTable');

class MatchableGameTable extends BaseGameTable {
    constructor(io, roomId, gameType, maxPlayers = 2, tier = 'free') {
        super(io, roomId);
        // 删除父类初始化的 players 属性，以便使用 getter
        delete this.players;

        this.gameType = gameType;  // 游戏类型（如 'chinesechess'）
        this.tier = tier;
        this.maxPlayers = maxPlayers;

        // 使用匹配状态管理器
        this.matchState = new MatchRoomState(roomId, maxPlayers);

        // 游戏状态（由子类管理）
        this.gameState = null;

        // 倒计时锁定状态（仅锁定就绪/取消就绪/离开操作）
        this.isLocked = false;
        this.countdownTimer = null;

        // 启动僵尸桌检查
        this.startZombieCheck();
    }

    /**
     * 玩家尝试入座
     */
    async playerJoin(socket, matchSettings = null) {
        console.log(`[MatchableGameTable] playerJoin() called`);
        console.log(`[MatchableGameTable] - roomId:`, this.roomId);
        console.log(`[MatchableGameTable] - gameType:`, this.gameType);
        console.log(`[MatchableGameTable] - socket.user:`, socket.user);
        console.log(`[MatchableGameTable] - matchSettings:`, matchSettings);

        const userId = socket.user._id.toString();
        console.log(`[MatchableGameTable] - userId:`, userId);

        // 获取玩家统计数据
        console.log(`[MatchableGameTable] Fetching player stats...`);
        const UserGameStats = require('../../models/UserGameStats');
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });
        console.log(`[MatchableGameTable] Stats found:`, stats);

        const playerStats = {
            gamesPlayed: stats?.gamesPlayed || 0,
            wins: stats?.wins || 0,
            disconnects: stats?.disconnects || 0
        };
        console.log(`[MatchableGameTable] Player stats:`, playerStats);

        // 检查是否符合匹配条件
        console.log(`[MatchableGameTable] Checking match criteria...`);
        if (!this.matchState.canPlayerJoin(playerStats)) {
            console.log(`[MatchableGameTable] Match criteria not met`);
            socket.emit('join_failed', {
                code: 'MATCH_CRITERIA_NOT_MET',
                message: '不符合游戏桌匹配条件'
            });
            return false;
        }
        console.log(`[MatchableGameTable] Match criteria passed`);

        // 计算胜率和掉线率
        const winRate = playerStats.gamesPlayed > 0
            ? (playerStats.wins / playerStats.gamesPlayed) * 100
            : 0;
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;
        console.log(`[MatchableGameTable] Win rate: ${winRate}%, Disconnect rate: ${disconnectRate}%`);

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
        console.log(`[MatchableGameTable] Player data prepared:`, playerData);

        // 尝试入座
        console.log(`[MatchableGameTable] Attempting to add player to matchState...`);
        const result = this.matchState.addPlayer(playerData);
        console.log(`[MatchableGameTable] addPlayer result:`, result);

        if (!result.success) {
            console.log(`[MatchableGameTable] Failed to add player:`, result.error);
            socket.emit('join_failed', {
                code: 'ROOM_FULL',
                message: result.error
            });
            return false;
        }

        // 加入 Socket.IO 房间
        console.log(`[MatchableGameTable] Joining Socket.IO room...`);
        socket.join(this.roomId);

        // 广播游戏桌状态更新
        console.log(`[MatchableGameTable] Broadcasting room state...`);
        this.broadcastRoomState();

        // 如果满座，自动开始准备检查
        if (this.matchState.players.length === this.maxPlayers) {
            console.log(`[MatchableGameTable] Room is full, starting ready check...`);
            this.startReadyCheck();
        }

        console.log(`[MatchableGameTable] Player joined successfully`);
        return true;
    }

    /**
     * 获取当前玩家数量
     * 用于游戏桌列表显示
     */
    getPlayerCount() {
        return this.matchState.players.length;
    }

    // --- 兼容性 Getters ---

    get players() {
        return this.matchState.players;
    }

    get spectators() {
        return this.matchState.spectators;
    }

    get tableId() {
        return this.roomId;
    }

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
     * 检查游戏桌是否可以加入
        }
        return this.playerLeave(socket);
    }

    /**
     * 玩家离座
     */
    playerLeave(socket) {
        const userId = socket.user._id.toString();
        console.log(`[MatchableGameTable] playerLeave called for room ${this.roomId}, userId: ${userId}`);

        // 记录之前的状态
        const wasMatching = this.matchState.status === MatchingRules.TABLE_STATUS.MATCHING;

        // 从玩家列表移除
        const wasPlayer = this.matchState.removePlayer(userId);
        console.log(`[MatchableGameTable] wasPlayer: ${wasPlayer}`);

        // 从观众列表移除
        const wasSpectator = this.matchState.removeSpectator(userId);
        console.log(`[MatchableGameTable] wasSpectator: ${wasSpectator}`);

        if (wasPlayer || wasSpectator) {
            socket.leave(this.roomId);
            console.log(`[MatchableGameTable] Broadcasting room state after player left...`);
            this.broadcastRoomState();

            // 如果之前是匹配中，现在取消了，通知客户端取消倒计时
            if (wasMatching && this.matchState.status !== MatchingRules.TABLE_STATUS.MATCHING) {
                this.broadcast('ready_check_cancelled', {
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
     * ⭐ 自动记录掉线统计
     */
    async handlePlayerDisconnect(socket) {
        const userId = socket.user._id.toString();

        console.log(`[MatchableGameTable] Player ${socket.user.username} disconnected from room ${this.roomId}`);

        // 检查玩家是否在游戏中
        const wasInGame = this.matchState.status === MatchingRules.TABLE_STATUS.PLAYING;

        // 如果在游戏中断线，记录掉线统计
        if (wasInGame) {
            try {
                await DisconnectTracker.recordDisconnect(
                    socket.user._id,
                    this.gameType,
                    true // wasInGame = true
                );
                console.log(`[MatchableGameTable] Disconnect recorded for player ${socket.user.username}`);
            } catch (error) {
                console.error(`[MatchableGameTable] Failed to record disconnect:`, error);
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
        console.log(`[MatchableGameTable] Player ${userId} disconnected during game`);
    }

    /**
     * 玩家准备 (点击"开始"按钮)
     */
    playerReady(socket) {
        // 如果倒计时已开始，不允许改变就绪状态
        if (this.isLocked) {
            socket.emit('error', { message: '游戏即将开始，无法改变状态' });
            return;
        }

        const userId = socket.user._id.toString();
        const result = this.matchState.setPlayerReady(userId, true);

        this.broadcastRoomState();

        if (result === 'all_ready') {
            // 所有玩家都准备好了，开始3-2-1倒计时
            this.startGameCountdown();
        }
    }

    /**
     * 开始游戏倒计时 (3-2-1)
     */
    startGameCountdown() {
        // 锁定就绪/取消就绪/离开操作
        this.isLocked = true;
        console.log(`[MatchableGameTable] Starting game countdown for room ${this.roomId}`);

        // 广播锁定状态
        this.broadcast('game_locked', {
            message: '所有玩家已就绪，游戏即将开始',
            locked: true
        });

        let countdown = 3;

        // 立即广播第一个倒计时
        this.broadcast('game_countdown', { count: countdown });

        // 设置倒计时定时器
        this.countdownTimer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                // 继续倒计时
                this.broadcast('game_countdown', { count: countdown });
            } else {
                // 倒计时结束，清除定时器
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;

                // 广播游戏开始
                this.broadcast('game_countdown', { count: 0, message: '游戏开始！' });

                // 延迟 500ms 后真正开始游戏，让客户端显示"游戏开始"
                setTimeout(() => {
                    this.startGame();
                }, 500);
            }
        }, 1000); // 每秒一次
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

        this.broadcast('game_countdown_cancelled', {
            message: '倒计时已取消',
            locked: false
        });
    }

    /**
     * 玩家取消准备
     */
    playerUnready(socket) {
        // 如果倒计时已开始，不允许取消就绪
        if (this.isLocked) {
            socket.emit('error', { message: '游戏即将开始，无法改变状态' });
            return;
        }

        const userId = socket.user._id.toString();
        this.matchState.setPlayerReady(userId, false);

        // 取消准备检查倒计时，防止玩家被踢出
        // 并且将状态重置为 WAITING，以便客户端显示"开始"按钮
        this.matchState.cancelReadyCheck();

        // 如果有游戏倒计时，也取消它 (虽然有锁应该不会走到这里，但为了安全)
        if (this.countdownTimer) {
            this.cancelGameCountdown();
        }

        // 通知客户端取消准备检查倒计时
        this.broadcast('ready_check_cancelled', {
            reason: '玩家取消准备',
            remainingPlayers: this.matchState.players.length
        });

        this.broadcastRoomState();
    }

    /**
     * 开始准备检查（30秒倒计时）
     */
    startReadyCheck() {
        const result = this.matchState.startReadyCheck();
        if (!result) return;

        console.log(`[MatchableGameTable] Starting 30s ready check for room ${this.roomId}`);

        // 广播准备检查开始
        this.broadcast('ready_check_start', {
            timeout: this.matchState.readyTimeout,
            message: '所有玩家请在30秒内点击"开始"按钮'
        });

        // 设置倒计时
        this.matchState.readyTimer = setTimeout(() => {
            this.onReadyTimeout();
        }, this.matchState.readyTimeout);

        // 广播最新的房间状态（matching）给大厅
        this.broadcastRoomState();
    }

    /**
     * 准备超时处理
     */
    onReadyTimeout() {
        console.log(`[MatchableGameTable] onReadyTimeout called for room ${this.roomId}`);

        const unreadyPlayers = this.matchState.getUnreadyPlayers();
        const readyPlayers = this.matchState.players.filter(p => p.ready);

        console.log(`[MatchableGameTable] Ready players: ${readyPlayers.length}, Unready players: ${unreadyPlayers.length}`);

        unreadyPlayers.forEach(player => {
            console.log(`[MatchableGameTable] Kicking unready player: ${player.nickname}`);
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.emit('kicked', {
                    reason: '未在规定时间内准备',
                    code: 'READY_TIMEOUT'
                });
                this.playerLeave(socket);
            } else {
                console.log(`[MatchableGameTable] Socket not found for player ${player.nickname}, force removing...`);
                this.matchState.removePlayer(player.userId);
                this.broadcastRoomState();
            }
        });

        // 取消准备检查定时器
        this.matchState.cancelReadyCheck();

        // 重置所有剩余玩家的准备状态
        this.matchState.resetReadyStatus();

        console.log(`[MatchableGameTable] Room reset. Remaining players: ${this.matchState.players.length}, Status: ${this.matchState.status}`);

        // 广播房间状态更新
        this.broadcastRoomState();

        // 通知剩余玩家倒计时已取消
        this.broadcast('ready_check_cancelled', {
            reason: '部分玩家未在规定时间内准备',
            remainingPlayers: this.matchState.players.length
        });
    }

    /**
     * 开始游戏（由子类实现具体逻辑）
     */
    startGame() {
        // 解锁并清除倒计时
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
            // 发生错误，恢复状态
            this.matchState.status = MatchingRules.TABLE_STATUS.WAITING;
            this.matchState.resetReadyStatus();

            this.broadcast('system_error', {
                message: '游戏启动失败，请重试'
            });

            this.broadcastRoomState();
        }
    }

    /**
     * 游戏开始回调（子类重写）
     */
    onGameStart() {
        this.matchState.resetReadyStatus();

        // 立即广播状态更新，让大厅看到房间已空闲
        this.broadcastRoomState();

        // 立即踢出所有玩家
        this.matchState.players.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                socket.leave(this.roomId);
            }
        });

        // 清空房间
        this.matchState.players = [];
        const roomInfo = this.matchState.getRoomInfo();
        roomInfo.status = this.status;

        const state = {
            ...roomInfo,
            players: this.matchState.players.map(p => ({
                userId: p.userId,
                socketId: p.socketId,
                nickname: p.nickname,
                avatar: p.avatar,
                ready: p.ready,
                title: p.title,
                winRate: p.winRate,
                disconnectRate: p.disconnectRate
            }))
        };
        socket.emit('state', state);
    }

    /**
     * 获取当前游戏状态
     * 子类应该重写此方法以包含游戏特定的数据
     */
    getGameState() {
        return {
            roomId: this.roomId,
            players: this.matchState.players,
            spectators: this.matchState.spectators,
            status: this.status,
            // 子类可以扩展更多数据
        };
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

module.exports = MatchableGameTable;
