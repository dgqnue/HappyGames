/**
 * 游戏房间基类 (GameRoom)
 * 代表一个特定等级的游戏区域（如：初级室、高级室）
 * 
 * 这是一个抽象基类，只定义最基础的属性和方法
 * 具体的实现逻辑应该在子类中完成
 */

class GameRoom {
    /**
     * @param {String} id - 游戏房间ID (如: beginner)
     * @param {String} name - 显示名称 (如: 初级室)
     * @param {Function} tableFactory - 创建游戏桌的工厂函数
     */
    constructor(id, name, tableFactory) {
        this.id = id;
        this.name = name;
        this.createTable = tableFactory;

        // 游戏桌列表
        this.tables = [];

        // 准入规则 (默认无限制)
        this.minRating = 0;
        this.maxRating = Infinity;
    }

    /**
     * 设置准入规则
     * @param {Number} minRating - 最低等级分
     * @param {Number} maxRating - 最高等级分
     */
    setAccessRule(minRating, maxRating) {
        this.minRating = minRating;
        this.maxRating = maxRating;
    }

    /**
     * 检查玩家是否有权进入
     * @param {Number} playerRating - 玩家等级分
     * @returns {Boolean} 是否可以进入
     */
    canAccess(playerRating) {
        return playerRating >= this.minRating && playerRating <= this.maxRating;
    }

    /**
     * 获取房间信息
     * @returns {Object} 房间基本信息
     */
    getRoomInfo() {
        return {
            id: this.id,
            tier: this.id, // 添加 tier 字段以兼容前端
            name: this.name,
            status: 'active', // 房间状态：active 或 maintenance
            minRating: this.minRating,
            maxRating: this.maxRating,
            tableCount: this.tables.length,
            playerCount: this.tables.reduce((sum, table) => sum + (table.players?.length || 0), 0)
        };
    }

    /**
     * 设置房间层的 Socket 事件监听
     * @param {Object} socket - Socket 实例
     * @param {String} gameType - 游戏类型
     */
    setupRoomListeners(socket, gameType) {
        const eventName = `${gameType}_get_tables`;
        
        // 🔧 关键修复：先移除已存在的监听器，防止重复注册
        // 注意：这会移除所有同名事件的监听器，但由于每个房间都注册了同一个事件名，
        // 这里只移除一次，让 ChineseChessCenter 统一处理所有房间的请求更合适
        // 但为了向后兼容，我们保持这个结构，只是确保不重复注册
        
        // 检查是否已经有这个房间的监听器（通过标记）
        const listenerKey = `__has_${gameType}_${this.id}_listener`;
        if (socket[listenerKey]) {
            console.log(`[GameRoom] Listener already registered for ${this.id}, skipping`);
            return;
        }
        socket[listenerKey] = true;
        
        // 监听获取游戏桌列表请求
        socket.on(eventName, (data = {}) => {
            const { roomId } = data;

            // 验证是否是当前房间
            if (roomId !== this.id) {
                return;
            }

            // 加入广播房间，以便接收桌子列表更新
            const broadcastRoom = `${gameType}_${this.id}`;
            socket.join(broadcastRoom);
            console.log(`[GameRoom] Socket ${socket.id} joined broadcast room: ${broadcastRoom}`);

            // 返回游戏桌列表
            const tableList = this.getTableList ? this.getTableList() : [];
            socket.emit('table_list', tableList);
        });
    }

    // 以下方法应该在子类中实现
    // initTables(count) - 初始化游戏桌
    // addTable() - 添加新游戏桌
    // removeTable(tableId) - 移除游戏桌
    // getTableList() - 获取游戏桌列表
    // findAvailableTable() - 查找可用游戏桌
    // findTable(tableId) - 根据ID查找游戏桌

    /**
     * 分配玩家到游戏桌（基类实现）
     * 流程：检查条件 → 通过后再加入游戏桌 → 确保不符合条件的玩家不被显示
     * @param {Object} socket - Socket 实例
     * @param {String} tableId - 指定的桌子ID（可选）
     * @returns {Object} { success, reason?, tableId }
     */
    async assignPlayerToTable(socket, tableId) {
        try {
            // 1. 获取或创建游戏桌
            const table = this.getOrCreateTable(tableId);

            // 2. 获取玩家统计数据
            const stats = await this.getUserStats(socket.user._id);
            if (!stats) {
                const reason = '无法获取玩家统计数据';
                console.log(`[GameRoom] ${reason}`);
                socket.emit('error', { message: reason });
                return { success: false, reason, tableId: table.tableId };
            }

            // 3. 【核心】执行所有条件检查，只有全部通过才能加入
            // 子类可以通过重写 validatePlayerJoin() 来自定义检查逻辑
            const validation = await this.validatePlayerJoin(stats, socket);
            if (!validation.success) {
                console.log(`[GameRoom] 玩家入座检查失败: ${validation.reason}`);
                socket.emit('error', { message: validation.reason });
                return { success: false, reason: validation.reason, tableId: table.tableId };
            }

            // 4. 判断是否可以作为玩家入座（积分检查）
            const canPlay = this.canAccess(stats.rating);
            if (!canPlay) {
                const message = `您的积分 ${stats.rating} 不符合当前游戏房间要求 [${this.minRating}, ${this.maxRating}]。\n请移步其他房间，或等其他玩家入座游戏后旁观。`;
                console.log(`[GameRoom] 玩家 ${socket.user.username} 积分 ${stats.rating} 不符合房间要求，拒绝入座`);
                socket.emit('error', { message });
                return { success: false, reason: message, tableId: table.tableId };
            }

            // 5. 调用 joinTable
            const result = await table.joinTable(socket, true);

            // 6. 如果加入成功且满座，通知客户端
            if (result.success && table.players.length === table.maxPlayers && !result.asSpectator) {
                console.log(`[GameRoom] 桌子已满座，发送 table_full 事件到客户端`);
                socket.emit('table_full', {
                    message: '游戏桌已满座，准备开始游戏',
                    tableId: table.tableId
                });
            }

            // 7. 返回结果
            return {
                ...result,
                tableId: table.tableId
            };
        } catch (err) {
            console.error('[GameRoom] Error in assignPlayerToTable:', err);
            socket.emit('error', { message: '分配游戏桌出错: ' + err.message });
            return { success: false, reason: err.message };
        }
    }

    /**
     * 验证玩家是否可以加入（可被子类重写扩展）
     * @param {Object} stats - 玩家统计数据
     * @param {Object} socket - Socket 实例（可选，用于获取更多信息）
     * @returns {Object} { success: boolean, reason?: string }
     */
    async validatePlayerJoin(stats, socket) {
        // 注意：积分范围检查已移至 assignPlayerToTable 中作为 canPlay 的判断依据
        // 这里只进行"硬性"阻挡（如黑名单、封禁等）

        // 基础检查：掉线率
        const disconnectValidation = this.validateDisconnectRate(stats);
        if (!disconnectValidation.success) {
            return disconnectValidation;
        }

        return { success: true };
    }

    /**
     * 验证玩家掉线率（可被子类重写调整阈值）
     * @param {Object} stats - 玩家统计数据
     * @returns {Object} { success: boolean, reason?: string }
     */
    validateDisconnectRate(stats) {
        // 配置
        const MIN_GAMES_FOR_DISCONNECT_CHECK = 20; // 至少需要20局对战记录才检查掉线率
        const MAX_DISCONNECT_RATE = 100; // 最大掉线率 (%)

        // 对局数不足，不检查掉线率
        if (stats.gamesPlayed < MIN_GAMES_FOR_DISCONNECT_CHECK) {
            console.log(`[GameRoom] 跳过掉线率检查：玩家对局数仅 ${stats.gamesPlayed} 局（需要至少 ${MIN_GAMES_FOR_DISCONNECT_CHECK} 局）`);
            return { success: true };
        }

        // 计算掉线率
        const disconnectRateRaw = stats.gamesPlayed > 0
            ? (stats.disconnects / stats.gamesPlayed) * 100
            : 0;
        const disconnectRate = Math.min(100, disconnectRateRaw);

        if (disconnectRateRaw > MAX_DISCONNECT_RATE) {
            return {
                success: false,
                reason: `您的掉线率 ${disconnectRate.toFixed(1)}% 超过房间允许的最大值 ${MAX_DISCONNECT_RATE}%（基于 ${stats.gamesPlayed} 局对战记录）`
            };
        }

        return { success: true };
    }

    /**
     * 获取或创建游戏桌
     * 子类必须重写此方法
     */
    getOrCreateTable(tableId) {
        throw new Error('getOrCreateTable() must be implemented by subclass');
    }

    /**
     * 获取用户统计数据
     * 子类必须重写此方法
     */
    async getUserStats(userId) {
        throw new Error('getUserStats() must be implemented by subclass');
    }
}

module.exports = GameRoom;
