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

    static isValidMove(board, fromX, fromY, toX, toY, turn) {
        const piece = board[fromY][fromX];
        if (!piece) return false;

        // 检查回合
        if (this.getSide(piece) !== turn) return false;

        // 检查目标位置
        const target = board[toY][toX];
        if (target && this.getSide(target) === turn) return false; // 不能吃自己的棋子

        const dx = toX - fromX;
        const dy = toY - fromY;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        switch (piece.toLowerCase()) {
            case 'k': // 将/帅
                // 必须待在九宫内 (x: 3-5, y: 0-2 或 7-9)
                if (toX < 3 || toX > 5) return false;
                if (turn === 'r') { // 红方将 (底部)
                    if (toY > 2) return false;
                } else { // 黑方帅 (顶部)
                    if (toY < 7) return false;
                }
                // 每次只能移动一步，横向或纵向
                return (absDx + absDy === 1);

            case 'a': // 士
                // 必须待在九宫内
                if (toX < 3 || toX > 5) return false;
                if (turn === 'r') {
                    if (toY > 2) return false;
                } else {
                    if (toY < 7) return false;
                }
                // 每次只能斜走一步
                return (absDx === 1 && absDy === 1);

            case 'b': // 象/相
                // 不能过河
                if (turn === 'r') {
                    if (toY > 4) return false;
                } else {
                    if (toY < 5) return false;
                }
                // 每次斜走两步
                if (absDx !== 2 || absDy !== 2) return false;
                // 检查象眼是否被堵
                if (board[fromY + dy / 2][fromX + dx / 2]) return false;
                return true;

            case 'n': // 马
                // 走日字 (一横一竖 + 一斜)
                if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
                // 检查马腿是否被堵
                if (absDx === 2) {
                    if (board[fromY][fromX + dx / 2]) return false;
                } else {
                    if (board[fromY + dy / 2][fromX]) return false;
                }
                return true;

            case 'r': // 车
                // 横向或纵向移动
                if (dx !== 0 && dy !== 0) return false;
                // 检查路径是否畅通
                if (!this.isPathClear(board, fromX, fromY, toX, toY)) return false;
                return true;

            case 'c': // 炮
                // 横向或纵向移动
                if (dx !== 0 && dy !== 0) return false;
                // 检查路径
                const count = this.countPiecesBetween(board, fromX, fromY, toX, toY);
                if (target) {
                    // 吃子需要隔一个棋子
                    return count === 1;
                } else {
                    // 移动不能隔子
                    return count === 0;
                }

            case 'p': // 兵/卒
                // 兵/卒移动逻辑
                if (turn === 'r') { // 红方 (大写 P)
                    // 红方在底部 (Row 9)，向上移动 (y 减小)
                    if (dy >= 0) return false; // 必须向上移动 (dy < 0)
                    if (dy < -1) return false; // 只能移动一步
                    if (absDx > 1) return false; // 横向最多一步

                    // 过河前 (Row 5-9)
                    if (fromY > 4) {
                        if (absDx !== 0) return false; // 只能向前
                    } else {
                        // 过河后 (Row 0-4)
                        // 可以向前或横向，但不能同时
                        if (absDx + Math.abs(dy) !== 1) return false;
                    }
                } else { // 黑方 (小写 p)
                    // 黑方在顶部 (Row 0)，向下移动 (y 增加)
                    if (dy <= 0) return false; // 必须向下移动 (dy > 0)
                    if (dy > 1) return false; // 只能移动一步
                    if (absDx > 1) return false; // 横向最多一步

                    // 过河前 (Row 0-4)
                    if (fromY < 5) {
                        if (absDx !== 0) return false; // 只能向前
                    } else {
                        // 过河后 (Row 5-9)
                        // 可以向前或横向，但不能同时
                        if (absDx + Math.abs(dy) !== 1) return false;
                    }
                }
                return true;
        }
        return false;
    }

    /**
     * 验证移动合法性 V2 (修复版)
     * 假设：
     * - 红方在底部 (Row 9)，棋子大写
     * - 黑方在顶部 (Row 0)，棋子小写
     * - 河界在 Row 4 和 Row 5 之间
     */
    static isValidMoveV2(board, fromX, fromY, toX, toY, turn) {
        // 复用 isValidMove 的逻辑，因为我们已经修复了它
        // 但为了保险起见，我们在这里重新实现一遍完整的逻辑，确保覆盖所有规则
        
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
                
                if (turn === 'r') { // 红帅
                    if (toY < 7 || toY > 9) return false;
                } else { // 黑将
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
                    if (toY < 5) return false;
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

    // 修正后的逻辑，假设红方 = 底部 (第 9-7 行)，黑方 = 顶部 (第 0-2 行)
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
                if (turn === 'r') { // 红方 (底部)
                    if (toY < 7) return false;
                } else { // 黑方 (顶部)
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

            case 'b': // 象/相
                if (turn === 'r') {
                    if (toY < 5) return false; // 不能过河 (河界在第 4 和 5 行之间)
                } else {
                    if (toY > 4) return false;
                }
                if (absDx !== 2 || absDy !== 2) return false;
                if (board[fromY + dy / 2][fromX + dx / 2]) return false;
                return true;

            case 'n': // 马
                if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
                if (absDx === 2) {
                    if (board[fromY][fromX + dx / 2]) return false;
                } else {
                    if (board[fromY + dy / 2][fromX]) return false;
                }
                return true;

            case 'r': // 车
                if (dx !== 0 && dy !== 0) return false;
                if (!this.isPathClear(board, fromX, fromY, toX, toY)) return false;
                return true;

            case 'c': // 炮
                if (dx !== 0 && dy !== 0) return false;
                const count = this.countPiecesBetween(board, fromX, fromY, toX, toY);
                if (target) return count === 1;
                return count === 0;

            case 'p': // 兵/卒
                if (turn === 'r') { // 红方向上移动 (dy < 0)
                    if (dy >= 0) return false; // 必须向上移动
                    if (dy < -1) return false; // 最多移动一步
                    if (absDx > 1) return false; // 横向最多移动一步
                    if (fromY > 4) { // 过河前 (第 5-9 行)
                        if (absDx !== 0) return false; // 只能向前
                    } else { // 过河后
                        if (absDx + Math.abs(dy) !== 1) return false;
                    }
                } else { // 黑方向下移动 (dy > 0)
                    if (dy <= 0) return false;
                    if (dy > 1) return false;
                    if (absDx > 1) return false;
                    if (fromY < 5) { // 过河前 (第 0-4 行)
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
}

module.exports = ChineseChessRules;
