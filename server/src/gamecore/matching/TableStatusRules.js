/**
 * ============================================================================
 * TableStatusRules - 牌桌状态规则
 * ============================================================================
 * 
 * 定义平台所有游戏的状态映射、常量配置和校验逻辑。
 * 这是一个纯静态工具类，不需要实例化。
 * 
 * 主要功能：
 * 1. 定义牌桌状态常量（空闲、等待、匹配中、游戏中）
 * 2. 匹配条件检查（底豆、胜率、断线率、等级分）
 * 3. 状态转换规则验证
 * 4. 座位分配策略
 * 5. UI/状态映射标准
 * 
 * 状态流转图：
 * ┌──────────────────────────────────────────────────────────────────┐
 * │                                                                  │
 * │   IDLE ──(玩家入座)──> WAITING ──(满座)──> MATCHING              │
 * │     ^                    │                    │                  │
 * │     │                    │                    │                  │
 * │     └───(全部离座)───────┴────(有人离座)──────┤                  │
 * │                                               │                  │
 * │                                        (全部准备)                 │
 * │                                               │                  │
 * │                                               v                  │
 * │         <────────(游戏结束)────────────── PLAYING                 │
 * │                                               │                  │
 * │                                               └──(新回合)──┐     │
 * │                                                           │     │
 * │                                               ┌───────────┘     │
 * │                                               v                  │
 * │                                            PLAYING               │
 * └──────────────────────────────────────────────────────────────────┘
 * 
 * 文件位置: server/src/gamecore/matching/TableStatusRules.js
 */

class TableStatusRules {
    static {
        console.log('[TableStatusRules] 模块已加载 - Version 4.0 (重构版)');
    }

    // ========================================================================
    // 默认配置
    // ========================================================================

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

    // ========================================================================
    // 状态定义
    // ========================================================================

    /**
     * 游戏桌状态定义
     * 
     * IDLE     - 空闲状态（无玩家入座）
     * WAITING  - 等待中（有玩家但未满座）
     * MATCHING - 匹配中（满座但未全部就绪/准备中）
     * PLAYING  - 游戏中（所有玩家已就绪，游戏进行中）
     */
    static TABLE_STATUS = {
        IDLE: 'idle',
        WAITING: 'waiting',
        MATCHING: 'matching',
        PLAYING: 'playing'
    };

    /**
     * 倒计时配置（单位: 毫秒）
     */
    static COUNTDOWN_CONFIG = {
        readyTimeout: 30000,    // 准备倒计时: 30秒
        zombieTimeout: 300000   // 僵尸桌超时: 5分钟
    };

    // ========================================================================
    // UI/状态映射标准
    // ========================================================================
    /**
     * UI/状态映射标准说明：
     * 
     * 1. 玩家未入座
     *    - 游戏桌状态: IDLE 或 WAITING
     *    - 玩家状态: 不在 players 列表中
     *    - 按钮显示: "入座"
     * 
     * 2. 玩家已入座，未就绪，未满座
     *    - 游戏桌状态: WAITING
     *    - 玩家状态: ready = false
     *    - 按钮显示: "离开" / "开始"
     * 
     * 3. 玩家已入座，已就绪，未满座
     *    - 游戏桌状态: WAITING
     *    - 玩家状态: ready = true
     *    - 按钮显示: "离开" / "取消"
     * 
     * 4. 玩家已入座，未就绪，已满座
     *    - 游戏桌状态: MATCHING
     *    - 玩家状态: ready = false
     *    - 按钮显示: "离开" / "开始"
     * 
     * 5. 玩家已入座，已就绪，已满座
     *    - 游戏桌状态: MATCHING
     *    - 玩家状态: ready = true
     *    - 按钮显示: "离开" / "取消"
     * 
     * 6. 游戏进行中
     *    - 游戏桌状态: PLAYING
     *    - 按钮显示: 隐藏（或显示 "投降"/"求和"）
     */

    // ========================================================================
    // 匹配条件检查
    // ========================================================================

    /**
     * 检查玩家是否符合房间的匹配条件
     * 
     * @param {Object} playerStats - 玩家统计数据（胜率、掉线率、等级分）
     * @param {Object} playerSettings - 玩家设置的匹配偏好
     * @param {Object} roomSettings - 房间当前的匹配设置
     * @param {boolean} isFirstPlayer - 是否是房间的第一个玩家
     * @returns {Object} { canJoin: boolean, reason: string }
     */
    static checkMatchCriteria(playerStats, playerSettings, roomSettings, isFirstPlayer = false) {
        // 规则：第一个入座的玩家自动通过，并确立房间规则
        if (isFirstPlayer) {
            return { canJoin: true, reason: '第一个玩家,自动通过' };
        }

        const { baseBet, betRange, winRateRange, maxDisconnectRate, ratingRange } = roomSettings;

        // 1. 检查底豆匹配（双向匹配）
        if (playerSettings) {
            // 规则：房间的底豆必须在玩家接受的范围内
            if (playerSettings.betRange && Array.isArray(playerSettings.betRange) && playerSettings.betRange.length >= 2) {
                if (baseBet < playerSettings.betRange[0] || baseBet > playerSettings.betRange[1]) {
                    return {
                        canJoin: false,
                        reason: `房间底豆 ${baseBet} 不在您接受的范围 [${playerSettings.betRange[0]}, ${playerSettings.betRange[1]}] 内`
                    };
                }
            }

            // 规则：玩家设定的底豆必须在房间接受的范围内
            if (typeof playerSettings.baseBet === 'number') {
                if (playerSettings.baseBet < betRange[0] || playerSettings.baseBet > betRange[1]) {
                    return {
                        canJoin: false,
                        reason: `您的底豆 ${playerSettings.baseBet} 不在房间接受的范围 [${betRange[0]}, ${betRange[1]}] 内`
                    };
                }
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

        // 3. 检查掉线率
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;

        if (disconnectRate > maxDisconnectRate) {
            return {
                canJoin: false,
                reason: `您的掉线率 ${disconnectRate.toFixed(1)}% 超过房间允许的最大值 ${maxDisconnectRate}%`
            };
        }

        // 4. 检查等级分（如果房间有设置）
        if (ratingRange) {
            const rating = playerStats.rating || 1200;
            if (rating < ratingRange[0] || rating > ratingRange[1]) {
                return {
                    canJoin: false,
                    reason: `您的等级分 ${rating} 不在房间要求的范围 [${ratingRange[0]}, ${ratingRange[1]}] 内`
                };
            }
        }

        return { canJoin: true, reason: '符合匹配条件' };
    }

    // ========================================================================
    // 状态转换
    // ========================================================================

    /**
     * 获取玩家加入后的新状态
     * @param {number} currentPlayers - 当前玩家数（加入后）
     * @param {number} maxPlayers - 最大玩家数
     * @returns {string|null} 新状态或null（无变化）
     */
    static getStateAfterPlayerJoin(currentPlayers, maxPlayers) {
        if (currentPlayers === 1) {
            return this.TABLE_STATUS.WAITING;
        }
        if (currentPlayers === maxPlayers) {
            return this.TABLE_STATUS.MATCHING;
        }
        return null;
    }

    /**
     * 获取玩家离开后的新状态
     * @param {number} currentPlayers - 当前玩家数（离开后）
     * @param {number} maxPlayers - 最大玩家数
     * @returns {string|null} 新状态或null（无变化）
     */
    static getStateAfterPlayerLeave(currentPlayers, maxPlayers) {
        if (currentPlayers === 0) {
            return this.TABLE_STATUS.IDLE;
        }
        if (currentPlayers < maxPlayers) {
            return this.TABLE_STATUS.WAITING;
        }
        return null;
    }

    /**
     * 获取取消准备后的新状态
     * @param {number} currentPlayers - 当前玩家数
     * @param {number} maxPlayers - 最大玩家数
     * @returns {string} 新状态
     */
    static getStateAfterCancelReadyCheck(currentPlayers, maxPlayers) {
        if (currentPlayers < maxPlayers) {
            return this.TABLE_STATUS.WAITING;
        }
        return this.TABLE_STATUS.MATCHING;
    }

    /**
     * 验证状态转换是否合法
     * @param {string} fromStatus - 当前状态
     * @param {string} toStatus - 目标状态
     * @returns {Object} { valid: boolean, reason: string }
     */
    static isValidTransition(fromStatus, toStatus) {
        const validTransitions = {
            'idle': ['waiting'],
            'waiting': ['matching', 'idle'],
            'matching': ['playing', 'waiting', 'idle'],
            'playing': ['matching', 'idle', 'playing']
        };

        const allowedTargets = validTransitions[fromStatus];
        
        if (!allowedTargets) {
            return { 
                valid: false, 
                reason: `未知的源状态: ${fromStatus}` 
            };
        }

        if (!allowedTargets.includes(toStatus)) {
            return { 
                valid: false, 
                reason: `非法的状态转换: ${fromStatus} → ${toStatus}（允许的目标: ${allowedTargets.join(', ')}）` 
            };
        }

        return { 
            valid: true, 
            reason: `合法的状态转换: ${fromStatus} → ${toStatus}` 
        };
    }

    // ========================================================================
    // 玩家相关
    // ========================================================================

    /**
     * 检查是否所有玩家都已准备
     * @param {Array} players - 玩家列表
     * @param {number} maxPlayers - 最大玩家数
     * @returns {boolean}
     */
    static areAllPlayersReady(players, maxPlayers) {
        if (players.length !== maxPlayers) return false;
        return players.every(p => p.ready);
    }

    /**
     * 获取未准备的玩家列表
     * @param {Array} players - 玩家列表
     * @returns {Array} 未准备的玩家
     */
    static getUnreadyPlayers(players) {
        return players.filter(p => !p.ready);
    }

    /**
     * 检查是否是僵尸桌（长时间未开始）
     * @param {number} firstPlayerJoinedAt - 第一个玩家加入的时间戳
     * @param {string} status - 当前状态
     * @returns {boolean}
     */
    static isZombieTable(firstPlayerJoinedAt, status) {
        if (!firstPlayerJoinedAt || status === this.TABLE_STATUS.PLAYING) {
            return false;
        }
        const elapsed = Date.now() - firstPlayerJoinedAt;
        return elapsed > this.COUNTDOWN_CONFIG.zombieTimeout;
    }

    // ========================================================================
    // 座位分配
    // ========================================================================

    /**
     * 分配座位
     * @param {string} strategy - 分配策略 ('sequential' | 'random' | 'spread')
     * @param {Array} existingSeats - 已占用的座位索引数组
     * @param {number} maxPlayers - 最大玩家数
     * @returns {number} 分配的座位索引，-1表示无可用座位
     */
    static assignSeat(strategy, existingSeats, maxPlayers) {
        switch (strategy) {
            case 'random':
                // 随机分配：从可用座位中随机选一个
                const available = [];
                for (let i = 0; i < maxPlayers; i++) {
                    if (!existingSeats.includes(i)) {
                        available.push(i);
                    }
                }
                if (available.length === 0) return -1;
                return available[Math.floor(Math.random() * available.length)];
            
            case 'spread':
                // 分散分配：尽量让玩家分散在不同位置
                const midpoint = Math.floor(maxPlayers / 2);
                const spreadOrder = [];
                for (let i = 0; i < maxPlayers; i++) {
                    spreadOrder.push((i * midpoint) % maxPlayers);
                }
                for (const seat of spreadOrder) {
                    if (!existingSeats.includes(seat)) {
                        return seat;
                    }
                }
                return -1;
            
            case 'sequential':
            default:
                // 顺序分配：找第一个空缺的索引
                for (let i = 0; i < maxPlayers; i++) {
                    if (!existingSeats.includes(i)) {
                        return i;
                    }
                }
                return -1;
        }
    }

    // ========================================================================
    // 辅助方法
    // ========================================================================

    /**
     * 检查桌子是否可用（用于查找空闲桌子）
     * @param {Object} table - 游戏桌对象
     * @returns {boolean}
     */
    static isTableAvailable(table) {
        return table.status === this.TABLE_STATUS.IDLE || 
               (table.status === this.TABLE_STATUS.WAITING && table.players.length < table.maxPlayers);
    }

    /**
     * 获取缺失玩家数
     * @param {number} currentPlayers - 当前玩家数
     * @param {number} minPlayers - 最小玩家数
     * @param {number} maxPlayers - 最大玩家数
     * @returns {number} 还需要多少玩家才能开始
     */
    static getMissingPlayers(currentPlayers, minPlayers, maxPlayers) {
        if (currentPlayers < minPlayers) {
            return minPlayers - currentPlayers;
        }
        return 0;
    }

    /**
     * 获取进度文本（UI显示用）
     * @param {number} playerCount - 当前玩家数
     * @param {number} minPlayers - 最小玩家数
     * @param {number} maxPlayers - 最大玩家数
     * @param {number} readyCount - 已准备玩家数
     * @returns {string} 进度文本
     */
    static getProgressText(playerCount, minPlayers, maxPlayers, readyCount) {
        const missing = this.getMissingPlayers(playerCount, minPlayers, maxPlayers);
        
        if (playerCount < minPlayers) {
            return `等待中（${playerCount}/${minPlayers}）- 还需 ${missing} 人`;
        }
        
        if (playerCount < maxPlayers) {
            return `等待中（${playerCount}/${maxPlayers}）`;
        }
        
        if (readyCount < playerCount) {
            return `准备中（${readyCount}/${playerCount} 已准备）`;
        }
        
        return '游戏进行中';
    }

    /**
     * 检查玩家是否可以作为替补加入
     * @param {Array} players - 当前玩家列表
     * @param {number} maxPlayers - 最大玩家数
     * @returns {boolean} 是否有替补位置
     */
    static hasReserveSlot(players, maxPlayers) {
        const activePlayers = players.filter(p => p.isActive !== false);
        return activePlayers.length < maxPlayers;
    }

    /**
     * 按座位索引排序玩家列表
     * @param {Array} players - 玩家列表
     * @returns {Array} 排序后的玩家列表
     */
    static sortPlayersBySeat(players) {
        return [...players].sort((a, b) => (a.seatIndex || 0) - (b.seatIndex || 0));
    }

    /**
     * 验证状态一致性
     * @param {string} clientStatus - 客户端状态
     * @param {string} serverStatus - 服务器状态
     * @param {Object} context - 额外的上下文信息
     * @returns {Object} { consistent: boolean, recommendation: string }
     */
    static validateStateConsistency(clientStatus, serverStatus, context = {}) {
        const { playerCount, maxPlayers, readyCount } = context;
        
        // 规则 1: 玩家未入座 -> IDLE 或 WAITING
        if (playerCount === 0 && serverStatus !== 'idle') {
            return { consistent: false, recommendation: '无玩家时状态应为 IDLE' };
        }

        // 规则 2 & 3: 未满座 -> WAITING
        if (playerCount > 0 && playerCount < maxPlayers && serverStatus !== 'waiting') {
            return { consistent: false, recommendation: '未满座时状态应为 WAITING' };
        }

        // 规则 4 & 5: 已满座但未开始 -> MATCHING
        if (playerCount === maxPlayers && serverStatus !== 'playing' && serverStatus !== 'matching') {
            return { consistent: false, recommendation: '满座未开始时状态应为 MATCHING' };
        }

        if (clientStatus === serverStatus) {
            return { consistent: true, recommendation: '状态一致，无需同步' };
        }

        // 分析状态不一致的原因
        const { wasPlayingBefore = false } = context;
        let recommendation = '';
        
        if (serverStatus === 'idle' && clientStatus !== 'idle') {
            recommendation = '服务器已重置为idle，建议客户端重新加载游戏房间列表';
        } else if (serverStatus === 'playing' && clientStatus !== 'playing') {
            recommendation = '游戏已在服务器开始，建议客户端立即同步游戏状态';
        } else if (serverStatus === 'matching' && clientStatus === 'waiting') {
            recommendation = '桌子已满座进入匹配状态，建议客户端显示准备倒计时';
        } else {
            recommendation = `状态不一致（客户端: ${clientStatus}, 服务器: ${serverStatus}），建议强制同步到服务器状态`;
        }

        return {
            consistent: false,
            recommendation,
            shouldForceSync: true,
            targetStatus: serverStatus
        };
    }

    /**
     * 获取状态转换的详细信息
     * @param {string} fromStatus - 源状态
     * @param {string} toStatus - 目标状态
     * @param {Object} context - 转换的上下文信息
     * @returns {Object} 详细的转换信息
     */
    static getTransitionDetails(fromStatus, toStatus, context = {}) {
        const {
            userId = 'unknown',
            reason = 'unknown',
            playerCount = 0,
            maxPlayers = 2,
            timestamp = Date.now()
        } = context;

        const validation = this.isValidTransition(fromStatus, toStatus);
        
        let transitionType = 'unknown';
        let details = '';

        if (fromStatus === 'idle' && toStatus === 'waiting') {
            transitionType = 'player_join';
            details = `第一个玩家(${userId})入座`;
        } else if (fromStatus === 'waiting' && toStatus === 'matching') {
            transitionType = 'table_full';
            details = `桌子已满座(${playerCount}/${maxPlayers})`;
        } else if (fromStatus === 'matching' && toStatus === 'playing') {
            transitionType = 'game_start';
            details = '所有玩家已准备，游戏开始';
        } else if (fromStatus === 'playing' && toStatus === 'matching') {
            transitionType = 'game_end';
            details = '游戏结束，进入再来一局阶段';
        } else if (fromStatus === 'playing' && toStatus === 'playing') {
            transitionType = 'new_round';
            details = '新回合开始';
        } else if (toStatus === 'waiting' && playerCount < maxPlayers) {
            transitionType = 'player_leave';
            details = `玩家离座，剩余玩家数: ${playerCount}`;
        } else if (toStatus === 'idle') {
            transitionType = 'table_reset';
            details = '所有玩家离座，桌子重置为空闲';
        } else {
            transitionType = 'custom';
            details = reason;
        }

        return {
            valid: validation.valid,
            fromStatus,
            toStatus,
            transitionType,
            details,
            userId,
            playerCount,
            maxPlayers,
            timestamp,
            validationReason: validation.reason
        };
    }
}

module.exports = TableStatusRules;
