const GameTable = require('../../../gamecore/hierarchy/GameTable');
const ChineseChessRules = require('../logic/ChineseChessRules');
const ChineseChessRound = require('./ChineseChessRound');
const EloService = require('../../../gamecore/EloService');
const Grade = require('../grade/Grade');
const LobbyFeed = require('../../../models/LobbyFeed');
const { getFullAvatarUrl } = require('../../../utils/avatarUtils');
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
        super(io, tableId, gameType, maxPlayers, tier);

        // 游戏特定状态
        this.round = new ChineseChessRound(this);
        this.roundCount = 0; // 记录回合数，用于换边
        
        // 兼容旧代码，保留 getter/setter 代理到 round
        Object.defineProperty(this, 'board', {
            get: () => this.round.board,
            set: (v) => this.round.board = v
        });
        Object.defineProperty(this, 'turn', {
            get: () => this.round.turn,
            set: (v) => this.round.turn = v
        });
        Object.defineProperty(this, 'history', {
            get: () => this.round.history,
            set: (v) => this.round.history = v
        });

        // 初始化空棋盘
        this.resetBoard();
    }

    /**
     * 玩家在游戏中离开时的处理（判负逻辑）
     * 重写基类的钩子方法
     */
    onPlayerLeaveDuringGame(socket) {
        const userId = socket.user._id.toString();
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            // 检查回合是否处于活跃状态
            // 如果回合已经结束（例如已经分出胜负，正在等待结算或新回合），则不触发判负
            if (!this.round || !this.round.isActive) {
                console.log(`[ChineseChessTable] Player ${userId} left but round is not active. Ignoring forfeit.`);
                return;
            }

            console.log(`[ChineseChessTable] Player ${userId} left during game, forfeiting. Round active: ${this.round.isActive}`);
            
            // 确定当前的红黑方
            const isSwap = this.roundCount % 2 === 0;
            const redPlayer = isSwap ? this.players[1] : this.players[0];
            
            // 判对方获胜
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
        // 确定红黑方 (根据 roundCount)
        // 如果是第一回合(roundCount=1)，players[0]是红方
        // 如果是第二回合(roundCount=2)，players[1]是红方
        // 注意：这里需要与 onGameStart 的逻辑保持一致
        // 如果游戏还没开始(roundCount=0)，默认 players[0] 是红方
        
        const isSwap = this.roundCount > 0 && this.roundCount % 2 === 0;
        const redPlayer = isSwap ? this.players[1] : this.players[0];
        const blackPlayer = isSwap ? this.players[0] : this.players[1];

        const isRed = redPlayer && socket.user._id.toString() === redPlayer.userId;
        const isBlack = blackPlayer && socket.user._id.toString() === blackPlayer.userId;
        
        socket.emit('table_update', {
            status: this.status,
            isRoundEnded: this.matchPlayers.gameEnded, // 同步回合结束状态
            board: this.board,
            turn: this.turn,
            mySide: isRed ? 'r' : (isBlack ? 'b' : null),
            players: this.players.map(p => ({
                userId: p.userId,
                nickname: p.nickname,
                avatar: getFullAvatarUrl(p.avatar),
                ready: p.ready
            })),
            winner: null // TODO: 如果已结束，需要发送 winner
        });
    }

    /**
     * 广播完整游戏桌状态给所有玩家
     */
    broadcastTableState() {
        this.players.forEach(player => {
            const socket = this.io.sockets.sockets.get(player.socketId);
            if (socket) {
                this.sendTableState(socket);
            }
        });
    }

    // --- 游戏逻辑 ---

    /**
     * 重置棋盘
     */
    resetBoard() {
        this.round.resetBoard();
    }

    /**
     * 游戏开始回调
     */
    async onGameStart() {
        // 增加回合数
        this.roundCount++;
        
        // 开始新回合
        this.round.start();

        // 确保玩家数量足够
        if (this.players.length < 2) {
            console.error(`[ChineseChess] Not enough players to start game: ${this.players.length}`);
            return;
        }

        // 分配阵营：根据回合数决定红黑方
        // 奇数回合：players[0] 红, players[1] 黑
        // 偶数回合：players[1] 红, players[0] 黑
        const isSwap = this.roundCount % 2 === 0;
        const redPlayer = isSwap ? this.players[1] : this.players[0];
        const blackPlayer = isSwap ? this.players[0] : this.players[1];

        if (!redPlayer || !blackPlayer) {
            console.error(`[ChineseChess] Failed to assign sides. Round: ${this.roundCount}, Players: ${this.players.length}`);
            return;
        }

        console.log(`[ChineseChess] Round ${this.roundCount} starting. Red: ${redPlayer?.nickname}, Black: ${blackPlayer?.nickname}`);

        // 架构优化：直接使用内存中的玩家状态
        const playerInfos = this.players.map(p => {
            return {
                userId: p.userId,
                nickname: p.nickname,
                title: p.title || '无',
                avatar: getFullAvatarUrl(p.avatar) // 信任内存状态
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

        // 确定当前的红黑方
        const isSwap = this.roundCount % 2 === 0;
        const redPlayer = isSwap ? this.players[1] : this.players[0];
        const blackPlayer = isSwap ? this.players[0] : this.players[1];

        // 验证是否是当前玩家的回合
        const validation = this.round.validateMove(fromX, fromY, toX, toY, userId, redPlayer.userId, blackPlayer.userId);
        
        if (!validation.valid) {
            console.log(`[ChineseChessTable] handleMove rejected: ${validation.reason}`);
            if (validation.reason === 'Must resolve check') {
                socket.emit('error', { message: '您必须应将' });
            } else if (validation.reason === 'Cannot move into check') {
                socket.emit('error', { message: '您不能送将' });
            } else if (validation.reason === 'Flying general') {
                socket.emit('error', { message: '将帅不能照面' });
            }
            return;
        }

        console.log(`[ChineseChessTable] handleMove accepted: valid move from (${fromX},${fromY}) to (${toX},${toY}), piece=${validation.piece}`);

        // 执行移动
        const result = this.round.executeMove(fromX, fromY, toX, toY, validation.piece);

        // 广播移动 (无论是否胜利，都要先广播移动，让前端更新棋盘)
        console.log(`[ChineseChessTable] Broadcasting move: captured=${result.captured ? result.captured : null}, from=(${fromX},${fromY}) to=(${toX},${toY}), new turn=${this.turn}, check=${result.check}, win=${result.win}`);
        this.broadcast('move', {
            move,
            captured: result.captured ? result.captured : null,
            check: result.check,
            turn: this.turn,
            board: this.board
        });

        // 检查胜利条件
        if (result.win) {
            this.handleWin(validation.side); // 当前方获胜
            return;
        }
    }

    /**
     * 处理胜利
     */
    async handleWin(winnerSide) {
        // 确定当前的红黑方
        const isSwap = this.roundCount % 2 === 0;
        const redPlayer = isSwap ? this.players[1] : this.players[0];
        const blackPlayer = isSwap ? this.players[0] : this.players[1];

        const winnerId = winnerSide === 'r' ? redPlayer.userId : blackPlayer.userId;
        const loserId = winnerSide === 'r' ? blackPlayer.userId : redPlayer.userId;

        // 结束回合
        this.round.end({ winner: winnerSide });

        // 1. ELO 结算（将更新后的 rating 写入数据库）
        // 修正：按 players 数组顺序调用，防止前端按位置映射导致显示错误 (playerA=p0, playerB=p1)
        let eloResult;
        const p0 = this.players[0];
        const p1 = this.players[1];

        if (p0 && p1) {
            const resultForP0 = p0.userId === winnerId ? 1 : 0;
            eloResult = await EloService.processMatchResult(
                this.gameType,
                p0.userId,
                p1.userId,
                resultForP0
            );
        } else {
            // 降级处理：如果找不到两个玩家（异常情况），按原逻辑
            eloResult = await EloService.processMatchResult(
                this.gameType,
                winnerId,
                loserId,
                1 // Winner gets 1 point
            );
        }
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

        // Broadcast Win to Lobby
        try {
            const winnerName = this.players.find(p => p.userId === winnerId)?.nickname || 'Unknown Player';
            const winnerTitle = titleResult[winnerId]?.title || '无';
            const winnerTitleColor = titleResult[winnerId]?.titleColor || '#000000';
            
            const winItem = new LobbyFeed({
                type: 'game_win',
                user: winnerName,
                game: '中国象棋',
                title: winnerTitle,
                titleColor: winnerTitleColor,
                timestamp: new Date()
            });
            await winItem.save();

            this.io.to('lobby').emit('lobby_feed', winItem);

            // Cleanup old feeds (keep latest 200)
            const count = await LobbyFeed.countDocuments();
            if (count > 200) {
                const latest = await LobbyFeed.find().sort({ timestamp: -1 }).limit(200).select('_id');
                if (latest.length === 200) {
                    const latestIds = latest.map(doc => doc._id);
                    await LobbyFeed.deleteMany({ _id: { $nin: latestIds } });
                }
            }
        } catch (err) {
            console.error(`[ChineseChessTable] Error broadcasting win to lobby:`, err);
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

        // 确定当前的红黑方 (必须考虑换边逻辑)
        const isSwap = this.roundCount % 2 === 0;
        const redPlayer = isSwap ? this.players[1] : this.players[0];
        const blackPlayer = isSwap ? this.players[0] : this.players[1];

        if (!redPlayer || !blackPlayer) return;

        // 判对手获胜
        // 如果断线的是红方，则黑方(b)获胜；否则红方(r)获胜
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
            isRoundEnded: this.matchPlayers.gameEnded, // 同步回合结束状态
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
                    avatar: getFullAvatarUrl(p.avatar), 
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
                avatar: getFullAvatarUrl(p.avatar), // 信任内存状态
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
