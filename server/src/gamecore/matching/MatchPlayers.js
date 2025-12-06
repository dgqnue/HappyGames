const DisconnectTracker = require('../DisconnectTracker');

/**
 * ============================================================================
 * PART 1: MatchingRules (匹配规则配置)
 * ============================================================================
 */

/**
 * 游戏匹配规则配置类
 * 定义了平台所有游戏的匹配规则、常量配置和校验逻辑
 */
class MatchingRules {
    static {
        console.log('[MatchingRules] 模块已加载 - Version 3.1 (完整版)');
    }

    /**
     * 默认匹配设置
     */
    static DEFAULT_SETTINGS = {
        baseBet: 1000,              // 游戏底豆默认值
        betRange: [500, 5000],      // 可接受的底豆范围默认值
        winRateRange: [0, 100],     // 对方胜率范围 (%)
        maxDisconnectRate: 100,     // 最大掉线率 (%)
        ratingRange: null           // 对方等级分范围 [min, max] (可选)
    };

    /**
     * 底豆配置范围
     */
    static BET_CONFIG = {
        min: 100,           // 最小底豆
        max: 100000,        // 最大底豆
        default: 1000,      // 默认底豆
        rangeMin: 500,      // 默认可接受范围最小值
        rangeMax: 5000      // 默认可接受范围最大值
    };

    /**
     * 游戏桌状态定义
     */
    static TABLE_STATUS = {
        IDLE: 'idle',           // 空闲状态 (无玩家入座)
        WAITING: 'waiting',     // 等待中 (有玩家但未满座)
        MATCHING: 'matching',   // 匹配中 (满座但未全部就绪/准备中)
        PLAYING: 'playing'      // 游戏中 (所有玩家已就绪，游戏进行中)
    };

    /**
     * 倒计时配置 (单位: 毫秒)
     */
    static COUNTDOWN_CONFIG = {
        readyTimeout: 30000,    // 准备倒计时: 30秒 (满座后所有玩家需在此时间内点击"开始")
        rematchTimeout: 10000,  // 再来一局倒计时: 10秒 (游戏结束后等待玩家确认)
        zombieTimeout: 300000   // 僵尸桌清理: 5分钟 (从第一个玩家入座起,5分钟内未开始游戏则清理)
    };

    /**
     * 检查玩家是否符合房间的匹配条件
     * @param {Object} playerStats - 玩家统计数据 (胜率、掉线率等)
     * @param {Object} playerSettings - 玩家设置的匹配偏好
     * @param {Object} roomSettings - 房间当前的匹配设置
     * @param {Boolean} isFirstPlayer - 是否是房间的第一个玩家
     * @returns {Object} { canJoin: Boolean, reason: String }
     */
    static checkMatchCriteria(playerStats, playerSettings, roomSettings, isFirstPlayer = false) {
        // 规则：第一个入座的玩家自动通过，并确立房间规则
        if (isFirstPlayer) {
            return { canJoin: true, reason: '第一个玩家,自动通过' };
        }

        const { baseBet, betRange, winRateRange, maxDisconnectRate, ratingRange } = roomSettings;

        // 1. 检查底豆匹配 (双向匹配)
        if (playerSettings) {
            // 规则：房间的底豆必须在玩家接受的范围内
            if (baseBet < playerSettings.betRange[0] || baseBet > playerSettings.betRange[1]) {
                return {
                    canJoin: false,
                    reason: `房间底豆 ${baseBet} 不在您接受的范围 [${playerSettings.betRange[0]}, ${playerSettings.betRange[1]}] 内`
                };
            }

            // 规则：玩家设定的底豆必须在房间接受的范围内 (用于自动匹配时的双向验证)
            if (playerSettings.baseBet < betRange[0] || playerSettings.baseBet > betRange[1]) {
                return {
                    canJoin: false,
                    reason: `您的底豆 ${playerSettings.baseBet} 不在房间接受的范围 [${betRange[0]}, ${betRange[1]}] 内`
                };
            }
        }

        // 2. 检查玩家胜率
        const winRate = playerStats.gamesPlayed > 0
            ? (playerStats.wins / playerStats.gamesPlayed) * 100
            : 0;

        if (winRate < winRateRange[0] || winRate > winRateRange[1]) {
            return {
                canJoin: false,
                reason: `您的胜率 ${winRate.toFixed(1)}% 不在房间要求的范围 [${winRateRange[0]}%, ${winRateRange[1]}%] 内`
            };
        }

        // 3. 检查玩家掉线率
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;

        if (disconnectRate > maxDisconnectRate) {
            return {
                canJoin: false,
                reason: `您的掉线率 ${disconnectRate.toFixed(1)}% 超过房间允许的最大值 ${maxDisconnectRate}%`
            };
        }

        // 4. 检查玩家等级分 (如果房间设置了等级分要求)
        if (ratingRange && ratingRange.length === 2) {
            const rating = playerStats.rating || 1200;
            const [minRating, maxRating] = ratingRange;

            if (rating < minRating || rating > maxRating) {
                return {
                    canJoin: false,
                    reason: `您的等级分 ${rating} 不在房间要求的范围 [${minRating}, ${maxRating}] 内`
                };
            }
        }

        return {
            canJoin: true,
            reason: `匹配成功: 胜率=${winRate.toFixed(1)}%, 掉线率=${disconnectRate.toFixed(1)}%`
        };
    }

    /**
     * 验证匹配设置的有效性
     */
    static validateSettings(settings) {
        const errors = [];

        // 检查底豆
        if (settings.baseBet < this.BET_CONFIG.min || settings.baseBet > this.BET_CONFIG.max) {
            errors.push(`底豆必须在 ${this.BET_CONFIG.min} - ${this.BET_CONFIG.max} 之间`);
        }

        // 检查底豆范围
        if (settings.betRange[0] < this.BET_CONFIG.min || settings.betRange[1] > this.BET_CONFIG.max) {
            errors.push(`底豆范围必须在 ${this.BET_CONFIG.min} - ${this.BET_CONFIG.max} 之间`);
        }

        if (settings.betRange[0] > settings.betRange[1]) {
            errors.push('底豆范围最小值不能大于最大值');
        }

        // 检查胜率范围
        if (settings.winRateRange[0] < 0 || settings.winRateRange[1] > 100) {
            errors.push('胜率范围必须在 0% - 100% 之间');
        }

        if (settings.winRateRange[0] > settings.winRateRange[1]) {
            errors.push('胜率范围最小值不能大于最大值');
        }

        // 检查掉线率
        if (settings.maxDisconnectRate < 0 || settings.maxDisconnectRate > 100) {
            errors.push('掉线率必须在 0% - 100% 之间');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取游戏桌状态的中文描述
     */
    static getStatusText(status) {
        const statusMap = {
            [this.TABLE_STATUS.IDLE]: '空闲',
            [this.TABLE_STATUS.WAITING]: '等待中',
            [this.TABLE_STATUS.MATCHING]: '匹配中',
            [this.TABLE_STATUS.PLAYING]: '游戏中'
        };

        return statusMap[status] || '未知状态';
    }

    /**
     * 判断游戏桌是否可以加入
     */
    static canJoinTable(status, currentPlayers, maxPlayers) {
        // 规则：只有空闲或等待中的桌子可以加入
        if (status !== this.TABLE_STATUS.IDLE && status !== this.TABLE_STATUS.WAITING) {
            return false;
        }

        // 规则：必须还有空位
        return currentPlayers < maxPlayers;
    }

    /**
     * 判断是否应该开始准备倒计时
     */
    static shouldStartReadyCheck(currentPlayers, maxPlayers, status) {
        // 规则：满座且状态为等待中时,应该开始准备倒计时
        return currentPlayers === maxPlayers && status === this.TABLE_STATUS.WAITING;
    }

    /**
     * 判断是否是僵尸桌 (需要清理)
     */
    static isZombieTable(firstPlayerJoinedAt, status) {
        // 规则：如果没有玩家或正在游戏中,不是僵尸桌
        if (!firstPlayerJoinedAt || status === this.TABLE_STATUS.PLAYING) {
            return false;
        }

        // 规则：从第一个玩家入座起，超过5分钟未开始游戏
        const elapsed = Date.now() - firstPlayerJoinedAt;
        return elapsed >= this.COUNTDOWN_CONFIG.zombieTimeout;
    }

    /**
     * 自动匹配的桌子分配策略
     */
    static findAvailableTableForAutoMatch(tables, tier) {
        // 规则：优先使用空闲状态的桌子
        const idleTable = tables.find(t =>
            t.status === this.TABLE_STATUS.IDLE &&
            t.tier === tier
        );

        if (idleTable) {
            return idleTable;
        }

        // 如果没有空闲桌子,返回 null (需要创建新桌子)
        return null;
    }

    /**
     * 计算添加玩家后应该转换到的状态
     */
    static getStateAfterPlayerJoin(currentPlayers, maxPlayers) {
        if (currentPlayers === 1) {
            return this.TABLE_STATUS.WAITING; // 第一个玩家加入,状态变为等待中
        }
        // 其他情况保持当前状态不变(由外部逻辑处理满座情况)
        return null;
    }

    /**
     * 计算移除玩家后应该转换到的状态
     */
    static getStateAfterPlayerLeave(remainingPlayers, maxPlayers) {
        if (remainingPlayers === 0) {
            return this.TABLE_STATUS.IDLE; // 无玩家,空闲
        } else if (remainingPlayers < maxPlayers) {
            return this.TABLE_STATUS.WAITING; // 不满座,等待中
        }
        return null; // 保持当前状态
    }

    /**
     * 检查是否所有玩家都已准备
     */
    static areAllPlayersReady(players, maxPlayers) {
        return players.length === maxPlayers && players.every(p => p.ready);
    }

    /**
     * 获取未准备的玩家列表
     */
    static getUnreadyPlayers(players) {
        return players.filter(p => !p.ready);
    }

    /**
     * 取消准备检查后应该转换到的状态
     */
    static getStateAfterCancelReadyCheck(playerCount) {
        if (playerCount === 0) {
            return this.TABLE_STATUS.IDLE;
        } else {
            return this.TABLE_STATUS.WAITING;
        }
    }
}

/**
 * ============================================================================
 * PART 2: MatchMaker (匹配系统核心)
 * ============================================================================
 */

/**
 * 匹配系统核心模块
 * 负责管理全服的"自动匹配"队列
 */
class MatchMaker {
    constructor() {
        this.queues = new Map();
        this.checkInterval = null;
        this.handlers = new Map();
        this.start();
    }

    start() {
        if (this.checkInterval) return;
        // 每3秒处理一次匹配队列
        this.checkInterval = setInterval(() => {
            this.processQueues();
        }, 3000);
        console.log('[MatchMaker] 匹配服务已启动');
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    registerHandler(gameType, handler) {
        this.handlers.set(gameType, handler);
    }

    joinQueue(gameType, player) {
        if (!this.queues.has(gameType)) {
            this.queues.set(gameType, []);
        }

        const queue = this.queues.get(gameType);

        if (queue.find(p => p.userId === player.userId)) {
            return { success: false, error: '已在匹配队列中' };
        }

        player.joinTime = Date.now();
        queue.push(player);

        console.log(`[MatchMaker] 玩家 ${player.userId} 加入 ${gameType} 匹配队列`);

        // 立即尝试匹配一次
        this.matchGame(gameType);

        return { success: true };
    }

    leaveQueue(gameType, userId) {
        const queue = this.queues.get(gameType);
        if (!queue) return false;

        const index = queue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            queue.splice(index, 1);
            console.log(`[MatchMaker] 玩家 ${userId} 离开 ${gameType} 匹配队列`);
            return true;
        }
        return false;
    }

    processQueues() {
        for (const gameType of this.queues.keys()) {
            this.matchGame(gameType);
        }
    }

    matchGame(gameType) {
        const queue = this.queues.get(gameType);
        if (!queue || queue.length < 2) return;

        // 按等待时间排序，先入先出
        queue.sort((a, b) => a.joinTime - b.joinTime);

        const matchedIndices = new Set();
        const handler = this.handlers.get(gameType);

        if (!handler) {
            console.warn(`[MatchMaker] 未找到 ${gameType} 的匹配处理器`);
            return;
        }

        // 简单的两两匹配逻辑
        for (let i = 0; i < queue.length; i++) {
            if (matchedIndices.has(i)) continue;

            for (let j = i + 1; j < queue.length; j++) {
                if (matchedIndices.has(j)) continue;

                const p1 = queue[i];
                const p2 = queue[j];

                if (this.isMatchCompatible(p1, p2)) {
                    matchedIndices.add(i);
                    matchedIndices.add(j);

                    console.log(`[MatchMaker] 匹配成功: ${p1.userId} vs ${p2.userId}`);
                    handler([p1, p2]);
                    break;
                }
            }
        }

        // 移除已匹配的玩家
        if (matchedIndices.size > 0) {
            const indices = Array.from(matchedIndices).sort((a, b) => b - a);
            for (const idx of indices) {
                queue.splice(idx, 1);
            }
        }
    }

    isMatchCompatible(p1, p2) {
        if (p1.userId === p2.userId) return false;

        // 简单的分差匹配逻辑
        const scoreDiff = Math.abs(p1.stats.rating - p2.stats.rating);
        if (scoreDiff > 300) {
            // 如果分差过大，检查等待时间
            const waitTime = Math.max(Date.now() - p1.joinTime, Date.now() - p2.joinTime);
            // 等待超过30秒则放宽匹配条件
            if (waitTime < 30000) {
                return false;
            }
        }
        return true;
    }

    getQueueStatus(gameType) {
        const queue = this.queues.get(gameType) || [];
        return {
            count: queue.length,
            avgWaitTime: 0 // TODO: 实现平均等待时间计算
        };
    }
}

/**
 * ============================================================================
 * PART 3: MatchRoomState (房间状态管理)
 * ============================================================================
 */

/**
 * 游戏匹配系统 - 房间状态管理
 * 管理房间的匹配条件、玩家准备状态、倒计时等
 */
class MatchRoomState {
    constructor(roomId, maxPlayers = 2) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;
        this.players = [];
        this.spectators = [];
        this.status = MatchingRules.TABLE_STATUS.IDLE;

        console.log(`[MatchRoomState] Room ${roomId} initialized with status: ${this.status}`);

        this.matchSettings = { ...MatchingRules.DEFAULT_SETTINGS };

        // 倒计时定时器
        this.readyTimer = null;
        this.readyTimeout = MatchingRules.COUNTDOWN_CONFIG.readyTimeout;

        this.zombieTimer = null;
        this.zombieTimeout = MatchingRules.COUNTDOWN_CONFIG.zombieTimeout;

        this.rematchTimer = null;
        this.rematchTimeout = MatchingRules.COUNTDOWN_CONFIG.rematchTimeout;

        // 记录时间点
        this.createdAt = Date.now();
        this.firstPlayerJoinedAt = null;

        // 再来一局请求集合
        this.rematchRequests = new Set();
    }

    canPlayerJoin(playerStats, playerSettings = null) {
        const isFirstPlayer = this.players.length === 0;
        const result = MatchingRules.checkMatchCriteria(
            playerStats,
            playerSettings,
            this.matchSettings,
            isFirstPlayer
        );
        console.log(`[MatchRoom] ${result.reason}`);
        return result.canJoin;
    }

    addPlayer(playerData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: '房间已满' };
        }

        if (this.players.find(p => p.userId === playerData.userId)) {
            return { success: false, error: '已在房间中' };
        }

        // 分配座位索引
        let seatIndex;
        if (this.maxPlayers === 2) {
            // 两人桌：如果已经有一个玩家，检查他的座位，分配另一个
            if (this.players.length === 1) {
                const firstPlayerSeat = this.players[0].seatIndex;
                seatIndex = firstPlayerSeat === 0 ? 1 : 0;
            } else {
                seatIndex = 0;
            }
        } else {
            // 多人桌：分配最小的未使用索引
            const usedSeatIndices = this.players.map(p => p.seatIndex);
            seatIndex = 0;
            while (usedSeatIndices.includes(seatIndex) && seatIndex < this.maxPlayers) {
                seatIndex++;
            }
            
            if (seatIndex >= this.maxPlayers) {
                console.error(`[MatchRoom] No available seat index for player ${playerData.userId}, used indices:`, usedSeatIndices);
                return { success: false, error: '没有可用座位' };
            }
        }
        
        const playerWithSeat = {
            ...playerData,
            ready: false,
            joinedAt: Date.now(),
            seatIndex: seatIndex
        };

        this.players.push(playerWithSeat);

        const newState = MatchingRules.getStateAfterPlayerJoin(this.players.length, this.maxPlayers);
        if (newState) {
            this.status = newState;
        }

        if (this.players.length === 1) {
            this.firstPlayerJoinedAt = Date.now();
            if (playerData.matchSettings) {
                this.matchSettings = { ...this.matchSettings, ...playerData.matchSettings };
                console.log(`[MatchRoom] Room match settings set by first player:`, this.matchSettings);
            }
        }

        console.log(`[MatchRoom] Player ${playerData.userId} added with seatIndex ${seatIndex}, current players:`, 
            this.players.map(p => ({ userId: p.userId, seatIndex: p.seatIndex })));
        
        return { success: true, seatIndex };
    }

    removePlayer(userId) {
        const index = this.players.findIndex(p => p.userId === userId);
        if (index === -1) return false;

        this.players.splice(index, 1);
        this.rematchRequests.delete(userId);

        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }

        const newState = MatchingRules.getStateAfterPlayerLeave(this.players.length, this.maxPlayers);
        if (newState) {
            this.status = newState;
        }

        if (this.players.length === 0) {
            if (this.zombieTimer) {
                clearTimeout(this.zombieTimer);
                this.zombieTimer = null;
            }
            this.firstPlayerJoinedAt = null;
            this.matchSettings = { ...MatchingRules.DEFAULT_SETTINGS };
            this.rematchRequests.clear();
            console.log(`[MatchRoom] Room emptied, match settings reset to default`);
        }

        return true;
    }

    addSpectator(spectatorData) {
        if (this.spectators.find(s => s.userId === spectatorData.userId)) {
            return { success: false, error: '已在观众席' };
        }
        this.spectators.push(spectatorData);
        return { success: true };
    }

    removeSpectator(userId) {
        const index = this.spectators.findIndex(s => s.userId === userId);
        if (index === -1) return false;
        this.spectators.splice(index, 1);
        return true;
    }

    setPlayerReady(userId, ready = true) {
        const player = this.players.find(p => p.userId === userId);
        if (!player) return false;

        player.ready = ready;

        if (this.allPlayersReady()) {
            this.cancelReadyCheck();
            return 'all_ready';
        }
        return true;
    }

    allPlayersReady() {
        return MatchingRules.areAllPlayersReady(this.players, this.maxPlayers);
    }

    startReadyCheck() {
        if (this.status === MatchingRules.TABLE_STATUS.MATCHING) return;

        this.status = MatchingRules.TABLE_STATUS.MATCHING;
        return {
            started: true,
            timeout: this.readyTimeout
        };
    }

    cancelReadyCheck() {
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
        const newState = MatchingRules.getStateAfterCancelReadyCheck(this.players.length);
        this.status = newState;
    }

    getUnreadyPlayers() {
        return MatchingRules.getUnreadyPlayers(this.players);
    }

    resetReadyStatus() {
        this.players.forEach(p => p.ready = false);
    }

    isZombieRoom() {
        return MatchingRules.isZombieTable(this.firstPlayerJoinedAt, this.status);
    }

    requestRematch(userId) {
        if (this.players.find(p => p.userId === userId)) {
            this.rematchRequests.add(userId);
            return this.rematchRequests.size === this.players.length; // 如果所有人都同意，返回 true
        }
        return false;
    }

    getRoomInfo() {
        return {
            roomId: this.roomId,
            status: this.status,
            players: this.players.length,
            maxPlayers: this.maxPlayers,
            spectators: this.spectators.length,
            baseBet: this.matchSettings.baseBet,
            matchSettings: this.matchSettings,
            playerList: this.players.map(p => ({
                nickname: p.nickname,
                title: p.title,
                winRate: p.winRate,
                disconnectRate: p.disconnectRate,
                ready: p.ready,
                wantsRematch: this.rematchRequests.has(p.userId),
                seatIndex: p.seatIndex
            }))
        };
    }

    cleanup() {
        if (this.readyTimer) clearTimeout(this.readyTimer);
        if (this.zombieTimer) clearTimeout(this.zombieTimer);
        if (this.rematchTimer) clearTimeout(this.rematchTimer);
    }
}

/**
 * ============================================================================
 * PART 4: MatchPlayers (玩家匹配管理器)
 * ============================================================================
 */

/**
 * 玩家匹配管理器 (MatchPlayers)
 * 
 * 负责处理游戏桌的玩家匹配、准备、倒计时、再来一局等逻辑。
 * 整合了 MatchRoomState 和 MatchingRules。
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

        // 状态动作队列：确保玩家动作按顺序处理
        this.actionQueue = [];
        this.isProcessingQueue = false;

        // 倒计时锁定状态
        this.isLocked = false;
        this.countdownTimer = null;

        // 启动僵尸桌检查
        this.startZombieCheck();
    }

    /**
     * 将动作加入队列并异步处理
     * @param {Function} actionFn - 返回Promise的动作函数
     * @returns {Promise} 动作执行结果的Promise
     */
    async enqueueAction(actionFn) {
        return new Promise((resolve, reject) => {
            // 包装动作，确保完成后继续处理队列
            const wrappedAction = async () => {
                try {
                    const result = await actionFn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    // 无论成功失败，都继续处理下一个动作
                    this.processQueue();
                }
            };

            // 将包装后的动作加入队列
            this.actionQueue.push(wrappedAction);

            // 如果没有正在处理，启动队列处理
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * 处理队列中的下一个动作
     */
    processQueue() {
        if (this.isProcessingQueue || this.actionQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        const action = this.actionQueue.shift();

        // 执行动作，完成后继续处理队列
        action().finally(() => {
            this.isProcessingQueue = false;
            
            // 延迟一小段时间，确保状态更新已经传播
            setTimeout(() => {
                this.processQueue();
            }, 10);
        });
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
     * 玩家尝试入座 - 内部实现
     */
    async _playerJoin(socket, matchSettings = null) {
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
            user: {
                _id: socket.user._id,
                username: socket.user.username,
                nickname: socket.user.nickname,
                piUsername: socket.user.piUsername,
                avatar: socket.user.avatar
            },
            nickname: socket.user.nickname || socket.user.username,
            title: stats?.title || '初出茅庐',
            titleColor: stats?.titleColor || '#666',
            winRate: Math.round(winRate),
            disconnectRate: Math.round(disconnectRate),
            matchSettings: matchSettings,
            ready: false
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
     * 玩家尝试入座 - 队列包装
     */
    async playerJoin(socket, matchSettings = null) {
        return this.enqueueAction(() => this._playerJoin(socket, matchSettings));
    }

    /**
     * 玩家离座 - 内部实现
     */
    _playerLeave(socket) {
        const userId = socket.user._id.toString();
        console.log(`[MatchPlayers] playerLeave called for userId: ${userId}, roomId: ${this.roomId}`);

        // 记录之前的状态
        const wasMatching = this.matchState.status === MatchingRules.TABLE_STATUS.MATCHING;
        console.log(`[MatchPlayers] Before leave - status: ${this.matchState.status}, wasMatching: ${wasMatching}`);

        // 从玩家列表移除
        const wasPlayer = this.matchState.removePlayer(userId);

        // 从观众列表移除
        const wasSpectator = this.matchState.removeSpectator(userId);

        console.log(`[MatchPlayers] After removePlayer - wasPlayer: ${wasPlayer}, wasSpectator: ${wasSpectator}`);

        if (wasPlayer || wasSpectator) {
            socket.leave(this.roomId);
            console.log(`[MatchPlayers] Socket left room, broadcasting room state. Current players: ${this.matchState.players.length}, status: ${this.matchState.status}`);
            this.table.broadcastRoomState();

            // 如果之前是匹配中，现在取消了，通知客户端取消倒计时
            if (wasMatching && this.matchState.status !== MatchingRules.TABLE_STATUS.MATCHING) {
                console.log(`[MatchPlayers] Broadcasting ready_check_cancelled because matching was interrupted`);
                this.table.broadcast('ready_check_cancelled', {
                    reason: '玩家离开，匹配中断',
                    remainingPlayers: this.matchState.players.length
                });
            }

            // 如果正在游戏倒计时，取消它
            if (this.countdownTimer) {
                console.log(`[MatchPlayers] Cancelling game countdown because player left`);
                this.cancelGameCountdown();
            }
        } else {
            console.log(`[MatchPlayers] Player ${userId} was not in the room as player or spectator`);
        }

        return wasPlayer || wasSpectator;
    }

    /**
     * 玩家离座 - 队列包装
     */
    async playerLeave(socket) {
        return this.enqueueAction(() => this._playerLeave(socket));
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
     * 玩家准备 - 内部实现
     */
    _playerReady(socket) {
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
            socket.emit('error', { message: '游戏即将开始，无法改变状态' });
            return;
        }

        const userId = socket.user._id.toString();
        this.matchState.setPlayerReady(userId, false);

        // 如果桌子满座且处于匹配中（准备倒计时），则保持倒计时，不取消
        const isFullAndMatching = this.matchState.players.length === this.maxPlayers &&
                                  this.matchState.status === MatchingRules.TABLE_STATUS.MATCHING;

        // 取消游戏开始倒计时（如果存在）
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
            // 桌子满座且处于匹配中，检查是否需要重新启动30秒倒计时
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

    /**
     * 开始准备检查（30秒倒计时）
     */
    startReadyCheck() {
        // 清除之前的定时器（如果存在）
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }

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

        // 取消30秒准备倒计时，因为所有玩家已准备，即将开始游戏
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }

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
     * 游戏结束处理
     * @param {Object} result - 游戏结果
     */
    onGameEnd(result) {
        console.log(`[MatchPlayers] Game ended in room ${this.roomId}`);

        // 重置准备状态
        this.matchState.resetReadyStatus();

        // 状态变为匹配中 (等待再来一局)
        this.matchState.status = MatchingRules.TABLE_STATUS.MATCHING;

        // 清空之前的再来一局请求
        this.matchState.rematchRequests.clear();

        // 广播游戏结束和开始再来一局倒计时
        this.table.broadcast('game_ended', {
            result,
            rematchTimeout: this.matchState.rematchTimeout
        });

        this.startRematchCountdown();
    }

    /**
     * 开始再来一局倒计时
     */
    startRematchCountdown() {
        if (this.matchState.rematchTimer) clearTimeout(this.matchState.rematchTimer);

        console.log(`[MatchPlayers] Starting rematch countdown for room ${this.roomId}`);

        this.matchState.rematchTimer = setTimeout(() => {
            this.onRematchTimeout();
        }, this.matchState.rematchTimeout);
    }

    /**
     * 玩家请求再来一局
     */
    playerRequestRematch(socket) {
        const userId = socket.user._id.toString();
        const allAgreed = this.matchState.requestRematch(userId);

        this.table.broadcast('rematch_update', {
            userId,
            wantsRematch: true,
            agreedCount: this.matchState.rematchRequests.size,
            totalPlayers: this.matchState.players.length
        });

        if (allAgreed) {
            // 所有人都同意，立即开始新游戏
            if (this.matchState.rematchTimer) {
                clearTimeout(this.matchState.rematchTimer);
                this.matchState.rematchTimer = null;
            }
            this.startGame();
        }
    }

    /**
     * 再来一局倒计时结束
     */
    onRematchTimeout() {
        console.log(`[MatchPlayers] Rematch timeout for room ${this.roomId}`);

        const players = [...this.matchState.players];
        const agreedPlayers = [];
        const kickedPlayers = [];

        players.forEach(p => {
            if (this.matchState.rematchRequests.has(p.userId)) {
                agreedPlayers.push(p);
            } else {
                kickedPlayers.push(p);
            }
        });

        // 踢出未同意的玩家
        kickedPlayers.forEach(p => {
            const socket = this.io.sockets.sockets.get(p.socketId);
            if (socket) {
                socket.emit('kicked', {
                    reason: '未确认再来一局',
                    code: 'REMATCH_TIMEOUT'
                });
                this.playerLeave(socket);
            } else {
                this.matchState.removePlayer(p.userId);
            }
        });

        // 如果还有玩家，状态变为等待中，等待新人加入
        if (this.matchState.players.length > 0) {
            this.matchState.status = MatchingRules.TABLE_STATUS.WAITING;
            this.matchState.rematchRequests.clear();
            this.table.broadcastRoomState();

            // 重新启动僵尸桌检查
            this.startZombieCheck();
        } else {
            // 房间空了，重置
            this.reset();
        }
    }

    /**
     * 游戏结束重置
     */
    reset() {
        this.matchState.resetReadyStatus();
        this.matchState.status = MatchingRules.TABLE_STATUS.IDLE;
        this.matchState.rematchRequests.clear();
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
                // 强制清理所有玩家
                [...this.matchState.players].forEach(p => {
                    const socket = this.io.sockets.sockets.get(p.socketId);
                    if (socket) {
                        socket.emit('kicked', {
                            reason: '长时间未开始游戏，房间已关闭',
                            code: 'ZOMBIE_ROOM'
                        });
                        this.playerLeave(socket);
                    }
                });
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

// 挂载辅助类到 MatchPlayers
MatchPlayers.MatchingRules = MatchingRules;
MatchPlayers.MatchMaker = MatchMaker;

module.exports = MatchPlayers;
