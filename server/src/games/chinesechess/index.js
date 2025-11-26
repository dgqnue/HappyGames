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
        tiers.forEach(tier => {
            for (let i = 0; i < 3; i++) { // 3 rooms per tier initially
                const roomId = `${this.gameType}_${tier}_${i}`;
                const room = new ChineseChessRoom(roomId, this.io, tier);
                this.rooms[tier].push(room);
            }
        });
    }

    async handleJoin(socket, data) {
        const { tier } = data;

        // Get user's rating
        const stats = await UserGameStats.findOne({
            userId: socket.user.id,
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

        // Find available room
        let room = this.rooms[tier].find(r => r.status === 'waiting' && (!r.players.r || !r.players.b));

        if (!room) {
            // Create new room if all are full
            const roomId = `${this.gameType}_${tier}_${this.rooms[tier].length}`;
            room = new ChineseChessRoom(roomId, this.io, tier);
            this.rooms[tier].push(room);
        }

        // Setup listeners
        socket.on('chess_move', (move) => room.handleMove(socket, move));
        socket.on('disconnect', () => this.handleDisconnect(socket, room));

        // Join room
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
        // Handle player disconnect
        // For now, just remove from room
        // In production, might want to implement reconnect logic
    }

    getRoomList(tier) {
        return this.rooms[tier].map(room => ({
            id: room.roomId,
            status: room.status,
            players: Object.keys(room.players).filter(k => room.players[k]).length,
            spectators: room.spectators.length
        }));
    }
}

module.exports = ChineseChessManager;
