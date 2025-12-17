const GameCenter = require('../../../gamecore/hierarchy/GameCenter');
const ChineseChessTable = require('./ChineseChessTable');
const ChineseChessRoom = require('./ChineseChessRoom');

/**
 * 中国象棋游戏中心 (ChineseChessCenter)
 * 继承自 GameCenter，负责管理所有中国象棋相关的游戏资源
 * 
 * 主要职责：
 * 1. 初始化中国象棋的各个游戏房间（免豆室、初级室等）
 * 2. 处理玩家进入象棋游戏中心的请求
 * 3. 协调匹配系统为象棋玩家匹配对手
 */
class ChineseChessCenter extends GameCenter {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {Object} matchMaker - 匹配器实例
     * @param {Object} roomLevelMatchMaker - 房间级别匹配器实例
     */
    constructor(io, matchMaker, roomLevelMatchMaker = null) {
        // 调用父类构造函数
        // 参数：io, 游戏类型标识, 游戏桌类, 匹配器
        super(io, 'chinesechess', ChineseChessTable, matchMaker);
        
        // 房间级别匹配器
        this.roomLevelMatchMaker = roomLevelMatchMaker;
        
        // 注册房间级别匹配处理器
        if (this.roomLevelMatchMaker) {
            this.roomLevelMatchMaker.registerHandler(this.gameType, async (players, roomId) => {
                try {
                    await this.handleRoomMatchFound(players, roomId);
                } catch (err) {
                    console.error(`[${this.gameType}] handleRoomMatchFound error:`, err);
                    players.forEach(p => {
                        p.socket?.emit('match_failed', { message: '匹配处理失败: ' + err.message });
                    });
                }
            });
        }
        
        console.log('[ChineseChessCenter] 中国象棋游戏中心已初始化');
    }

    /**
     * 重写创建游戏房间方法
     * 使用 ChineseChessRoom 而不是通用的 GameRoom
     */
    createGameRoom(id, name, minRating, maxRating) {
        const gameRoom = new ChineseChessRoom(id, name, (tableId, roomType) => {
            // 工厂函数：创建象棋游戏桌实例
            const table = new this.TableClass(this.io, tableId, this.gameType, 2, roomType);
            table.gameCenter = this;
            return table;
        });

        gameRoom.setAccessRule(minRating, maxRating);
        gameRoom.initTables(3); // 创建3张桌子

        // 可以设置象棋特有的规则
        // gameRoom.setChessRules({
        //     timeLimit: 60,
        //     allowUndo: true,
        //     allowDraw: true
        // });

        this.gameRooms.set(id, gameRoom);
        console.log(`[ChineseChessCenter] 创建象棋房间: ${name} (${id})`);
    }

    /**
     * 重写初始化游戏房间方法
     * 可以自定义中国象棋的游戏房间配置
     */
    initGameRooms() {
        // 免豆室 - 无等级分限制
        this.createGameRoom('free', '免豆室', 0, Infinity);

        // 初级室 - 1500分以下
        this.createGameRoom('beginner', '初级室', 0, 1500);

        // 中级室 - 1500-1800分
        this.createGameRoom('intermediate', '中级室', 1500, 1800);

        // 高级室 - 1800分以上
        this.createGameRoom('advanced', '高级室', 1800, Infinity);

        console.log('[ChineseChessCenter] 游戏房间初始化完成');
    }

    /**
     * 玩家进入中国象棋游戏中心
     */
    playerJoinGameCenter(socket) {
        console.log(`[${this.gameType}] 玩家进入游戏中心: ${socket.user.username}, socketId: ${socket.id}`);

        // 🔧 关键修复：检查是否已经注册过监听器，防止重复注册
        const listenerKey = `__has_${this.gameType}_center_listeners`;
        if (socket[listenerKey]) {
            console.log(`[${this.gameType}] Center listeners already registered for socket ${socket.id}, skipping`);
            return;
        }
        socket[listenerKey] = true;
        console.log(`[${this.gameType}] 正在为 socket ${socket.id} 注册事件监听器...`);

        // 调试：监听所有事件
        socket.onAny((eventName, ...args) => {
            if (eventName.includes('quick_match') || eventName.includes('room_quick')) {
                console.log(`[${this.gameType}] 收到事件 (onAny): ${eventName}`, args);
            }
        });

        // ========== GameRoom 层事件监听 ==========
        // 为所有房间设置监听器
        for (const room of this.gameRooms.values()) {
            room.setupRoomListeners(socket, this.gameType);
        }

        // ========== GameCenter 层事件监听 ==========

        // 1. 监听获取房间列表请求
        socket.on(`${this.gameType}_get_rooms`, (data = {}) => {
            const { tier, roomType } = data;
            this.handleGetRooms(socket, roomType || tier);
        });

        // 1.5 监听获取用户统计请求
        socket.on(`${this.gameType}_get_stats`, async () => {
            try {
                const stats = await this.getUserStats(socket.user._id);
                socket.emit('user_stats', stats);
            } catch (err) {
                console.error(`[${this.gameType}] 获取用户统计失败:`, err);
            }
        });

        // 2. 监听加入游戏桌请求 (手动加入)
        socket.on(`${this.gameType}_join`, async (data) => {
            console.log(`[${this.gameType}] Received join request:`, data, 'User:', socket.user?.username);
            const { tier, roomType, roomId: tableId } = data;
            const type = roomType || tier;

            try {
                const gameRoom = this.gameRooms.get(type);
                if (!gameRoom) {
                    return socket.emit('error', { message: '游戏房间不存在' });
                }

                // 完全委托给 GameRoom 处理
                const result = await gameRoom.assignPlayerToTable(socket, tableId);

                if (result.success) {
                    socket.currentRoomId = result.tableId;
                    socket.currentGameId = this.gameType;
                    this.broadcastRoomList(type);
                }
            } catch (err) {
                console.error(`[${this.gameType}] 加入游戏失败:`, err);
                socket.emit('error', { message: '加入游戏失败: ' + err.message });
            }
        });

        // 3. 监听自动匹配请求（全局匹配 - 保留但可能不再使用）
        socket.on('auto_match', (settings) => {
            this.handleAutoMatch(socket, settings);
        });

        // 4. 监听取消匹配（全局匹配）
        socket.on('cancel_match', () => {
            this.handleCancelMatch(socket);
        });

        // 5. 房间级别快速匹配
        const quickMatchEvent = `${this.gameType}_room_quick_match`;
        console.log(`[${this.gameType}] 注册事件监听器: ${quickMatchEvent}`);
        socket.on(quickMatchEvent, async (data) => {
            console.log(`[${this.gameType}] 收到房间快速匹配请求:`, data, 'from user:', socket.user?.username);
            await this.handleRoomQuickMatch(socket, data);
        });

        // 6. 取消房间级别匹配
        const cancelMatchEvent = `${this.gameType}_cancel_room_quick_match`;
        console.log(`[${this.gameType}] 注册事件监听器: ${cancelMatchEvent}`);
        socket.on(cancelMatchEvent, () => {
            console.log(`[${this.gameType}] 收到取消房间匹配请求 from user:`, socket.user?.username);
            this.handleCancelRoomQuickMatch(socket);
        });
        
        console.log(`[${this.gameType}] 事件监听器注册完成 for socket ${socket.id}`);
    }

    /**
     * 处理获取房间列表
     */
    handleGetRooms(socket, roomType) {
        console.log(`[ChineseChessCenter] handleGetRooms called with roomType: ${roomType}`);

        // If no roomType specified, return list of all rooms
        if (!roomType) {
            const rooms = [];
            for (const room of this.gameRooms.values()) {
                rooms.push(room.getRoomInfo());
            }
            return socket.emit('room_list', rooms);
        }

        const gameRoom = this.gameRooms.get(roomType);
        if (!gameRoom) {
            return socket.emit('error', { message: '无效的游戏房间' });
        }

        // 加入广播房间
        const broadcastRoom = `${this.gameType}_${roomType}`;
        socket.join(broadcastRoom);

        socket.emit('table_list', gameRoom.getTableList());
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
        // 计算玩家平均分
        const totalRating = players.reduce((sum, p) => sum + (p.stats.rating || 0), 0);
        const avgRating = totalRating / players.length;

        // 根据平均分决定房间类型
        let roomType = 'free';
        if (avgRating < 1500) {
            roomType = 'beginner';
        } else if (avgRating < 1800) {
            roomType = 'intermediate';
        } else {
            roomType = 'advanced';
        }

        console.log(`[${this.gameType}] 匹配成功 (平均分: ${avgRating.toFixed(0)}), 分配到: ${roomType}`);

        const gameRoom = this.gameRooms.get(roomType);
        if (!gameRoom) {
            console.error(`[ChineseChessCenter] 找不到房间: ${roomType}, 降级到 free`);
            roomType = 'free';
        }

        const targetRoom = this.gameRooms.get(roomType);

        // 找一个空桌子
        let table = targetRoom.findAvailableTable();
        if (!table) {
            table = targetRoom.addTable();
        }

        console.log(`[${this.gameType}] 分配桌子: ${table.tableId}`);

        // 将玩家加入桌子
        for (const p of players) {
            // 通知前端匹配成功
            p.socket.emit('match_found', {
                roomId: table.tableId,
                message: '匹配成功！正在进入游戏...'
            });

            // 执行加入逻辑 - 使用 joinTable 方法，canPlay = true
            await table.joinTable(p.socket, true);

            p.socket.currentRoomId = table.tableId;
            p.socket.currentGameId = this.gameType;

            // 自动准备
            table.playerReady(p.socket);
        }
    }

    /**
     * 处理玩家断线
     */
    onPlayerDisconnect(socket) {
        // 从匹配队列移除
        if (this.matchMaker) {
            this.matchMaker.leaveQueue(this.gameType, socket.user._id.toString());
        }
        
        // 从房间级别匹配队列移除
        if (this.roomLevelMatchMaker) {
            this.roomLevelMatchMaker.removeFromAllQueues(this.gameType, socket.user._id.toString());
        }

        // 注意：游戏中的断线现在由 GameTable 自己处理
    }

    /**
     * 处理房间级别快速匹配请求
     * @param {Object} socket - Socket 实例
     * @param {Object} data - 包含 roomId 的数据
     */
    async handleRoomQuickMatch(socket, data) {
        const { roomId } = data;
        console.log(`[${this.gameType}] handleRoomQuickMatch - roomId: ${roomId}, roomLevelMatchMaker exists: ${!!this.roomLevelMatchMaker}`);
        
        if (!this.roomLevelMatchMaker) {
            console.log(`[${this.gameType}] 匹配服务未启用`);
            socket.emit('match_failed', { message: '匹配服务未启用' });
            return;
        }

        if (!roomId) {
            console.log(`[${this.gameType}] 未指定房间`);
            socket.emit('match_failed', { message: '未指定房间' });
            return;
        }

        // 检查房间是否存在
        const gameRoom = this.gameRooms.get(roomId);
        console.log(`[${this.gameType}] 查找房间 ${roomId}, 找到: ${!!gameRoom}, 所有房间: ${Array.from(this.gameRooms.keys()).join(', ')}`);
        if (!gameRoom) {
            socket.emit('match_failed', { message: '游戏房间不存在' });
            return;
        }

        // 获取玩家统计数据
        const stats = await this.getUserStats(socket.user._id);
        console.log(`[${this.gameType}] 玩家统计: rating=${stats.rating}`);
        
        // 检查玩家是否满足房间要求
        if (!gameRoom.canAccess(stats.rating)) {
            socket.emit('match_failed', { 
                message: `您的等级分 ${stats.rating} 不符合 ${gameRoom.name} 的要求` 
            });
            return;
        }

        // 加入房间匹配队列
        const result = this.roomLevelMatchMaker.joinRoomQueue(this.gameType, roomId, {
            userId: socket.user._id.toString(),
            socket,
            stats
        });
        console.log(`[${this.gameType}] joinRoomQueue 结果:`, result);

        if (result.success) {
            socket.emit('room_match_queue_joined', { 
                message: `已加入 ${gameRoom.name} 匹配队列`,
                roomId: roomId
            });
        } else {
            socket.emit('match_failed', { message: result.error });
        }
    }

    /**
     * 处理取消房间级别匹配
     * @param {Object} socket - Socket 实例
     */
    handleCancelRoomQuickMatch(socket) {
        if (!this.roomLevelMatchMaker) return;
        
        this.roomLevelMatchMaker.removeFromAllQueues(this.gameType, socket.user._id.toString());
        socket.emit('room_match_cancelled', { message: '已取消匹配' });
    }

    /**
     * 处理房间级别匹配成功
     * @param {Array} players - 匹配成功的玩家列表
     * @param {string} roomId - 房间ID
     */
    async handleRoomMatchFound(players, roomId) {
        console.log(`[${this.gameType}] 房间匹配成功 (${roomId}): ${players.map(p => p.userId).join(' vs ')}`);

        const gameRoom = this.gameRooms.get(roomId);
        if (!gameRoom) {
            console.error(`[ChineseChessCenter] 找不到房间: ${roomId}`);
            players.forEach(p => {
                p.socket.emit('match_failed', { message: '游戏房间不存在' });
            });
            return;
        }

        // 找一个空桌子或创建新桌子
        let table = gameRoom.findAvailableTable();
        if (!table) {
            table = gameRoom.addTable();
        }

        console.log(`[${this.gameType}] 分配桌子: ${table.tableId}`);

        // 将玩家加入桌子
        for (const p of players) {
            // 🔧 关键：先让玩家加入房间级别的广播室，确保能收到状态更新
            const broadcastRoom = `${this.gameType}_${roomId}`;
            p.socket.join(broadcastRoom);
            console.log(`[${this.gameType}] 玩家 ${p.userId} 加入广播室: ${broadcastRoom}`);
            
            // 通知前端匹配成功
            p.socket.emit('match_found', {
                roomId: table.tableId,
                tableId: table.tableId,
                roomType: roomId,
                message: '匹配成功！正在进入游戏...'
            });

            // 执行加入逻辑 - 使用 joinTable 方法，canPlay = true
            await table.joinTable(p.socket, true);

            p.socket.currentRoomId = table.tableId;
            p.socket.currentGameId = this.gameType;

            // 自动准备
            table.playerReady(p.socket);
        }

        // 广播房间列表更新
        this.broadcastRoomList(roomId);
    }
}

module.exports = ChineseChessCenter;
