/**
 * 游戏匹配规则配置
 * 
 * 本文件定义了平台所有游戏的匹配规则和逻辑
 * 适用于从游戏桌加入和自动匹配两种方式
 */

class MatchingRules {
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
        MATCHING: 'matching',   // 匹配中 (满座但未全部就绪)
        PLAYING: 'playing'      // 游戏中
    };

    /**
     * 倒计时配置
     */
    static COUNTDOWN_CONFIG = {
        readyTimeout: 30000,    // 准备倒计时: 30秒 (满座后所有玩家需在此时间内点击"开始")
        zombieTimeout: 300000   // 僵尸桌清理: 5分钟 (从第一个玩家入座起,5分钟内未开始游戏则清理)
    };

    /**
     * 检查玩家是否符合房间的匹配条件
     * 
     * @param {Object} playerStats - 玩家统计数据
     * @param {Object} playerSettings - 玩家自己的匹配设置 (可选)
     * @param {Object} roomSettings - 房间的匹配设置 (由第一个入座玩家设定)
     * @param {Boolean} isFirstPlayer - 是否是第一个玩家
     * @returns {Object} { canJoin: boolean, reason: string }
     */
    static checkMatchCriteria(playerStats, playerSettings, roomSettings, isFirstPlayer = false) {
        // 第一个玩家直接允许
        if (isFirstPlayer) {
            return { canJoin: true, reason: '第一个玩家,自动通过' };
        }

        const { baseBet, betRange, winRateRange, maxDisconnectRate, ratingRange } = roomSettings;

        // 1. 检查底豆匹配 (双向匹配)
        if (playerSettings) {
            // 房间的底豆必须在玩家接受的范围内
            if (baseBet < playerSettings.betRange[0] || baseBet > playerSettings.betRange[1]) {
                return {
                    canJoin: false,
                    reason: `房间底豆 ${baseBet} 不在您接受的范围 [${playerSettings.betRange[0]}, ${playerSettings.betRange[1]}] 内`
                };
            }

            // 玩家设定的底豆必须在房间接受的范围内
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
     * 
     * @param {Object} settings - 匹配设置
     * @returns {Object} { valid: boolean, errors: string[] }
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

        // 检查等级分范围 (如果设置了)
        if (settings.ratingRange && settings.ratingRange.length === 2) {
            if (settings.ratingRange[0] > settings.ratingRange[1]) {
                errors.push('等级分范围最小值不能大于最大值');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 获取游戏桌状态的中文描述
     * 
     * @param {String} status - 状态值
     * @returns {String} 中文描述
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
     * 
     * @param {String} status - 游戏桌状态
     * @param {Number} currentPlayers - 当前玩家数
     * @param {Number} maxPlayers - 最大玩家数
     * @returns {Boolean}
     */
    static canJoinTable(status, currentPlayers, maxPlayers) {
        // 只有空闲或等待中的桌子可以加入
        if (status !== this.TABLE_STATUS.IDLE && status !== this.TABLE_STATUS.WAITING) {
            return false;
        }

        // 必须还有空位
        return currentPlayers < maxPlayers;
    }

    /**
     * 判断是否应该开始准备倒计时
     * 
     * @param {Number} currentPlayers - 当前玩家数
     * @param {Number} maxPlayers - 最大玩家数
     * @param {String} status - 当前状态
     * @returns {Boolean}
     */
    static shouldStartReadyCheck(currentPlayers, maxPlayers, status) {
        // 满座且状态为等待中时,应该开始准备倒计时
        return currentPlayers === maxPlayers && status === this.TABLE_STATUS.WAITING;
    }

    /**
     * 判断是否是僵尸桌 (需要清理)
     * 
     * @param {Number} firstPlayerJoinedAt - 第一个玩家加入的时间戳
     * @param {String} status - 当前状态
     * @returns {Boolean}
     */
    static isZombieTable(firstPlayerJoinedAt, status) {
        // 如果没有玩家或正在游戏中,不是僵尸桌
        if (!firstPlayerJoinedAt || status === this.TABLE_STATUS.PLAYING) {
            return false;
        }

        const elapsed = Date.now() - firstPlayerJoinedAt;
        return elapsed >= this.COUNTDOWN_CONFIG.zombieTimeout;
    }

    /**
     * 自动匹配的桌子分配策略
     * 
     * @param {Array} tables - 可用的游戏桌列表
     * @param {String} tier - 游戏室等级
     * @returns {Object|null} 返回可用的桌子或 null
     */
    static findAvailableTableForAutoMatch(tables, tier) {
        // 优先使用空闲状态的桌子
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
     * 获取桌子编号 (从 tableId 中提取)
     * 
     * @param {String} tableId - 桌子ID (格式: tier_number)
     * @returns {Number} 桌子编号
     */
    static getTableNumber(tableId) {
        const parts = tableId.split('_');
        return parseInt(parts[parts.length - 1]) || 0;
    }

    /**
     * 计算添加玩家后应该转换到的状态
     * 
     * @param {Number} currentPlayers - 当前玩家数
     * @param {Number} maxPlayers - 最大玩家数
     * @returns {String} 新状态
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
     * 
     * @param {Number} remainingPlayers - 剩余玩家数
     * @param {Number} maxPlayers - 最大玩家数
     * @returns {String} 新状态
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
     * 
     * @param {Array} players - 玩家列表
     * @param {Number} maxPlayers - 最大玩家数
     * @returns {Boolean}
     */
    static areAllPlayersReady(players, maxPlayers) {
        return players.length === maxPlayers && players.every(p => p.ready);
    }

    /**
     * 获取未准备的玩家列表
     * 
     * @param {Array} players - 玩家列表
     * @returns {Array} 未准备的玩家
     */
    static getUnreadyPlayers(players) {
        return players.filter(p => !p.ready);
    }

    /**
     * 取消准备检查后应该转换到的状态
     * 
     * @param {Number} playerCount - 当前玩家数
     * @returns {String} 新状态
     */
    static getStateAfterCancelReadyCheck(playerCount) {
        if (playerCount === 0) {
            return this.TABLE_STATUS.IDLE;
        } else {
            return this.TABLE_STATUS.WAITING;
        }
    }

    /**
     * 检查玩家等级分是否符合游戏室准入要求
     * 
     * @param {Number} playerRating - 玩家等级分
     * @param {Number} minRating - 最小等级分要求
     * @param {Number} maxRating - 最大等级分要求
     * @returns {Boolean}
     */
    static canAccessTier(playerRating, minRating, maxRating) {
        return playerRating >= minRating && playerRating <= maxRating;
    }

    /**
     * 检查游戏桌是否可用于加入
     * 
     * @param {Object} table - 游戏桌对象
     * @returns {Boolean}
     */
    static isTableAvailable(table) {
        return table.status === this.TABLE_STATUS.IDLE &&
            table.players.length < table.maxPlayers;
    }
}

/**
 * 匹配系统核心模块 (MatchMaker)
 * 
 * 职责描述：
 * 负责管理全服的"自动匹配"队列。当玩家点击"自动匹配"时，会被加入到此队列中。
 * 系统会定期轮询队列，根据预设的匹配策略（如等级分接近、等待时间优先等）
 * 将队列中的玩家两两配对，并触发匹配成功的回调。
 * 
 * 主要功能：
 * 1. 维护不同游戏类型(gameType)的匹配队列
 * 2. 执行撮合算法，查找合适的对手
 * 3. 处理匹配超时和放宽匹配限制的逻辑
 * 4. 触发匹配成功事件，通知上层创建游戏房间
 */
class MatchMaker {
    constructor() {
        // 匹配队列容器
        // Key: 游戏类型 (gameType, 如 'chinesechess')
        // Value: 玩家请求数组 (Array<PlayerRequest>)
        this.queues = new Map();

        // 匹配轮询定时器
        // 用于定期触发 processQueues 方法
        this.checkInterval = null;

        // 匹配成功回调处理器
        // Key: 游戏类型
        // Value: 回调函数 (players) => void，用于通知 GameManager 创建房间
        this.handlers = new Map();

        this.start();
    }

    /**
     * 启动匹配服务
     */
    start() {
        if (this.checkInterval) return;

        // 启动定时器，每3秒执行一次匹配撮合
        // 这个频率可以根据服务器负载和实时性要求进行调整
        this.checkInterval = setInterval(() => {
            this.processQueues();
        }, 3000);

        console.log('[MatchMaker] 匹配服务已启动');
    }

    /**
     * 停止匹配服务
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * 注册匹配成功处理器
     * @param {String} gameType - 游戏类型
     * @param {Function} handler - 回调函数 (players) => void
     */
    registerHandler(gameType, handler) {
        this.handlers.set(gameType, handler);
    }

    /**
     * 玩家加入匹配队列
     * 
     * @param {String} gameType - 游戏类型 (如 'chinesechess')
     * @param {Object} player - 玩家请求对象，包含 { userId, socket, settings, stats, ... }
     * @returns {Object} result - { success: boolean, error: string }
     */
    joinQueue(gameType, player) {
        if (!this.queues.has(gameType)) {
            this.queues.set(gameType, []);
        }

        const queue = this.queues.get(gameType);

        // 检查是否已在队列
        if (queue.find(p => p.userId === player.userId)) {
            return { success: false, error: '已在匹配队列中' };
        }

        // 记录加入时间，用于计算等待时间和优先级
        // 等待时间越长的玩家，在队列排序中越靠前（先入先出）
        player.joinTime = Date.now();
        queue.push(player);

        console.log(`[MatchMaker] 玩家 ${player.userId} 加入 ${gameType} 匹配队列`);

        // 玩家加入后，立即尝试一次匹配，减少用户等待时间
        // 如果能马上匹配到，就不需要等下一次定时轮询
        this.matchGame(gameType);

        return { success: true };
    }

    /**
     * 玩家离开匹配队列
     * @param {String} gameType - 游戏类型
     * @param {String} userId - 玩家ID
     */
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

    /**
     * 处理所有队列
     */
    processQueues() {
        // 遍历所有游戏类型的队列，分别执行匹配逻辑
        for (const gameType of this.queues.keys()) {
            this.matchGame(gameType);
        }
    }

    /**
     * 执行特定游戏的匹配逻辑
     * @param {String} gameType 
     */
    matchGame(gameType) {
        const queue = this.queues.get(gameType);
        if (!queue || queue.length < 2) return;

        // 1. 队列排序：优先处理等待时间最长的玩家 (FIFO 策略)
        // 这样可以保证公平性，防止有人一直匹配不到
        queue.sort((a, b) => a.joinTime - b.joinTime);

        const matchedIndices = new Set();
        const handler = this.handlers.get(gameType);

        if (!handler) {
            console.warn(`[MatchMaker] 未找到 ${gameType} 的匹配处理器`);
            return;
        }

        // 2. 双重循环进行两两匹配
        // 外层循环遍历每一个待匹配玩家
        // 内层循环寻找合适的对手
        // TODO: 未来可优化为更高效的匹配算法，或引入"桶"匹配机制
        for (let i = 0; i < queue.length; i++) {
            if (matchedIndices.has(i)) continue;

            for (let j = i + 1; j < queue.length; j++) {
                if (matchedIndices.has(j)) continue;

                const p1 = queue[i];
                const p2 = queue[j];

                // 检查两个玩家是否满足匹配条件 (如等级分差距、网络状况等)
                if (this.isMatchCompatible(p1, p2)) {
                    // 匹配成功
                    matchedIndices.add(i);
                    matchedIndices.add(j);

                    console.log(`[MatchMaker] 匹配成功: ${p1.userId} vs ${p2.userId}`);

                    // 调用注册的回调函数，通常是 GameManager.handleMatchFound
                    // 这将触发创建房间、将玩家加入房间等后续流程
                    handler([p1, p2]);
                    break;
                }
            }
        }

        // 移除已匹配的玩家
        if (matchedIndices.size > 0) {
            // 从后往前删除，确保索引不会因为删除操作而失效
            const indices = Array.from(matchedIndices).sort((a, b) => b - a);
            for (const idx of indices) {
                queue.splice(idx, 1);
            }
        }
    }

    /**
     * 检查两个玩家是否兼容 (匹配核心策略)
     * 
     * @param {Object} p1 - 玩家1请求对象
     * @param {Object} p2 - 玩家2请求对象
     * @returns {Boolean} 是否可以匹配
     */
    isMatchCompatible(p1, p2) {
        // 1. 不能是同一个人
        if (p1.userId === p2.userId) return false;

        // 2. 检查等级分 (Rating/ELO) 差距
        // 默认策略：只匹配实力相近的对手
        // 初始允许差距：300分
        const scoreDiff = Math.abs(p1.stats.rating - p2.stats.rating);
        if (scoreDiff > 300) {
            // 动态放宽策略：
            // 如果任意一方等待时间超过 30秒，则忽略分数限制，优先保证匹配成功
            const waitTime = Math.max(Date.now() - p1.joinTime, Date.now() - p2.joinTime);
            if (waitTime < 30000) {
                return false; // 差距过大且等待时间不足，匹配失败
            }
        }

        // 3. 检查下注范围 (预留)
        // 如果未来需要支持"底豆范围"匹配，在此处添加逻辑
        // 例如：if (p1.settings.minBet > p2.settings.maxBet) return false;

        return true;
    }

    /**
     * 获取队列状态
     */
    getQueueStatus(gameType) {
        const queue = this.queues.get(gameType) || [];
        return {
            count: queue.length,
            avgWaitTime: 0 // TODO: 计算平均等待时间
        };
    }
}

// 将 MatchMaker 挂载到 MatchingRules 上
MatchingRules.MatchMaker = MatchMaker;

module.exports = MatchingRules;
