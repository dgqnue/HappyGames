// server/src/games/chinesechess/logic/ChineseChessRules.js

class ChineseChessRules {
    static isRed(piece) {
        return /^[A-Z]$/.test(piece); // 红方棋子是大写字母 (R, N, B, A, K, C, P)
    }

    static isBlack(piece) {
        return /^[a-z]$/.test(piece); // 黑方棋子是小写字母 (r, n, b, a, k, c, p)
    }

    static getSide(piece) {
        if (!piece) return null;
        return this.isRed(piece) ? 'r' : 'b';
    }

    /**
     * 验证移动合法性 V2 (修复版)
     * 假设：
     * - 红方在底部 (Row 9)，棋子大写
     * - 黑方在顶部 (Row 0)，棋子小写
     * - 河界在 Row 4 和 Row 5 之间
     */
    static isValidMoveV2(board, fromX, fromY, toX, toY, turn) {
        const piece = board[fromY][fromX];
        if (!piece) return false;
        
        // 检查回合
        if (this.getSide(piece) !== turn) return false;
        
        // 检查目标位置是否是己方棋子
        const target = board[toY][toX];
        if (target && this.getSide(target) === turn) return false;

        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        // 必须有移动
        if (dx === 0 && dy === 0) return false;

        const pieceType = piece.toLowerCase();

        switch (pieceType) {
            case 'k': // 将/帅
                // 必须在九宫内
                if (toX < 3 || toX > 5) return false;
                
                if (turn === 'r') { // 红帅 (底部)
                    if (toY < 7 || toY > 9) return false;
                } else { // 黑将 (顶部)
                    if (toY < 0 || toY > 2) return false;
                }
                
                // 只能走一步，横或竖
                return (absDx + absDy === 1);

            case 'a': // 士/仕
                // 必须在九宫内
                if (toX < 3 || toX > 5) return false;
                
                if (turn === 'r') { // 红仕
                    if (toY < 7 || toY > 9) return false;
                } else { // 黑士
                    if (toY < 0 || toY > 2) return false;
                }
                
                // 只能斜走一步
                return (absDx === 1 && absDy === 1);

            case 'b': // 象/相
                // 不能过河
                if (turn === 'r') { // 红相
                    if (toY < 5) return false; // 不能过河 (河界在第 4 和 5 行之间)
                } else { // 黑象
                    if (toY > 4) return false;
                }
                
                // 走田字 (2x2)
                if (absDx !== 2 || absDy !== 2) return false;
                
                // 象眼不能有子
                const eyeX = fromX + dx / 2;
                const eyeY = fromY + dy / 2;
                if (board[eyeY][eyeX]) return false;
                
                return true;

            case 'n': // 马
                // 走日字
                if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
                
                // 蹩马腿
                if (absDx === 2) { // 横走2
                    if (board[fromY][fromX + dx / 2]) return false;
                } else { // 竖走2
                    if (board[fromY + dy / 2][fromX]) return false;
                }
                
                return true;

            case 'r': // 车
                // 走直线
                if (dx !== 0 && dy !== 0) return false;
                
                // 路径必须无子
                if (!this.isPathClear(board, fromX, fromY, toX, toY)) return false;
                
                return true;

            case 'c': // 炮
                // 走直线
                if (dx !== 0 && dy !== 0) return false;
                
                const count = this.countPiecesBetween(board, fromX, fromY, toX, toY);
                
                if (target) {
                    // 吃子：必须隔一个子 (炮架)
                    return count === 1;
                } else {
                    // 移动：路径必须无子
                    return count === 0;
                }

            case 'p': // 兵/卒
                if (turn === 'r') { // 红兵 (向上)
                    if (dy >= 0) return false; // 必须向上
                    
                    // 过河前 (Row 5-9)
                    if (fromY > 4) {
                        if (absDx !== 0) return false; // 只能向前
                    } else {
                        // 过河后
                        // 可以横向
                    }
                } else { // 黑卒 (向下)
                    if (dy <= 0) return false; // 必须向下
                    
                    // 过河前 (Row 0-4)
                    if (fromY < 5) {
                        if (absDx !== 0) return false; // 只能向前
                    } else {
                        // 过河后
                        // 可以横向
                    }
                }
                
                // 每次只能走一步
                if (absDx + Math.abs(dy) !== 1) return false;
                
                return true;
        }
        
        return false;
    }

    static isPathClear(board, x1, y1, x2, y2) {
        return this.countPiecesBetween(board, x1, y1, x2, y2) === 0;
    }

    static countPiecesBetween(board, x1, y1, x2, y2) {
        let count = 0;
        if (x1 === x2) { // 纵向
            const min = Math.min(y1, y2);
            const max = Math.max(y1, y2);
            for (let y = min + 1; y < max; y++) {
                if (board[y][x1]) count++;
            }
        } else { // 横向
            const min = Math.min(x1, x2);
            const max = Math.max(x1, x2);
            for (let x = min + 1; x < max; x++) {
                if (board[y1][x]) count++;
            }
        }
        return count;
    }

    /**
     * 找到指定方向的将/帅位置
     * @param {Array} board - 棋盘
     * @param {string} side - 'r' (红方) 或 'b' (黑方)
     * @returns {Object|null} - {x, y} 或 null
     */
    static getKingPosition(board, side) {
        const kingPiece = side === 'r' ? 'K' : 'k';
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                if (board[y][x] === kingPiece) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    /**
     * 检查某个位置是否受到对方攻击（被将军）
     * @param {Array} board - 棋盘
     * @param {number} kingX - 将/帅的X坐标
     * @param {number} kingY - 将/帅的Y坐标
     * @param {string} side - 'r' (红方) 或 'b' (黑方)
     * @returns {boolean}
     */
    static isKingUnderAttack(board, kingX, kingY, side) {
        const enemySide = side === 'r' ? 'b' : 'r';

        // 遍历所有敌方棋子，检查是否能攻击到将/帅
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const piece = board[y][x];
                if (!piece) continue;

                const pieceSide = this.getSide(piece);
                if (pieceSide !== enemySide) continue;

                // 检查敌方棋子是否能移动到国王位置（模拟一个移动）
                if (this.isValidMoveV2(board, x, y, kingX, kingY, enemySide)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 检查移动后是否形成将军
     * @param {Array} board - 棋盘
     * @param {number} fromX - 移动的起始X
     * @param {number} fromY - 移动的起始Y
     * @param {number} toX - 移动的目标X
     * @param {number} toY - 移动的目标Y
     * @param {string} side - 'r' (红方) 或 'b' (黑方)
     * @returns {boolean}
     */
    static isCheckAfterMove(board, fromX, fromY, toX, toY, side) {
        // 深拷贝棋盘以模拟移动
        const boardCopy = board.map(row => [...row]);
        const piece = boardCopy[fromY][fromX];
        
        // 执行移动
        boardCopy[toY][toX] = piece;
        boardCopy[fromY][fromX] = null;

        // 对方的国王位置
        const enemySide = side === 'r' ? 'b' : 'r';
        const kingPos = this.getKingPosition(boardCopy, enemySide);
        
        if (!kingPos) {
            return false;
        }

        // 检查对方国王是否受到攻击
        return this.isKingUnderAttack(boardCopy, kingPos.x, kingPos.y, enemySide);
    }
}

module.exports = ChineseChessRules;
