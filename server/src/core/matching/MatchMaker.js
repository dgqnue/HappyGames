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

module.exports = MatchMaker;
