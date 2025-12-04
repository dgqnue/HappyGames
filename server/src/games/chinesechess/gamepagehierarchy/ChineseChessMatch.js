const GameMatch = require('../../../gamecore/hierarchy/GameMatch');
const ChineseChessRules = require('../logic/ChineseChessRules');

/**
 * 中国象棋对局实现 (Chinese Chess Match Implementation)
 */
class ChineseChessMatch extends GameMatch {
    constructor(matchId) {
        super(matchId);
        this.board = null;
        this.turn = null; // 'r' (红方) 或 'b' (黑方)
    }

    onStart() {
        this.resetBoard();
    }

    resetBoard() {
        // 标准开局位置 (红方在下，黑方在上)
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
    }

    isTurn(player) {
        // 将玩家索引映射到阵营
        // 玩家 0 = 红方, 玩家 1 = 黑方
        const playerIndex = this.players.findIndex(p => (p.userId || p.id) === (player.userId || player.id));
        if (playerIndex === -1) return false; // 不是玩家

        const side = playerIndex === 0 ? 'r' : 'b';
        return side === this.turn;
    }

    validateMove(player, move) {
        const { fromX, fromY, toX, toY } = move;

        // 基本边界检查
        if (fromX < 0 || fromX > 8 || fromY < 0 || fromY > 9 ||
            toX < 0 || toX > 8 || toY < 0 || toY > 9) {
            return { valid: false, message: '移动超出边界' };
        }

        // 使用 ChineseChessRules 进行逻辑判断
        if (!ChineseChessRules.isValidMoveV2(this.board, fromX, fromY, toX, toY, this.turn)) {
            return { valid: false, message: '根据规则，移动非法' };
        }

        return { valid: true };
    }

    executeMove(player, move) {
        const { fromX, fromY, toX, toY } = move;

        const piece = this.board[fromY][fromX];
        const captured = this.board[toY][toX];

        // 更新棋盘
        this.board[toY][toX] = piece;
        this.board[fromY][fromX] = null;

        return {
            historyData: {
                piece,
                captured,
                fen: this.getFen() // 可选: 存储 FEN 以便更容易重建
            }
        };
    }

    checkWinCondition() {
        // 检查最后一步是否吃掉了将/帅
        // 注意: 在标准象棋中，获胜条件是将死或对手认输。
        // 如果继续下，吃掉将/帅是"最终"获胜条件。
        // 然而，我们目前在 ChineseChessTable 中的逻辑是检查吃掉将/帅。
        // 让我们检查是否有将/帅缺失。

        let redKing = false;
        let blackKing = false;

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const p = this.board[y][x];
                if (p === 'K') redKing = true;
                if (p === 'k') blackKing = true;
            }
        }

        if (!redKing) {
            return { winner: this.players[1], reason: 'capture_king' }; // 黑方胜
        }
        if (!blackKing) {
            return { winner: this.players[0], reason: 'capture_king' }; // 红方胜
        }

        return null;
    }

    switchTurn() {
        this.turn = this.turn === 'r' ? 'b' : 'r';
    }

    getFen() {
        // 简化的 FEN 生成 (可选)
        // 待办: 如果需要，实现完整的 FEN
        return '';
    }
}

module.exports = ChineseChessMatch;
