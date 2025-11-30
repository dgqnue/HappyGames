/**
 * 匹配系统模块
 * 负责管理玩家匹配队列和匹配逻辑
 * 
 * 主要职责：
 * 1. 维护匹配队列
 * 2. 执行匹配算法
 * 3. 触发匹配成功事件
 */
class MatchMaker {
    constructor() {
        // 匹配队列：Map<gameType, Array<PlayerRequest>>
        this.queues = new Map();

        // 匹配检查定时器
        this.checkInterval = null;

        // 匹配成功回调：Map<gameType, Function>
        this.handlers = new Map();

        this.start();
    }

    /**
     * 启动匹配服务
     */
    start() {
        if (this.checkInterval) return;

        // 每3秒检查一次匹配
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
     * @param {String} gameType - 游戏类型
     * @param {Object} player - 玩家信息 { userId, socket, settings, ... }
     * @returns {Object} result - { success, error }
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

        // 添加时间戳
        player.joinTime = Date.now();
        queue.push(player);

        console.log(`[MatchMaker] 玩家 ${player.userId} 加入 ${gameType} 匹配队列`);

        // 立即尝试一次匹配
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

        // 按等待时间排序（先入先出）
        queue.sort((a, b) => a.joinTime - b.joinTime);

        const matchedIndices = new Set();
        const handler = this.handlers.get(gameType);

        if (!handler) {
            console.warn(`[MatchMaker] 未找到 ${gameType} 的匹配处理器`);
            return;
        }

        // 简单的两两匹配逻辑
        // TODO: 可扩展为基于ELO分、下注额等条件的复杂匹配
        for (let i = 0; i < queue.length; i++) {
            if (matchedIndices.has(i)) continue;

            for (let j = i + 1; j < queue.length; j++) {
                if (matchedIndices.has(j)) continue;

                const p1 = queue[i];
                const p2 = queue[j];

                if (this.isMatchCompatible(p1, p2)) {
                    // 匹配成功
                    matchedIndices.add(i);
                    matchedIndices.add(j);

                    console.log(`[MatchMaker] 匹配成功: ${p1.userId} vs ${p2.userId}`);

                    // 触发回调
                    handler([p1, p2]);
                    break;
                }
            }
        }

        // 移除已匹配的玩家
        if (matchedIndices.size > 0) {
            // 从后往前删，避免索引错位
            const indices = Array.from(matchedIndices).sort((a, b) => b - a);
            for (const idx of indices) {
                queue.splice(idx, 1);
            }
        }
    }

    /**
     * 检查两个玩家是否兼容
     */
    isMatchCompatible(p1, p2) {
        // 1. 不能是同一个人
        if (p1.userId === p2.userId) return false;

        // 2. 检查 ELO 分数差距 (如果都在 settings 中指定了范围)
        // 默认允许 300 分差距
        const scoreDiff = Math.abs(p1.stats.rating - p2.stats.rating);
        if (scoreDiff > 300) {
            // 如果等待时间超过 30 秒，放宽限制
            const waitTime = Math.max(Date.now() - p1.joinTime, Date.now() - p2.joinTime);
            if (waitTime < 30000) {
                return false;
            }
        }

        // 3. 检查下注范围 (如果有)
        // if (p1.settings.minBet > p2.settings.maxBet) return false;

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

module.exports = MatchMaker;
