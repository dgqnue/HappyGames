/**
 * ============================================================================
 * TableMatchManager - 牌桌匹配管理器
 * ============================================================================
 * 
 * 处理游戏桌的玩家匹配、准备状态和倒计时。
 * 整合 TableState（牌桌状态）和 StateMappingRules（状态规则）。
 * 
 * 主要功能：
 * 1. 玩家入座/离座管理
 * 2. 观众管理
 * 3. 准备状态和倒计时（30秒准备、3-2-1开始）
 * 4. AI匹配集成（第一个玩家入座后8-15秒自动匹配AI）
 * 5. 回合开始/结束处理
 * 6. 断线处理
 * 
 * 使用方式：
 * const TableMatchManager = require('./matching/TableMatchManager');
 * const matchPlayers = new TableMatchManager(table);
 * 
 * 文件位置: server/src/gamecore/matching/TableMatchManager.js
 */

// 导入依赖模块
const TableState = require('./TableState');
const TableStatusRules = require('./TableStatusRules');
const GameSettings = require('./GameSettings');
const { fetchLatestAvatarUrl } = require('../../utils/avatarUtils');

// AI 相关模块
const AIPlayerManager = require('../../ai/AIPlayerManager');
const AIGameController = require('../../ai/AIGameController');
const DisconnectTracker = require('../DisconnectTracker');

class TableMatchManager {
    /**
     * 构造函数
     * @param {Object} table - 游戏桌实例（必须包含 io, roomId, gameType, maxPlayers, broadcast 方法）
     */
    constructor(table) {
        // 游戏桌引用
        this.table = table;
        this.io = table.io;
        this.roomId = table.roomId;
        this.gameType = table.gameType;
        this.maxPlayers = table.maxPlayers;

        // 获取游戏配置
        this.gameConfig = GameSettings.getConfig(this.gameType) || {};

        // 使用牌桌状态管理器
        this.matchState = new TableState(this.roomId, this.maxPlayers, this.gameConfig);

        // 操作队列：确保玩家操作按顺序处理
        this.actionQueue = [];
        this.isProcessingQueue = false;

        // 倒计时锁定状态
        this.isLocked = false;
        this.countdownTimer = null;
        
        // 准备倒计时取消标志 - 防止30秒倒计时与3秒游戏倒计时冲突
        this.readyCheckCancelled = false;
        
        // 回合结束标志
        this.roundEnded = false;
        
        // 下一回合请求集合
        this._nextRoundRequests = new Set();
    }

    // ========================================================================
    // 操作队列管理
    // ========================================================================

    /**
     * 将操作加入队列并异步处理
     * @param {Function} actionFn - 操作函数，返回 Promise
     * @returns {Promise} 操作结果的 Promise
     */
    async enqueueAction(actionFn) {
        return new Promise((resolve, reject) => {
            const wrappedAction = async () => {
                try {
                    const result = await actionFn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.processQueue();
                }
            };

            this.actionQueue.push(wrappedAction);

            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * 处理队列中的下一个操作
     */
    processQueue() {
        if (this.isProcessingQueue || this.actionQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        const action = this.actionQueue.shift();

        action().finally(() => {
            this.isProcessingQueue = false;
            setTimeout(() => {
                this.processQueue();
            }, 10);
        });
    }

    // ========================================================================
    // 属性访问器
    // ========================================================================

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
        // 如果已满但未开始，且不在准备倒计时中，视为匹配中
        if (this.matchState.players.length === this.maxPlayers &&
            this.matchState.status === TableStatusRules.TABLE_STATUS.WAITING) {
            return TableStatusRules.TABLE_STATUS.MATCHING;
        }
        return this.matchState.status;
    }

    set status(value) {
        this.matchState.status = value;
    }

    // ========================================================================
    // AI 匹配相关方法
    // ========================================================================
    
    /**
     * 启动 AI 匹配计时器（8-15秒后 AI 入场）
     * @param {number} playerRating - 人类玩家的等级分
     */
    startAIMatchTimer(playerRating) {
        this.cancelAIMatchTimer();
        
        console.log(`[TableMatchManager] 启动AI匹配计时器: 房间=${this.roomId}, 等级分=${playerRating}`);
        
        AIPlayerManager.startMatchTimer(this.roomId, playerRating, (aiPlayer) => {
            this.onAIMatchTimeout(aiPlayer);
        });
    }
    
    /**
     * 取消 AI 匹配计时器（真人加入时调用）
     */
    cancelAIMatchTimer() {
        AIPlayerManager.cancelMatchTimer(this.roomId);
    }
    
    /**
     * AI 匹配超时回调 - AI 入场
     * @param {Object} aiPlayer - AI 玩家信息
     */
    async onAIMatchTimeout(aiPlayer) {
        // 检查房间是否仍需要 AI
        if (this.matchState.players.length >= this.maxPlayers) {
            console.log(`[TableMatchManager] AI匹配超时但房间已满，忽略`);
            return;
        }
        
        if (this.matchState.players.length === 0) {
            console.log(`[TableMatchManager] AI匹配超时但房间为空，忽略`);
            return;
        }
        
        console.log(`[TableMatchManager] AI ${aiPlayer.nickname} 加入牌桌 ${this.roomId}`);
        
        // 构造 AI 玩家数据
        const aiPlayerData = {
            odid: aiPlayer.odid,
            odid: aiPlayer.odid,
            userId: aiPlayer.odid,
            socketId: `ai_socket_${aiPlayer.odid}`,
            user: {
                _id: aiPlayer.id,
                odid: aiPlayer.odid,
                userId: aiPlayer.odid,
                nickname: aiPlayer.nickname,
                avatar: aiPlayer.avatar
            },
            nickname: aiPlayer.nickname,
            avatar: aiPlayer.avatar,
            title: aiPlayer.title,
            titleColor: aiPlayer.titleColor,
            rating: aiPlayer.rating,
            winRate: 50,
            disconnectRate: 0,
            matchSettings: null,
            ready: false,
            isAI: true
        };
        
        // 添加玩家
        const result = this.matchState.addPlayer(aiPlayerData);
        if (!result.success) {
            console.error(`[TableMatchManager] AI入座失败:`, result.error);
            return;
        }
        
        // 广播房间状态
        await this.table.broadcastRoomState();
        
        // 确定 AI 的颜色
        const aiSide = this.matchState.players.length === 2 ? 'b' : 'r';
        
        console.log(`[TableMatchManager] 创建AI会话: tableId=${this.table.tableId}, AI=${aiPlayer.odid}, 颜色=${aiSide}`);
        
        // 创建 AI 游戏会话
        AIGameController.createSession(this.table, aiPlayer, aiSide);
        
        // 1-2秒后 AI 自动准备
        const readyDelay = Math.floor(Math.random() * 1000) + 1000;
        setTimeout(async () => {
            await this.handleAIReady(aiPlayer.odid);
        }, readyDelay);
    }
    
    /**
     * AI 准备处理
     * @param {string} aiUserId - AI 用户ID
     */
    async handleAIReady(aiUserId) {
        console.log(`[TableMatchManager] AI准备: ${aiUserId}`);
        
        const result = this.matchState.setPlayerReady(aiUserId, true);
        console.log(`[TableMatchManager] setPlayerReady 结果: ${result}`);
        
        const player = this.matchState.players.find(p => p.odid === aiUserId || p.userId === aiUserId);
        if (player) {
            console.log(`[TableMatchManager] AI ${player.nickname} 已准备`);
            
            await this.table.broadcastRoomState();
            
            if (result === 'all_ready') {
                console.log(`[TableMatchManager] 所有玩家已准备，开始游戏倒计时`);
                this.startRoundCountdown();
            } else if (this.matchState.players.length === this.maxPlayers) {
                this.startReadyCheck();
            }
        }
    }

    // ========================================================================
    // 玩家入座/离座
    // ========================================================================

    /**
     * 玩家入座尝试 - 内部实现
     */
    async _playerJoin(socket, matchSettings = null) {
        console.log(`[TableMatchManager] 玩家入座: 房间=${this.roomId}`);

        // 如果明确指定不能玩（如积分不足），作为观众加入
        if (matchSettings && matchSettings.canPlay === false) {
            console.log(`[TableMatchManager] 玩家 ${socket.user._id} 作为观众加入`);
            return this._addSpectator(socket);
        }

        const userId = socket.user._id.toString();

        // 获取玩家统计
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

        // 检查匹配条件
        const isFirstPlayer = this.matchState.players.length === 0;
        const checkResult = TableStatusRules.checkMatchCriteria(
            playerStats, matchSettings, this.matchState.matchSettings, isFirstPlayer
        );
        
        if (!checkResult.canJoin) {
            console.warn(`[TableMatchManager] 玩家 ${userId} 不符合匹配条件: ${checkResult.reason}`);
            socket.emit('join_failed', {
                code: 'MATCH_CRITERIA_NOT_MET',
                message: checkResult.reason || '不符合匹配条件'
            });
            return false;
        }

        // 计算胜率和断线率
        const winRate = playerStats.gamesPlayed > 0
            ? (playerStats.wins / playerStats.gamesPlayed) * 100
            : 0;
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;

        // 获取最新头像
        const userAvatar = await fetchLatestAvatarUrl(socket.user._id);
        
        // 获取昵称
        const User = require('../../models/User');
        let userNickname = socket.user.nickname || socket.user.username;
        try {
            const userFromDb = await User.findById(socket.user._id).select('nickname').lean();
            if (userFromDb && userFromDb.nickname) {
                userNickname = userFromDb.nickname;
            }
        } catch (err) {
            console.warn(`[TableMatchManager] 获取昵称失败:`, err.message);
        }

        // 准备玩家数据
        const playerData = {
            userId,
            socketId: socket.id,
            user: {
                _id: socket.user._id,
                username: socket.user.username,
                nickname: userNickname,
                piUsername: socket.user.piUsername,
                avatar: userAvatar
            },
            nickname: userNickname,
            avatar: userAvatar,
            title: stats?.title || '新手',
            titleColor: stats?.titleColor || '#666',
            winRate: Math.round(winRate),
            disconnectRate: Math.round(disconnectRate),
            matchSettings: matchSettings,
            ready: false
        };

        // 尝试入座
        const result = this.matchState.addPlayer(playerData);

        if (!result.success) {
            // 如果是"已在房间中"错误，视为重新连接
            if (result.error === 'Already in room' || result.error === '已在房间中') {
                console.log(`[TableMatchManager] 玩家 ${userId} 已在房间中，视为重连`);
                socket.join(this.roomId);
                await this.table.broadcastRoomState();
                return true;
            }
            
            socket.emit('join_failed', {
                code: result.error === 'Room is full' || result.error === '房间已满' ? 'ROOM_FULL' : 'JOIN_FAILED',
                message: result.error
            });
            return false;
        }

        // 加入 Socket.IO 房间
        socket.join(this.roomId);
        console.log(`[TableMatchManager] Socket ${socket.id} 加入房间: ${this.roomId}`);
        
        // 同时加入广播室
        const tier = this.table.tier;
        if (tier) {
            const broadcastRoom = `${this.gameType}_${tier}`;
            socket.join(broadcastRoom);
        }

        // 广播房间状态更新
        await this.table.broadcastRoomState();

        // 处理 AI 匹配计时器
        if (this.matchState.players.length === this.maxPlayers) {
            this.cancelAIMatchTimer();
            this.startReadyCheck();
        } else if (this.matchState.players.length === 1) {
            const playerRating = stats?.rating || 1200;
            console.log(`[TableMatchManager] 第一个玩家入座，启动AI匹配计时器 (等级分: ${playerRating})`);
            this.startAIMatchTimer(playerRating);
        } else if (this.matchState.players.length > 1) {
            this.cancelAIMatchTimer();
        }

        return true;
    }

    /**
     * 玩家入座尝试 - 队列包装
     */
    async playerJoin(socket, matchSettings = null) {
        return this.enqueueAction(() => this._playerJoin(socket, matchSettings));
    }

    /**
     * 添加观众 - 队列包装
     */
    async addSpectator(socket) {
        return this.enqueueAction(() => this._addSpectator(socket));
    }

    /**
     * 添加观众 - 内部实现
     */
    async _addSpectator(socket) {
        const spectatorData = {
            userId: socket.user._id.toString(),
            socketId: socket.id,
            nickname: socket.user.nickname || socket.user.username,
            avatar: await fetchLatestAvatarUrl(socket.user._id)
        };

        const result = this.matchState.addSpectator(spectatorData);
        
        if (result.success) {
            socket.join(this.roomId);
            if (this.table && typeof this.table.broadcastRoomState === 'function') {
                await this.table.broadcastRoomState();
            }
            return { success: true, asSpectator: true };
        } else {
            return { success: false, error: result.error };
        }
    }

    /**
     * 玩家离座 - 内部实现
     */
    _playerLeave(socket) {
        const userId = socket.user._id.toString();
        
        console.log(`[TableMatchManager] 玩家离座: ${userId}, 房间: ${this.roomId}`);
        
        // 通知 AI 控制器
        try {
            if (AIGameController && typeof AIGameController.onPlayerLeave === 'function') {
                AIGameController.onPlayerLeave(this.roomId, userId);
            }
        } catch (err) {
            console.error(`[TableMatchManager] 通知AI控制器失败:`, err);
        }

        const statusBefore = this.matchState.status;
        const playerCountBefore = this.matchState.players.length;
        const wasMatching = statusBefore === TableStatusRules.TABLE_STATUS.MATCHING;
        const wasPlaying = statusBefore === TableStatusRules.TABLE_STATUS.PLAYING;
        const wasPlayer = this.matchState.players.some(p => p.userId === userId);

        // 游戏进行中离开，处理弃权
        if (wasPlaying && !this.roundEnded) {
            const player = this.matchState.players.find(p => p.userId === userId);
            if (player && typeof this.table.onPlayerLeaveDuringRound === 'function') {
                console.log(`[TableMatchManager] 玩家 ${userId} 在游戏中离开，触发弃权`);
                this.table.onPlayerLeaveDuringRound(socket);
            }
        }

        // 移除玩家
        const wasPlayerRemoved = this.matchState.removePlayer(userId);
        const wasSpectator = this.matchState.removeSpectator(userId);

        const statusAfter = this.matchState.status;
        const playerCountAfter = this.matchState.players.length;
        
        console.log(`[TableMatchManager] 离座后: 玩家数 ${playerCountBefore}->${playerCountAfter}, 状态 ${statusBefore}->${statusAfter}`);

        if (wasPlayerRemoved || wasSpectator) {
            socket.leave(this.roomId);
            
            if (playerCountAfter === 0) {
                // 房间空了，重置状态
                this._resetTableState();
            } else {
                // 还有玩家，重置准备状态
                if (statusAfter !== TableStatusRules.TABLE_STATUS.PLAYING) {
                    this.matchState.resetReadyStatus();
                }
                
                // 僵尸 AI 清理
                this._checkZombieAI();
            }
            
            this.table.broadcastRoomState();

            if (wasMatching && statusAfter !== TableStatusRules.TABLE_STATUS.MATCHING) {
                this.table.broadcast('ready_check_cancelled', {
                    reason: '玩家离开，匹配中断',
                    remainingPlayers: playerCountAfter
                });
            }

            if (this.countdownTimer) {
                this.cancelGameCountdown();
            }
        }

        return wasPlayerRemoved || wasSpectator;
    }

    /**
     * 重置牌桌状态
     */
    _resetTableState() {
        console.log(`[TableMatchManager] 重置牌桌状态`);
        this.matchState.transitionStatus(TableStatusRules.TABLE_STATUS.IDLE, { reason: 'table_reset' });
        this.matchState.resetReadyStatus();
        this.readyCheckCancelled = false;
        this.isLocked = false;
        this.roundEnded = false;
        if (this.matchState) {
            this.matchState.gameEnded = false;
        }
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
        if (this._nextRoundRequests) {
            this._nextRoundRequests.clear();
        }
    }

    /**
     * 检查并清理僵尸 AI
     */
    _checkZombieAI() {
        const isAIPlayer = (p) => p.isAI === true || 
            (p.socketId && typeof p.socketId === 'string' && p.socketId.startsWith('ai_socket_'));
        
        const remainingPlayers = [...this.matchState.players];
        const allAI = remainingPlayers.length > 0 && remainingPlayers.every(isAIPlayer);
        
        if (allAI) {
            console.log(`[TableMatchManager] 只剩AI玩家，等待AI自行离开...`);
            
            setTimeout(() => {
                const currentPlayers = this.matchState.players;
                const stillHasAI = currentPlayers.length > 0 && currentPlayers.some(isAIPlayer);
                
                if (stillHasAI) {
                    console.log(`[TableMatchManager] AI超时未离开，强制清理`);
                    this._forceCleanupAI();
                }
            }, 6000);
        }
    }

    /**
     * 强制清理 AI
     */
    _forceCleanupAI() {
        const isAIPlayer = (p) => p.isAI === true || 
            (p.socketId && typeof p.socketId === 'string' && p.socketId.startsWith('ai_socket_'));
        
        try {
            const session = AIGameController.getSession(this.roomId);
            if (session) {
                AIGameController.leaveTable(session);
            }
        } catch (e) {
            console.error(`[TableMatchManager] 清理AI会话失败:`, e);
        }
        
        const aiPlayersToRemove = [...this.matchState.players].filter(isAIPlayer);
        for (const aiPlayer of aiPlayersToRemove) {
            console.log(`[TableMatchManager] 强制移除AI: ${aiPlayer.nickname}`);
            this.matchState.removePlayer(aiPlayer.userId);
            
            try {
                AIPlayerManager.releaseAI(aiPlayer.userId);
            } catch (e) {
                console.error(`[TableMatchManager] 释放AI资源失败:`, e);
            }
        }
        
        if (this.matchState.players.length === 0) {
            this.matchState.transitionStatus(TableStatusRules.TABLE_STATUS.IDLE, { reason: 'ai_cleanup' });
            this.roundEnded = false;
            this.isLocked = false;
        }
        
        this.table.broadcastRoomState();
    }

    /**
     * 玩家离座 - 队列包装
     */
    async playerLeave(socket) {
        return this.enqueueAction(() => this._playerLeave(socket));
    }

    // ========================================================================
    // 断线处理
    // ========================================================================

    /**
     * 处理玩家断线
     */
    async handlePlayerDisconnect(socket) {
        const userId = socket.user._id.toString();
        console.log(`[TableMatchManager] 玩家 ${socket.user.username} 断线: 房间=${this.roomId}`);

        const wasInGame = this.matchState.status === TableStatusRules.TABLE_STATUS.PLAYING;

        if (wasInGame && !this.roundEnded) {
            try {
                await DisconnectTracker.recordDisconnect(
                    socket.user._id,
                    this.gameType,
                    true
                );
            } catch (error) {
                console.error(`[TableMatchManager] 记录断线失败:`, error);
            }
        }

        this.playerLeave(socket);

        if (wasInGame && !this.roundEnded && typeof this.table.onPlayerDisconnectDuringGame === 'function') {
            this.table.onPlayerDisconnectDuringGame(userId);
        }
    }

    // ========================================================================
    // 准备状态
    // ========================================================================

    /**
     * 玩家准备 - 内部实现
     */
    async _playerReady(socket) {
        const userId = socket.user._id.toString();
        
        // 回合结束后点击"再来一局"
        if (this.roundEnded && this.matchState.status === TableStatusRules.TABLE_STATUS.PLAYING) {
            console.log(`[TableMatchManager] 玩家 ${userId} 请求下一回合`);
            this._nextRoundRequests.add(userId);
            
            const allPlayersRequested = this.matchState.players.every(p => 
                this._nextRoundRequests.has(p.userId)
            );
            
            if (allPlayersRequested) {
                console.log(`[TableMatchManager] 所有玩家请求下一回合，开始...`);
                this._nextRoundRequests.clear();
                await this.startRound();
            }
            return;
        }
        
        // 幂等性检查
        const player = this.matchState.players.find(p => p.userId === userId);
        if (player && player.ready) {
            return;
        }

        if (this.isLocked) {
            socket.emit('error', { message: '游戏即将开始，无法更改状态' });
            return;
        }

        const canReady = this.matchState.status !== TableStatusRules.TABLE_STATUS.PLAYING;
        if (!canReady) {
            console.warn(`[TableMatchManager] 玩家 ${userId} 尝试在游戏中准备`);
            return;
        }

        const result = this.matchState.setPlayerReady(userId, true);
        await this.table.broadcastRoomState();

        if (result === 'all_ready') {
            this.startRoundCountdown();
        }
    }

    /**
     * 玩家准备 - 队列包装
     */
    async playerReady(socket) {
        return this.enqueueAction(() => this._playerReady(socket));
    }

    /**
     * 玩家取消准备 - 内部实现
     */
    _playerUnready(socket) {
        if (this.isLocked) {
            socket.emit('error', { message: '游戏即将开始，无法更改状态' });
            return;
        }

        const userId = socket.user._id.toString();
        this.matchState.setPlayerReady(userId, false);

        const isFullAndMatching = this.matchState.players.length === this.maxPlayers &&
            this.matchState.status === TableStatusRules.TABLE_STATUS.MATCHING;

        if (this.countdownTimer) {
            this.cancelGameCountdown();
        }

        if (!isFullAndMatching) {
            this.matchState.cancelReadyCheck();
            this.table.broadcast('ready_check_cancelled', {
                reason: '玩家取消准备',
                remainingPlayers: this.matchState.players.length
            });
        } else {
            if (!this.matchState.readyTimer) {
                this.startReadyCheck();
            }
        }

        this.table.broadcastRoomState();
    }

    /**
     * 玩家取消准备 - 队列包装
     */
    async playerUnready(socket) {
        return this.enqueueAction(() => this._playerUnready(socket));
    }

    // ========================================================================
    // 倒计时管理
    // ========================================================================

    /**
     * 开始准备倒计时（30秒）
     */
    startReadyCheck() {
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }

        const result = this.matchState.startReadyCheck();
        if (!result) return;

        this.table.broadcast('ready_check_start', {
            timeout: this.matchState.readyTimeout
        });
        console.log(`[TableMatchManager] 开始30秒准备倒计时`);

        this.table.broadcastRoomState();
    }

    /**
     * 开始游戏倒计时（3-2-1）
     */
    startRoundCountdown() {
        this.isLocked = true;

        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }
        this.readyCheckCancelled = true;

        this.table.broadcast('game_locked', {
            message: '所有玩家已准备，游戏即将开始',
            locked: true
        });

        const roundCount = this.table.roundCount || 0;
        console.log(`[TableMatchManager] 开始游戏倒计时, 当前回合数: ${roundCount}`);
        
        if (roundCount > 0) {
            // 非第一局，直接开始
            console.log(`[TableMatchManager] 非第一局，直接开始游戏`);
            (async () => {
                await this.startRound();
            })().catch(err => console.error('[TableMatchManager] 开始回合失败:', err));
            return;
        }

        // 第一局：显示321倒计时
        console.log(`[TableMatchManager] 第一局，显示3-2-1倒计时`);
        let countdown = 3;
        this.table.broadcast('game_countdown', { count: countdown });

        this.countdownTimer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                this.table.broadcast('game_countdown', { count: countdown });
            } else {
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                }

                console.log(`[TableMatchManager] 倒计时结束，开始游戏`);
                this.table.broadcast('game_countdown', { count: 0, message: '游戏开始！' });

                setTimeout(async () => {
                    await this.startRound();
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
        this.readyCheckCancelled = false;

        this.table.broadcast('game_countdown_cancelled', {
            message: '倒计时已取消',
            locked: false
        });
    }

    /**
     * 取消游戏并重置状态
     */
    cancelGame() {
        console.log(`[TableMatchManager] 取消游戏: 房间=${this.roomId}`);
        
        this.cancelGameCountdown();
        
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }
        
        this.roundEnded = false;
        this.matchState.gameEnded = false;
        this.isLocked = false;
        this.readyCheckCancelled = false;
        
        this.matchState.resetReadyStatus();
        this.matchState.status = TableStatusRules.TABLE_STATUS.MATCHING;
        
        this.table.broadcastRoomState();
        
        console.log(`[TableMatchManager] 游戏已取消，状态重置为MATCHING`);
    }

    // ========================================================================
    // 回合管理
    // ========================================================================

    /**
     * 开始回合
     */
    async startRound() {
        console.log(`[TableMatchManager] 开始回合: 房间=${this.roomId}`);
        
        if (this._nextRoundRequests) {
            this._nextRoundRequests.clear();
        }
        
        this.roundEnded = false; 
        this.matchState.gameEnded = false; 
        this.readyCheckCancelled = true;

        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }

        this.matchState.transitionStatus(TableStatusRules.TABLE_STATUS.PLAYING, { reason: 'round_start' });
        console.log(`[TableMatchManager] 状态设为 PLAYING`);

        if (typeof this.table.startRound === 'function') {
            try {
                this.table.startRound();
            } catch (error) {
                console.error(`[TableMatchManager] 调用 table.startRound() 失败:`, error);
                this.table.broadcast('error', {
                    message: '开始回合失败',
                    error: error.message
                });
                return;
            }
        } else if (typeof this.table.onRoundStart === 'function') {
            try {
                this.table.onRoundStart();
            } catch (error) {
                console.error(`[TableMatchManager] 调用 table.onRoundStart() 失败:`, error);
            }
        } else {
            console.error('[TableMatchManager] Table 没有实现 startRound() 或 onRoundStart()');
        }

        await this.table.broadcastRoomState();
    }

    /**
     * 回合结束处理
     * @param {Object} result - 回合结果
     */
    async onRoundEnd(result) {
        console.log(`[TableMatchManager] 回合结束: 房间=${this.roomId}`);

        this.isLocked = false;
        this.roundEnded = true;
        if (this.matchState) {
            this.matchState.gameEnded = true;
        }

        if (this.table && this.table.roundStartTime !== undefined) {
            this.table.roundStartTime = null;
        }

        console.log(`[TableMatchManager] 广播 round_ended 事件`);
        this.table.broadcast('round_ended', { result });

        // 发送更新后的用户统计
        try {
            const UserGameStats = require('../../models/UserGameStats');
            for (const player of this.matchState.players) {
                const updatedStats = await UserGameStats.findOne({
                    userId: player.userId,
                    gameType: this.gameType
                }).lean();

                if (updatedStats) {
                    const socket = this.io.sockets.sockets.get(player.socketId);
                    if (socket) {
                        const avatar = await fetchLatestAvatarUrl(player.userId);
                        socket.emit('user_stats', {
                            userId: updatedStats.userId,
                            rating: updatedStats.rating,
                            gamesPlayed: updatedStats.gamesPlayed,
                            wins: updatedStats.wins,
                            losses: updatedStats.losses,
                            draws: updatedStats.draws,
                            disconnects: updatedStats.disconnects,
                            title: updatedStats.title,
                            titleRank: updatedStats.titleRank,
                            titleColor: updatedStats.titleColor,
                            lastPlayedAt: updatedStats.lastPlayedAt,
                            avatar: avatar
                        });
                    }
                }
            }
        } catch (err) {
            console.error(`[TableMatchManager] 发送更新的用户统计失败:`, err);
        }

        this.table.broadcastRoomState();

        if (this.matchState.rematchTimer) {
            clearTimeout(this.matchState.rematchTimer);
            this.matchState.rematchTimer = null;
        }
    }

    /**
     * 重置游戏
     */
    reset() {
        console.log(`[TableMatchManager] 重置房间: ${this.roomId}`);
        
        this.gameEnded = false;
        this.matchState.gameEnded = false;
        this.matchState.resetReadyStatus();
        this.matchState.status = TableStatusRules.TABLE_STATUS.IDLE;
        
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
        }
        
        this.table.broadcastRoomState();
    }

    /**
     * 清理资源
     */
    cleanup() {
        this.matchState.cleanup();
        if (this.countdownTimer) clearInterval(this.countdownTimer);
    }

    /**
     * 状态一致性检查和修复
     * @param {Array<{userId, clientStatus}>} clientStates - 客户端状态列表
     * @returns {Array} 需要同步的玩家列表
     */
    validateAndFixStateConsistency(clientStates = []) {
        const syncResults = [];
        const serverStatus = this.status;

        for (const clientState of clientStates) {
            const { userId, clientStatus } = clientState;
            const socket = this.matchState.players
                .find(p => p.userId === userId)
                ?.socketId;

            if (!socket) continue;

            const validation = TableStatusRules.validateStateConsistency(
                clientStatus,
                serverStatus,
                {
                    playerCount: this.matchState.players.length,
                    wasPlayingBefore: serverStatus === 'playing'
                }
            );

            if (!validation.consistent) {
                console.warn(`[TableMatchManager] 检测到状态不一致: 玩家=${userId}`, {
                    roomId: this.roomId,
                    客户端状态: clientStatus,
                    服务器状态: serverStatus
                });

                if (validation.shouldForceSync) {
                    this.io.sockets.sockets.get(socket)?.emit('force_state_sync', {
                        newStatus: validation.targetStatus,
                        reason: '状态不一致，强制同步',
                        recommendation: validation.recommendation
                    });
                }
            }

            syncResults.push({
                userId,
                needsSync: !validation.consistent,
                recommendation: validation.recommendation,
                targetStatus: validation.targetStatus || serverStatus
            });
        }

        return syncResults;
    }
}

module.exports = TableMatchManager;
