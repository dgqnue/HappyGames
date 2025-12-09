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
     */
    constructor(io, matchMaker) {
        // 调用父类构造函数
        // 参数：io, 游戏类型标识, 游戏桌类, 匹配器
        super(io, 'chinesechess', ChineseChessTable, matchMaker);
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
        gameRoom.initTables(1); // 调试模式：只创建1张桌子

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
        console.log(`[${this.gameType}] 玩家进入游戏中心: ${socket.user.username}`);

        // ========== GameRoom 层事件监听 ==========
        // 为所有房间设置监听器
        for (const room of this.gameRooms.values()) {
            room.setupRoomListeners(socket, this.gameType);
        }

        // 自动加入本游戏中心的所有广播房间，以便接收 table_list 更新
        try {
            for (const roomType of this.gameRooms.keys()) {
                const broadcastRoom = `${this.gameType}_${roomType}`;
                socket.join(broadcastRoom);
                console.log(`[${this.gameType}] Socket ${socket.id} joined broadcast room ${broadcastRoom}`);
            }
        } catch (err) {
            console.error(`[${this.gameType}] Error joining broadcast rooms:`, err);
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

        // 3. 监听自动匹配请求
        socket.on('auto_match', (settings) => {
            this.handleAutoMatch(socket, settings);
        });

        // 4. 监听取消匹配
        socket.on('cancel_match', () => {
            this.handleCancelMatch(socket);
        });

        // 5. 添加中国象棋特有的事件监听
        // 注意：悔棋和求和现在由 GameTable 处理，这里只需要保留未进入桌子时的监听（如果有的话）
        // 或者如果客户端在进入桌子前就发送这些事件（不太可能），则需要保留。
        // 但通常这些是在游戏进行中发送的，所以应该由 GameTable 处理。
        // 为了兼容性，如果 GameTable 还没有接管，这里可以保留，但我们已经移到了 GameTable。
        // 所以这里可以移除，或者保留作为 fallback (但不建议)。
        // 我们移除它们，因为 GameTable 已经处理了。
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

            // 执行加入逻辑 - 使用 joinAsPlayer 并自动设置监听器
            await table.joinAsPlayer(p.socket);

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

        // 注意：游戏中的断线现在由 GameTable 自己处理
    }
}

module.exports = ChineseChessCenter;
