// server/src/games/chinesechess/logic/XiangqiRules.js

class XiangqiRules {
    static isRed(piece) {
        return /^[A-Z]$/.test(piece); // Red pieces are Uppercase (R, N, B, A, K, C, P)
    }

    static isBlack(piece) {
        return /^[a-z]$/.test(piece); // Black pieces are Lowercase (r, n, b, a, k, c, p)
    }

    static getSide(piece) {
        if (!piece) return null;
        return this.isRed(piece) ? 'r' : 'b';
    }

    static isValidMove(board, fromX, fromY, toX, toY, turn) {
        const piece = board[fromY][fromX];
        if (!piece) return false;

        // Check turn
        if (this.getSide(piece) !== turn) return false;

        // Check target
        const target = board[toY][toX];
        if (target && this.getSide(target) === turn) return false; // Cannot capture own piece

        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        switch (piece.toLowerCase()) {
            case 'k': // King/General
                // Must stay in palace (x: 3-5, y: 0-2 or 7-9)
                if (toX < 3 || toX > 5) return false;
                if (turn === 'r') { // Red King (bottom)
                    if (toY > 2) return false;
                } else { // Black King (top)
                    if (toY < 7) return false;
                }
                // Move 1 step orthogonal
                return (absDx + absDy === 1);

            case 'a': // Advisor
                // Must stay in palace
                if (toX < 3 || toX > 5) return false;
                if (turn === 'r') {
                    if (toY > 2) return false;
                } else {
                    if (toY < 7) return false;
                }
                // Move 1 step diagonal
                return (absDx === 1 && absDy === 1);

            case 'b': // Elephant (Bishop)
                // Cannot cross river
                if (turn === 'r') {
                    if (toY > 4) return false;
                } else {
                    if (toY < 5) return false;
                }
                // Move 2 steps diagonal
                if (absDx !== 2 || absDy !== 2) return false;
                // Check blocking eye
                if (board[fromY + dy / 2][fromX + dx / 2]) return false;
                return true;

            case 'n': // Horse (Knight)
                // Move L shape (1 orthogonal + 1 diagonal)
                if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
                // Check blocking leg
                if (absDx === 2) {
                    if (board[fromY][fromX + dx / 2]) return false;
                } else {
                    if (board[fromY + dy / 2][fromX]) return false;
                }
                return true;

            case 'r': // Rook (Chariot)
                // Move orthogonal
                if (dx !== 0 && dy !== 0) return false;
                // Check path clear
                if (!this.isPathClear(board, fromX, fromY, toX, toY)) return false;
                return true;

            case 'c': // Cannon
                // Move orthogonal
                if (dx !== 0 && dy !== 0) return false;
                // Check path
                const count = this.countPiecesBetween(board, fromX, fromY, toX, toY);
                if (target) {
                    // Capture needs 1 screen
                    return count === 1;
                } else {
                    // Move needs 0 screens
                    return count === 0;
                }

            case 'p': // Pawn
                // Move forward 1 step
                // After crossing river, can move side 1 step
                if (turn === 'r') {
                    if (dy < 0) return false; // Cannot move back
                    if (fromY <= 4) { // Before river (Red is at bottom, y=0-4 is Red side? Wait. Standard FEN: Red at bottom (rows 9-5?), Black at top (rows 0-4?).
                        // Let's assume standard FEN: 
                        // rnbakabnr (row 0 - Black)
                        // ...
                        // RNBAKABNR (row 9 - Red)
                        // So Red moves UP (dy < 0). Black moves DOWN (dy > 0).

                        // Wait, my King logic above: Red King (bottom) -> y > 2 return false. 
                        // This implies Red is at y=0-2. So Red is TOP?
                        // Standard Xiangqi: Red is usually at BOTTOM (Row 9).
                        // Let's stick to: Red at BOTTOM (Row 9).
                        // Red King: x:3-5, y:7-9.
                        // Black King: x:3-5, y:0-2.

                        // Let me REVISE the King/Advisor logic to match Red=Bottom.
                    }
                }
                return false; // Placeholder, will fix in revised block below
        }
        return false;
    }

    // Corrected logic assuming Red = Bottom (Rows 9-7), Black = Top (Rows 0-2)
    static isValidMoveV2(board, fromX, fromY, toX, toY, turn) {
        const piece = board[fromY][fromX];
        if (!piece) return false;
        if (this.getSide(piece) !== turn) return false;
        const target = board[toY][toX];
        if (target && this.getSide(target) === turn) return false;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        switch (piece.toLowerCase()) {
            case 'k':
                if (toX < 3 || toX > 5) return false;
                if (turn === 'r') { // Red (Bottom)
                    if (toY < 7) return false;
                } else { // Black (Top)
                    if (toY > 2) return false;
                }
                return (absDx + absDy === 1);

            case 'a':
                if (toX < 3 || toX > 5) return false;
                if (turn === 'r') {
                    if (toY < 7) return false;
                } else {
                    if (toY > 2) return false;
                }
                return (absDx === 1 && absDy === 1);

            case 'b': // Elephant
                if (turn === 'r') {
                    if (toY < 5) return false; // Cannot cross river (River is between 4 and 5)
                } else {
                    if (toY > 4) return false;
                }
                if (absDx !== 2 || absDy !== 2) return false;
                if (board[fromY + dy / 2][fromX + dx / 2]) return false;
                return true;

            case 'n': // Horse
                if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
                if (absDx === 2) {
                    if (board[fromY][fromX + dx / 2]) return false;
                } else {
                    if (board[fromY + dy / 2][fromX]) return false;
                }
                return true;

            case 'r': // Rook
                if (dx !== 0 && dy !== 0) return false;
                if (!this.isPathClear(board, fromX, fromY, toX, toY)) return false;
                return true;

            case 'c': // Cannon
                if (dx !== 0 && dy !== 0) return false;
                const count = this.countPiecesBetween(board, fromX, fromY, toX, toY);
                if (target) return count === 1;
                return count === 0;

            case 'p': // Pawn
                if (turn === 'r') { // Red moves UP (dy < 0)
                    if (dy >= 0) return false; // Must move up
                    if (dy < -1) return false; // Max 1 step
                    if (absDx > 1) return false; // Max 1 step side
                    if (fromY > 4) { // Before river (Rows 5-9)
                        if (absDx !== 0) return false; // Only forward
                    } else { // After river
                        if (absDx + Math.abs(dy) !== 1) return false;
                    }
                } else { // Black moves DOWN (dy > 0)
                    if (dy <= 0) return false;
                    if (dy > 1) return false;
                    if (absDx > 1) return false;
                    if (fromY < 5) { // Before river (Rows 0-4)
                        if (absDx !== 0) return false;
                    } else {
                        if (absDx + Math.abs(dy) !== 1) return false;
                    }
                }
                return true;
        }
        return false;
    }

    static isPathClear(board, x1, y1, x2, y2) {
        return this.countPiecesBetween(board, x1, y1, x2, y2) === 0;
    }

    static countPiecesBetween(board, x1, y1, x2, y2) {
        let count = 0;
        if (x1 === x2) { // Vertical
            const min = Math.min(y1, y2);
            const max = Math.max(y1, y2);
            for (let y = min + 1; y < max; y++) {
                if (board[y][x1]) count++;
            }
        } else { // Horizontal
            const min = Math.min(x1, x2);
            const max = Math.max(x1, x2);
            for (let x = min + 1; x < max; x++) {
                if (board[y1][x]) count++;
            }
        }
        return count;
    }
}

module.exports = XiangqiRules;
