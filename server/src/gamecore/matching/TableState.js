/**
 * ============================================================================
 * TableState - 牌桌状态管理
 * ============================================================================
 * 
 * 管理单个游戏桌的状态，包括玩家入座、准备、游戏进行、结束等。
 * 支持多人游戏配置（最小/最大玩家数、座位策略）。
 * 
 * 主要功能：
 * 1. 玩家入座、离座管理
 * 2. 观众列表管理
 * 3. 准备状态检查
 * 4. 状态转换（空闲 -> 等待 -> 匹配中 -> 游戏中 -> 结算）
 * 5. 座位分配策略
 * 
 * 状态流转：
 * IDLE（空闲）-> WAITING（等待玩家）-> MATCHING（匹配/准备中）-> PLAYING（游戏中）
 *    ^                                                              |
 *    |<------------------------------- SETTLING（结算中）<----------|
 * 
 * 文件位置: server/src/gamecore/matching/TableState.js
 */

const StateMappingRules = require('./StateMappingRules');

class TableState {
    /**
     * 构造函数 - 支持多人游戏配置
     * 
     * @param {string} roomId - 房间ID
     * @param {number} maxPlayers - 最大玩家数（默认2）
     * @param {Object} gameConfig - 游戏配置对象
     * @param {number} gameConfig.minPlayers - 最小开始人数
     * @param {string} gameConfig.seatStrategy - 座位策略 (sequential/random/spread)
     * @param {number} gameConfig.readyTimeout - 准备超时时间
     * @param {boolean} gameConfig.requireAllReady - 是否要求所有玩家准备
     */
    constructor(roomId, maxPlayers = 2, gameConfig = null) {
        // 基础配置
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;
        
        // 游戏配置
        this.gameConfig = gameConfig || {};
        this.minPlayers = this.gameConfig.minPlayers || maxPlayers;
        this.seatStrategy = this.gameConfig.seatStrategy || 'sequential';
        
        // 玩家和观众列表
        this.players = [];
        this.spectators = [];
        
        // 当前状态
        this.status = StateMappingRules.TABLE_STATUS.IDLE;

        // 匹配设置
        this.matchSettings = { ...StateMappingRules.DEFAULT_SETTINGS };

        // 倒计时相关
        this.readyTimer = null;
        this.readyTimeout = this.gameConfig.readyTimeout || StateMappingRules.COUNTDOWN_CONFIG.readyTimeout;

        // 时间戳记录
        this.createdAt = Date.now();
        this.firstPlayerJoinedAt = null;

        // 复盘请求
        this.rematchRequests = new Map();
        this.roundEnded = false;

        console.log(`[TableState] 牌桌 ${roomId} 初始化完成 ` +
            `(最大玩家: ${maxPlayers}, 最小玩家: ${this.minPlayers}, 座位策略: ${this.seatStrategy})`);
    }

    // ========================================================================
    // 玩家入座检查
    // ========================================================================

    /**
     * 检查玩家是否可以入座
     * @param {Object} playerStats - 玩家统计数据（等级分等）
     * @param {Object} playerSettings - 玩家匹配设置
     * @returns {boolean} 是否可以入座
     */
    canPlayerJoin(playerStats, playerSettings = null) {
        const isFirstPlayer = this.players.length === 0;
        const result = StateMappingRules.checkMatchCriteria(
            playerStats,
            playerSettings,
            this.matchSettings,
            isFirstPlayer
        );
        console.log(`[TableState] 入座检查: ${result.reason}`);
        return result.canJoin;
    }

    // ========================================================================
    // 玩家入座和离座
    // ========================================================================

    /**
     * 玩家入座
     * @param {Object} playerData - 玩家数据
     * @param {string} playerData.userId - 玩家ID
     * @param {string} playerData.nickname - 昵称
     * @param {Object} playerData.matchSettings - 匹配设置（第一个玩家可设置房间规则）
     * @returns {Object} { success: boolean, seatIndex?: number, error?: string }
     */
    addPlayer(playerData) {
        // 检查是否已满
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: '房间已满' };
        }

        // 检查是否已在房间中
        if (this.players.find(p => p.userId === playerData.userId)) {
            return { success: false, error: '已在房间中' };
        }

        // 使用座位策略分配座位
        const existingSeats = this.players.map(p => p.seatIndex);
        const seatIndex = StateMappingRules.assignSeat(this.seatStrategy, existingSeats, this.maxPlayers);

        if (seatIndex === -1) {
            console.error(`[TableState] 无法为玩家 ${playerData.userId} 分配座位`, {
                已用座位: existingSeats,
                最大玩家: this.maxPlayers,
                座位策略: this.seatStrategy
            });
            return { success: false, error: '没有可用座位' };
        }

        // 创建带座位的玩家对象
        const playerWithSeat = {
            ...playerData,
            ready: false,
            joinedAt: Date.now(),
            seatIndex: seatIndex,
            isActive: true
        };

        this.players.push(playerWithSeat);

        // 根据玩家数量更新状态
        const newState = StateMappingRules.getStateAfterPlayerJoin(this.players.length, this.maxPlayers);
        if (newState) {
            this.transitionStatus(newState, { userId: playerData.userId, reason: 'player_join' });
        }

        // 第一个玩家可以设置房间规则
        if (this.players.length === 1) {
            this.firstPlayerJoinedAt = Date.now();
            if (playerData.matchSettings) {
                this.matchSettings = { ...this.matchSettings, ...playerData.matchSettings };
                console.log(`[TableState] 房间设置由第一个玩家设定:`, this.matchSettings);
            }
        }

        console.log(`[TableState] 玩家 ${playerData.userId} 入座成功 (座位: ${seatIndex})`);

        return { success: true, seatIndex };
    }

    /**
     * 玩家离座
     * @param {string} userId - 玩家ID
     * @returns {boolean} 是否成功移除
     */
    removePlayer(userId) {
        const index = this.players.findIndex(p => p.userId === userId);
        if (index === -1) return false;

        this.players.splice(index, 1);

        // 清除准备计时器
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }

        // 更新状态
        const newState = StateMappingRules.getStateAfterPlayerLeave(this.players.length, this.maxPlayers);
        if (newState) {
            this.transitionStatus(newState, { userId, reason: 'player_leave' });
        }

        // 如果房间变空，重置所有设置
        if (this.players.length === 0) {
            this.firstPlayerJoinedAt = null;
            this.matchSettings = { ...StateMappingRules.DEFAULT_SETTINGS };
            this.rematchRequests.clear();
            this.roundEnded = false;
            console.log(`[TableState] 房间已空，重置为默认设置`);
        }

        console.log(`[TableState] 玩家 ${userId} 已离座`);
        return true;
    }

    /**
     * 查找空座位
     * @returns {number|null} 座位索引，或null表示没有空座
     */
    findEmptySeat() {
        const occupiedSeats = new Set(this.players.map(p => p.seatIndex));
        for (let i = 0; i < this.maxPlayers; i++) {
            if (!occupiedSeats.has(i)) {
                return i;
            }
        }
        return null;
    }

    // ========================================================================
    // 观众管理
    // ========================================================================

    /**
     * 添加观众
     * @param {Object} spectatorData - 观众数据
     * @returns {Object} { success: boolean, error?: string }
     */
    addSpectator(spectatorData) {
        if (this.spectators.find(s => s.userId === spectatorData.userId)) {
            return { success: false, error: '已在观众列表中' };
        }
        this.spectators.push(spectatorData);
        return { success: true };
    }

    /**
     * 移除观众
     * @param {string} userId - 观众ID
     * @returns {boolean} 是否成功移除
     */
    removeSpectator(userId) {
        const index = this.spectators.findIndex(s => s.userId === userId);
        if (index === -1) return false;
        this.spectators.splice(index, 1);
        return true;
    }

    /**
     * 将观众提升为玩家（填补空座）
     * @param {Object} spectatorData - 观众数据
     * @returns {Object} { success: boolean, seatIndex?: number, error?: string }
     */
    promoteSpectatorToPlayer(spectatorData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: '座位已满' };
        }

        this.removeSpectator(spectatorData.userId);
        spectatorData.ready = false;
        spectatorData.isActive = true;
        return this.addPlayer(spectatorData);
    }

    // ========================================================================
    // 准备状态管理
    // ========================================================================

    /**
     * 设置玩家准备状态
     * @param {string} userId - 玩家ID
     * @param {boolean} ready - 是否准备
     * @returns {boolean|'all_ready'} true表示成功，'all_ready'表示所有人都准备好了
     */
    setPlayerReady(userId, ready = true) {
        console.log(`[TableState] 设置准备状态: userId=${userId}, ready=${ready}`);
        
        const player = this.players.find(p => p.userId === userId);
        if (!player) {
            console.log(`[TableState] 找不到玩家: ${userId}`);
            return false;
        }

        player.ready = ready;
        console.log(`[TableState] 玩家 ${player.nickname || userId} 的准备状态设为 ${ready}`);

        if (this.allPlayersReady()) {
            console.log(`[TableState] 所有玩家都已准备好！`);
            this.cancelReadyCheck();
            return 'all_ready';
        }
        
        return true;
    }

    /**
     * 检查是否所有玩家都准备好了
     * @returns {boolean} 是否都准备好了
     */
    allPlayersReady() {
        const activePlayers = this.players.filter(p => p.isActive !== false);
        
        // 检查最小人数
        if (activePlayers.length < this.minPlayers) {
            return false;
        }

        // 检查是否需要所有人准备
        if (this.gameConfig.requireAllReady === false) {
            const readyCount = activePlayers.filter(p => p.ready).length;
            return readyCount >= this.minPlayers;
        }

        return activePlayers.every(p => p.ready);
    }

    /**
     * 获取准备状态概览
     * @returns {Object} { ready, total, inactive, percentage, canStart }
     */
    getReadyStatus() {
        const activePlayers = this.players.filter(p => p.isActive !== false);
        const ready = activePlayers.filter(p => p.ready).length;
        const total = activePlayers.length;

        return {
            ready,
            total,
            inactive: this.players.length - total,
            percentage: total > 0 ? Math.round((ready / total) * 100) : 0,
            canStart: this.allPlayersReady()
        };
    }

    /**
     * 开始准备倒计时
     * @returns {Object} { started: boolean, timeout: number }
     */
    startReadyCheck() {
        this.transitionStatus(StateMappingRules.TABLE_STATUS.MATCHING, { reason: 'ready_check_start' });
        return {
            started: true,
            timeout: this.readyTimeout
        };
    }

    /**
     * 取消准备倒计时
     */
    cancelReadyCheck() {
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
        const newState = StateMappingRules.getStateAfterCancelReadyCheck(this.players.length, this.maxPlayers);
        this.transitionStatus(newState, { reason: 'ready_check_cancel' });
    }

    /**
     * 获取未准备的玩家列表
     * @returns {Array} 未准备的玩家列表
     */
    getUnreadyPlayers() {
        return StateMappingRules.getUnreadyPlayers(this.players);
    }

    /**
     * 重置所有玩家的准备状态
     */
    resetReadyStatus() {
        this.players.forEach(p => p.ready = false);
    }

    // ========================================================================
    // 状态管理
    // ========================================================================

    /**
     * 状态转换
     * @param {string} newStatus - 新状态
     * @param {Object} context - 转换上下文 { userId, reason }
     * @returns {boolean} 是否转换成功
     */
    transitionStatus(newStatus, context = {}) {
        const oldStatus = this.status;
        
        // 验证状态转换是否有效
        const validation = StateMappingRules.isValidTransition(oldStatus, newStatus);
        if (!validation.valid) {
            console.warn(`[TableState] 状态转换无效: ${validation.reason}`, {
                roomId: this.roomId,
                从: oldStatus,
                到: newStatus,
                上下文: context
            });
            return false;
        }

        // 获取转换详情
        const transitionDetails = StateMappingRules.getTransitionDetails(oldStatus, newStatus, {
            userId: context.userId,
            reason: context.reason,
            playerCount: this.players.length,
            maxPlayers: this.maxPlayers,
            timestamp: Date.now()
        });

        // 记录状态转换日志
        console.log(`[TableState] 状态转换: ${oldStatus} -> ${newStatus}`, {
            roomId: this.roomId,
            类型: transitionDetails.transitionType,
            玩家数: this.players.length,
            触发者: context.userId || 'system'
        });

        // 执行状态转换
        this.status = newStatus;
        
        return true;
    }

    /**
     * 检查是否是僵尸房间（长时间未使用）
     * @returns {boolean} 是否是僵尸房间
     */
    isZombieRoom() {
        return StateMappingRules.isZombieTable(this.firstPlayerJoinedAt, this.status);
    }

    // ========================================================================
    // 信息获取
    // ========================================================================

    /**
     * 获取进度文本（UI显示用）
     * @returns {string} 进度文本
     */
    getProgressText() {
        return StateMappingRules.getProgressText(
            this.players.length,
            this.minPlayers,
            this.maxPlayers,
            this.players.filter(p => p.ready && p.isActive !== false).length
        );
    }

    /**
     * 获取还差多少玩家
     * @returns {number} 差的玩家数
     */
    getMissingPlayers() {
        return StateMappingRules.getMissingPlayers(
            this.players.length,
            this.minPlayers,
            this.maxPlayers
        );
    }

    /**
     * 获取房间信息
     * @returns {Object} 房间信息
     */
    getRoomInfo() {
        return {
            roomId: this.roomId,
            status: this.status,
            isRoundEnded: this.roundEnded || false,
            players: this.players.length,
            maxPlayers: this.maxPlayers,
            minPlayers: this.minPlayers,
            spectators: this.spectators.length,
            baseBet: this.matchSettings.baseBet,
            matchSettings: this.matchSettings,
            playerList: this.players.map(p => ({
                userId: p.userId,
                nickname: p.nickname,
                avatar: p.avatar,
                title: p.title,
                titleColor: p.titleColor,
                winRate: p.winRate,
                disconnectRate: p.disconnectRate,
                ready: p.ready,
                seatIndex: p.seatIndex,
                isActive: p.isActive
            }))
        };
    }

    // ========================================================================
    // 清理
    // ========================================================================

    /**
     * 清理资源
     */
    cleanup() {
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
    }
}

module.exports = TableState;
