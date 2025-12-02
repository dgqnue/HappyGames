const UserGameStats = require('../../models/UserGameStats');
const GameRoom = require('./GameRoom');

/**
 * 游戏中心 (GameCenter)
 * 负责管理特定类型游戏的所有资源和流程
 * 
 * 主要职责：
 * 1. 管理下属的所有游戏房间 (GameRooms) - 如初级室、高级室
 * 2. 处理玩家进入游戏中心的请求
 * 3. 协调匹配系统和游戏桌 (GameTables)
 * 4. 处理Socket事件路由
 */
class GameCenter {
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

        // 游戏房间列表 Map<roomType, GameRoom>
        this.gameRooms = new Map();

        // 初始化默认游戏房间
        this.initGameRooms();

        // 注册匹配回调
        if (this.matchMaker) {
            this.matchMaker.registerHandler(this.gameType, (players) => {
                this.handleMatchFound(players);
            });
        }
    }

    /**
     * 初始化游戏房间
     * 子类可重写此方法自定义游戏房间
     */
    initGameRooms() {
        this.createGameRoom('free', '免豆室', 0, Infinity);
        this.createGameRoom('beginner', '初级室', 0, 1500);
        this.createGameRoom('intermediate', '中级室', 1500, 1800);
        this.createGameRoom('advanced', '高级室', 1800, Infinity);
    }

    /**
     * 创建游戏房间
     */
    createGameRoom(id, name, minRating, maxRating) {
        const gameRoom = new GameRoom(id, name, (tableId, roomType) => {
            // 工厂函数：创建具体的游戏桌实例
            // MatchableGameTable signature: (io, tableId, gameType, maxPlayers, roomType)
            // 注意：MatchableGameTable 的构造函数参数名之前是 tier，现在对应 roomType
            const table = new this.TableClass(this.io, tableId, this.gameType, 2, roomType);
            table.gameCenter = this; // Set gameCenter reference
            return table;
        });

        gameRoom.setAccessRule(minRating, maxRating);
        gameRoom.initTables(3); // 默认创建3张桌子

        this.gameRooms.set(id, gameRoom);
        console.log(`[GameCenter] 创建游戏房间: ${name} (${id})`);
    }

    /**
     * 处理玩家进入游戏模块
     * @param {Object} socket 
     */
    onPlayerJoin(socket) {
        console.log(`[${this.gameType}] 玩家进入游戏大厅: ${socket.user.username}`);

        // 1. 监听获取房间列表请求
        // 前端参数名可能还是 tier，为了兼容暂时保留或同时支持
        socket.on('get_rooms', ({ tier, roomType }) => {
            this.handleGetRooms(socket, roomType || tier);
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
    handleGetRooms(socket, roomType) {
        console.log(`[GameCenter] handleGetRooms called with roomType: ${roomType}`);
        console.log(`[GameCenter] Available game rooms:`, Array.from(this.gameRooms.keys()));

        const gameRoom = this.gameRooms.get(roomType);
        if (!gameRoom) {
            console.error(`[GameCenter] Game room not found for roomType: ${roomType}`);
            return socket.emit('error', { message: '无效的游戏房间' });
        }

        // 加入广播房间，以便接收列表更新
        // 广播房间名格式: gameType_roomType (例如: chinesechess_beginner)
        const broadcastRoom = `${this.gameType}_${roomType}`;
        socket.join(broadcastRoom);
        console.log(`[GameCenter] Socket joined broadcast room: ${broadcastRoom}`);

        const tableList = gameRoom.getTableList();
        console.log(`[GameCenter] Sending table list:`, tableList);
        socket.emit('room_list', tableList);
    }

    /**
     * 广播房间列表更新
     */
    broadcastRoomList(roomType) {
        const gameRoom = this.gameRooms.get(roomType);
        if (gameRoom) {
            const broadcastRoom = `${this.gameType}_${roomType}`;
            this.io.to(broadcastRoom).emit('room_list', gameRoom.getTableList());
        }
    }

    /**
     * 处理加入游戏桌
     */
    async handleJoinTable(socket, { tier, roomType, roomId: tableId }) {
        // 兼容旧参数 tier
        const type = roomType || tier;
        console.log(`[GameCenter] handleJoinTable: roomType=${type}, table=${tableId}, user=${socket.user.username}`);
        try {
            const gameRoom = this.gameRooms.get(type);
            if (!gameRoom) {
                console.error(`[GameCenter] 游戏房间不存在: ${type}`);
                return socket.emit('error', { message: '游戏房间不存在' });
            }

            // 检查权限
            console.log(`[GameCenter] 获取用户数据: ${socket.user._id}`);
            const stats = await this.getUserStats(socket.user._id);
            console.log(`[GameCenter] 用户评分: ${stats.rating}`);

            if (!gameRoom.canAccess(stats.rating)) {
                console.warn(`[GameCenter] 权限不足: ${stats.rating}`);
                return socket.emit('error', { code: 'TIER_RESTRICTED', message: '等级分不满足要求' });
            }

            // 查找游戏桌
            let table = gameRoom.findTable(tableId);

            // 如果指定了ID但没找到，报错
            if (tableId && !table) {
                console.error(`[GameCenter] 游戏桌不存在: ${tableId}`);
                return socket.emit('error', { message: '游戏桌不存在' });
            }

            // 如果没指定ID，找一个空闲的
            if (!table) {
                table = gameRoom.findAvailableTable();
            }

            // 如果还是没有，创建新的
            if (!table) {
                console.log(`[GameCenter] 创建新桌子`);
                table = gameRoom.addTable();
            }

            // 尝试加入
            console.log(`[GameCenter] 尝试加入桌子: ${table.tableId}`);
            const success = await table.join(socket);
            if (success) {
                console.log(`[GameCenter] 加入成功`);
                socket.currentRoomId = table.tableId;
                socket.currentGameId = this.gameType;
                this.setupTableListeners(socket, table);

                // 广播房间列表更新
                this.broadcastRoomList(type);

                // 发送当前桌子状态给该玩家
                table.sendState(socket);
            } else {
                console.warn(`[GameCenter] 加入失败`);
                socket.emit('error', { message: '加入失败，房间已满' });
            }
        } catch (err) {
            console.error(`[GameCenter] handleJoinTable 出错:`, err);
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
        const roomType = 'free';
        const gameRoom = this.gameRooms.get(roomType);

        // 找一个空桌子
        let table = gameRoom.findAvailableTable();
        if (!table) {
            table = gameRoom.addTable();
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
            // table.tier 应该是 roomType
            this.broadcastRoomList(table.tier);
        });

        // 准备/取消准备
        socket.on('player_ready', () => table.playerReady(socket));
        socket.on('player_unready', () => table.playerUnready(socket));

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
            // tableId 格式: gameType_roomType_index (例如: chinesechess_beginner_1)
            const parts = socket.currentRoomId.split('_');
            if (parts.length >= 3) {
                const roomType = parts[1];
                const gameRoom = this.gameRooms.get(roomType);
                if (gameRoom) {
                    const table = gameRoom.findTable(socket.currentRoomId);
                    if (table) {
                        table.leave(socket);
                        this.broadcastRoomList(roomType);
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

module.exports = GameCenter;
