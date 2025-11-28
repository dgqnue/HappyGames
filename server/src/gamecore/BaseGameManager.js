/**
 * 游戏管理器基类模板
 * 
 * 所有游戏管理器都应继承此类，自动获得：
 * - 房间管理
 * - Socket.IO 事件处理
 * - HTTP API 支持
 * - 等级分权限验证
 * - 玩家加入/离开处理
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
     * @param {Class} RoomClass - 游戏房间类
     */
    constructor(io, gameType, RoomClass) {
        this.io = io;
        this.gameType = gameType;
        this.RoomClass = RoomClass;
        this.rooms = {
            free: [],
            beginner: [],
            intermediate: [],
            advanced: []
        };
        this.initRooms();
    }

    /**
     * 初始化房间
     * 为每个等级创建初始房间
     */
    initRooms() {
        const tiers = ['free', 'beginner', 'intermediate', 'advanced'];
        console.log(`[${this.gameType}] Initializing rooms...`);

        tiers.forEach(tier => {
            const initialRoomCount = this.getInitialRoomCount(tier);
            for (let i = 0; i < initialRoomCount; i++) {
                const roomId = `${this.gameType}_${tier}_${i}`;
                // 注意：参数顺序为 (io, roomId, tier)
                const room = new this.RoomClass(this.io, roomId, tier);
                this.rooms[tier].push(room);
                console.log(`[${this.gameType}] Created room: ${roomId}`);
            }
        });

        console.log(`[${this.gameType}] Total rooms created: ${Object.values(this.rooms).flat().length}`);
    }

    /**
     * 获取每个等级的初始房间数量
     * 子类可以重写此方法自定义房间数量
     */
    getInitialRoomCount(tier) {
        return 3; // 默认每个等级3个房间
    }

    /**
     * 玩家加入游戏
     * 由 SocketDispatcher 调用
     */
    onPlayerJoin(socket, user) {
        console.log(`[${this.gameType}] Player ${user.username} joined game manager`);

        // 监听获取房间列表请求
        socket.on('get_rooms', ({ tier }) => {
            this.handleGetRooms(socket, user, tier);
        });

        // 监听加入房间请求
        socket.on(`${this.gameType}_join`, (data) => {
            this.handleJoin(socket, data);
        });
    }

    /**
     * 处理获取房间列表请求
     */
    handleGetRooms(socket, user, tier) {
        console.log(`[${this.gameType}] Player ${user.username} requested rooms for tier: ${tier}`);

        if (this.rooms[tier]) {
            const roomList = this.getRoomList(tier);
            console.log(`[${this.gameType}] Sending ${roomList.length} rooms to player`);
            socket.emit('room_list', roomList);
        } else {
            console.error(`[${this.gameType}] Invalid tier requested: ${tier}`);
            socket.emit('room_list', []);
        }
    }

    /**
     * 处理玩家加入房间请求
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
                message: 'Your rating does not allow access to this tier.'
            });
            return;
        }

        // 查找或创建房间
        let room = this.findRoom(tier, roomId);

        if (!room) {
            if (roomId) {
                return socket.emit('error', { message: 'Room not found' });
            }
            // 创建新房间（自动匹配时）
            room = this.createRoom(tier);
        }

        // 设置事件监听
        this.setupRoomListeners(socket, room);

        // 加入房间
        await room.join(socket);
    }

    /**
     * 查找房间
     */
    findRoom(tier, roomId) {
        if (roomId) {
            // 加入指定房间
            return this.rooms[tier].find(r => r.roomId === roomId);
        } else {
            // 自动匹配：查找第一个可用房间
            return this.rooms[tier].find(r => r.status === 'waiting' && r.canJoin());
        }
    }

    /**
     * 创建新房间
     */
    createRoom(tier) {
        const newRoomId = `${this.gameType}_${tier}_${this.rooms[tier].length}`;
        // 注意：参数顺序为 (io, roomId, tier)
        const room = new this.RoomClass(this.io, newRoomId, tier);
        this.rooms[tier].push(room);
        console.log(`[${this.gameType}] Created new room: ${newRoomId}`);
        return room;
    }

    /**
     * 设置房间相关的 Socket 事件监听
     */
    setupRoomListeners(socket, room) {
        // 监听游戏移动
        socket.on(`${this.gameType}_move`, (move) => {
            room.handleMove(socket, move);
        });

        // 监听主动离开房间
        socket.on(`${this.gameType}_leave`, () => {
            console.log(`[${this.gameType}] Player ${socket.user.username} leaving room voluntarily`);
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
     * 获取房间列表
     * 用于 HTTP API 和 Socket.IO
     */
    getRoomList(tier) {
        console.log(`[${this.gameType}] getRoomList called for tier: ${tier}`);
        console.log(`[${this.gameType}] Rooms in tier ${tier}:`, this.rooms[tier].length);

        const roomList = this.rooms[tier].map(room => ({
            id: room.roomId,
            status: room.status,
            players: room.getPlayerCount ? room.getPlayerCount() : this.getPlayerCount(room),
            spectators: room.spectators ? room.spectators.length : 0
        }));

        console.log(`[${this.gameType}] Returning room list:`, JSON.stringify(roomList));
        return roomList;
    }

    /**
     * 获取房间玩家数量（默认实现）
     * 如果房间类没有 getPlayerCount 方法，使用此方法
     */
    getPlayerCount(room) {
        if (room.players) {
            return Object.keys(room.players).filter(k => room.players[k]).length;
        }
        return 0;
    }
}

module.exports = BaseGameManager;
