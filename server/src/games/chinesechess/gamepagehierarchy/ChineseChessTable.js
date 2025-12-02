const GameTable = require('../../../core/hierarchy/GameTable');
const MatchPlayers = require('../../../core/matching/MatchPlayers');
const XiangqiRules = require('../logic/XiangqiRules');
const EloService = require('../../../gamecore/EloService');

/**
 * 中国象棋游戏桌 (ChineseChessTable)
 * 直接继承自 GameTable，使用 MatchPlayers 处理匹配逻辑
 */
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
        return await this.matchPlayers.playerJoin(socket, matchSettings);
    }

    playerLeave(socket) {
        return this.matchPlayers.playerLeave(socket);
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
    onGameStart() {
        // 分配阵营：第一个玩家是红方，第二个是黑方
        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];

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
                playerInfos: this.players.map(p => ({
                    userId: p.userId,
                    nickname: p.nickname,
                    title: p.title || '无',
                    avatar: p.avatar
                }))
            });
        });

        console.log(`[ChineseChess] 游戏开始: ${this.tableId}`);
    }

    /**
     * 处理移动请求
     */
    handleMove(socket, move) {
        if (this.status !== 'playing') return;

        const { fromX, fromY, toX, toY } = move;
        const userId = socket.user._id.toString();

        const redPlayer = this.players[0];
        const blackPlayer = this.players[1];

        // 验证是否是当前玩家的回合
        const isRed = userId === redPlayer.userId;
        const isBlack = userId === blackPlayer.userId;

        if (!isRed && !isBlack) return; // 旁观者不能移动

        const side = isRed ? 'r' : 'b';
        if (side !== this.turn) return; // 不是你的回合

        // 验证移动逻辑
        if (!XiangqiRules.isValidMoveV2(this.board, fromX, fromY, toX, toY, this.turn)) {
            socket.emit('error', { message: '非法移动' });
            return;
        }

        // 执行移动
        const piece = this.board[fromY][fromX];
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

        // 广播移动
        this.broadcast('move', {
            move,
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

        // 1. ELO 结算
        const eloResult = await EloService.processMatchResult(
            this.gameType,
            winnerId,
            loserId,
            1 // Winner gets 1 point
        );

        // 2. 游戏豆结算 (非免费室)
        if (this.tier !== 'free') {
            const betAmount = this.getBetAmount();
            await this.settle({
                winner: winnerId,
                loser: loserId,
                amount: betAmount
            });
        }

        // 结束游戏
        this.endGame({
            winner: winnerSide, // 'r' or 'b'
            winnerId: winnerId,
            elo: eloResult
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

    // --- 必须实现的 BaseGameTable 方法 ---

    /**
     * 广播房间状态
     * MatchPlayers 需要调用此方法
     */
    broadcastRoomState() {
        const roomInfo = this.matchPlayers.matchState.getRoomInfo();
        roomInfo.status = this.status;

        const state = {
            ...roomInfo,
            players: this.players.map(p => ({
                userId: p.userId,
                socketId: p.socketId,
                nickname: p.nickname,
                avatar: p.avatar,
                ready: p.ready,
                title: p.title,
                winRate: p.winRate,
                disconnectRate: p.disconnectRate
            }))
        };

        // 广播给房间内所有人
        this.io.to(this.tableId).emit('table_update', state);

        // 这里的逻辑可能需要调整：
        // 原始 MatchableGameTable 中，broadcastRoomState 似乎也用于更新大厅列表？
        // 不，大厅列表是通过 GameRoom.getTableList() 获取的。
        // GameRoom.getTableList() 使用 table.status, table.players.length 等属性。
        // 因为我们委托了 getter，所以 GameRoom 应该能获取到正确的数据。
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
    broadcast(event, data) {
        this.io.to(this.tableId).emit(event, data);
    }
}

module.exports = ChineseChessTable;
