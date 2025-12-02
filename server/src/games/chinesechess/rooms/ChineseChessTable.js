const MatchableGameTable = require('../../../core/matching/MatchableGameTable');
const XiangqiRules = require('../logic/XiangqiRules');
const EloService = require('../../../gamecore/EloService'); // 保留 EloService，后续可重构

/**
 * 中国象棋游戏桌 (ChineseChessTable)
 * 继承自 MatchableGameTable，实现具体的象棋逻辑
 */
class ChineseChessTable extends MatchableGameTable {
    constructor(io, tableId, gameType, maxPlayers, tier) {
        // 调用父类构造函数: io, roomId, gameType, maxPlayers, tier
        super(io, tableId, gameType, maxPlayers, tier);

        // 游戏特定状态
        this.board = null;
        this.turn = null;
        this.history = [];

        // 初始化空棋盘
        this.resetBoard();
    }

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
     * 游戏开始回调
     */
    onGameStart() {
        this.resetBoard();

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
                    title: p.title || '无', // 假设 title 在 player 对象中，如果没有则默认
                    avatar: p.avatar
                }))
            });
        });

        console.log(`[ChineseChess] 游戏开始: ${this.tableId}`);
    }

    /**
     * 游戏结束回调
     */
    onGameEnd(result) {
        console.log(`[ChineseChess] 游戏结束: ${this.tableId}, 结果:`, result);
        // 可以在这里做一些清理工作
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
}

module.exports = ChineseChessTable;
