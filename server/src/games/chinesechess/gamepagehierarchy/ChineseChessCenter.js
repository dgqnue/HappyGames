const GameCenter = require('../../../core/hierarchy/GameCenter');
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
        gameRoom.initTables(3); // 默认创建3张桌子

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
     * 重写处理玩家加入的逻辑
     * 添加中国象棋特有的事件监听
     */
    onPlayerJoin(socket) {
        console.log(`[${this.gameType}] 玩家进入游戏大厅: ${socket.user.username}`);

        // 1. 监听获取房间列表请求
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

        // 5. 添加中国象棋特有的事件监听
        socket.on('request_undo', () => {
            // TODO: 实现悔棋逻辑
            console.log('[ChineseChess] 玩家请求悔棋');
        });

        socket.on('request_draw', () => {
            // TODO: 实现求和逻辑
            console.log('[ChineseChess] 玩家请求求和');
        });
    }

    /**
     * 处理获取房间列表
     */
    handleGetRooms(socket, roomType) {
        console.log(`[ChineseChessCenter] handleGetRooms called with roomType: ${roomType}`);
        console.log(`[ChineseChessCenter] Available game rooms:`, Array.from(this.gameRooms.keys()));

        const gameRoom = this.gameRooms.get(roomType);
        if (!gameRoom) {
            console.error(`[ChineseChessCenter] Game room not found for roomType: ${roomType}`);
            return socket.emit('error', { message: '无效的游戏房间' });
        }

        // 加入广播房间，以便接收列表更新
        const broadcastRoom = `${this.gameType}_${roomType}`;
        socket.join(broadcastRoom);
        console.log(`[ChineseChessCenter] Socket joined broadcast room: ${broadcastRoom}`);

        const tableList = gameRoom.getTableList();
        console.log(`[ChineseChessCenter] Sending table list:`, tableList);
        socket.emit('room_list', tableList);
    }

    /**
     * 处理加入游戏桌
     */
    async handleJoinTable(socket, { tier, roomType, roomId: tableId }) {
        // 兼容旧参数 tier
        const type = roomType || tier;
        console.log(`[ChineseChessCenter] handleJoinTable: roomType=${type}, table=${tableId}, user=${socket.user.username}`);

        try {
            const gameRoom = this.gameRooms.get(type);
            if (!gameRoom) {
                console.error(`[ChineseChessCenter] 游戏房间不存在: ${type}`);
                return socket.emit('error', { message: '游戏房间不存在' });
            }

            // 检查权限
            console.log(`[ChineseChessCenter] 获取用户数据: ${socket.user._id}`);
            const stats = await this.getUserStats(socket.user._id);
            console.log(`[ChineseChessCenter] 用户评分: ${stats.rating}`);

            if (!gameRoom.canAccess(stats.rating)) {
                console.warn(`[ChineseChessCenter] 权限不足: ${stats.rating}`);
                return socket.emit('error', { code: 'TIER_RESTRICTED', message: '等级分不满足要求' });
            }

            // 查找游戏桌
            let table = gameRoom.findTable(tableId);

            // 如果指定了ID但没找到，报错
            if (tableId && !table) {
                console.error(`[ChineseChessCenter] 游戏桌不存在: ${tableId}`);
                return socket.emit('error', { message: '游戏桌不存在' });
            }

            // 如果没指定ID，找一个空闲的
            if (!table) {
                table = gameRoom.findAvailableTable();
            }

            // 如果还是没有，创建新的
            if (!table) {
                console.log(`[ChineseChessCenter] 创建新桌子`);
                table = gameRoom.addTable();
            }

            // 尝试加入
            console.log(`[ChineseChessCenter] 尝试加入桌子: ${table.tableId}`);
            const success = await table.join(socket);
            if (success) {
                console.log(`[ChineseChessCenter] 加入成功`);
                socket.currentRoomId = table.tableId;
                socket.currentGameId = this.gameType;
                this.setupTableListeners(socket, table);

                // 广播房间列表更新
                this.broadcastRoomList(type);

                // 发送当前桌子状态给该玩家
                table.sendState(socket);
            } else {
                console.warn(`[ChineseChessCenter] 加入失败`);
                socket.emit('error', { message: '加入失败，房间已满' });
            }
        } catch (err) {
            console.error(`[ChineseChessCenter] handleJoinTable 出错:`, err);
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
            // tableId 格式: roomType_index (例如: beginner_1)
            const parts = socket.currentRoomId.split('_');
            if (parts.length >= 2) {
                const roomType = parts[0];
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
}

module.exports = ChineseChessCenter;
