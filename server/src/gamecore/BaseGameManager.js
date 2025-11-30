/**
 * 游戏管理器基类模板
 * 
 * 所有游戏管理器都应继承此类，自动获得：
 * - 游戏室和游戏桌管理
 * - Socket.IO 事件处理
 * - HTTP API 支持
 * - 等级分权限验证
 * - 玩家加入/离开处理
 * 
 * 术语说明：
 * - 游戏室 (Game Room/Tier): 按等级分类的区域，如"初级室"、"中级室"
 * - 游戏桌 (Game Table): 具体的对局实例，玩家在桌上进行游戏
 * 
 * 使用方法：
 * class MyGameManager extends BaseGameManager {
 *     constructor(io) {
 *         super(io, 'mygame', MyGameRoom);
 *     }
 * }
 */

const UserGameStats = require('../models/UserGameStats');

class BaseGameManager {
    /**
     * @param {Object} io - Socket.IO 实例
     * @param {String} gameType - 游戏类型标识（小写，下划线分隔）
     * @param {Class} RoomClass - 游戏桌类
     */
    constructor(io, gameType, RoomClass) {
        this.io = io;
        this.gameType = gameType;
        this.RoomClass = RoomClass;
        // rooms 按游戏室等级分组，每个游戏室包含多个游戏桌
        this.rooms = {
            free: [],      // 免豆室的游戏桌列表
            beginner: [],  // 初级室的游戏桌列表
            intermediate: [], // 中级室的游戏桌列表
            advanced: []   // 高级室的游戏桌列表
        };
        this.initRooms();
    }

    /**
     * 初始化游戏桌
     * 为每个游戏室等级创建初始游戏桌
     */
    initRooms() {
        const tiers = ['free', 'beginner', 'intermediate', 'advanced'];
        console.log(`[${this.gameType}] Initializing game tables for all tiers...`);

        tiers.forEach(tier => {
            const initialRoomCount = this.getInitialRoomCount(tier);
            for (let i = 0; i < initialRoomCount; i++) {
                const roomId = `${this.gameType}_${tier}_${i}`;
                // ChineseChessRoom 的构造函数是 (io, roomId, tier)
                // 它会在内部调用 super(io, roomId, 'chinesechess', 2, tier)
                const room = new this.RoomClass(this.io, roomId, tier);
                room.gameManager = this; // 设置游戏管理器引用
                this.rooms[tier].push(room);
                console.log(`[${this.gameType}] Created game table: ${roomId} in ${tier} room`);
            }
        });

        console.log(`[${this.gameType}] Total game tables created: ${Object.values(this.rooms).flat().length}`);
    }

    /**
     * 获取每个游戏室的初始游戏桌数量
     * 子类可以重写此方法自定义数量
     */
    getInitialRoomCount(tier) {
        return 3; // 默认每个游戏室3个游戏桌
    }

    /**
     * 玩家加入游戏管理器
     * 由 SocketDispatcher 调用
     */
    onPlayerJoin(socket, user) {
        console.log(`[${this.gameType}] Player ${user.username} joined game manager`);

        // 监听获取游戏桌列表请求（指定游戏室）
        socket.on('get_rooms', ({ tier }) => {
            this.handleGetRooms(socket, user, tier);
        });

        // 监听加入游戏桌请求
        socket.on(`${this.gameType}_join`, (data) => {
            this.handleJoin(socket, data);
        });
    }

    /**
     * 处理获取游戏桌列表请求
     * @param {String} tier - 游戏室等级 (free/beginner/intermediate/advanced)
     */
    handleGetRooms(socket, user, tier) {
        console.log(`[${this.gameType}] Player ${user.username} requested tables for game room: ${tier}`);

        // 让客户端加入广播房间，以便接收房间列表更新
        const broadcastRoom = `${this.gameType}_${tier}`;
        socket.join(broadcastRoom);
        console.log(`[${this.gameType}] Socket ${socket.id} joined broadcast room: ${broadcastRoom}`);

        if (this.rooms[tier]) {
            const roomList = this.getRoomList(tier);
            console.log(`[${this.gameType}] Sending ${roomList.length} tables from ${tier} room to player`);
            socket.emit('room_list', roomList);
        } else {
            console.error(`[${this.gameType}] Invalid game room tier requested: ${tier}`);
            socket.emit('room_list', []);
        }
    }

    /**
     * 处理玩家加入游戏桌请求
     */
    async handleJoin(socket, data) {
        console.log(`[${this.gameType}] handleJoin called`);
        console.log(`[${this.gameType}] - socket.user:`, socket.user);
        console.log(`[${this.gameType}] - data:`, data);

        const { tier, roomId } = data;

        console.log(`[${this.gameType}] - tier:`, tier);
        console.log(`[${this.gameType}] - roomId:`, roomId);

        // 获取用户等级分
        console.log(`[${this.gameType}] Fetching user stats...`);
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });
        const rating = stats ? stats.rating : 1200;
        console.log(`[${this.gameType}] User rating:`, rating);

        // 验证等级分权限
        console.log(`[${this.gameType}] Checking tier access...`);
        if (!this.canAccessTier(tier, rating)) {
            console.log(`[${this.gameType}] Access denied for tier:`, tier);
            socket.emit('error', {
                code: 'TIER_RESTRICTED',
                message: 'Your rating does not allow access to this game room tier.'
            });
            return;
        }
        console.log(`[${this.gameType}] Tier access granted`);

        // 检查是否已经在房间中
        if (socket.currentRoomId) {
            console.log(`[${this.gameType}] Player already in room: ${socket.currentRoomId}`);
            // 如果已经在当前房间，可能只是重连，允许继续
            if (socket.currentRoomId === roomId) {
                // 允许重连逻辑（如果需要）
            } else {
                socket.emit('error', {
                    code: 'ALREADY_IN_ROOM',
                    message: '您已在其他游戏桌中，请先退出。'
                });
                return;
            }
        }

        // 查找或创建游戏桌
        console.log(`[${this.gameType}] Finding room...`);
        let room = this.findRoom(tier, roomId);
        console.log(`[${this.gameType}] Room found:`, room ? room.roomId : 'null');

        if (!room) {
            if (roomId) {
                console.error(`[${this.gameType}] Room not found:`, roomId);
                return socket.emit('error', { message: 'Game table not found' });
            }
            // 创建新游戏桌（自动匹配时）
            console.log(`[${this.gameType}] Creating new room...`);
            room = this.createRoom(tier);
        }

        // 设置事件监听
        console.log(`[${this.gameType}] Setting up room listeners...`);
        this.setupRoomListeners(socket, room);

        // 加入游戏桌
        console.log(`[${this.gameType}] Calling room.join()...`);
        try {
            const success = await room.join(socket);
            if (success) {
                console.log(`[${this.gameType}] Player joined successfully`);
                socket.currentRoomId = room.roomId;
                socket.currentGameId = this.gameType;
            } else {
                console.log(`[${this.gameType}] Player join failed (logic)`);
            }
        } catch (error) {
            console.error(`[${this.gameType}] Error joining room:`, error);
            socket.emit('error', { message: 'Failed to join game table' });
        }
    }

    /**
     * 查找游戏桌
     */
    findRoom(tier, roomId) {
        if (roomId) {
            // 加入指定游戏桌
            return this.rooms[tier].find(r => r.roomId === roomId);
        } else {
            // 自动匹配：查找第一个可用游戏桌
            return this.rooms[tier].find(r => r.status === 'waiting' && r.canJoin());
        }
    }

    /**
     * 创建新游戏桌
     */
    createRoom(tier) {
        const newRoomId = `${this.gameType}_${tier}_${this.rooms[tier].length}`;
        // ChineseChessRoom 的构造函数是 (io, roomId, tier)
        const room = new this.RoomClass(this.io, newRoomId, tier);
        this.rooms[tier].push(room);
        console.log(`[${this.gameType}] Created new game table: ${newRoomId}`);
        return room;
    }

    /**
     * 设置游戏桌相关的 Socket 事件监听
     */
    setupRoomListeners(socket, room) {
        // 监听游戏移动
        socket.on(`${this.gameType}_move`, (move) => {
            room.handleMove(socket, move);
        });

        // 监听主动离开游戏桌
        socket.on(`${this.gameType}_leave`, () => {
            console.log(`[${this.gameType}] Player ${socket.user.username} leaving table voluntarily`);
            room.leave(socket);
            socket.currentRoomId = null;
            socket.currentGameId = null;
        });

        // 监听玩家准备
        socket.on('player_ready', () => {
            if (room.playerReady) {
                room.playerReady(socket);
            }
        });

        // 监听玩家取消准备
        socket.on('player_unready', () => {
            if (room.playerUnready) {
                room.playerUnready(socket);
            }
        });

        // 监听旁观请求
        socket.on('spectate', (data) => {
            if (room.spectatorJoin) {
                room.spectatorJoin(socket);
            }
        });

        // 监听断线
        // 注意：这会移除 SocketDispatcher 的 disconnect 监听器
        socket.removeAllListeners('disconnect');
        socket.on('disconnect', () => {
            this.handleDisconnect(socket, room);
        });
    }

    /**
     * 处理玩家断线
     */
    handleDisconnect(socket, room) {
        console.log(`[${this.gameType}] Player ${socket.user.username} disconnected`);

        if (room) {
            room.handlePlayerDisconnect(socket);
        }
        socket.currentRoomId = null;
        socket.currentGameId = null;
    }

    /**
     * 验证玩家是否有权限进入指定游戏室
     * @param {String} tier - 游戏室等级
     * @param {Number} rating - 玩家等级分
     * 子类可以重写此方法自定义权限规则
     */
    canAccessTier(tier, rating) {
        switch (tier) {
            case 'free':
                return true;
            case 'beginner':
                return rating < 1500;
            case 'intermediate':
                return rating >= 1500 && rating <= 1800;
            case 'advanced':
                return rating > 1800;
            default:
                return false;
        }
    }

    /**
     * 获取指定游戏室的游戏桌列表
     * @param {String} tier - 游戏室等级
     * 用于 HTTP API 和 Socket.IO
     */
    getRoomList(tier) {
        console.log(`[${this.gameType}] getRoomList called for game room: ${tier}`);
        console.log(`[${this.gameType}] Tables in ${tier} room:`, this.rooms[tier].length);

        const roomList = this.rooms[tier].map(room => ({
            id: room.roomId,
            status: room.status,
            players: room.getPlayerCount ? room.getPlayerCount() : this.getPlayerCount(room),
            spectators: room.spectators ? room.spectators.length : 0
        }));

        console.log(`[${this.gameType}] Returning ${roomList.length} tables from ${tier} room:`, JSON.stringify(roomList));
        return roomList;
    }

    /**
     * 获取游戏桌玩家数量（默认实现）
     * 如果游戏桌类没有 getPlayerCount 方法，使用此方法
     */
    getPlayerCount(room) {
        if (room.players) {
            return Object.keys(room.players).filter(k => room.players[k]).length;
        }
        return 0;
    }

    /**
     * 广播房间列表更新到所有在该 tier 的客户端
     * @param {String} tier - 游戏室等级
     */
    broadcastRoomList(tier) {
        console.log(`[${this.gameType}] broadcastRoomList called for tier: ${tier}`);

        if (!this.rooms[tier]) {
            console.warn(`[${this.gameType}] No rooms found for tier: ${tier}`);
            return;
        }

        const roomList = this.getRoomList(tier);
        console.log(`[${this.gameType}] Broadcasting room_list update for ${tier}:`, roomList.length, 'rooms');
        console.log(`[${this.gameType}] Room list content:`, JSON.stringify(roomList));

        // 向所有连接到该游戏的客户端广播
        // 使用游戏类型作为房间名，所有玩该游戏的客户端都会加入这个房间
        const broadcastRoom = `${this.gameType}_${tier}`;
        console.log(`[${this.gameType}] Broadcasting to room: ${broadcastRoom}`);
        this.io.to(broadcastRoom).emit('room_list', roomList);
        console.log(`[${this.gameType}] Broadcast complete`);
    }

    /**
     * 【匹配系统模板方法】
     * 处理匹配成功 - 通用逻辑
     * 子类可以重写此方法来自定义匹配行为
     * 
     * @param {Array} players - 匹配成功的玩家列表
     * @param {String} tier - 游戏室等级，默认 'free'
     */
    async handleMatchFound(players, tier = 'free') {
        try {
            console.log(`[${this.gameType}] Match found for ${players.length} players in ${tier} tier`);

            // 1. 先查找现有的空闲游戏桌（idle 状态且无玩家）
            let room = this.findAvailableRoom(tier);

            if (room) {
                console.log(`[${this.gameType}] Reusing existing idle table ${room.roomId}`);
            } else {
                // 2. 如果没有空闲桌，创建新游戏桌
                const nextNumber = this.findNextAvailableNumber(tier);
                const roomId = `${this.gameType}_${tier}_${nextNumber}`;

                // 创建游戏桌实例
                room = new this.RoomClass(this.io, roomId, tier);
                room.gameManager = this; // 设置游戏管理器引用

                // 将游戏桌添加到对应游戏室
                if (!this.rooms[tier]) {
                    this.rooms[tier] = [];
                }
                this.rooms[tier].push(room);

                console.log(`[${this.gameType}] Created new game table ${roomId} for matched players`);
            }

            // 3. 将玩家加入游戏桌
            for (const player of players) {
                const success = await room.playerJoin(player.socket, player.matchSettings);
                if (success) {
                    player.socket.emit('match_found', {
                        roomId: room.roomId,
                        message: '匹配成功！'
                    });
                } else {
                    console.error(`[${this.gameType}] Failed to add matched player ${player.userId} to game table ${room.roomId}`);
                }
            }

            // 4. 匹配成功后直接开始游戏
            this.autoStartGame(room);

        } catch (error) {
            console.error(`[${this.gameType}] Error handling match found:`, error);
        }
    }

    /**
     * 【匹配系统模板方法】
     * 查找可用的空闲游戏桌
     * 
     * @param {String} tier - 游戏室等级
     * @returns {Object|null} - 可用的游戏桌或 null
     */
    findAvailableRoom(tier) {
        const existingRooms = this.rooms[tier] || [];

        for (const existingRoom of existingRooms) {
            if (existingRoom.matchState.status === 'idle' && existingRoom.matchState.players.length === 0) {
                // 子类可以重写此方法添加更多匹配条件检查
                return existingRoom;
            }
        }

        return null;
    }

    /**
     * 【匹配系统模板方法】
     * 查找最小的可用编号（填补删除游戏桌留下的空缺）
     * 
     * @param {String} tier - 游戏室等级
     * @returns {Number} - 下一个可用编号
     */
    findNextAvailableNumber(tier) {
        const existingRooms = this.rooms[tier] || [];

        // 提取所有现有编号并排序
        const existingNumbers = existingRooms.map(r => {
            const parts = r.roomId.split('_');
            return parseInt(parts[parts.length - 1]);
        }).sort((a, b) => a - b);

        // 查找第一个不连续的编号
        let nextNumber = 0;
        for (let i = 0; i < existingNumbers.length; i++) {
            if (existingNumbers[i] !== i) {
                nextNumber = i;
                break;
            }
        }

        // 如果所有编号都连续，使用下一个编号
        if (nextNumber === 0 && existingNumbers.length > 0 && existingNumbers[0] === 0) {
            nextNumber = existingNumbers.length;
        }

        return nextNumber;
    }

    /**
     * 【匹配系统模板方法】
     * 自动开始游戏（跳过准备检查）
     * 子类可以重写此方法来自定义自动开始行为
     * 
     * @param {Object} room - 游戏桌实例
     */
    autoStartGame(room) {
        // 设置所有玩家为已准备
        room.matchState.players.forEach(p => p.ready = true);

        // 延迟1秒后自动开始游戏，让客户端有时间准备
        setTimeout(() => {
            if (room.matchState.players.length === room.maxPlayers) {
                console.log(`[${this.gameType}] Auto-starting game for matched players in room ${room.roomId}`);
                room.startGame();
            }
        }, 1000);
    }
}

module.exports = BaseGameManager;
