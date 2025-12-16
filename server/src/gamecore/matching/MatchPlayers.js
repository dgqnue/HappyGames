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

        // Record timestamps
        this.createdAt = Date.now();
        this.firstPlayerJoinedAt = null;
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

        if (this.readyTimer) {
            clearTimeout(this.readyTimer);
            this.readyTimer = null;
        }

        const newState = StateMappingRules.getStateAfterPlayerLeave(this.players.length, this.maxPlayers);
        if (newState) {
            // 🔧 Fix: If game ended and a player leaves, do NOT keep status as PLAYING.
            // Transition to WAITING so the room becomes available for new players (or IDLE if empty).
            // This prevents "ghost" playing rooms with 1 player.
            this.transitionStatus(newState, { userId, reason: 'player_leave' });
        }

        if (this.players.length === 0) {
            this.firstPlayerJoinedAt = null;
            this.matchSettings = { ...StateMappingRules.DEFAULT_SETTINGS };
            this.rematchRequests.clear();
            this.roundEnded = false; // Reset gameEnded flag when room is empty
            if (this.matchState) {
                this.matchState.gameEnded = false;
            }
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

        this.transitionStatus(StateMappingRules.TABLE_STATUS.MATCHING, { reason: 'ready_check_start' });
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
        this.transitionStatus(newState, { reason: 'ready_check_cancel' });
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



    getRoomInfo() {
        return {
            roomId: this.roomId,
            status: this.status,
            isRoundEnded: this.roundEnded || false, // Add isRoundEnded flag
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
 * Handles player matching, ready status, and countdowns for game tables.
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
            // 🔧 修复：如果是"Already in room"错误，说明可能是之前的离开没有正确处理
            // 在这种情况下，我们应该检查玩家是否真的在房间中，如果是，则视为重新连接成功
            if (result.error === 'Already in room') {
                console.log(`[MatchPlayers] Player ${userId} already in room, treating as reconnect`);
                // 确保 socket 加入了房间
                socket.join(this.roomId);
                // 广播房间状态
                await this.table.broadcastRoomState();
                return true; // 视为成功加入
            }
            
            socket.emit('join_failed', {
                code: result.error === 'Room is full' ? 'ROOM_FULL' : 'JOIN_FAILED',
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
        
        console.log(`[DEBUG_TRACE] [MatchPlayers] _playerLeave called for userId: ${userId}, roomId: ${this.roomId}`);
        console.log(`[DEBUG_TRACE] [MatchPlayers] State before leave - Status: ${statusBefore}, Players: ${playerCountBefore}, RoundEnded: ${this.roundEnded}`);
        // 🔧 Debug: Print stack trace to see who called playerLeave
        console.trace(`[DEBUG_TRACE] [MatchPlayers] playerLeave stack trace for ${userId}`);
        
        console.log(`[MatchPlayers] Before leave - players: ${playerCountBefore}, status: ${statusBefore}`);

        // Record previous status
        const wasMatching = statusBefore === StateMappingRules.TABLE_STATUS.MATCHING;
        const wasPlaying = statusBefore === StateMappingRules.TABLE_STATUS.PLAYING;
        
        // Check if user is a player (before removing)
        const wasPlayer = this.matchState.players.some(p => p.userId === userId);

        // Handle forfeit if leaving during game (and game not ended)
        if (wasPlaying && !this.roundEnded) {
            // Check if player is actually in the game (not spectator)
            const player = this.matchState.players.find(p => p.userId === userId);
            if (player && typeof this.table.onPlayerLeaveDuringRound === 'function') {
                console.log(`[MatchPlayers] Player ${userId} leaving during round, triggering forfeit`);
                this.table.onPlayerLeaveDuringRound(socket);
            }
        }

        // 🔧 Update: If game ended (between rounds) and a player leaves, dissolve the room
        // Only trigger if we are NOT in playing state (double check)
        if (this.roundEnded && wasPlayer && this.matchState.status !== StateMappingRules.TABLE_STATUS.PLAYING) {
            console.log(`[MatchPlayers] Player ${userId} left after game ended. NOT dissolving room to allow opponent to see result.`);
            // 🔧 Change: Do NOT kick opponent. Let them stay.
            /*
            console.log(`[MatchPlayers] Player ${userId} left after game ended (and not playing). Dissolving room.`);
            
            // Kick remaining players (if any)
            // We iterate backwards to safely remove
            for (let i = this.matchState.players.length - 1; i >= 0; i--) {
                const p = this.matchState.players[i];
                if (p.userId !== userId) { // Don't kick the leaver again (will be removed below)
                    const s = this.io.sockets.sockets.get(p.socketId);
                    if (s) {
                        console.log(`[MatchPlayers] Kicking opponent ${p.userId} because ${userId} left`);
                        s.emit('kicked', { reason: 'Opponent left', code: 'OPPONENT_LEFT' });
                        s.leave(this.roomId);
                    }
                    this.matchState.removePlayer(p.userId);
                }
            }
            */
            // Now the leaver will be removed by standard logic below
        }

        // Remove from player list (this method automatically calculates new status)
        const wasPlayerResult = this.matchState.removePlayer(userId);
        // wasPlayer variable name conflict fix
        const wasPlayerActuallyRemoved = wasPlayerResult; 

        // Remove from spectator list
        const wasSpectator = this.matchState.removeSpectator(userId);

        const statusAfter = this.matchState.status;
        const playerCountAfter = this.matchState.players.length;
        
        console.log(`[MatchPlayers] After removePlayer - wasPlayer: ${wasPlayerActuallyRemoved}, wasSpectator: ${wasSpectator}, players: ${playerCountBefore}->${playerCountAfter}, status: ${statusBefore}->${statusAfter}`);

        if (wasPlayerActuallyRemoved || wasSpectator) {
            socket.leave(this.roomId);
            console.log(`[MatchPlayers] Socket left room, will broadcast room state. Current players: ${playerCountAfter}, status: ${statusAfter}`);
            
            // If all players left, reset table state
            if (playerCountAfter === 0) {
                console.log(`[MatchPlayers] All players left the table, resetting table state`);
                // Reset to initial state
                this.matchState.transitionStatus(StateMappingRules.TABLE_STATUS.IDLE, { reason: 'table_reset' });
                this.matchState.resetReadyStatus();
                this.readyCheckCancelled = false;
                this.isLocked = false;
                
                // 🔧 关键修复：重置 roundEnded 标志，确保新玩家可以正常加入
                this.roundEnded = false;
                if (this.matchState) {
                    this.matchState.gameEnded = false;
                }
                console.log(`[MatchPlayers] Reset roundEnded to false after all players left`);
                
                // 🔧 Clear all active timers, ensure state restores immediately
                if (this.countdownTimer) {
                    clearTimeout(this.countdownTimer);
                    this.countdownTimer = null;
                    console.log(`[MatchPlayers] Cleared countdown timer because all players left`);
                }
                
                // 🔧 清除下一回合请求
                if (this._nextRoundRequests) {
                    this._nextRoundRequests.clear();
                }
            } else {
                // 🔧 关键修复：如果还有玩家，且游戏未开始，重置所有人的准备状态
                // 这样可以防止剩下的玩家处于“已准备”但界面显示“开始”的不一致状态
                if (statusAfter !== StateMappingRules.TABLE_STATUS.PLAYING) {
                    console.log(`[MatchPlayers] Resetting ready status for remaining players due to player leave`);
                    this.matchState.resetReadyStatus();
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

        return wasPlayerActuallyRemoved || wasSpectator;
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
        // Only record if game is NOT ended
        if (wasInGame && !this.roundEnded) {
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
        // Only forfeit if game is NOT ended
        if (wasInGame && !this.roundEnded && typeof this.table.onPlayerDisconnectDuringGame === 'function') {
            this.table.onPlayerDisconnectDuringGame(userId);
        }
    }

    /**
     * Player ready - Internal implementation
     */
    _playerReady(socket) {
        const userId = socket.user._id.toString();
        
        // 🔧 如果回合已结束（roundEnded=true），玩家点击"再来一局"应该开始下一回合
        // 此时玩家状态仍是 ready，所以需要特殊处理
        if (this.roundEnded && this.matchState.status === StateMappingRules.TABLE_STATUS.PLAYING) {
            console.log(`[MatchPlayers] Player ${userId} requested next round (roundEnded=true)`);
            // 记录这个玩家想要下一回合
            if (!this._nextRoundRequests) {
                this._nextRoundRequests = new Set();
            }
            this._nextRoundRequests.add(userId);
            
            // 检查是否所有玩家都请求了下一回合
            const allPlayersRequested = this.matchState.players.every(p => 
                this._nextRoundRequests.has(p.userId)
            );
            
            console.log(`[MatchPlayers] Next round requests: ${this._nextRoundRequests.size}/${this.matchState.players.length}, allRequested: ${allPlayersRequested}`);
            
            if (allPlayersRequested) {
                console.log(`[MatchPlayers] All players requested next round, starting...`);
                this._nextRoundRequests.clear();
                this.startRound();
            }
            return;
        }
        
        // 🔧 幂等性检查：如果玩家已经准备好了，直接忽略重复请求
        const player = this.matchState.players.find(p => p.userId === userId);
        if (player && player.ready) {
            return;
        }

        if (this.isLocked) {
            socket.emit('error', { message: 'Game starting, cannot change state' });
            return;
        }

        // Allow ready if status is MATCHING or WAITING
        const canReady = this.matchState.status !== StateMappingRules.TABLE_STATUS.PLAYING;

        if (!canReady) {
             console.warn(`[MatchPlayers] Player ${userId} tried to ready while playing`);
             return;
        }

        const result = this.matchState.setPlayerReady(userId, true);

        this.table.broadcastRoomState();

        if (result === 'all_ready') {
            this.startRoundCountdown();
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
     * 倒计时会显示给玩家，但超时不会踢人
     */
    startReadyCheck() {
        // Clear previous timer (if exists)
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }

        const result = this.matchState.startReadyCheck();
        if (!result) return;

        // 广播30秒倒计时开始事件（UI显示用）
        this.table.broadcast('ready_check_start', {
            timeout: this.matchState.readyTimeout
        });
        console.log(`[MatchPlayers] startReadyCheck: broadcasting 30s countdown (timeout will not kick players)`);

        this.table.broadcastRoomState();
    }

    /**
     * Start round countdown (开始回合倒计时 3-2-1)
     */
    startRoundCountdown() {
        this.isLocked = true;

        // Cancel 30s ready countdown, as all players ready, game starting
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }
        this.readyCheckCancelled = true;

        this.table.broadcast('game_locked', {
            message: 'All players ready, game starting',
            locked: true
        });

        // 检查是否已经执行过321倒计时
        // 使用 roundCount 来判断是否是第一局
        // 如果 roundCount > 0，说明已经进行过至少一局游戏，直接开始
        const roundCount = this.table.roundCount || 0;
        console.log(`[MatchPlayers] startRoundCountdown called, roundCount: ${roundCount}`);
        
        if (roundCount > 0) {
            // 已经执行过321倒计时，直接开始游戏
            console.log(`[MatchPlayers] Not first round (roundCount > 0), starting game immediately`);
            
            // 直接开始游戏，不发送倒计时，也不等待
            this.startRound();
            return;
        }

        // 第一次开始游戏：显示321倒计时
        console.log(`[MatchPlayers] First time starting game (roundCount=0), showing 3-2-1 countdown`);
        let countdown = 3;
        this.table.broadcast('game_countdown', { count: countdown });

        this.countdownTimer = setInterval(() => {
            countdown--;

            if (countdown > 0) {
                this.table.broadcast('game_countdown', { count: countdown });
            } else {
                // 清除定时器
                if (this.countdownTimer) {
                    clearInterval(this.countdownTimer);
                    this.countdownTimer = null;
                    console.log(`[MatchPlayers] Countdown timer cleared and will never start again`);
                }

                // 倒计时结束，开始游戏
                // 注意：不需要手动设置 gameStartCount，因为 startRound 会增加 roundCount
                console.log(`[MatchPlayers] Countdown finished, starting game`);

                // 发送 0 倒计时作为开始信号（仅第一局）
                this.table.broadcast('game_countdown', { count: 0, message: 'Game Start!' });

                setTimeout(() => {
                    this.startRound();
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
     * Cancel game and reset to IDLE state
     * Used when a player disconnects during the grace period
     */
    cancelGame() {
        console.log(`[MatchPlayers] cancelGame called for room ${this.roomId}`);
        
        // Stop any active countdown
        this.cancelGameCountdown();
        
        // Clear all timers
        if (this.matchState.readyTimer) {
            clearTimeout(this.matchState.readyTimer);
            this.matchState.readyTimer = null;
        }
        
        // Reset game state
        this.roundEnded = false;
        this.matchState.gameEnded = false;
        this.isLocked = false;
        this.readyCheckCancelled = false;
        
        // Reset ready status
        this.matchState.resetReadyStatus();
        
        // Set status back to MATCHING (players can choose to leave or ready again)
        this.matchState.status = StateMappingRules.TABLE_STATUS.MATCHING;
        
        // Broadcast updated room state
        this.table.broadcastRoomState();
        
        console.log(`[MatchPlayers] Game cancelled, status reset to MATCHING`);
    }

    /**
     * Start game
     */
    /**
     * Start round (开始回合)
     */
    startRound() {
        console.log(`[DEBUG_TRACE] [MatchPlayers] startRound called for room ${this.roomId}`);
        console.log(`[DEBUG_TRACE] [MatchPlayers] startRound state before reset: gameEnded=${this.gameEnded}, roundEnded=${this.roundEnded}, status=${this.matchState.status}, readyCheckCancelled=${this.readyCheckCancelled}`);
        
        // 🔧 清除下一回合请求记录
        if (this._nextRoundRequests) {
            this._nextRoundRequests.clear();
        }
        
        // 🔧 Safety: Ensure roundEnded is false immediately
        this.roundEnded = false; 
        this.matchState.gameEnded = false; 

        // 🔧 Safety: Mark ready check as cancelled to prevent any pending timeouts
        this.readyCheckCancelled = true;

        console.log(`[MatchPlayers] startRound state after reset: roundEnded=${this.roundEnded}, status=${this.matchState.status}`);

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

        // Set to playing state
        this.matchState.transitionStatus(StateMappingRules.TABLE_STATUS.PLAYING, { reason: 'round_start' });
        console.log(`[MatchPlayers] Status set to PLAYING. Current status getter: ${this.status}`);

        // Note: Do not reset ready status! Ready status should remain until round ends
        // Reset ready status should only happen in onRoundEnd()

        // 🔧 CRITICAL FIX: Call table.startRound() FIRST to reset board/data BEFORE broadcasting state
        // This prevents sending "status: playing" with the OLD board data (from previous round)
        // which could confuse clients or cause them to think the round is already over.
        
        // Notify table to start round
        if (typeof this.table.startRound === 'function') {
            console.log(`[MatchPlayers] Calling table.startRound()...`);
            try {
                this.table.startRound();
            } catch (error) {
                console.error(`[MatchPlayers] Error calling table.startRound():`, error);
                // Error handling: Round start failed
                this.table.broadcast('error', {
                    message: 'Failed to start round',
                    error: error.message
                });
                // If start failed, revert status?
                return;
            }
        } else if (typeof this.table.onRoundStart === 'function') {
            // Fallback for old API
            console.log(`[MatchPlayers] Calling table.onRoundStart()...`);
            try {
                this.table.onRoundStart();
            } catch (error) {
                console.error(`[MatchPlayers] Error calling table.onRoundStart():`, error);
            }
        } else {
            console.error('[MatchPlayers] Table does not implement startRound() or onRoundStart()');
        }

        // Broadcast state update, ensure all clients (including lobby) know status is playing
        // Now the board data will be fresh
        console.log(`[MatchPlayers] Broadcasting room state...`);
        this.table.broadcastRoomState();
    }

    /**
     * Round end handler (回合结束处理)
     * @param {Object} result - Round result
     */
    async onRoundEnd(result) {
        console.log(`[MatchPlayers] Round ended in room ${this.roomId}`);
        console.log(`[MatchPlayers] onRoundEnd state before update: roundEnded=${this.roundEnded}, status=${this.matchState.status}`);

        // 🔧 关键修复：回合结束后，状态保持 PLAYING，玩家保持 ready
        // 只有当玩家主动离开时，状态才会改变
        
        // Release game lock (允许玩家点击"再来一局")
        this.isLocked = false;
        
        // Mark round as ended (用于判断是否可以开始下一回合)
        this.roundEnded = true;
        if (this.matchState) {
            this.matchState.gameEnded = true; // Sync to matchState for getRoomInfo
        }

        // 🔧 不要重置 ready 状态！玩家仍然是 ready 的
        // this.matchState.resetReadyStatus(); // REMOVED

        // 🔧 CRITICAL FIX: Reset roundStartTime to prevent stale timestamp in grace period check
        if (this.table && this.table.roundStartTime !== undefined) {
            this.table.roundStartTime = null;
            console.log(`[MatchPlayers] Reset table.roundStartTime to null after round end`);
        }

        // 🔧 不要改变状态！保持 PLAYING
        // this.matchState.status = StateMappingRules.TABLE_STATUS.MATCHING; // REMOVED

        // Broadcast round end
        console.log(`[MatchPlayers] Broadcasting round_ended event with result:`, result);
        this.table.broadcast('round_ended', {
            result
        });
        console.log(`[MatchPlayers] round_ended event broadcasted successfully`);

        // Immediately broadcast cancel ready status, ensure client receives
        // this.table.broadcast('players_unready', {
        //     reason: 'Game ended, ready status cleared'
        // });

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

        // 🔧 CRITICAL FIX: Explicitly disable rematch countdown
        // The previous line was commented out, but we want to be absolutely sure
        // this.startRematchCountdown(); 
        
        // Also ensure any existing timer is cleared
        if (this.matchState.rematchTimer) {
            clearTimeout(this.matchState.rematchTimer);
            this.matchState.rematchTimer = null;
        }
    }



    /**
     * Game end reset
     */
    reset() {
        console.log(`[MatchPlayers] Resetting room ${this.roomId}`);
        
        this.gameEnded = false; // Reset game ended flag
        this.matchState.gameEnded = false; // Sync to matchState
        this.matchState.resetReadyStatus();
        this.matchState.status = StateMappingRules.TABLE_STATUS.IDLE;
        
        // 🔧 Ensure all active timers are cleared
        if (this.countdownTimer) {
            clearTimeout(this.countdownTimer);
            this.countdownTimer = null;
            console.log(`[MatchPlayers] Cleared countdown timer in reset()`);
        }
        
        // Broadcast room state, refresh room list
        this.table.broadcastRoomState();
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
