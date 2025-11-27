// server/src/games/chinesechess/index.js
const ChineseChessRoom = require('./rooms/ChineseChessRoom');
const UserGameStats = require('../../models/UserGameStats');

class ChineseChessManager {
    constructor(io) {
        this.io = io;
        this.gameType = 'chinesechess';
        this.rooms = {
            free: [],
            beginner: [],
            intermediate: [],
            advanced: []
        };
        this.initRooms();
    }

    initRooms() {
        // Create initial rooms for each tier
        const tiers = ['free', 'beginner', 'intermediate', 'advanced'];
        console.log('[ChineseChess] Initializing rooms...');
        tiers.forEach(tier => {
            for (let i = 0; i < 3; i++) { // 3 rooms per tier initially
                const roomId = `${this.gameType}_${tier}_${i}`;
                const room = new ChineseChessRoom(roomId, this.io, tier);
                this.rooms[tier].push(room);
                console.log(`[ChineseChess] Created room: ${roomId}`);
            }
        });
        console.log(`[ChineseChess] Total rooms created: ${Object.values(this.rooms).flat().length}`);
    }

    // Called by SocketDispatcher when user emits 'start_game'
    onPlayerJoin(socket, user) {
        console.log(`Player ${user.username} joined Chinese Chess manager`);
        // Just register event listeners for this game type
        // Don't auto-join a room yet. Wait for user to request room list or join specific room.

        socket.on('get_rooms', ({ tier }) => {
            console.log(`Player ${user.username} requested rooms for tier: ${tier}`);
            if (this.rooms[tier]) {
                const roomList = this.getRoomList(tier);
                console.log(`Sending ${roomList.length} rooms to player`);
                socket.emit('room_list', roomList);
            } else {
                console.error(`Invalid tier requested: ${tier}`);
                socket.emit('room_list', []);
            }
        });

        socket.on('chess_join', (data) => this.handleJoin(socket, data));
    }

    async handleJoin(socket, data) {
        const { tier, roomId } = data;

        // Get user's rating
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });
        const rating = stats ? stats.rating : 1200;

        // Validate tier access
        if (!this.canAccessTier(tier, rating)) {
            socket.emit('error', {
                code: 'TIER_RESTRICTED',
                message: 'Your rating does not allow access to this tier.'
            });
            return;
        }

        let room;
        if (roomId) {
            // Join specific room
            room = this.rooms[tier].find(r => r.roomId === roomId);
        } else {
            // Auto-match (find first available)
            room = this.rooms[tier].find(r => r.status === 'waiting' && (!r.players.r || !r.players.b));
        }

        if (!room) {
            if (roomId) {
                return socket.emit('error', { message: 'Room not found' });
            }
            // Create new room if all are full (for auto-match)
            const newRoomId = `${this.gameType}_${tier}_${this.rooms[tier].length}`;
            room = new ChineseChessRoom(newRoomId, this.io, tier);
            this.rooms[tier].push(room);
        }

        // 设置事件监听
        socket.on('chess_move', (move) => room.handleMove(socket, move));

        // 监听主动离开房间
        socket.on('chess_leave', () => {
            console.log(`[ChineseChess] Player ${socket.user.username} leaving room voluntarily`);
            room.leave(socket);
        });

        // 断线处理
        socket.removeAllListeners('disconnect');
        socket.on('disconnect', () => this.handleDisconnect(socket, room));

        // 加入房间
        await room.join(socket);
    }

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

    handleDisconnect(socket, room) {
        console.log(`[ChineseChess] Player ${socket.user.username} disconnected`);

        // 调用房间的断线处理方法
        if (room) {
            room.handlePlayerDisconnect(socket);
        }
    }

    getRoomList(tier) {
        console.log(`[ChineseChess] getRoomList called for tier: ${tier}`);
        console.log(`[ChineseChess] Rooms in tier ${tier}:`, this.rooms[tier].length);
        const roomList = this.rooms[tier].map(room => ({
            id: room.roomId,
            status: room.status,
            players: Object.keys(room.players).filter(k => room.players[k]).length,
            spectators: room.spectators.length
        }));
        console.log(`[ChineseChess] Returning room list:`, JSON.stringify(roomList));
        return roomList;
    }
}

module.exports = ChineseChessManager;
