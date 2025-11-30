const UserGameStats = require('../../models/UserGameStats');
const GameTier = require('./GameTier');

/**
 * 游戏管理器基类 (GameManager)
 * 负责管理特定类型游戏的所有资源和流程
 * 
 * 主要职责：
 * 1. 管理游戏室 (Tiers)
 * 2. 处理玩家进入游戏的请求
 * 3. 协调匹配系统和游戏桌
 * 4. 处理Socket事件路由
 */
class GameManager {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {String} gameType - 游戏类型标识
     * @param {Class} TableClass - 游戏桌类定义
     * @param {Object} matchMaker - 匹配器实例
     */
    constructor(io, gameType, TableClass, matchMaker) {
        this.io = io;
        this.gameType = gameType;
        this.TableClass = TableClass;
        this.matchMaker = matchMaker;

        // 游戏室列表 Map<tierId, GameTier>
        this.tiers = new Map();

        // 初始化默认游戏室
        this.initTiers();

        // 注册匹配回调
        if (this.matchMaker) {
            this.matchMaker.registerHandler(this.gameType, (players) => {
                this.handleMatchFound(players);
            });
        }
    }

    /**
     * 初始化游戏室
     * 子类可重写此方法自定义游戏室
     */
    initTiers() {
        this.createTier('free', '免豆室', 0, Infinity);
        this.createTier('beginner', '初级室', 0, 1500);
        this.createTier('intermediate', '中级室', 1500, 1800);
        this.createTier('advanced', '高级室', 1800, Infinity);
    }

    /**
     * 创建游戏室
     */
    createTier(id, name, minRating, maxRating) {
        const tier = new GameTier(id, name, (tableId, tierId) => {
            // 工厂函数：创建具体的游戏桌实例
            const table = new this.TableClass(this.io, tableId, this.gameType, 2, tierId);
            table.manager = this;
            return table;
        });

        tier.setAccessRule(minRating, maxRating);
        tier.initTables(3); // 默认创建3张桌子

        this.tiers.set(id, tier);
        console.log(`[GameManager] 创建游戏室: ${name} (${id})`);
    }

    /**
     * 处理玩家进入游戏模块
     * @param {Object} socket 
     */
    onPlayerJoin(socket) {
        console.log(`[${this.gameType}] 玩家进入游戏大厅: ${socket.user.username}`);

        // 1. 监听获取房间列表请求
        socket.on('get_rooms', ({ tier }) => {
            this.handleGetRooms(socket, tier);
        });

        // 2. 监听加入游戏桌请求 (手动加入)
        socket.on(`${this.gameType}_join`, (data) => {
            this.handleJoinTable(socket, data);
        });

        // 3. 监听自动匹配请求
        socket.on('auto_match', (settings) => {
            this.handleAutoMatch(socket, settings);
        });

        // 4. 监听取消匹配
        socket.on('cancel_match', () => {
            this.handleCancelMatch(socket);
        });
    }

    /**
     * 处理获取房间列表
     */
    handleGetRooms(socket, tierId) {
        const tier = this.tiers.get(tierId);
        if (!tier) {
            return socket.emit('error', { message: '无效的游戏室' });
        }

        // 加入广播房间，以便接收列表更新
        const broadcastRoom = `${this.gameType}_${tierId}`;
        socket.join(broadcastRoom);

        socket.emit('room_list', tier.getTableList());
    }

    /**
     * 广播房间列表更新
     */
    broadcastRoomUpdate(tierId) {
        const tier = this.tiers.get(tierId);
        if (tier) {
            const broadcastRoom = `${this.gameType}_${tierId}`;
            this.io.to(broadcastRoom).emit('room_list', tier.getTableList());
        }
    }

    /**
     * 处理加入游戏桌
     */
    async handleJoinTable(socket, { tier: tierId, roomId: tableId }) {
        console.log(`[GameManager] handleJoinTable: tier=${tierId}, table=${tableId}, user=${socket.user.username}`);
        try {
            const tier = this.tiers.get(tierId);
            if (!tier) {
                console.error(`[GameManager] 游戏室不存在: ${tierId}`);
                return socket.emit('error', { message: '游戏室不存在' });
            }

            // 检查权限
            console.log(`[GameManager] 获取用户数据: ${socket.user._id}`);
            const stats = await this.getUserStats(socket.user._id);
            console.log(`[GameManager] 用户评分: ${stats.rating}`);

            if (!tier.canAccess(stats.rating)) {
                console.warn(`[GameManager] 权限不足: ${stats.rating}`);
                return socket.emit('error', { code: 'TIER_RESTRICTED', message: '等级分不满足要求' });
            }

            // 查找游戏桌
            let table = tier.findTable(tableId);

            // 如果指定了ID但没找到，报错
            if (tableId && !table) {
                console.error(`[GameManager] 游戏桌不存在: ${tableId}`);
                return socket.emit('error', { message: '游戏桌不存在' });
            }

            // 如果没指定ID，找一个空闲的
            if (!table) {
                table = tier.findAvailableTable();
            }

            // 如果还是没有，创建新的
            if (!table) {
                console.log(`[GameManager] 创建新桌子`);
                table = tier.addTable();
            }

            // 尝试加入
            console.log(`[GameManager] 尝试加入桌子: ${table.tableId}`);
            const success = await table.join(socket);
            if (success) {
                console.log(`[GameManager] 加入成功`);
                socket.currentRoomId = table.tableId;
                socket.currentGameId = this.gameType;
                this.setupTableListeners(socket, table);

                // 广播房间列表更新
                this.broadcastRoomUpdate(tierId);

                // 发送当前桌子状态给该玩家
                table.sendState(socket);
            } else {
                console.warn(`[GameManager] 加入失败`);
                socket.emit('error', { message: '加入失败，房间已满' });
            }
        } catch (err) {
            console.error(`[GameManager] handleJoinTable 出错:`, err);
            socket.emit('error', { message: '加入游戏失败: ' + err.message });
        }
    }

    /**
     * 处理自动匹配请求
     */
    async handleAutoMatch(socket, settings) {
        if (!this.matchMaker) return;

        const stats = await this.getUserStats(socket.user._id);

        const result = this.matchMaker.joinQueue(this.gameType, {
            userId: socket.user._id.toString(),
            socket,
            settings,
            stats
        });

        if (result.success) {
            socket.emit('match_queue_joined', { message: '已加入匹配队列' });
        } else {
            socket.emit('match_failed', { message: result.error });
        }
    }

    /**
     * 处理取消匹配
     */
    handleCancelMatch(socket) {
        if (!this.matchMaker) return;
        this.matchMaker.leaveQueue(this.gameType, socket.user._id.toString());
        socket.emit('match_cancelled');
    }

    /**
     * 处理匹配成功
     * @param {Array} players - 玩家列表
     */
    async handleMatchFound(players) {
        // 默认放入 'free' 场，或者根据玩家等级决定
        const tierId = 'free';
        const tier = this.tiers.get(tierId);

        // 找一个空桌子
        let table = tier.findAvailableTable();
        if (!table) {
            table = tier.addTable();
        }

        console.log(`[${this.gameType}] 匹配成功，分配到桌子: ${table.tableId}`);

        // 将玩家加入桌子
        for (const p of players) {
            // 通知前端匹配成功
            p.socket.emit('match_found', {
                roomId: table.tableId,
                message: '匹配成功！'
            });

            // 执行加入逻辑
            await table.join(p.socket);
            p.socket.currentRoomId = table.tableId;
            p.socket.currentGameId = this.gameType;
            this.setupTableListeners(p.socket, table);

            // 自动准备
            table.playerReady(p.socket);
        }
    }

    /**
     * 设置游戏桌相关的Socket监听
     */
    setupTableListeners(socket, table) {
        // 游戏移动
        socket.on(`${this.gameType}_move`, (move) => {
            if (table.handleMove) table.handleMove(socket, move);
        });

        // 离开游戏
        socket.on(`${this.gameType}_leave`, () => {
            table.leave(socket);
            socket.currentRoomId = null;
            socket.currentGameId = null;
            this.broadcastRoomUpdate(table.tier);
        });

        // 准备/取消准备
        socket.on('player_ready', () => table.playerReady(socket));
        // socket.on('player_unready', () => table.playerUnready(socket)); // 如果需要

        // 断线处理
        socket.removeAllListeners('disconnect');
        socket.on('disconnect', () => {
            this.onPlayerDisconnect(socket);
        });
    }

    /**
     * 处理玩家断线
     */
    onPlayerDisconnect(socket) {
        // 从匹配队列移除
        if (this.matchMaker) {
            this.matchMaker.leaveQueue(this.gameType, socket.user._id.toString());
        }

        // 如果在游戏中，通知桌子
        if (socket.currentRoomId) {
            // 这里的逻辑稍微复杂，因为我们需要找到桌子
            // 简单起见，我们遍历所有桌子找（或者维护一个 socketId -> table 映射）
            // 由于 socket.currentRoomId 存储了 tableId，我们可以尝试解析
            // tableId 格式: gameType_tierId_index
            const parts = socket.currentRoomId.split('_');
            if (parts.length >= 3) {
                const tierId = parts[1];
                const tier = this.tiers.get(tierId);
                if (tier) {
                    const table = tier.findTable(socket.currentRoomId);
                    if (table) {
                        table.leave(socket);
                        this.broadcastRoomUpdate(tierId);
                    }
                }
            }
        }
    }

    /**
     * 获取用户统计数据
     */
    async getUserStats(userId) {
        let stats = await UserGameStats.findOne({ userId, gameType: this.gameType });
        if (!stats) {
            stats = { rating: 1200 }; // 默认值
        }
        return stats;
    }
}

module.exports = GameManager;
