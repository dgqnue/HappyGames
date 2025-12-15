const GameRound = require('../../../gamecore/hierarchy/GameRound');
const ChineseChessRules = require('../logic/ChineseChessRules');

class ChineseChessRound extends GameRound {
    constructor(table) {
        super(table);
        this.board = null;
        this.turn = null;
        this.history = [];
    }

    onStart() {
        this.resetBoard();
    }

    resetBoard() {
        // Standard setup (Red at bottom, Black at top)
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
        this.turn = 'r'; // Red moves first
        this.history = [];
    }

    validateMove(fromX, fromY, toX, toY, userId, redPlayerId, blackPlayerId) {
        // 1. Player validation
        const isRed = userId === redPlayerId;
        const isBlack = userId === blackPlayerId;

        if (!isRed && !isBlack) return { valid: false, reason: 'Not a player' };
        
        const side = isRed ? 'r' : 'b';
        if (side !== this.turn) return { valid: false, reason: 'Not your turn' };

        // 2. Piece validation
        const piece = this.board[fromY] ? this.board[fromY][fromX] : null;
        if (!piece) return { valid: false, reason: 'No piece selected' };

        // 3. Rule validation
        const isValidMove = ChineseChessRules.isValidMoveV2(this.board, fromX, fromY, toX, toY, this.turn);
        if (!isValidMove) return { valid: false, reason: 'Invalid move rule' };

        // 4. Check validation (Self-check)
        if (ChineseChessRules.isSelfCheckAfterMove(this.board, fromX, fromY, toX, toY, this.turn)) {
            const kingPos = ChineseChessRules.getKingPosition(this.board, this.turn);
            const isAlreadyInCheck = kingPos && ChineseChessRules.isKingUnderAttack(this.board, kingPos.x, kingPos.y, this.turn);
            return { valid: false, reason: isAlreadyInCheck ? 'Must resolve check' : 'Cannot move into check' };
        }

        // 5. Flying General
        if (ChineseChessRules.isFlyingGeneralAfterMove(this.board, fromX, fromY, toX, toY)) {
            return { valid: false, reason: 'Flying general' };
        }

        return { valid: true, piece, side };
    }

    executeMove(fromX, fromY, toX, toY, piece) {
        const captured = this.board[toY][toX];
        
        // Save snapshot for check detection
        const boardBeforeMove = this.board.map(row => [...row]);

        this.board[toY][toX] = piece;
        this.board[fromY][fromX] = null;

        this.history.push({ fromX, fromY, toX, toY, piece, captured });

        // Check win (Capture King)
        if (captured && captured.toLowerCase() === 'k') {
            return { captured, win: true };
        }

        // Switch turn
        this.turn = this.turn === 'r' ? 'b' : 'r';

        // Calculate check status (Always calculate it now, because we need it for sound effect even if it's a win)
        let check = false;
        try {
            // The player who moved is the opposite of current turn
            const whoMoved = this.turn === 'r' ? 'b' : 'r';
            check = ChineseChessRules.isCheckAfterMove(boardBeforeMove, fromX, fromY, toX, toY, whoMoved);
        } catch (err) {
            console.warn('Check detection failed', err);
        }

        // Check stalemate (Opponent has no moves)
        const opponentHasMoves = ChineseChessRules.hasLegalMove(this.board, this.turn);
        if (!opponentHasMoves) {
            return { captured, win: true, reason: 'stalemate', check };
        }

        return { captured, win: false, check };
    }
}

module.exports = ChineseChessRound;
