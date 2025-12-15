/**
 * ============================================================================
 * PART 1: StateMappingRules (状态界面映射规则)
 * ============================================================================
 */

/**
 * 状态界面映射规则类
 * 定义了平台所有游戏的状态映射、常量配置和校验逻辑
 */
class StateMappingRules {
    static {
        console.log('[StateMappingRules] 模块已加载 - Version 3.1 (完整版)');
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
     * ============================================================================
     * UI/状态映射标准 (UI/State Mapping Standard)
     * ============================================================================
     * 
     * 为了确保前端显示与后端状态的一致性，定义以下标准映射规则：
     * 
     * 1. 玩家未入座 (Player Not Seated)
     *    - 游戏桌状态: IDLE (空闲) 或 WAITING (等待中)
     *    - 玩家状态: 不在 players 列表中
     *    - 按钮显示: "入座"
     * 
     * 2. 玩家已入座，未就绪，未满座 (Seated, Unready, Not Full)
     *    - 游戏桌状态: WAITING
     *    - 玩家状态: ready = false
     *    - 按钮显示: "离开" / "开始" (点击"开始"触发准备)
     * 
     * 3. 玩家已入座，已就绪，未满座 (Seated, Ready, Not Full)
     *    - 游戏桌状态: WAITING
     *    - 玩家状态: ready = true
     *    - 按钮显示: "离开" / "取消" (点击"取消"触发取消准备)
     * 
     * 4. 玩家已入座，未就绪，已满座 (Seated, Unready, Full)
     *    - 游戏桌状态: MATCHING (匹配中/准备中)
     *    - 玩家状态: ready = false
     *    - 按钮显示: "离开" / "开始"
     * 
     * 5. 玩家已入座，已就绪，已满座 (Seated, Ready, Full)
     *    - 游戏桌状态: MATCHING
     *    - 玩家状态: ready = true
     *    - 按钮显示: "离开" / "取消"
     * 
     * 6. 游戏进行中 (Playing)
     *    - 游戏桌状态: PLAYING
     *    - 玩家状态: ready = true (通常)
     *    - 按钮显示: 隐藏 (或显示 "投降"/"求和")
     * 
     * 每次状态变更时，应确保符合上述规则。
     */

    /**
     * 倒计时配置 (单位: 毫秒)
     */
    static COUNTDOWN_CONFIG = {
        readyTimeout: 30000,    // 准备倒计时: 30秒 (满座后所有玩家需在此时间内点击"开始")
        rematchTimeout: 0,      // 再来一局倒计时: 0 (禁用自动倒计时，完全由玩家手动点击开始)
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
            // 只有当 playerSettings 中包含 betRange 时才检查
            if (playerSettings.betRange && Array.isArray(playerSettings.betRange) && playerSettings.betRange.length >= 2) {
                if (baseBet < playerSettings.betRange[0] || baseBet > playerSettings.betRange[1]) {
                    return {
                        canJoin: false,
                        reason: `房间底豆 ${baseBet} 不在您接受的范围 [${playerSettings.betRange[0]}, ${playerSettings.betRange[1]}] 内`
                    };
                }
            }

            // 规则：玩家设定的底豆必须在房间接受的范围内 (用于自动匹配时的双向验证)
            // 只有当 playerSettings 中包含 baseBet 时才检查
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

        // 4. 检查等级分 (如果房间有设置)
        if (ratingRange) {
            const rating = playerStats.rating || 1200;
            if (rating < ratingRange[0] || rating > ratingRange[1]) {
                return {
                    canJoin: false,
                    reason: `您的等级分 ${rating} 不在房间要求的范围 [${ratingRange[0]}, ${ratingRange[1]}] 内`
                };
            }
        }

        return { canJoin: true };
    }

    /**
     * 检查是否是僵尸桌 (长时间未开始)
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

    /**
     * 获取玩家加入后的新状态
     * @param {number} currentPlayers - 当前玩家数 (加入后)
     * @param {number} maxPlayers - 最大玩家数
     * @returns {string|null} 新状态或null(无变化)
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
     * @param {number} currentPlayers - 当前玩家数 (离开后)
     * @param {number} maxPlayers - 最大玩家数
     * @returns {string|null} 新状态或null(无变化)
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
        // 如果玩家人数少于最大人数，状态应为 WAITING
        if (currentPlayers < maxPlayers) {
            return this.TABLE_STATUS.WAITING;
        }
        // 否则保持 MATCHING (满座但未全部就绪)
        return this.TABLE_STATUS.MATCHING;
    }

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
     * 检查桌子是否可用 (用于查找空闲桌子)
     * @param {Object} table - 游戏桌对象
     * @returns {boolean}
     */
    static isTableAvailable(table) {
        return table.status === this.TABLE_STATUS.IDLE || 
               (table.status === this.TABLE_STATUS.WAITING && table.players.length < table.maxPlayers);
    }

    /**
     * 分配座位 (简单策略：找第一个空缺的索引)
     * @param {string} strategy - 分配策略 (目前只支持 'sequential')
     * @param {Array} existingSeats - 已占用的座位索引数组
     * @param {number} maxPlayers - 最大玩家数
     * @returns {number} 分配的座位索引，-1表示无可用座位
     */
    static assignSeat(strategy, existingSeats, maxPlayers) {
        // 默认策略：顺序分配 (0, 1, 2...)
        for (let i = 0; i < maxPlayers; i++) {
            if (!existingSeats.includes(i)) {
                return i;
            }
        }
        return -1;
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
     * 获取房间状态描述文本
     * @param {number} playerCount - 当前玩家数
     * @param {number} minPlayers - 最小玩家数
     * @param {number} maxPlayers - 最大玩家数
     * @param {number} readyCount - 已准备玩家数
     * @returns {string} 状态描述
     */
    static getRoomStatusDescription(playerCount, minPlayers, maxPlayers, readyCount) {
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
     * 检查玩家是否可以作为替补加入（在游戏进行中）
     * 用于观众晋升为玩家的场景
     * 
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
     * 用于确保玩家顺序一致
     * 
     * @param {Array} players - 玩家列表
     * @returns {Array} 排序后的玩家列表
     */
    static sortPlayersBySeat(players) {
        return [...players].sort((a, b) => (a.seatIndex || 0) - (b.seatIndex || 0));
    }

    /**
     * 改进1: 验证状态转换是否合法
     * 确保状态机只按照预定义的转换规则进行转换
     * @param {string} fromStatus - 当前状态
     * @param {string} toStatus - 目标状态
     * @returns {Object} { valid: boolean, reason: string }
     */
    static isValidTransition(fromStatus, toStatus) {
        const validTransitions = {
            'idle': ['waiting'],                    // idle只能转为waiting（玩家入座）
            'waiting': ['matching', 'idle'],        // waiting可以转为matching（满座）或idle（所有人离座）
            'matching': ['playing', 'waiting', 'idle'],  // matching可以转为playing（游戏开始）、waiting（有人离座）或idle（全部离座）
            'playing': ['matching', 'idle', 'playing'] // playing可以转为matching（游戏结束）、idle（所有人离座）或playing（新回合开始）
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
                reason: `非法的状态转换: ${fromStatus} → ${toStatus}（允许的目标: ${allowedTargets.join(', ')})` 
            };
        }

        return { 
            valid: true, 
            reason: `合法的状态转换: ${fromStatus} → ${toStatus}` 
        };
    }

    /**
     * 改进2: 验证状态一致性
     * 确保客户端和服务器的状态同步
     * @param {string} clientStatus - 客户端状态
     * @param {string} serverStatus - 服务器状态
     * @param {Object} context - 额外的上下文信息
     * @returns {Object} { consistent: boolean, recommendation: string }
     */
    static validateStateConsistency(clientStatus, serverStatus, context = {}) {
        // 强制执行 UI/状态映射标准检查
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
            return {
                consistent: true,
                recommendation: '状态一致，无需同步'
            };
        }

        // 分析状态不一致的原因
        const { wasPlayingBefore = false } = context;
        
        let recommendation = '';
        
        // 常见的不一致场景处理建议
        if (serverStatus === 'idle' && clientStatus !== 'idle') {
            recommendation = '服务器已重置为idle（所有玩家离座），建议客户端重新加载游戏房间列表';
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
     * 改进3: 获取状态转换的详细信息
     * 用于日志记录和调试，提供完整的转换上下文
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
        
        // 根据转换类型判断原因
        let transitionType = 'unknown';
        let details = '';

        if (fromStatus === 'idle' && toStatus === 'waiting') {
            transitionType = 'player_join';
            details = `第一个玩家(${userId})入座`;
        } else if (fromStatus === 'waiting' && toStatus === 'matching') {
            transitionType = 'table_full';
            details = `桌子已满座(${playerCount}/${maxPlayers})，自动进入匹配状态`;
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

module.exports = StateMappingRules;
