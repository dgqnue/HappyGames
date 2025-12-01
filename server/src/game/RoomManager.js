const AntiCheat = require('./AntiCheat');

/**
 * Room Manager
 * Manages game rooms and tables. Handles player joining, leaving, and table state.
 */
class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> Room Object
        // Room Object: { id, gameType, tables: Map(tableId -> Table) }
        // Table Object: { id, baseBeans, players: [], status: 'waiting'|'playing', ... }
    }

    /**
     * Create a new room
     * @param {string} gameType - Type of game (e.g., 'poker')
     * @param {string} roomId - Unique Room ID
     */
    createRoom(gameType, roomId) {
        this.rooms.set(roomId, {
            id: roomId,
            gameType,
            tables: new Map()
        });
    }

    /**
     * Get a table by ID
     * @param {string} roomId - Room ID
     * @param {string} tableId - Table ID
     * @returns {Object|null} Table object or null
     */
    getTable(roomId, tableId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        return room.tables.get(tableId);
    }

    /**
     * Get or Create a Table
     * If table doesn't exist, creates a new one with default settings.
     * @param {string} roomId - Room ID
     * @param {string} tableId - Table ID
     * @returns {Object|null} Table object
     */
    getOrCreateTable(roomId, tableId) {
        const room = this.rooms.get(roomId);
        if (!room) return null;

        if (!room.tables.has(tableId)) {
            room.tables.set(tableId, {
                id: tableId,
                baseBeans: 1000, // Default
                players: [], // { userId, socketId, ip, gps, ready: false }
                status: 'waiting',
                createdAt: Date.now()
            });
        }
        return room.tables.get(tableId);
    }

    /**
     * Join a Table
     * Adds a user to a table if possible. Checks for anti-cheat rules.
     * @param {string} roomId - Room ID
     * @param {string} tableId - Table ID
     * @param {Object} user - User object
     * @param {Object} socket - Socket object
     * @returns {Object} Result { success, message, table }
     */
    joinTable(roomId, tableId, user, socket) {
        const table = this.getOrCreateTable(roomId, tableId);
        if (!table) return { success: false, message: 'Room not found' };

        if (table.status === 'playing') {
            return { success: false, message: 'Game already in progress' };
        }

        if (table.players.length >= 4) { // Assume 4 max for now
            return { success: false, message: 'Table full' };
        }

        // Anti-Cheat Check
        const check = AntiCheat.canJoinTable(table.players, {
            id: user._id,
            ip: socket.handshake.address,
            gps: user.gps // Assuming passed in user object or socket
        });

        if (!check.allowed) {
            return { success: false, message: check.reason };
        }

        // Add player
        table.players.push({
            userId: user._id,
            username: user.username,
            socketId: socket.id,
            ip: socket.handshake.address,
            ready: false
        });

        return { success: true, table };
    }

    /**
     * Leave a Table
     * Removes a user from a table.
     * @param {string} roomId - Room ID
     * @param {string} tableId - Table ID
     * @param {string} socketId - Socket ID
     * @returns {Object|undefined} Updated table or undefined
     */
    leaveTable(roomId, tableId, socketId) {
        const table = this.getTable(roomId, tableId);
        if (!table) return;

        const index = table.players.findIndex(p => p.socketId === socketId);
        if (index !== -1) {
            table.players.splice(index, 1);
            // If empty, maybe delete table or reset
            if (table.players.length === 0) {
                table.status = 'waiting';
                table.baseBeans = 1000; // Reset defaults
            }
        }
        return table;
    }
}

module.exports = new RoomManager();
