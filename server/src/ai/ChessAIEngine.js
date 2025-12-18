/**
 * 象棋 AI 引擎 (服务端版本)
 * 
 * 基于 Minimax + Alpha-Beta 剪枝算法
 * 支持不同棋力等级（通过搜索深度和随机因子控制）
 * 
 * 文件位置: server/src/ai/ChessAIEngine.js
 */

const ChineseChessRules = require('../games/chinesechess/logic/ChineseChessRules');

// 棋子基础分值
const PIECE_VALUES = {
    'k': 10000, 'K': 10000, // 帅/将
    'r': 900,   'R': 900,   // 车
    'n': 450,   'N': 450,   // 马
    'c': 450,   'C': 450,   // 炮
    'a': 200,   'A': 200,   // 士
    'b': 200,   'B': 200,   // 象
    'p': 100,   'P': 100    // 兵
};

// 位置加分表（过河兵、中心控制等）
const POSITION_BONUS = {
    // 红兵过河加分
    redPawnBonus: (y) => y < 5 ? 50 + (5 - y) * 20 : 0,
    // 黑卒过河加分
    blackPawnBonus: (y) => y > 4 ? 50 + (y - 4) * 20 : 0,
    // 车占中路加分
    rookCenterBonus: (x) => (x === 4) ? 30 : 0,
    // 马的灵活性（靠近中心更好）
    knightMobilityBonus: (x, y) => {
        const centerX = 4, centerY = 4.5;
        const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
        return Math.max(0, 20 - dist * 3);
    }
};

/**
 * AI 棋力等级配置
 */
const AI_STRENGTH_CONFIG = {
    // 新手级 (rating 800-1000)
    beginner: {
        depth: 1,
        randomFactor: 0.3,      // 30% 概率走次优解
        blunderChance: 0.15,    // 15% 概率犯错
        thinkTimeRange: [2000, 5000]  // 思考时间 2-5 秒
    },
    // 初级 (rating 1000-1200)
    easy: {
        depth: 2,
        randomFactor: 0.2,
        blunderChance: 0.08,
        thinkTimeRange: [1500, 4000]
    },
    // 中级 (rating 1200-1400)
    medium: {
        depth: 2,
        randomFactor: 0.1,
        blunderChance: 0.03,
        thinkTimeRange: [1000, 3000]
    },
    // 高级 (rating 1400-1600)
    hard: {
        depth: 3,
        randomFactor: 0.05,
        blunderChance: 0.01,
        thinkTimeRange: [800, 2500]
    },
    // 专家级 (rating 1600-1800)
    expert: {
        depth: 3,
        randomFactor: 0.02,
        blunderChance: 0,
        thinkTimeRange: [500, 2000]
    },
    // 大师级 (rating 1800+)
    master: {
        depth: 4,
        randomFactor: 0,
        blunderChance: 0,
        thinkTimeRange: [300, 1500]
    }
};

/**
 * 根据 rating 获取 AI 强度配置
 */
function getStrengthByRating(rating) {
    if (rating < 1000) return AI_STRENGTH_CONFIG.beginner;
    if (rating < 1200) return AI_STRENGTH_CONFIG.easy;
    if (rating < 1400) return AI_STRENGTH_CONFIG.medium;
    if (rating < 1600) return AI_STRENGTH_CONFIG.hard;
    if (rating < 1800) return AI_STRENGTH_CONFIG.expert;
    return AI_STRENGTH_CONFIG.master;
}

/**
 * 获取某方所有合法走法
 */
function getAllLegalMoves(board, turn) {
    const moves = [];
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (!piece) continue;
            
            const pieceSide = ChineseChessRules.isRed(piece) ? 'r' : 'b';
            if (pieceSide !== turn) continue;

            for (let ty = 0; ty < 10; ty++) {
                for (let tx = 0; tx < 9; tx++) {
                    // 基础行走规则检查
                    if (ChineseChessRules.isValidMoveV2(board, x, y, tx, ty, turn)) {
                        // 送将检查
                        if (!ChineseChessRules.isSelfCheckAfterMove(board, x, y, tx, ty, turn)) {
                            // 飞将检查
                            if (!ChineseChessRules.isFlyingGeneralAfterMove(board, x, y, tx, ty)) {
                                const captured = board[ty][tx];
                                moves.push({
                                    from: { x, y },
                                    to: { x: tx, y: ty },
                                    piece,
                                    captured,
                                    // 预估分值用于排序
                                    priority: captured ? (PIECE_VALUES[captured] || 0) : 0
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 按吃子价值排序，优先搜索高价值走法（提高剪枝效率）
    moves.sort((a, b) => b.priority - a.priority);
    
    return moves;
}

/**
 * 局面评估函数
 * @param {Array} board - 棋盘
 * @returns {number} 评估分数（红方视角，正数对红方有利）
 */
function evaluateBoard(board) {
    let score = 0;
    
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (!piece) continue;
            
            const isRed = ChineseChessRules.isRed(piece);
            const baseValue = PIECE_VALUES[piece] || 0;
            let positionBonus = 0;
            
            const pieceType = piece.toLowerCase();
            
            // 位置加分
            switch (pieceType) {
                case 'p':
                    positionBonus = isRed 
                        ? POSITION_BONUS.redPawnBonus(y)
                        : POSITION_BONUS.blackPawnBonus(y);
                    break;
                case 'r':
                    positionBonus = POSITION_BONUS.rookCenterBonus(x);
                    break;
                case 'n':
                    positionBonus = POSITION_BONUS.knightMobilityBonus(x, y);
                    break;
            }
            
            const totalValue = baseValue + positionBonus;
            score += isRed ? totalValue : -totalValue;
        }
    }
    
    return score;
}

/**
 * Minimax 搜索 + Alpha-Beta 剪枝
 */
function minimax(board, depth, alpha, beta, isMaximizing, aiColor) {
    if (depth === 0) {
        const evalScore = evaluateBoard(board);
        return { score: aiColor === 'r' ? evalScore : -evalScore };
    }

    const turn = isMaximizing ? aiColor : (aiColor === 'r' ? 'b' : 'r');
    const moves = getAllLegalMoves(board, turn);

    if (moves.length === 0) {
        // 无路可走 = 被将死
        return { score: isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth) };
    }

    let bestMove = null;
    
    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const move of moves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;

            const result = minimax(newBoard, depth - 1, alpha, beta, false, aiColor);
            
            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = move;
            }
            alpha = Math.max(alpha, maxScore);
            if (beta <= alpha) break;
        }
        return { score: maxScore, move: bestMove };
    } else {
        let minScore = Infinity;
        for (const move of moves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;

            const result = minimax(newBoard, depth - 1, alpha, beta, true, aiColor);
            
            if (result.score < minScore) {
                minScore = result.score;
                bestMove = move;
            }
            beta = Math.min(beta, minScore);
            if (beta <= alpha) break;
        }
        return { score: minScore, move: bestMove };
    }
}

/**
 * 计算 AI 的最佳走法
 * 
 * @param {Array} board - 当前棋盘状态
 * @param {string} aiColor - AI 执的颜色 ('r' 或 'b')
 * @param {number} rating - AI 玩家的等级分（用于确定棋力）
 * @returns {Object} { move, thinkTime }
 */
function calculateBestMove(board, aiColor, rating = 1200) {
    const strength = getStrengthByRating(rating);
    
    console.log(`[ChessAIEngine] Calculating move for ${aiColor}, rating=${rating}, depth=${strength.depth}`);
    
    // 获取所有合法走法
    const allMoves = getAllLegalMoves(board, aiColor);
    
    if (allMoves.length === 0) {
        console.warn('[ChessAIEngine] No legal moves available!');
        return null;
    }
    
    if (allMoves.length === 1) {
        // 只有一个选择，直接返回
        return {
            move: allMoves[0],
            thinkTime: randomInRange(500, 1000)
        };
    }
    
    let selectedMove;
    
    // 是否犯错（随机走一步不好的棋）
    if (Math.random() < strength.blunderChance) {
        console.log('[ChessAIEngine] AI making a blunder...');
        // 从后半部分（较差的走法）中随机选一个
        const worstHalf = allMoves.slice(Math.floor(allMoves.length / 2));
        selectedMove = worstHalf[Math.floor(Math.random() * worstHalf.length)];
    } else {
        // 正常计算
        const result = minimax(board, strength.depth, -Infinity, Infinity, true, aiColor);
        selectedMove = result.move;
        
        // 是否走次优解（增加变化性）
        if (Math.random() < strength.randomFactor && allMoves.length > 2) {
            console.log('[ChessAIEngine] AI choosing sub-optimal move for variety...');
            // 从前几个好走法中随机选
            const topMoves = allMoves.slice(0, Math.min(5, allMoves.length));
            selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
        }
    }
    
    // 随机思考时间
    const thinkTime = randomInRange(strength.thinkTimeRange[0], strength.thinkTimeRange[1]);
    
    console.log(`[ChessAIEngine] Selected move: (${selectedMove.from.x},${selectedMove.from.y}) -> (${selectedMove.to.x},${selectedMove.to.y}), thinkTime=${thinkTime}ms`);
    
    return {
        move: selectedMove,
        thinkTime
    };
}

/**
 * 在范围内生成随机数
 */
function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    calculateBestMove,
    getAllLegalMoves,
    evaluateBoard,
    getStrengthByRating,
    AI_STRENGTH_CONFIG
};
