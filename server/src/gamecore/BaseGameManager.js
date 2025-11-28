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
                // 注意：参数顺序为 (io, roomId, tier)
                const room = new this.RoomClass(this.io, roomId, tier);
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

        // 监听获取游戏桌列表请求
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
     */
    handleGetRooms(socket, user, tier) {
        console.log(`[${this.gameType}] Player ${user.username} requested tables for tier: ${tier}`);

        if (this.rooms[tier]) {
            const roomList = this.getRoomList(tier);
            console.log(`[${this.gameType}] Sending ${roomList.length} tables to player`);
            socket.emit('room_list', roomList);
        } else {
            console.error(`[${this.gameType}] Invalid tier requested: ${tier}`);
            socket.emit('room_list', []);
        }
    }

    /**
     * 处理玩家加入游戏桌请求
     */
    async handleJoin(socket, data) {
        const { tier, roomId } = data;

        // 获取用户等级分
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });
        const rating = stats ? stats.rating : 1200;

        // 验证等级分权限
        if (!this.canAccessTier(tier, rating)) {
            socket.emit('error', {
                code: 'TIER_RESTRICTED',
                message: 'Your rating does not allow access to this game room tier.'
            });
            return;
        }

        // 查找或创建游戏桌
        let room = this.findRoom(tier, roomId);

        if (!room) {
            if (roomId) {
                return socket.emit('error', { message: 'Game table not found' });
            }
            // 创建新游戏桌（自动匹配时）
            room = this.createRoom(tier);
        }

        // 设置事件监听
        this.setupRoomListeners(socket, room);

        // 加入游戏桌
        await room.join(socket);
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
        // 注意：参数顺序为 (io, roomId, tier)
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
        });

        // 监听断线
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
    }

    /**
     * 验证等级分权限
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
     * 获取游戏桌列表
     * 用于 HTTP API 和 Socket.IO
     */
    getRoomList(tier) {
        console.log(`[${this.gameType}] getRoomList called for tier: ${tier}`);
        console.log(`[${this.gameType}] Tables in tier ${tier}:`, this.rooms[tier].length);

        const roomList = this.rooms[tier].map(room => ({
            id: room.roomId,
            status: room.status,
            players: room.getPlayerCount ? room.getPlayerCount() : this.getPlayerCount(room),
            spectators: room.spectators ? room.spectators.length : 0
        }));

        console.log(`[${this.gameType}] Returning table list:`, JSON.stringify(roomList));
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
}

module.exports = BaseGameManager;
