const RoomManager = require('./RoomManager');
const AntiCheat = require('./AntiCheat');

/**
 * Matchmaker Service
 * Handles player matchmaking queue and assigns players to tables.
 */
class Matchmaker {
    constructor() {
        this.queue = []; // Array of { user, socket, criteria, timestamp }
        this.interval = null;
    }

    /**
     * Start the matchmaking loop
     */
    start() {
        if (this.interval) return;
        this.interval = setInterval(() => this.processQueue(), 5000); // Check every 5s
    }

    /**
     * Add user to matchmaking queue
     * @param {Object} user - User object
     * @param {Object} socket - Socket object
     * @param {Object} criteria - Matchmaking criteria { minBeans, maxBeans, ... }
     */
    addToQueue(user, socket, criteria) {
        // criteria: { minBeans, maxBeans, minWinRate, maxDisconnectRate }
        this.queue.push({ user, socket, criteria, timestamp: Date.now() });
        // Try immediate match
        this.processQueue();
    }

    /**
     * Remove user from queue
     * @param {string} socketId - Socket ID
     */
    removeFromQueue(socketId) {
        this.queue = this.queue.filter(item => item.socket.id !== socketId);
    }

    /**
     * Process the matchmaking queue
     * Attempts to match users to existing tables or creates new ones.
     */
    processQueue() {
        if (this.queue.length < 2) return; // Need at least 2 to match? Or match to existing table?

        // Simplified matching: Try to find an existing waiting table for each user in queue
        // If not found, group users in queue together.

        // 1. Try to join existing tables
        // Iterate queue copy to allow modification
        const queueCopy = [...this.queue];

        for (const item of queueCopy) {
            const { user, socket, criteria } = item;

            // Find a room/table that fits
            // For MVP, iterate all rooms (inefficient, but works for demo)
            let matched = false;
            for (const [roomId, room] of RoomManager.rooms) {
                for (const [tableId, table] of room.tables) {
                    if (table.status === 'waiting' && table.players.length < 4) {
                        // Check criteria
                        if (table.baseBeans >= criteria.minBeans && table.baseBeans <= criteria.maxBeans) {
                            // Check AntiCheat
                            const check = AntiCheat.canJoinTable(table.players, { id: user._id, ip: socket.handshake.address });
                            if (check.allowed) {
                                RoomManager.joinTable(roomId, tableId, user, socket);
                                this.removeFromQueue(socket.id);
                                socket.emit('match_success', { roomId, tableId });
                                matched = true;
                                break;
                            }
                        }
                    }
                }
                if (matched) break;
            }

            if (!matched) {
                // 2. If no table found, maybe create a new one if enough players in queue match each other?
                // For now, just leave them in queue or create a new table for them immediately?
                // "Auto match... automatically assign a game table"
                // Let's create a new table for the first user, and let others join it in next pass.

                // Create new table in a default room
                const defaultRoomId = 'lobby_room_1'; // Assuming this exists
                const newTableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Ensure room exists
                if (!RoomManager.rooms.has(defaultRoomId)) {
                    RoomManager.createRoom('default', defaultRoomId);
                }

                const table = RoomManager.getOrCreateTable(defaultRoomId, newTableId);
                table.baseBeans = criteria.minBeans || 1000; // Set base beans to user preference

                RoomManager.joinTable(defaultRoomId, newTableId, user, socket);
                this.removeFromQueue(socket.id);
                socket.emit('match_success', { roomId: defaultRoomId, tableId: newTableId });
            }
        }
    }
}

module.exports = new Matchmaker();
