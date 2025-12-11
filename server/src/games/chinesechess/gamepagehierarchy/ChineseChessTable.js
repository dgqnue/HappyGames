const GameTable = require('../../../gamecore/hierarchy/GameTable');
const MatchPlayers = require('../../../gamecore/matching/MatchPlayers');
const ChineseChessRules = require('../logic/ChineseChessRules');
const EloService = require('../../../gamecore/EloService');
const Grade = require('../grade/Grade');
const axios = require('axios');
const crypto = require('crypto');

const SECRET_KEY = process.env.SETTLEMENT_SECRET_KEY || 'YOUR_SECURE_KEY';

/**
 * 中国象棋游戏桌 (ChineseChessTable)
 * 直接继承自 GameTable，使用 MatchPlayers 处理匹配逻辑
 */
const { fetchLatestAvatarUrl } = require('../../../utils/avatarUtils');

class ChineseChessTable extends GameTable {
    constructor(io, tableId, gameType, maxPlayers, tier) {
        super(io, tableId);

        this.gameType = gameType;
        this.maxPlayers = maxPlayers;
        this.tier = tier;

        // 初始化匹配管理器
        this.matchPlayers = new MatchPlayers(this);

        // 游戏特定状态
        this.board = null;
        this.turn = null;
        this.history = [];

        // 初始化空棋盘
        this.resetBoard();
    }

    // --- 委托给 MatchPlayers 的属性 ---

    get players() {
        return this.matchPlayers.players;
    }

    get spectators() {
        return this.matchPlayers.spectators;
    }

    get status() {
        return this.matchPlayers.status;
    }

    set status(value) {
        this.matchPlayers.status = value;
    }

    // --- 委托给 MatchPlayers 的方法 ---

    async playerJoin(socket, matchSettings) {
        const success = await this.matchPlayers.playerJoin(socket, matchSettings);
        // 注意：Socket 事件监听器现在由 setupSocketListeners 统一处理
        // 不在这里注册，避免重复注册
        return success;
    }

    /**
     * 玩家在游戏中离开时的处理（判负逻辑）
     * 重写基类的钩子方法
     */
    onPlayerLeaveDuringGame(socket) {
        const userId = socket.user._id.toString();
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            console.log(`[ChineseChessTable] Player ${userId} left during game, forfeiting.`);
            // 判对方获胜
            const redPlayer = this.players[0];
            const winnerSide = userId === redPlayer.userId ? 'b' : 'r';
            this.handleWin(winnerSide);
            // handleWin 会调用 endGame -> onGameEnd，该方法会将状态设为 MATCHING 并广播
        }
    }

    /**
     * 移除玩家的事件监听器
     * 重写基类的方法
     */
    removePlayerEventListeners(socket) {
        socket.removeAllListeners(`${this.gameType}_move`);
        socket.removeAllListeners(`${this.gameType}_check_state_consistency`);
    }

    /**
     * 重置游戏数据（棋盘）
     * 重写基类的方法
     */
    resetGameData() {
        this.resetBoard();
    }

    handlePlayerDisconnect(socket) {
        return this.matchPlayers.handlePlayerDisconnect(socket);
    }

    playerReady(socket) {
        return this.matchPlayers.playerReady(socket);
    }

    playerUnready(socket) {
        return this.matchPlayers.playerUnready(socket);
    }

    /**
     * 处理状态一致性检查
     */
    handleStateConsistencyCheck(socket, data) {
        // 简单实现：如果发现状态不一致，发送最新状态
        // 这里可以添加更复杂的逻辑
        if (data.tableId !== this.tableId) return;
        
        // 如果客户端认为在 playing 但服务器不在 playing，或者反之
        // 或者 board hash 不一致等
        // 目前简单起见，不强制同步，只是记录日志或在严重不一致时同步
        
        // 例如：如果服务器在 playing，但客户端不在
        if (this.status === 'playing' && data.clientStatus !== 'playing') {
            console.log(`[ChineseChessTable] State mismatch detected for ${socket.user.username}, resyncing...`);
            this.sendTableState(socket);
        }
    }

    /**
     * 发送完整游戏桌状态给特定玩家
     */
    sendTableState(socket) {
        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];
        const isRed = redPlayer && socket.user._id.toString() === redPlayer.userId;
        
        socket.emit('table_update', {
            status: this.status,
            board: this.board,
            turn: this.turn,
            mySide: isRed ? 'r' : (blackPlayer && socket.user._id.toString() === blackPlayer.userId ? 'b' : null),
            players: this.players.map(p => ({
                userId: p.userId,
                nickname: p.nickname,
                avatar: p.avatar,
                ready: p.ready
            })),
            winner: null // TODO: 如果已结束，需要发送 winner
        });
    }

    // --- 游戏逻辑 ---

    /**
     * 重置棋盘
     */
    resetBoard() {
        // 标准开局 (红方在下，黑方在上)
        this.board = [
            ['r', 'n', 'b', 'a', 'k', 'a', 'b', 'n', 'r'],
            [null, null, null, null, null, null, null, null, null],
            [null, 'c', null, null, null, null, null, 'c', null],
            ['p', null, 'p', null, 'p', null, 'p', null, 'p'],
            [null, null, null, null, null, null, null, null, null],
            [null, null, null, null, null, null, null, null, null],
            ['P', null, 'P', null, 'P', null, 'P', null, 'P'],
            [null, 'C', null, null, null, null, null, 'C', null],
            [null, null, null, null, null, null, null, null, null],
            ['R', 'N', 'B', 'A', 'K', 'A', 'B', 'N', 'R']
        ];
        this.turn = 'r'; // 红方先行
        this.history = [];
    }

    /**
     * 开始游戏 (由 MatchPlayers 调用)
     */
    startGame() {
        this.resetBoard();
        this.onGameStart();
    }

    /**
     * 游戏开始回调
     */
    async onGameStart() {
        // 分配阵营：第一个玩家是红方，第二个是黑方
        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];

        // 架构优化：直接使用内存中的玩家状态
        const playerInfos = this.players.map(p => {
            return {
                userId: p.userId,
                nickname: p.nickname,
                title: p.title || '无',
                avatar: p.avatar || '/images/default-avatar.png' // 信任内存状态
            };
        });

        // 发送初始状态给所有玩家
        this.players.forEach((player) => {
            const isRed = player.userId === redPlayer.userId;
            this.sendToPlayer(player.socketId, 'game_start', {
                board: this.board,
                turn: this.turn,
                mySide: isRed ? 'r' : 'b',
                players: {
                    r: redPlayer.userId,
                    b: blackPlayer.userId
                },
                playerInfos: playerInfos
            });
        });

        console.log(`[ChineseChess] 游戏开始: ${this.tableId}`);
    }

    /**
     * 处理移动请求
     */
    handleMove(socket, move) {
        // 如果状态不是 playing，尝试自愈，避免直接拒绝导致棋子无法移动
        if (this.status !== 'playing') {
            console.warn(`[ChineseChessTable] handleMove: status=${this.status}, expected 'playing'. Attempting auto-recover.`);

            // 若棋盘未初始化，重置棋盘并抢救状态
            if (!this.board || !Array.isArray(this.board) || this.board.length === 0) {
                console.warn('[ChineseChessTable] Board missing when move received. Resetting board and turn.');
                this.resetBoard();
            }

            // 补上回合信息
            if (!this.turn) {
                this.turn = 'r';
            }

            // 将状态切回 playing 并广播，让前端同步
            this.matchPlayers.matchState.status = 'playing';
            this.broadcastRoomState();
        }

        const { fromX, fromY, toX, toY } = move;
        const userId = socket.user._id.toString();

        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];

        // 验证是否是当前玩家的回合
        const isRed = userId === redPlayer.userId;
        const isBlack = userId === blackPlayer.userId;

        if (!isRed && !isBlack) {
            console.log(`[ChineseChessTable] handleMove rejected: userId ${userId} is neither red player (${redPlayer?.userId}) nor black player (${blackPlayer?.userId})`);
            return; // 旁观者不能移动
        }

        const side = isRed ? 'r' : 'b';
        if (side !== this.turn) {
            console.log(`[ChineseChessTable] handleMove rejected: side ${side} is not current turn ${this.turn}`);
            return; // 不是你的回合
        }

        // 检查源位置的棋子是否存在
        const piece = this.board[fromY] ? this.board[fromY][fromX] : null;
        if (!piece) {
            console.log(`[ChineseChessTable] handleMove rejected: no piece at (${fromX},${fromY}), board state: ${JSON.stringify(this.board[fromY])}`);
            return;
        }

        // 验证移动逻辑
        const isValidMove = ChineseChessRules.isValidMoveV2(this.board, fromX, fromY, toX, toY, this.turn);
        if (!isValidMove) {
            console.log(`[ChineseChessTable] handleMove rejected: invalid move from (${fromX},${fromY}) to (${toX},${toY}), piece=${piece}`);
            socket.emit('error', { message: '非法移动' });
            return;
        }
        console.log(`[ChineseChessTable] handleMove accepted: valid move from (${fromX},${fromY}) to (${toX},${toY}), piece=${piece}`);

        // 在执行移动前保存棋盘快照，用于将军检测，避免使用已被修改的棋盘
        const boardBeforeMove = this.board.map(row => [...row]);

        // 执行移动
        const captured = this.board[toY][toX];

        this.board[toY][toX] = piece;
        this.board[fromY][fromX] = null;

        this.history.push({ ...move, piece, captured });

        // 检查胜利条件（吃掉将/帅）
        if (captured && captured.toLowerCase() === 'k') {
            this.handleWin(side); // 当前方获胜
            return;
        }

        // 切换回合
        this.turn = this.turn === 'r' ? 'b' : 'r';

        // 检查是否形成将军（使用移动前的棋盘做模拟，若检测异常不中断广播）
        let check = false;
        try {
            check = ChineseChessRules.isCheckAfterMove(boardBeforeMove, fromX, fromY, toX, toY, side);
        } catch (err) {
            console.warn('[ChineseChessTable] isCheckAfterMove failed, continue without check flag:', err);
        }

        // 广播移动
        console.log(`[ChineseChessTable] Broadcasting move: captured=${captured ? captured : null}, from=(${fromX},${fromY}) to=(${toX},${toY}), new turn=${this.turn}, check=${check}`);
        this.broadcast('move', {
            move,
            captured: captured ? captured : null,
            check: check,
            turn: this.turn,
            board: this.board
        });
    }

    /**
     * 处理胜利
     */
    async handleWin(winnerSide) {
        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];

        const winnerId = winnerSide === 'r' ? redPlayer.userId : blackPlayer.userId;
        const loserId = winnerSide === 'r' ? blackPlayer.userId : redPlayer.userId;

        // 1. ELO 结算（将更新后的 rating 写入数据库）
        const eloResult = await EloService.processMatchResult(
            this.gameType,
            winnerId,
            loserId,
            1 // Winner gets 1 point
        );
        console.log(`[ChineseChessTable] ELO updated:`, eloResult);

        // 2. 全局重新计算所有玩家的排名和称号
        //    因为这两个玩家的 rating 改变，可能影响所有玩家的排名
        console.log(`[ChineseChessTable] Recalculating all player titles...`);
        let titleResult = {};
        try {
            titleResult = await Grade.updateAllPlayerTitles(this.gameType);
            console.log(`[ChineseChessTable] All player titles updated:`, titleResult);
        } catch (err) {
            console.error(`[ChineseChessTable] Error updating all titles:`, err);
        }

        // 3. 游戏豆结算 (非免费室)
        if (this.tier !== 'free') {
            const betAmount = this.getBetAmount();
            await this.settle({
                winner: winnerId,
                loser: loserId,
                amount: betAmount
            });
        }

        // 4. 结束游戏，广播包含称号信息的结果
        this.endGame({
            winner: winnerSide, // 'r' or 'b'
            winnerId: winnerId,
            elo: eloResult,
            title: titleResult  // 包含更新后的称号信息
        });
    }

    /**
     * 结束游戏
     */
    /**
     * 结束游戏
     */
    endGame(result) {
        console.log(`[ChineseChess] 游戏结束: ${this.tableId}, 结果:`, result);

        // 委托给 MatchPlayers 处理游戏结束流程 (包含再来一局逻辑)
        this.matchPlayers.onGameEnd(result);
    }

    /**
     * 处理游戏中断线
     */
    onPlayerDisconnectDuringGame(userId) {
        console.log(`[ChineseChess] 玩家断线判负: ${userId}`);

        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];

        if (!redPlayer || !blackPlayer) return;

        // 判对手获胜
        const winnerSide = userId === redPlayer.userId ? 'b' : 'r';
        this.handleWin(winnerSide);
    }

    getBetAmount() {
        switch (this.tier) {
            case 'beginner': return 100;
            case 'intermediate': return 1000;
            case 'advanced': return 10000;
            default: return 0;
        }
    }

    // --- 结算相关方法 (从基类移入) ---

    /**
     * 签名函数：增加时间戳 (timestamp) 和随机数 (nonce)
     */
    sign(data) {
        // 签名数据必须包含 batchId, timestamp, nonce, result, 以防止重放攻击
        return crypto.createHmac('sha256', SECRET_KEY)
            .update(JSON.stringify(data))
            .digest('hex');
    }

    /**
     * 异步结算 API 调用
     */
    async settle(result) {
        // 生成唯一的 BatchId, timestamp, nonce
        const batchId = `${this.tableId}-${Date.now()}`;
        const timestamp = Date.now();
        const nonce = crypto.randomBytes(16).toString('hex');

        const settlementPayload = {
            batchId,
            timestamp,
            nonce,
            result, // 包含 winner, loser, amount 等详细信息
        };

        try {
            const signature = this.sign(settlementPayload);
            // Assuming the API is running on localhost for internal calls
            const apiUrl = process.env.API_URL || 'http://localhost:5000';
            await axios.post(`${apiUrl}/api/settle`, settlementPayload, {
                headers: {
                    "x-signature": signature
                }
            });
        } catch (err) {
            console.error(`Settlement failed for Table ${this.tableId}:`, err);
            // 即使异步请求失败，也需要记录，以便后续人工干预或重试
            // 建议：发送一个内部系统错误消息给当前游戏桌的所有玩家
            this.broadcast('system_error', { code: 'W005', message: '结算服务请求失败，请联系客服' });
        }
    }

    // --- 必须实现的 BaseGameTable 方法 ---

    /**
     * 广播房间状态
     * 改进版本：从数据库获取最新的玩家称号、等级分和头像
     * MatchPlayers 需要调用此方法
     */
    async broadcastRoomState() {
        const roomInfo = this.matchPlayers.matchState.getRoomInfo();
        const currentStatus = this.status;  // 使用 getter，确保获取正确的状态
        const currentPlayers = this.players;
        
        // 辅助函数：将头像路径转换为完整 URL（统一提供给前端）
        // const getFullAvatarUrl = (avatarPath) => { ... } // Moved to utils/urlUtils.js
        
        // 从数据库获取最新的玩家信息（特别是称号、等级分和头像）
        const UserGameStats = require('../../../models/UserGameStats');
        const User = require('../../../models/User');
        const playerDataMap = {};
        
        try {
            for (const player of currentPlayers) {
                const playerData = {};
                
                // 获取游戏统计数据（称号、等级分）
                const stats = await UserGameStats.findOne({
                    userId: player.userId,
                    gameType: this.gameType
                }).lean();
                
                if (stats) {
                    playerData.title = stats.title;
                    playerData.titleColor = stats.titleColor;
                    playerData.rating = stats.rating;
                }
                
                // 获取用户信息（头像、昵称等）- 无条件查询
                // 架构优化：不再重复查询头像，直接使用内存中的状态
                // const dbQueryId = player.user?._id || player.userId;
                // playerData.avatar = await fetchLatestAvatarUrl(dbQueryId);

                // 单独获取昵称 (如果需要实时更新昵称的话保留，否则也可以优化掉)
                const dbQueryId = player.user?._id || player.userId;
                try {
                    const userInfo = await User.findById(dbQueryId).select('nickname').lean();
                    if (userInfo?.nickname) {
                        playerData.nickname = userInfo.nickname;
                    }
                } catch (err) {
                    console.warn(`[ChineseChessTable] Failed to fetch nickname for ${player.userId}:`, err.message);
                }
                
                playerDataMap[player.userId] = playerData;
            }
        } catch (err) {
            console.error(`[ChineseChessTable] Error loading player stats for broadcastRoomState:`, err);
        }
        
        const state = {
            ...roomInfo,
            tableId: this.tableId,              // 确保 tableId 被设置
            roomId: this.tableId,               // 保留 roomId 作为备选
            status: currentStatus,              // 游戏桌状态（idle, waiting, matching, playing）
            players: currentPlayers.map(p => {
                // 优先使用从数据库获取的最新信息 (仅限动态数据如称号、积分)
                const latestData = playerDataMap[p.userId] || {};
                
                // 🚨 关键修复：确保 userId 绝对存在
                const effectiveUserId = p.userId || (p.user ? p.user._id.toString() : null);
                
                if (!effectiveUserId) {
                    console.error(`[ChineseChessTable] 🚨 CRITICAL: Player object missing userId!`, p);
                }

                return {
                    userId: effectiveUserId,
                    nickname: latestData.nickname || p.nickname,
                    // 架构优化：直接使用内存中的头像，它是入座时获取的正确数据
                    avatar: p.avatar || '/images/default-avatar.png', 
                    ready: p.ready,
                    title: latestData.title || p.title,
                    titleColor: latestData.titleColor || p.titleColor,
                    winRate: p.winRate,
                    disconnectRate: p.disconnectRate,
                    seatIndex: p.seatIndex
                };
                    socketId: p.socketId,
                    nickname: latestData.nickname || p.nickname || (p.user ? p.user.nickname : 'Unknown'),
                    avatar: effectiveAvatar,
                    ready: p.ready,
                    title: latestData.title || p.title,
                    titleColor: latestData.titleColor || p.titleColor,
                    winRate: p.winRate,
                    disconnectRate: p.disconnectRate,
                    seatIndex: p.seatIndex
                };
            }),
            // 如果正在游戏中，附带游戏状态
            ...(currentStatus === 'playing' ? {
                board: this.board,
                turn: this.turn
            } : {})
        };

        console.log(`[ChineseChessTable] Broadcasting room state for table ${this.tableId}: status=${currentStatus}, players=${currentPlayers.length}`);
        
        // 广播给房间内所有人
        // DEBUG: Log avatar URLs being sent
        if (state.players && state.players.length > 0) {
            const avatars = state.players.map(p => `${p.nickname}:${p.avatar}`);
            console.log(`[ChineseChessTable] Broadcasting table_update with avatars:`, avatars);
        }
        this.io.to(this.tableId).emit('table_update', state);

        // 通知 GameCenter 广播更新的桌子列表到房间
        // 这样房间中的其他玩家可以看到桌子状态的变化
        if (this.gameCenter) {
            this.gameCenter.broadcastRoomList(this.tier);
        }
    }

    /**
     * 发送消息给指定玩家
     */
    sendToPlayer(socketId, event, data) {
        this.io.to(socketId).emit(event, data);
    }

    /**
     * 广播消息
     */
    /**
     * 广播消息
     */
    broadcast(event, data) {
        this.io.to(this.tableId).emit(event, data);
    }

    /**
     * 处理玩家加入游戏桌
     * @param {Object} socket - Socket 实例
     * @param {Boolean} canPlay - 是否可以作为玩家入座（由 GameRoom 判断）
     */
    async joinTable(socket, canPlay) {
        if (!socket.user) {
            socket.emit('error', { message: '未认证' });
            return { success: false };
        }

        if (!canPlay) {
            // 不符合积分条件，作为观众加入
            return await this.joinAsSpectator(socket);
        }

        // 符合条件，作为玩家加入
        return await this.joinAsPlayer(socket);
    }

    /**
     * 作为玩家加入
     */
    async joinAsPlayer(socket) {
        const success = await this.playerJoin(socket);

        if (success) {
            socket.join(this.tableId);
            this.setupSocketListeners(socket, false); // 玩家模式
            this.sendState(socket);
            return { success: true, asSpectator: false };
        } else {
            socket.emit('error', { message: '加入失败，房间已满' });
            return { success: false };
        }
    }

    /**
     * 作为观众加入
     */
    async joinAsSpectator(socket) {
        const spectatorData = {
            userId: socket.user._id.toString(),
            socketId: socket.id,
            nickname: socket.user.nickname || socket.user.username
        };

        const result = this.matchPlayers.matchState.addSpectator(spectatorData);

        if (result.success) {
            socket.join(this.tableId);
            this.setupSocketListeners(socket, true); // 观众模式
            this.sendState(socket);

            socket.emit('joined_as_spectator', {
                message: '您的积分不足，已作为观众加入'
            });

            return { success: true, asSpectator: true };
        } else {
            socket.emit('error', { message: result.error });
            return { success: false };
        }
    }

    /**
     * 设置 Socket 监听器
     */
    setupSocketListeners(socket, isSpectator = false) {
        if (!isSpectator) {
            // 玩家模式
            socket.on(`${this.gameType}_move`, (move) => {
                this.handleMove(socket, move);
            });
            
            // 绑定状态一致性检查
            socket.on(`${this.gameType}_check_state_consistency`, (data) => {
                this.handleStateConsistencyCheck(socket, data);
            });
            
            socket.on('player_ready', () => this.playerReady(socket));
            socket.on('player_unready', () => this.playerUnready(socket));

            // 悔棋和求和
            socket.on('request_undo', () => {
                console.log('[ChineseChess] 玩家请求悔棋');
            });
            socket.on('request_draw', () => {
                console.log('[ChineseChess] 玩家请求求和');
            });
        }

        // 通用监听
        socket.on(`${this.gameType}_leave`, () => {
            if (isSpectator) {
                this.matchPlayers.matchState.removeSpectator(socket.user._id.toString());
            } else {
                this.playerLeave(socket);
            }
            socket.currentRoomId = null;
            socket.currentGameId = null;
        });

        // 断线处理
        // 注意：SocketServer 可能会统一处理 disconnect，这里仅作补充或特定逻辑
        socket.on('disconnect', () => {
            if (isSpectator) {
                this.matchPlayers.matchState.removeSpectator(socket.user._id.toString());
            } else {
                this.handlePlayerDisconnect(socket);
            }
        });
    }

    /**
     * 发送桌子状态
     */
    async sendState(socket) {
        const state = this.matchPlayers.matchState.getRoomInfo();
        state.status = this.status;

        // 架构优化：直接使用内存中的玩家状态，不再重复查询数据库
        // MatchPlayers 在玩家入座时已经获取了正确的头像
        const playersWithAvatar = this.players.map(p => {
            return {
                userId: p.userId,
                nickname: p.nickname,
                avatar: p.avatar || '/images/default-avatar.png', // 信任内存状态
                ready: p.ready,
                title: p.title,
                titleColor: p.titleColor,
                winRate: p.winRate,
                seatIndex: p.seatIndex
            };
        });

        socket.emit('table_state', {
            ...state,
            roomId: this.tableId,  // 添加 tableId，客户端用它来确认加入成功
            tableId: this.tableId, // 同时提供 tableId 字段以保持兼容性
            players: playersWithAvatar,
            spectators: this.spectators.map(s => ({
                userId: s.userId,
                nickname: s.nickname
            }))
        });
        
        // DEBUG: Log avatar URLs being sent in table_state
        if (playersWithAvatar && playersWithAvatar.length > 0) {
            const avatars = playersWithAvatar.map(p => `${p.nickname}:${p.avatar}`);
            console.log(`[ChineseChessTable] Sent table_state to ${socket.user.username} with avatars:`, avatars);
        }

        // 如果游戏正在进行中，发送游戏状态
        if (this.status === 'playing') {
            const redPlayer = this.players[0];
            const blackPlayer = this.players[1];
            const isRed = redPlayer && socket.user._id.toString() === redPlayer.userId;

            socket.emit('game_start', {
                board: this.board,
                turn: this.turn,
                mySide: isRed ? 'r' : 'b',
                players: {
                    r: redPlayer ? redPlayer.userId : null,
                    b: blackPlayer ? blackPlayer.userId : null
                },
                playerInfos: playersWithAvatar
            });
        }
    }
}

module.exports = ChineseChessTable;
