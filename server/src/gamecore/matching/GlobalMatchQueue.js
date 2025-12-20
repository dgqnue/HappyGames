/**
 * ============================================================================
 * GlobalMatchQueue - 全局自动匹配队列
 * ============================================================================
 * 
 * 管理跨房间的全局自动匹配队列。
 * 玩家加入队列后，系统根据等级分自动匹配对手，然后分配到合适的房间。
 * 
 * 主要功能：
 * 1. 管理多个游戏类型的匹配队列
 * 2. 按等待时间优先匹配（FIFO）
 * 3. 根据等级分差距决定是否匹配
 * 4. 等待时间越长，匹配条件越宽松
 * 
 * 使用场景：
 * - 玩家点击"快速开始"，不指定房间
 * - 系统自动根据等级分选择合适的房间
 * 
 * 文件位置: server/src/gamecore/matching/GlobalMatchQueue.js
 */

class GlobalMatchQueue {
    constructor() {
        // 匹配队列 Map<gameType, player[]>
        this.queues = new Map();
        // 定时检查间隔
        this.checkInterval = null;
        // 匹配成功处理器 Map<gameType, handler>
        this.handlers = new Map();
        // 启动匹配服务
        this.start();
    }

    /**
     * 启动匹配服务
     * 每3秒检查一次所有队列
     */
    start() {
        if (this.checkInterval) return;
        this.checkInterval = setInterval(() => {
            this.processQueues();
        }, 3000);
        console.log('[GlobalMatchQueue] 全局匹配服务已启动');
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
     * @param {string} gameType - 游戏类型
     * @param {Function} handler - 处理函数 (players) => void
     */
    registerHandler(gameType, handler) {
        this.handlers.set(gameType, handler);
    }

    /**
     * 玩家加入匹配队列
     * @param {string} gameType - 游戏类型
     * @param {Object} player - 玩家信息 { userId, socket, stats, settings }
     * @returns {Object} { success, error? }
     */
    joinQueue(gameType, player) {
        // 初始化队列
        if (!this.queues.has(gameType)) {
            this.queues.set(gameType, []);
        }

        const queue = this.queues.get(gameType);

        // 检查是否已在队列中
        if (queue.find(p => p.userId === player.userId)) {
            return { success: false, error: '已在匹配队列中' };
        }

        // 记录加入时间
        player.joinTime = Date.now();
        queue.push(player);

        console.log(`[GlobalMatchQueue] 玩家 ${player.userId} 加入 ${gameType} 匹配队列`);

        // 立即尝试匹配
        this.matchGame(gameType);

        return { success: true };
    }

    /**
     * 玩家离开匹配队列
     * @param {string} gameType - 游戏类型
     * @param {string} userId - 玩家ID
     * @returns {boolean} 是否成功移除
     */
    leaveQueue(gameType, userId) {
        const queue = this.queues.get(gameType);
        if (!queue) return false;

        const index = queue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            queue.splice(index, 1);
            console.log(`[GlobalMatchQueue] 玩家 ${userId} 离开 ${gameType} 匹配队列`);
            return true;
        }
        return false;
    }

    /**
     * 处理所有队列
     * 由定时器周期性调用
     */
    processQueues() {
        for (const gameType of this.queues.keys()) {
            this.matchGame(gameType);
        }
    }

    /**
     * 在指定游戏类型中进行匹配
     * @param {string} gameType - 游戏类型
     */
    matchGame(gameType) {
        const queue = this.queues.get(gameType);
        if (!queue || queue.length < 2) return;

        // 按等待时间排序，先进先出
        queue.sort((a, b) => a.joinTime - b.joinTime);

        const matchedIndices = new Set();
        const handler = this.handlers.get(gameType);

        if (!handler) {
            console.warn(`[GlobalMatchQueue] 未找到 ${gameType} 的匹配处理器`);
            return;
        }

        // 简单的配对匹配逻辑
        for (let i = 0; i < queue.length; i++) {
            if (matchedIndices.has(i)) continue;

            for (let j = i + 1; j < queue.length; j++) {
                if (matchedIndices.has(j)) continue;

                const p1 = queue[i];
                const p2 = queue[j];

                if (this.isMatchCompatible(p1, p2)) {
                    matchedIndices.add(i);
                    matchedIndices.add(j);

                    console.log(`[GlobalMatchQueue] 匹配成功: ${p1.userId} vs ${p2.userId}`);
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

    /**
     * 检查两个玩家是否可以匹配
     * @param {Object} p1 - 玩家1
     * @param {Object} p2 - 玩家2
     * @returns {boolean} 是否可以匹配
     */
    isMatchCompatible(p1, p2) {
        // 不能与自己匹配
        if (p1.userId === p2.userId) return false;

        // 计算等级分差距
        const scoreDiff = Math.abs(p1.stats.rating - p2.stats.rating);
        
        if (scoreDiff > 300) {
            // 如果分差较大，检查等待时间
            const waitTime = Math.max(Date.now() - p1.joinTime, Date.now() - p2.joinTime);
            // 等待超过30秒后放宽条件
            if (waitTime < 30000) {
                return false;
            }
        }
        return true;
    }

    /**
     * 获取队列状态
     * @param {string} gameType - 游戏类型
     * @returns {Object} { count, avgWaitTime }
     */
    getQueueStatus(gameType) {
        const queue = this.queues.get(gameType) || [];
        return {
            count: queue.length,
            avgWaitTime: 0 // TODO: 实现平均等待时间计算
        };
    }
}

module.exports = GlobalMatchQueue;
