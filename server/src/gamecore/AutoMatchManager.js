/**
 * 自动匹配管理器
 * 
 * 负责根据玩家设置的匹配条件自动匹配合适的对手
 */

class AutoMatchManager {
    constructor() {
        // 匹配队列：{ gameType: [{ userId, socket, settings, stats, timestamp }] }
        this.matchQueues = {};

        // 匹配检查间隔
        this.matchInterval = null;

        // 启动匹配检查
        this.startMatchChecking();
    }

    /**
     * 加入匹配队列
     */
    joinQueue(gameType, socket, matchSettings) {
        if (!this.matchQueues[gameType]) {
            this.matchQueues[gameType] = [];
        }

        const userId = socket.user._id.toString();

        // 检查是否已在队列中
        const existing = this.matchQueues[gameType].find(p => p.userId === userId);
        if (existing) {
            return { success: false, error: '已在匹配队列中' };
        }

        // 添加到队列
        this.matchQueues[gameType].push({
            userId,
            socket,
            settings: matchSettings,
            timestamp: Date.now()
        });

        console.log(`[AutoMatch] Player ${socket.user.username} joined ${gameType} queue`);

        // 立即尝试匹配
        this.tryMatch(gameType);

        return { success: true };
    }

    /**
     * 离开匹配队列
     */
    leaveQueue(gameType, userId) {
        if (!this.matchQueues[gameType]) return false;

        const index = this.matchQueues[gameType].findIndex(p => p.userId === userId);
        if (index === -1) return false;

        this.matchQueues[gameType].splice(index, 1);
        console.log(`[AutoMatch] Player ${userId} left ${gameType} queue`);

        return true;
    }

    /**
     * 启动匹配检查（每3秒检查一次）
     */
    startMatchChecking() {
        this.matchInterval = setInterval(() => {
            Object.keys(this.matchQueues).forEach(gameType => {
                this.tryMatch(gameType);
            });
        }, 3000);
    }

    /**
     * 尝试匹配
     */
    tryMatch(gameType) {
        const queue = this.matchQueues[gameType];
        if (!queue || queue.length < 2) return;

        // 按入队时间排序（先进先出）
        queue.sort((a, b) => a.timestamp - b.timestamp);

        // 尝试为每个玩家找到匹配
        const matched = [];

        for (let i = 0; i < queue.length; i++) {
            if (matched.includes(i)) continue;

            const player1 = queue[i];

            // 查找符合条件的对手
            for (let j = i + 1; j < queue.length; j++) {
                if (matched.includes(j)) continue;

                const player2 = queue[j];

                // 检查双方是否互相符合匹配条件
                if (this.isMatch(player1, player2)) {
                    console.log(`[AutoMatch] Match found: ${player1.userId} vs ${player2.userId}`);

                    // 标记为已匹配
                    matched.push(i, j);

                    // 通知匹配成功（由 GameManager 处理房间分配）
                    this.onMatchFound(gameType, [player1, player2]);

                    break;
                }
            }
        }

        // 从队列中移除已匹配的玩家
        if (matched.length > 0) {
            matched.sort((a, b) => b - a); // 从后往前删除
            matched.forEach(index => {
                queue.splice(index, 1);
            });
        }
    }

    /**
     * 检查两个玩家是否匹配
     */
    isMatch(player1, player2) {
        const s1 = player1.settings;
        const s2 = player2.settings;

        // 检查底豆是否在对方的接受范围内
        if (s1.baseBet < s2.betRange[0] || s1.baseBet > s2.betRange[1]) {
            return false;
        }
        if (s2.baseBet < s1.betRange[0] || s2.baseBet > s1.betRange[1]) {
            return false;
        }

        // 获取玩家统计数据（需要从数据库查询，这里简化处理）
        // 实际应该在 joinQueue 时就获取并缓存

        return true;
    }

    /**
     * 匹配成功回调（由外部设置）
     */
    onMatchFound(gameType, players) {
        // 这个方法应该由 GameManager 设置
        // 用于创建房间并将玩家加入
        console.log(`[AutoMatch] Match found for ${gameType}, but no handler set`);
    }

    /**
     * 设置匹配成功回调
     */
    setMatchFoundHandler(handler) {
        this.onMatchFound = handler;
    }

    /**
     * 获取队列信息
     */
    getQueueInfo(gameType) {
        const queue = this.matchQueues[gameType] || [];
        return {
            gameType,
            playersInQueue: queue.length,
            avgWaitTime: this.calculateAvgWaitTime(queue)
        };
    }

    /**
     * 计算平均等待时间
     */
    calculateAvgWaitTime(queue) {
        if (queue.length === 0) return 0;

        const now = Date.now();
        const totalWait = queue.reduce((sum, p) => sum + (now - p.timestamp), 0);
        return Math.round(totalWait / queue.length / 1000); // 秒
    }

    /**
     * 清理资源
     */
    cleanup() {
        if (this.matchInterval) {
            clearInterval(this.matchInterval);
        }
    }
}

module.exports = AutoMatchManager;
