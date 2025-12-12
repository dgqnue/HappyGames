const DisconnectTracker = require('../DisconnectTracker');
const GameConfig = require('./GameConfig');
const { fetchLatestAvatarUrl } = require('../../utils/avatarUtils');

const StateMappingRules = require('./StateMappingRules');

/**
 * ============================================================================
 * PART 2: MatchMaker (Core Matching System)
 * ============================================================================
 */

/**
 * MatchMaker Module
 * Manages the global "auto-match" queues.
 */
class MatchMaker {
    constructor() {
        this.queues = new Map();
        this.checkInterval = null;
        this.handlers = new Map();
        this.start();
    }

    start() {
        if (this.checkInterval) return;
        // Process match queues every 3 seconds
        this.checkInterval = setInterval(() => {
            this.processQueues();
        }, 3000);
        console.log('[MatchMaker] Match service started');
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    registerHandler(gameType, handler) {
        this.handlers.set(gameType, handler);
    }

    joinQueue(gameType, player) {
        if (!this.queues.has(gameType)) {
            this.queues.set(gameType, []);
        }

        const queue = this.queues.get(gameType);

        if (queue.find(p => p.userId === player.userId)) {
            return { success: false, error: 'Already in match queue' };
        }

        player.joinTime = Date.now();
        queue.push(player);

        console.log(`[MatchMaker] Player ${player.userId} joined ${gameType} match queue`);

        // Try to match immediately
        this.matchGame(gameType);

        return { success: true };
    }

    leaveQueue(gameType, userId) {
        const queue = this.queues.get(gameType);
        if (!queue) return false;

        const index = queue.findIndex(p => p.userId === userId);
        if (index !== -1) {
            queue.splice(index, 1);
            console.log(`[MatchMaker] Player ${userId} left ${gameType} match queue`);
            return true;
        }
        return false;
    }

    processQueues() {
        for (const gameType of this.queues.keys()) {
            this.matchGame(gameType);
        }
    }

    matchGame(gameType) {
        const queue = this.queues.get(gameType);
        if (!queue || queue.length < 2) return;

        // Sort by wait time, FIFO
        queue.sort((a, b) => a.joinTime - b.joinTime);

        const matchedIndices = new Set();
        const handler = this.handlers.get(gameType);

        if (!handler) {
            console.warn(`[MatchMaker] Match handler not found for ${gameType}`);
            return;
        }

        // Simple pairwise matching logic
        for (let i = 0; i < queue.length; i++) {
            if (matchedIndices.has(i)) continue;

            for (let j = i + 1; j < queue.length; j++) {
                if (matchedIndices.has(j)) continue;

                const p1 = queue[i];
                const p2 = queue[j];

                if (this.isMatchCompatible(p1, p2)) {
                    matchedIndices.add(i);
                    matchedIndices.add(j);

                    console.log(`[MatchMaker] Match success: ${p1.userId} vs ${p2.userId}`);
                    handler([p1, p2]);
                    break;
                }
            }
        }

        // Remove matched players
        if (matchedIndices.size > 0) {
            const indices = Array.from(matchedIndices).sort((a, b) => b - a);
            for (const idx of indices) {
                queue.splice(idx, 1);
            }
        }
    }

    isMatchCompatible(p1, p2) {
        if (p1.userId === p2.userId) return false;

        // Simple score difference matching logic
        const scoreDiff = Math.abs(p1.stats.rating - p2.stats.rating);
        if (scoreDiff > 300) {
            // If score diff is large, check wait time
            const waitTime = Math.max(Date.now() - p1.joinTime, Date.now() - p2.joinTime);
            // Relax conditions if waiting more than 30 seconds
            if (waitTime < 30000) {
                return false;
            }
        }
        return true;
    }

    getQueueStatus(gameType) {
        const queue = this.queues.get(gameType) || [];
        return {
            count: queue.length,
            avgWaitTime: 0 // TODO: Implement average wait time calculation
        };
    }
}

/**
 * ============================================================================
 * PART 3: MatchRoomState (Room State Management)
 * ============================================================================
 */

/**
 * Game Match System - Room State Management
 * Manages room matching criteria, player ready status, countdowns, etc.
 */
class MatchRoomState {
    /**
     * Constructor - Supports multiplayer game configuration
     * 
     * @param {string} roomId - Room ID
     * @param {number} maxPlayers - Max players (default 2)
     * @param {Object} gameConfig - Game configuration object (optional)
     */
    constructor(roomId, maxPlayers = 2, gameConfig = null) {
        this.roomId = roomId;
        this.maxPlayers = maxPlayers;
        
        // NEW: Game configuration
        this.gameConfig = gameConfig || {};
        this.minPlayers = this.gameConfig.minPlayers || maxPlayers;
        this.seatStrategy = this.gameConfig.seatStrategy || 'sequential';
        
        this.players = [];
        this.spectators = [];  // NEW: Spectator list
        this.status = StateMappingRules.TABLE_STATUS.IDLE;

        console.log(`[MatchRoomState] Room ${roomId} initialized (maxPlayers: ${maxPlayers}, minPlayers: ${this.minPlayers}, strategy: ${this.seatStrategy})`);

        this.matchSettings = { ...StateMappingRules.DEFAULT_SETTINGS };

        // Countdown timers
        this.readyTimer = null;
        this.readyTimeout = this.gameConfig.readyTimeout || StateMappingRules.COUNTDOWN_CONFIG.readyTimeout;

        this.zombieTimer = null;
        this.zombieTimeout = StateMappingRules.COUNTDOWN_CONFIG.zombieTimeout;

        this.rematchTimer = null;
        this.rematchTimeout = StateMappingRules.COUNTDOWN_CONFIG.rematchTimeout;

        // Record timestamps
        this.createdAt = Date.now();
        this.firstPlayerJoinedAt = null;

        // Rematch requests set
        this.rematchRequests = new Set();
    }

    canPlayerJoin(playerStats, playerSettings = null) {
        const isFirstPlayer = this.players.length === 0;
        const result = StateMappingRules.checkMatchCriteria(
            playerStats,
            playerSettings,
            this.matchSettings,
            isFirstPlayer
        );
        console.log(`[MatchRoom] ${result.reason}`);
        return result.canJoin;
    }

    addPlayer(playerData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: 'Room is full' };
        }

        if (this.players.find(p => p.userId === playerData.userId)) {
            return { success: false, error: 'Already in room' };
        }

        // Improved version: Use configured seat strategy
        const existingSeats = this.players.map(p => p.seatIndex);
        const seatIndex = StateMappingRules.assignSeat(this.seatStrategy, existingSeats, this.maxPlayers);

        if (seatIndex === -1) {
            console.error(`[MatchRoom] No seat available for player ${playerData.userId}, used seats`, existingSeats, `maxPlayers: ${this.maxPlayers}, seatStrategy: ${this.seatStrategy}`);
            return { success: false, error: 'No seat available' };
        }

        const playerWithSeat = {
            ...playerData,
            ready: false,
            joinedAt: Date.now(),
            seatIndex: seatIndex
        };

        this.players.push(playerWithSeat);

        const newState = StateMappingRules.getStateAfterPlayerJoin(this.players.length, this.maxPlayers);
        if (newState) {
            this.transitionStatus(newState, { userId: playerData.userId, reason: 'player_join' });
        }

        if (this.players.length === 1) {
            this.firstPlayerJoinedAt = Date.now();
            if (playerData.matchSettings) {
                this.matchSettings = { ...this.matchSettings, ...playerData.matchSettings };
                console.log(`[MatchRoom] Room match settings set by first player:`, this.matchSettings);
            }
        }

        console.log(`[MatchRoom] Player ${playerData.userId} added with seatIndex ${seatIndex}, current players:`,
            this.players.map(p => ({ userId: p.userId, seatIndex: p.seatIndex })));

        return { success: true, seatIndex };
    }

    removePlayer(userId) {
        const index = this.players.findIndex(p => p.userId === userId);
        if (index === -1) return false;

        this.players.splice(index, 1);
        this.rematchRequests.delete(userId);

        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }

        const newState = StateMappingRules.getStateAfterPlayerLeave(this.players.length, this.maxPlayers);
        if (newState) {
            this.status = newState;
        }

        if (this.players.length === 0) {
            if (this.zombieTimer) {
                clearTimeout(this.zombieTimer);
                this.zombieTimer = null;
            }
            this.firstPlayerJoinedAt = null;
            this.matchSettings = { ...StateMappingRules.DEFAULT_SETTINGS };
            this.rematchRequests.clear();
            console.log(`[MatchRoom] Room emptied, match settings reset to default`);
        }

        return true;
    }

    addSpectator(spectatorData) {
        if (this.spectators.find(s => s.userId === spectatorData.userId)) {
            return { success: false, error: 'Already in spectators' };
        }
        this.spectators.push(spectatorData);
        return { success: true };
    }

    removeSpectator(userId) {
        const index = this.spectators.findIndex(s => s.userId === userId);
        if (index === -1) return false;
        this.spectators.splice(index, 1);
        return true;
    }

    /**
     * ============================================================================
     * Multiplayer Support Methods (NEW)
     * ============================================================================
     */

    /**
     * Promote spectator to player (fill empty seat)
     * Used during game when a player disconnects
     */
    promoteSpectatorToPlayer(spectatorData) {
        if (this.players.length >= this.maxPlayers) {
            return { success: false, error: 'Seats full' };
        }

        // Remove from spectator list
        this.removeSpectator(spectatorData.userId);

        // Add as player (reuse addPlayer logic)
        spectatorData.ready = false;  // New player needs to ready up
        spectatorData.isActive = true;
        return this.addPlayer(spectatorData);
    }

    /**
     * Get ready status overview (multiplayer version)
     * Used for UI display of ready progress
     */
    getReadyStatus() {
        const activePlayers = this.players.filter(p => p.isActive !== false);
        const ready = activePlayers.filter(p => p.ready).length;
        const total = activePlayers.length;

        return {
            ready,
            total,
            inactive: this.players.length - total,
            percentage: total > 0 ? Math.round((ready / total) * 100) : 0,
            canStart: this.allPlayersReady()
        };
    }

    /**
     * Improved version: Multiplayer allPlayersReady
     * Considers minimum player requirement in game config
     */
    allPlayersReady() {
        // Active players must meet minimum requirement
        const activePlayers = this.players.filter(p => p.isActive !== false);
        
        if (activePlayers.length < this.minPlayers) {
            return false;
        }

        // Check if all players are required to be ready
        if (this.gameConfig.requireAllReady === false) {
            // Only need minimum players to be ready
            const readyCount = activePlayers.filter(p => p.ready).length;
            return readyCount >= this.minPlayers;
        }

        // Require all active players to be ready
        return activePlayers.every(p => p.ready);
    }

    /**
     * Get progress text (for UI display)
     */
    getProgressText() {
        return StateMappingRules.getProgressText(
            this.players.length,
            this.minPlayers,
            this.maxPlayers,
            this.players.filter(p => p.ready && p.isActive !== false).length
        );
    }

    /**
     * Get missing players count
     */
    getMissingPlayers() {
        return StateMappingRules.getMissingPlayers(
            this.players.length,
            this.minPlayers,
            this.maxPlayers
        );
    }

    setPlayerReady(userId, ready = true) {
        const player = this.players.find(p => p.userId === userId);
        if (!player) return false;

        player.ready = ready;

        if (this.allPlayersReady()) {
            this.cancelReadyCheck();
            return 'all_ready';
        }
        return true;
    }

    startReadyCheck() {
        // Allow starting ready check even if already in MATCHING state (e.g. when room just became full)
        // if (this.status === StateMappingRules.TABLE_STATUS.MATCHING) return;

        this.status = StateMappingRules.TABLE_STATUS.MATCHING;
        return {
            started: true,
            timeout: this.readyTimeout
        };
    }

    cancelReadyCheck() {
        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }
        const newState = StateMappingRules.getStateAfterCancelReadyCheck(this.players.length, this.maxPlayers);
        this.status = newState;
    }

    getUnreadyPlayers() {
        return StateMappingRules.getUnreadyPlayers(this.players);
    }

    resetReadyStatus() {
        this.players.forEach(p => p.ready = false);
    }

    isZombieRoom() {
        return StateMappingRules.isZombieTable(this.firstPlayerJoinedAt, this.status);
    }

    requestRematch(userId) {
        if (this.players.find(p => p.userId === userId)) {
            this.rematchRequests.add(userId);
            return this.rematchRequests.size === this.players.length; // If everyone agrees, return true
        }
        return false;
    }

    getRoomInfo() {
        return {
            roomId: this.roomId,
            status: this.status,
            players: this.players.length,
            maxPlayers: this.maxPlayers,
            spectators: this.spectators.length,
            baseBet: this.matchSettings.baseBet,
            matchSettings: this.matchSettings,
            playerList: this.players.map(p => ({
                userId: p.userId, // Add userId
                nickname: p.nickname,
                avatar: p.avatar, // Add avatar
                title: p.title,
                titleColor: p.titleColor, // Add titleColor
                winRate: p.winRate,
                disconnectRate: p.disconnectRate,
                ready: p.ready,
                wantsRematch: this.rematchRequests.has(p.userId),
                seatIndex: p.seatIndex
            }))
        };
    }

    /**
     * Status transition helper - includes logging and validation
     * @param {string} newStatus - New status
     * @param {Object} context - Transition context { userId, reason, ... }
     * @returns {boolean} Whether transition was successful
     */
    transitionStatus(newStatus, context = {}) {
        const oldStatus = this.status;
        
        // Check if status transition is valid
        const validation = StateMappingRules.isValidTransition(oldStatus, newStatus);
        if (!validation.valid) {
            console.warn(`[MatchRoomState] ${validation.reason}`, {
                roomId: this.roomId,
                fromStatus: oldStatus,
                toStatus: newStatus,
                context
            });
            return false;
        }

        // Get transition details and log
        const transitionDetails = StateMappingRules.getTransitionDetails(oldStatus, newStatus, {
            userId: context.userId,
            reason: context.reason,
            playerCount: this.players.length,
            maxPlayers: this.maxPlayers,
            timestamp: Date.now()
        });

        // Log status transition
        console.log(`[MatchRoomState] Status transition: ${oldStatus} -> ${newStatus}`, {
            roomId: this.roomId,
            type: transitionDetails.transitionType,
            details: transitionDetails.details,
            playerCount: this.players.length,
            userId: context.userId || 'system'
        });

        // Execute status transition
        this.status = newStatus;
        
        return true;
    }

    cleanup() {
        if (this.readyTimer) clearTimeout(this.readyTimer);
        if (this.zombieTimer) clearTimeout(this.zombieTimer);
        if (this.rematchTimer) clearTimeout(this.rematchTimer);
    }
}

/**
 * ============================================================================
 * PART 4: MatchPlayers (Player Match Manager)
 * ============================================================================
 */

/**
 * Player Match Manager (MatchPlayers)
 * 
 * Handles player matching, ready status, countdowns, rematch logic for game tables.
 * Integrates MatchRoomState and StateMappingRules.
 */
class MatchPlayers {
    /**
     * @param {Object} table - Game table instance (must include io, roomId, gameType, maxPlayers, broadcast method)
     */
    constructor(table) {
        this.table = table;
        this.io = table.io;
        this.roomId = table.roomId;
        this.gameType = table.gameType;
        this.maxPlayers = table.maxPlayers;

        // NEW: Get game config
        this.gameConfig = GameConfig.getConfig(this.gameType) || {};

        // Use match state manager (pass game config)
        this.matchState = new MatchRoomState(this.roomId, this.maxPlayers, this.gameConfig);

        // Action queue: Ensure player actions are processed sequentially
        this.actionQueue = [];
        this.isProcessingQueue = false;

        // Countdown lock state
        this.isLocked = false;
        this.countdownTimer = null;
        
        // Ready countdown cancelled flag - prevent 30s countdown conflict with 3s game countdown
        this.readyCheckCancelled = false;

        // Start zombie check
        this.startZombieCheck();
    }

    /**
     * Enqueue action and process asynchronously
     * @param {Function} actionFn - Action function returning Promise
     * @returns {Promise} Promise of action result
     */
    async enqueueAction(actionFn) {
        return new Promise((resolve, reject) => {
            // Wrap action to ensure queue processing continues
            const wrappedAction = async () => {
                try {
                    const result = await actionFn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    // Continue processing queue regardless of success/failure
                    this.processQueue();
                }
            };

            // Add wrapped action to queue
            this.actionQueue.push(wrappedAction);

            // If not processing, start queue processing
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * Process next action in queue
     */
    processQueue() {
        if (this.isProcessingQueue || this.actionQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;
        const action = this.actionQueue.shift();

        // Execute action, continue processing queue after completion
        action().finally(() => {
            this.isProcessingQueue = false;

            // Delay slightly to ensure state updates propagate
            setTimeout(() => {
                this.processQueue();
            }, 10);
        });
    }

    /**
     * Get current player list
     */
    get players() {
        return this.matchState.players;
    }

    /**
     * Get current spectator list
     */
    get spectators() {
        return this.matchState.spectators;
    }

    /**
     * Get current status
     */
    get status() {
        // If full but not started, and not in ready countdown, consider as matching
        if (this.matchState.players.length === this.maxPlayers &&
            this.matchState.status === StateMappingRules.TABLE_STATUS.WAITING) {
            return StateMappingRules.TABLE_STATUS.MATCHING;
        }
        return this.matchState.status;
    }

    set status(value) {
        this.matchState.status = value;
    }

    /**
     * Player join attempt - Internal implementation
     */
    async _playerJoin(socket, matchSettings = null) {
        console.log(`[MatchPlayers] playerJoin() called for room ${this.roomId}`);

        // If explicitly specified cannot play (e.g. insufficient points), join as spectator
        if (matchSettings && matchSettings.canPlay === false) {
            console.log(`[MatchPlayers] Player ${socket.user._id} joining as spectator (canPlay=false)`);
            // Note: Cannot call this.addSpectator(socket) directly as it would call enqueueAction again causing deadlock
            // We need to extract addSpectator internal logic or handle it here
            return this._addSpectator(socket);
        }

        const userId = socket.user._id.toString();

        // Get player stats
        const UserGameStats = require('../../models/UserGameStats');
        const stats = await UserGameStats.findOne({
            userId: socket.user._id,
            gameType: this.gameType
        });

        const playerStats = {
            gamesPlayed: stats?.gamesPlayed || 0,
            wins: stats?.wins || 0,
            disconnects: stats?.disconnects || 0
        };

        // Check match criteria, use StateMappingRules for detailed reason
        const isFirstPlayer = this.matchState.players.length === 0;
        const checkResult = StateMappingRules.checkMatchCriteria(playerStats, matchSettings, this.matchState.matchSettings, isFirstPlayer);
        if (!checkResult.canJoin) {
            console.warn(`[MatchPlayers] player ${userId} failed match criteria. stats:`, playerStats, ' roomSettings:', this.matchState.matchSettings, 'reason:', checkResult.reason);
            socket.emit('join_failed', {
                code: 'MATCH_CRITERIA_NOT_MET',
                message: checkResult.reason || 'Match criteria not met'
            });
            return false;
        }

        // Calculate win rate and disconnect rate
        const winRate = playerStats.gamesPlayed > 0
            ? (playerStats.wins / playerStats.gamesPlayed) * 100
            : 0;
        const disconnectRate = playerStats.gamesPlayed > 0
            ? (playerStats.disconnects / playerStats.gamesPlayed) * 100
            : 0;

        // Use unified fetchLatestAvatarUrl to get latest avatar
        const userAvatar = await fetchLatestAvatarUrl(socket.user._id);
        console.log(`[MatchPlayers] Final avatar for ${userId}: ${userAvatar}`);
        
        // Get nickname (still need manual query, or extend avatarUtils, but currently focusing on avatar)
        const User = require('../../models/User');
        let userNickname = socket.user.nickname || socket.user.username;
        try {
            const userFromDb = await User.findById(socket.user._id).select('nickname').lean();
            if (userFromDb && userFromDb.nickname) {
                userNickname = userFromDb.nickname;
            }
        } catch (err) {
            console.warn(`[MatchPlayers] Failed to fetch nickname:`, err.message);
        }

        // Prepare player data
        const playerData = {
            userId,
            socketId: socket.id,
            user: {
                _id: socket.user._id,
                username: socket.user.username,
                nickname: userNickname,
                piUsername: socket.user.piUsername,
                avatar: userAvatar
            },
            nickname: userNickname,
            avatar: userAvatar,  // Set avatar at top level for broadcastRoomState access
            title: stats?.title || 'Newbie',
            titleColor: stats?.titleColor || '#666',
            winRate: Math.round(winRate),
            disconnectRate: Math.round(disconnectRate),
            matchSettings: matchSettings,
            ready: false
        };

        // Attempt to join
        const result = this.matchState.addPlayer(playerData);

        if (!result.success) {
            socket.emit('join_failed', {
                code: 'ROOM_FULL',
                message: result.error
            });
            return false;
        }

        // Join Socket.IO room
        socket.join(this.roomId);

        // Broadcast room state update (await ensures DB query completes)
        await this.table.broadcastRoomState();

        // If full, auto start ready check
        if (this.matchState.players.length === this.maxPlayers) {
            this.startReadyCheck();
        }

        return true;
    }

    /**
     * Player join attempt - Queue wrapper
     */
    async playerJoin(socket, matchSettings = null) {
        return this.enqueueAction(() => this._playerJoin(socket, matchSettings));
    }

    /**
     * Add spectator - Queue wrapper
     */
    async addSpectator(socket) {
        return this.enqueueAction(() => this._addSpectator(socket));
    }

    /**
     * Add spectator - Internal implementation
     */
    async _addSpectator(socket) {
        const spectatorData = {
            userId: socket.user._id.toString(),
            socketId: socket.id,
            nickname: socket.user.nickname || socket.user.username,
            avatar: await fetchLatestAvatarUrl(socket.user._id)
        };

        const result = this.matchState.addSpectator(spectatorData);
        
        if (result.success) {
            socket.join(this.roomId);
            // Broadcast room state update
            if (this.table && typeof this.table.broadcastRoomState === 'function') {
                await this.table.broadcastRoomState();
            }
            return { success: true, asSpectator: true };
        } else {
            return { success: false, error: result.error };
        }
    }

    /**
     * Player leave - Internal implementation
     */
    _playerLeave(socket) {
        const userId = socket.user._id.toString();
        const statusBefore = this.matchState.status;
        const playerCountBefore = this.matchState.players.length;
        
        console.log(`[MatchPlayers] playerLeave called for userId: ${userId}, roomId: ${this.roomId}`);
        console.log(`[MatchPlayers] Before leave - players: ${playerCountBefore}, status: ${statusBefore}`);

        // Record previous status
        const wasMatching = statusBefore === StateMappingRules.TABLE_STATUS.MATCHING;

        // Remove from player list (this method automatically calculates new status)
        const wasPlayer = this.matchState.removePlayer(userId);

        // Remove from spectator list
        const wasSpectator = this.matchState.removeSpectator(userId);

        const statusAfter = this.matchState.status;
        const playerCountAfter = this.matchState.players.length;
        
        console.log(`[MatchPlayers] After removePlayer - wasPlayer: ${wasPlayer}, wasSpectator: ${wasSpectator}, players: ${playerCountBefore}->${playerCountAfter}, status: ${statusBefore}->${statusAfter}`);

        if (wasPlayer || wasSpectator) {
            socket.leave(this.roomId);
            console.log(`[MatchPlayers] Socket left room, will broadcast room state. Current players: ${playerCountAfter}, status: ${statusAfter}`);
            
            // If all players left, reset table state
            if (playerCountAfter === 0) {
                console.log(`[MatchPlayers] All players left the table, resetting table state`);
                // Reset to initial state
                this.matchState.status = StateMappingRules.TABLE_STATUS.IDLE;
                this.matchState.resetReadyStatus();
                this.readyCheckCancelled = false;
                this.isLocked = false;
                
                // 🔧 Clear all active timers, ensure state restores immediately (no need to wait for 10s rematch countdown)
                if (this.matchState.rematchTimer) {
                    clearTimeout(this.matchState.rematchTimer);
                    this.matchState.rematchTimer = null;
                    console.log(`[MatchPlayers] Cleared rematch timer because all players left`);
                }
                if (this.countdownTimer) {
                    clearTimeout(this.countdownTimer);
                    this.countdownTimer = null;
                    console.log(`[MatchPlayers] Cleared countdown timer because all players left`);
                }
            }
            
            // Broadcast new room state
            console.log(`[MatchPlayers] Broadcasting room state: status=${this.matchState.status}, players=${playerCountAfter}`);
            this.table.broadcastRoomState();

            // If was matching and now cancelled, notify clients to cancel countdown
            if (wasMatching && this.matchState.status !== StateMappingRules.TABLE_STATUS.MATCHING) {
                console.log(`[MatchPlayers] Broadcasting ready_check_cancelled because matching was interrupted`);
                this.table.broadcast('ready_check_cancelled', {
                    reason: 'Player left, match interrupted',
                    remainingPlayers: playerCountAfter
                });
            }

            // If game countdown active, cancel it
            if (this.countdownTimer) {
                console.log(`[MatchPlayers] Cancelling game countdown because player left`);
                this.cancelGameCountdown();
            }
        } else {
            console.log(`[MatchPlayers] Player ${userId} was not in the room as player or spectator`);
        }

        return wasPlayer || wasSpectator;
    }

    /**
     * Player leave - Queue wrapper
     */
    async playerLeave(socket) {
        return this.enqueueAction(() => this._playerLeave(socket));
    }

    /**
     * Handle player disconnect
     */
    async handlePlayerDisconnect(socket) {
        const userId = socket.user._id.toString();
        console.log(`[MatchPlayers] Player ${socket.user.username} disconnected from room ${this.roomId}`);

        // Check if player was in game
        const wasInGame = this.matchState.status === StateMappingRules.TABLE_STATUS.PLAYING;

        // If disconnected during game, record disconnect stats
        if (wasInGame) {
            try {
                await DisconnectTracker.recordDisconnect(
                    socket.user._id,
                    this.gameType,
                    true
                );
            } catch (error) {
                console.error(`[MatchPlayers] Failed to record disconnect:`, error);
            }
        }

        // Remove player
        this.playerLeave(socket);

        // If disconnected during game, notify table to handle (e.g. forfeit)
        if (wasInGame && typeof this.table.onPlayerDisconnectDuringGame === 'function') {
            this.table.onPlayerDisconnectDuringGame(userId);
        }
    }

    /**
     * Player ready - Internal implementation
     */
    _playerReady(socket) {
        if (this.isLocked) {
            socket.emit('error', { message: 'Game starting, cannot change state' });
            return;
        }

        const userId = socket.user._id.toString();
        const result = this.matchState.setPlayerReady(userId, true);

        this.table.broadcastRoomState();

        if (result === 'all_ready') {
            this.startGameCountdown();
        }
    }

    /**
     * Player ready - Queue wrapper
     */
    async playerReady(socket) {
        return this.enqueueAction(() => this._playerReady(socket));
    }

    /**
     * Player unready - Internal implementation
     */
    _playerUnready(socket) {
        if (this.isLocked) {
            socket.emit('error', { message: 'Game starting, cannot change state' });
            return;
        }

        const userId = socket.user._id.toString();
        this.matchState.setPlayerReady(userId, false);

        // If table full and matching (ready countdown), keep countdown, do not cancel
        const isFullAndMatching = this.matchState.players.length === this.maxPlayers &&
            this.matchState.status === StateMappingRules.TABLE_STATUS.MATCHING;

        // Cancel game start countdown (if exists)
        if (this.countdownTimer) {
            this.cancelGameCountdown();
        }

        if (!isFullAndMatching) {
            this.matchState.cancelReadyCheck();

            this.table.broadcast('ready_check_cancelled', {
                reason: 'Player cancelled ready',
                remainingPlayers: this.matchState.players.length
            });
        } else {
            // Table full and matching, check if need to restart 30s countdown
            if (!this.matchState.readyTimer) {
                this.startReadyCheck();
            }
        }

        this.table.broadcastRoomState();
    }

    /**
     * Player unready - Queue wrapper
     */
    async playerUnready(socket) {
        return this.enqueueAction(() => this._playerUnready(socket));
    }

    /**
     * Start ready check (30s countdown)
     */
    startReadyCheck() {
        // Clear previous timer (if exists)
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }

        const result = this.matchState.startReadyCheck();
        if (!result) return;

        this.table.broadcast('ready_check_start', {
            timeout: this.matchState.readyTimeout,
            message: 'All players please click "Start" within 30 seconds'
        });

        this.matchState.readyTimer = setTimeout(() => {
            this.onReadyTimeout();
        }, this.matchState.readyTimeout);

        this.table.broadcastRoomState();
    }

    /**
     * Ready timeout handler (30s countdown)
     * This method only handles ready timeout, should not be affected by game countdown
     */
    async onReadyTimeout() {
        // Use enqueueAction to ensure atomicity and prevent race conditions
        await this.enqueueAction(async () => {
            console.log(`[MatchPlayers] onReadyTimeout called for room ${this.roomId}, readyCheckCancelled: ${this.readyCheckCancelled}`);
            
            // If ready countdown cancelled (i.e. game countdown started), return immediately
            if (this.readyCheckCancelled) {
                console.log(`[MatchPlayers] Ready check was already cancelled, skipping timeout processing`);
                return;
            }
            
            // If game already started, do nothing
            if (this.matchState.status === StateMappingRules.TABLE_STATUS.PLAYING) {
                console.log(`[MatchPlayers] Game already playing, skipping ready timeout processing`);
                return;
            }

            console.log(`[MatchPlayers] Ready timeout occurred - kicking out unready players`);

            const unreadyPlayers = this.matchState.getUnreadyPlayers();
            console.log(`[MatchPlayers] Unready players:`, unreadyPlayers.map(p => p.userId));

            // Kick players first
            for (const player of unreadyPlayers) {
                const socket = this.io.sockets.sockets.get(player.socketId);
                if (socket) {
                    console.log(`[MatchPlayers] Kicking player ${player.userId} for ready timeout`);
                    socket.emit('kicked', {
                        reason: 'Ready timeout',
                        code: 'READY_TIMEOUT'
                    });
                    // Use _playerLeave directly since we are already in queue
                    this._playerLeave(socket);
                } else {
                    console.log(`[MatchPlayers] Removing player ${player.userId} from match state`);
                    this.matchState.removePlayer(player.userId);
                    // _playerLeave handles broadcast, but removePlayer doesn't
                    // However, we will broadcast at the end anyway
                }
            }

            // Then cancel ready check (which updates status based on remaining players)
            this.matchState.cancelReadyCheck();
            this.matchState.resetReadyStatus();

            this.table.broadcast('ready_check_cancelled', {
                reason: 'Some players failed to ready up',
                remainingPlayers: this.matchState.players.length
            });

            this.table.broadcastRoomState();
        });
    }
            reason: 'Some players failed to ready up',
            remainingPlayers: this.matchState.players.length
        });

        this.table.broadcastRoomState();
    }

    /**
     * Start game countdown (3-2-1)
     */
    startGameCountdown() {
        this.isLocked = true;

        // Cancel 30s ready countdown, as all players ready, game starting
        // This is key: must explicitly mark 30s countdown as cancelled to prevent subsequent callbacks
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }
        // Mark ready countdown as stopped, prevent onReadyTimeout execution
        this.readyCheckCancelled = true;

        this.table.broadcast('game_locked', {
            message: 'All players ready, game starting',
            locked: true
        });

        let countdown = 3;
        this.table.broadcast('game_countdown', { count: countdown });

        this.countdownTimer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                this.table.broadcast('game_countdown', { count: countdown });
            } else {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;

                this.table.broadcast('game_countdown', { count: 0, message: 'Game Start!' });

                setTimeout(() => {
                    this.startGame();
                }, 500);
            }
        }, 1000);
    }

    /**
     * Cancel game countdown
     */
    cancelGameCountdown() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        this.isLocked = false;
        
        // Reset ready countdown cancelled flag, so next round countdown works
        this.readyCheckCancelled = false;

        this.table.broadcast('game_countdown_cancelled', {
            message: 'Countdown cancelled',
            locked: false
        });
    }

    /**
     * Start game
     */
    startGame() {
        console.log(`[MatchPlayers] startGame called for room ${this.roomId}`);
        
        // Clear all timers, ensure no more state changes
        // Note: Do not set isLocked = false, as game is starting
        // Only release lock when game truly ends
        
        // Clear game start countdown
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        
        // Clear ready countdown
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }
        
        // Clear zombie check
        if (this.matchState.zombieTimer) {
            clearTimeout(this.matchState.zombieTimer);
            this.matchState.zombieTimer = null;
        }

        // Set to playing state
        this.matchState.status = StateMappingRules.TABLE_STATUS.PLAYING;
        console.log(`[MatchPlayers] Status set to PLAYING. Current status getter: ${this.status}`);

        // Note: Do not reset ready status! Ready status should remain until game ends
        // Reset ready status should only happen in onGameEnd()

        // Broadcast state update, ensure all clients (including lobby) know status is playing
        console.log(`[MatchPlayers] Broadcasting room state...`);
        this.table.broadcastRoomState();

        // Note: Do not send game_start event here!
        // Game logic will handle in table.startGame() and send its own game_start event
        // This avoids event duplication and data inconsistency

        // Notify table to start game
        if (typeof this.table.startGame === 'function') {
            console.log(`[MatchPlayers] Calling table.startGame()...`);
            try {
                this.table.startGame();
            } catch (error) {
                console.error(`[MatchPlayers] Error calling table.startGame():`, error);
                // Error handling: Game start failed
                this.table.broadcast('error', {
                    message: 'Failed to start game',
                    error: error.message
                });
            }
        } else {
            console.error('[MatchPlayers] Table does not implement startGame()');
        }
    }

    /**
     * Game end handler
     * @param {Object} result - Game result
     */
    async onGameEnd(result) {
        console.log(`[MatchPlayers] Game ended in room ${this.roomId}`);

        // Release game lock (game ended, can match again)
        this.isLocked = false;
        
        // Reset ready countdown cancelled flag, so next round can use 30s countdown
        this.readyCheckCancelled = false;

        // Reset ready status
        this.matchState.resetReadyStatus();

        // Status becomes matching (waiting for rematch)
        this.matchState.status = StateMappingRules.TABLE_STATUS.MATCHING;

        // Clear previous rematch requests
        this.matchState.rematchRequests.clear();

        // Broadcast game end and start rematch countdown
        this.table.broadcast('game_ended', {
            result,
            rematchTimeout: this.matchState.rematchTimeout
        });

        // Immediately broadcast cancel ready status, ensure client receives
        this.table.broadcast('players_unready', {
            reason: 'Game ended, ready status cleared'
        });

        // After game ends, send updated user stats to all players
        // So players can see updated title, rating etc immediately when returning to room
        try {
            const UserGameStats = require('../../models/UserGameStats');
            for (const player of this.matchState.players) {
                const updatedStats = await UserGameStats.findOne({
                    userId: player.userId,
                    gameType: this.gameType
                }).lean();

                if (updatedStats) {
                    const socket = this.io.sockets.sockets.get(player.socketId);
                    if (socket) {
                        // Get latest avatar
                        const avatar = await fetchLatestAvatarUrl(player.userId);

                        socket.emit('user_stats', {
                            userId: updatedStats.userId,
                            rating: updatedStats.rating,
                            gamesPlayed: updatedStats.gamesPlayed,
                            wins: updatedStats.wins,
                            losses: updatedStats.losses,
                            draws: updatedStats.draws,
                            disconnects: updatedStats.disconnects,
                            title: updatedStats.title,
                            titleRank: updatedStats.titleRank,
                            titleColor: updatedStats.titleColor,
                            lastPlayedAt: updatedStats.lastPlayedAt,
                            avatar: avatar // Add avatar field
                        });
                        console.log(`[MatchPlayers] Sent updated user_stats to ${player.userId}: rating=${updatedStats.rating}, title=${updatedStats.title}`);
                    }
                }
            }
        } catch (err) {
            console.error(`[MatchPlayers] Error sending updated user_stats:`, err);
        }

        // Broadcast room state update, refresh room list (from playing to matching)
        this.table.broadcastRoomState();

        this.startRematchCountdown();
    }

    /**
     * Start rematch countdown
     */
    startRematchCountdown() {
        if (this.matchState.rematchTimer) clearTimeout(this.matchState.rematchTimer);

        console.log(`[MatchPlayers] Starting rematch countdown for room ${this.roomId}`);

        this.matchState.rematchTimer = setTimeout(() => {
            this.onRematchTimeout();
        }, this.matchState.rematchTimeout);
    }

    /**
     * Player request rematch
     */
    playerRequestRematch(socket) {
        const userId = socket.user._id.toString();
        const allAgreed = this.matchState.requestRematch(userId);

        this.table.broadcast('rematch_update', {
            userId,
            wantsRematch: true,
            agreedCount: this.matchState.rematchRequests.size,
            totalPlayers: this.matchState.players.length
        });

        if (allAgreed) {
            // Everyone agreed, start new game immediately
            if (this.matchState.rematchTimer) {
                clearTimeout(this.matchState.rematchTimer);
                this.matchState.rematchTimer = null;
            }
            this.startGame();
        }
    }

    /**
     * Rematch countdown timeout
     */
    onRematchTimeout() {
        console.log(`[MatchPlayers] Rematch timeout for room ${this.roomId}`);

        const players = [...this.matchState.players];
        const agreedPlayers = [];
        const kickedPlayers = [];

        players.forEach(p => {
            if (this.matchState.rematchRequests.has(p.userId)) {
                agreedPlayers.push(p);
            } else {
                kickedPlayers.push(p);
            }
        });

        // Kick players who didn't agree
        kickedPlayers.forEach(p => {
            const socket = this.io.sockets.sockets.get(p.socketId);
            if (socket) {
                socket.emit('kicked', {
                    reason: 'Rematch not confirmed',
                    code: 'REMATCH_TIMEOUT'
                });
                this.playerLeave(socket);
            } else {
                this.matchState.removePlayer(p.userId);
            }
        });

        // If players remain, status becomes waiting, wait for new players
        if (this.matchState.players.length > 0) {
            this.matchState.status = StateMappingRules.TABLE_STATUS.WAITING;
            this.matchState.rematchRequests.clear();
            this.table.broadcastRoomState();

            // Restart zombie check
            this.startZombieCheck();
        } else {
            // Room empty, reset
            this.reset();
        }
    }

    /**
     * Game end reset
     */
    reset() {
        console.log(`[MatchPlayers] Resetting room ${this.roomId}`);
        
        this.matchState.resetReadyStatus();
        this.matchState.status = StateMappingRules.TABLE_STATUS.IDLE;
        this.matchState.rematchRequests.clear();
        
        // 🔧 Ensure all active timers are cleared
        if (this.matchState.rematchTimer) {
            clearTimeout(this.matchState.rematchTimer);
            this.matchState.rematchTimer = null;
            console.log(`[MatchPlayers] Cleared rematch timer in reset()`);
        }
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
            console.log(`[MatchPlayers] Cleared countdown timer in reset()`);
        }
        
        // Broadcast room state, refresh room list
        this.table.broadcastRoomState();
        
        this.startZombieCheck();
    }

    /**
     * Start zombie check
     */
    startZombieCheck() {
        if (this.matchState.zombieTimer) clearTimeout(this.matchState.zombieTimer);

        this.matchState.zombieTimer = setTimeout(() => {
            if (this.matchState.isZombieRoom()) {
                console.log(`[MatchPlayers] Room ${this.roomId} is a zombie room, cleaning up...`);
                // Force clean all players
                [...this.matchState.players].forEach(p => {
                    const socket = this.io.sockets.sockets.get(p.socketId);
                    if (socket) {
                        socket.emit('kicked', {
                            reason: 'Room closed due to inactivity',
                            code: 'ZOMBIE_ROOM'
                        });
                        this.playerLeave(socket);
                    }
                });
            }
        }, this.matchState.zombieTimeout);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.matchState.cleanup();
        if (this.countdownTimer) clearInterval(this.countdownTimer);
    }

    /**
     * Improvement 3: State consistency check and fix method
     * Periodically check and fix inconsistency between client and server state
     * @param {Array<{userId, clientStatus}>} clientStates - Client state list
     * @returns {Array<{userId, needsSync, recommendation}>} List of players needing sync
     */
    validateAndFixStateConsistency(clientStates = []) {
        const syncResults = [];
        const serverStatus = this.status;

        for (const clientState of clientStates) {
            const { userId, clientStatus } = clientState;
            const socket = this.matchState.players
                .find(p => p.userId === userId)
                ?.socketId;

            if (!socket) continue;

            const validation = StateMappingRules.validateStateConsistency(
                clientStatus,
                serverStatus,
                {
                    playerCount: this.matchState.players.length,
                    wasPlayingBefore: serverStatus === 'playing'
                }
            );

            if (!validation.consistent) {
                console.warn(`[MatchPlayers] State mismatch detected for user ${userId}:`, {
                    roomId: this.roomId,
                    clientStatus,
                    serverStatus,
                    recommendation: validation.recommendation
                });

                // Send force sync message to client
                if (validation.shouldForceSync) {
                    this.io.sockets.sockets.get(socket)?.emit('force_state_sync', {
                        newStatus: validation.targetStatus,
                        reason: 'State mismatch, forced sync',
                        recommendation: validation.recommendation
                    });
                }
            }

            syncResults.push({
                userId,
                needsSync: !validation.consistent,
                recommendation: validation.recommendation,
                targetStatus: validation.targetStatus || serverStatus
            });
        }

        if (syncResults.some(r => r.needsSync)) {
            console.log(`[MatchPlayers] State consistency check completed for room ${this.roomId}:`, {
                totalPlayers: clientStates.length,
                needsSyncCount: syncResults.filter(r => r.needsSync).length
            });
        }

        return syncResults;
    }
}

// Mount helper classes to MatchPlayers
MatchPlayers.StateMappingRules = StateMappingRules;
MatchPlayers.MatchMaker = MatchMaker;

module.exports = MatchPlayers;
