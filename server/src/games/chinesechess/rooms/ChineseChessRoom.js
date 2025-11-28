// server/src/games/chinesechess/rooms/ChineseChessRoom.js
const MatchableGameRoom = require('../../../gamecore/MatchableGameRoom');
const XiangqiRules = require('../logic/XiangqiRules');
const EloService = require('../../../gamecore/EloService');

class ChineseChessRoom extends MatchableGameRoom {
    constructor(io, roomId, tier) {
        // 2人游戏
        super(io, roomId, 2, tier);
        this.gameType = 'chinesechess';

        // 游戏特定状态
        this.board = null;
        this.turn = null;
        this.history = [];

        // 初始化空棋盘（等待开始）
        this.resetBoard();
    }

    /**
     * 重置棋盘
     */
    resetBoard() {
        // Standard Starting Position (Red at bottom, Black at top)
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
        this.turn = 'r'; // Red goes first
        this.history = [];
    }

    /**
     * 游戏开始回调（由 MatchableGameRoom 调用）
     */
    onGameStart() {
        this.resetBoard();

        // 分配阵营：第一个玩家是红方，第二个是黑方
        // 注意：matchState.players 顺序就是入座顺序
        const redPlayer = this.matchState.players[0];
        const blackPlayer = this.matchState.players[1];

        // 发送初始状态给所有玩家
        this.matchState.players.forEach((player) => {
            const isRed = player.userId === redPlayer.userId;
            this.sendToPlayer(player.socketId, 'game_start', {
                board: this.board,
                turn: this.turn,
                mySide: isRed ? 'r' : 'b',
                players: {
                    r: redPlayer.userId,
                    b: blackPlayer.userId
                },
                playerInfos: this.matchState.players.map(p => ({
                    userId: p.userId,
                    nickname: p.nickname,
                    title: p.title,
                    avatar: p.avatar
                }))
            });
        });

        console.log(`[ChineseChess] Game started in room ${this.roomId}`);
    }

    /**
     * 获取公共游戏状态（用于旁观）
     */
    getPublicGameState() {
        // 如果游戏还没开始，只返回基础信息
        if (this.matchState.status !== 'playing') {
            return super.getPublicGameState();
        }

        const redPlayer = this.matchState.players[0];
        const blackPlayer = this.matchState.players[1];

        return {
            ...super.getPublicGameState(),
            board: this.board,
            turn: this.turn,
            players: {
                r: redPlayer ? redPlayer.userId : null,
                b: blackPlayer ? blackPlayer.userId : null
            }
        };
    }

    /**
     * 处理移动
     */
    handleMove(socket, move) {
        if (this.matchState.status !== 'playing') return;

        const { fromX, fromY, toX, toY } = move;
        const userId = socket.user._id.toString();

        const redPlayer = this.matchState.players[0];
        const blackPlayer = this.matchState.players[1];

        // 验证是否是当前玩家的回合
        const isRed = userId === redPlayer.userId;
        const isBlack = userId === blackPlayer.userId;

        if (!isRed && !isBlack) return; // 旁观者不能移动

        const side = isRed ? 'r' : 'b';
        if (side !== this.turn) return; // 不是你的回合

        // 验证移动逻辑
        if (!XiangqiRules.isValidMoveV2(this.board, fromX, fromY, toX, toY, this.turn)) {
            socket.emit('error', { message: 'Invalid Move' });
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
            this.handleGameEnd(side); // 当前方获胜
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
     * 处理游戏结束
     */
    async handleGameEnd(winnerSide) {
        const redPlayer = this.matchState.players[0];
        const blackPlayer = this.matchState.players[1];

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
            const betAmount = this.matchState.matchSettings.baseBet || this.getBetAmount();
            await this.settle({
                winner: winnerId,
                loser: loserId,
                amount: betAmount
            });
        }

        // 调用父类 endGame 处理通用逻辑（清理状态、广播结束、准备新局）
        this.endGame({
            winner: winnerSide, // 'r' or 'b'
            winnerId: winnerId,
            elo: eloResult
        });
    }

    /**
     * 游戏中断线的特殊处理
     */
    onPlayerDisconnectDuringGame(userId) {
        console.log(`[ChineseChess] Player ${userId} disconnected during game`);

        const redPlayer = this.matchState.players[0];
        const blackPlayer = this.matchState.players[1];

        if (!redPlayer || !blackPlayer) return;

        // 判对手获胜
        const winnerSide = userId === redPlayer.userId ? 'b' : 'r';
        this.handleGameEnd(winnerSide);
    }

    getBetAmount() {
        switch (this.tier) {
            case 'beginner': return 100;
            case 'intermediate': return 1000;
            case 'advanced': return 10000;
            default: return 0;
        }
    }
}

module.exports = ChineseChessRoom;

