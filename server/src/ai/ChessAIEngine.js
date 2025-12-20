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
 * AI 棋力等级配置 (100分一档，共13个等级)
 * 
 * 参数说明：
 * - depth: 搜索深度（1-5层）
 * - randomFactor: 走次优解的概率（增加变化性）
 * - blunderChance: 犯错概率（走较差走法）
 * - candidateRange: 多候选走法的分数容差（用于随机选择）
 * - thinkTimeRange: 思考时间范围（毫秒）
 */
const AI_STRENGTH_CONFIG = {
    // rating 800-900: 入门级
    rating_800: {
        depth: 1,
        randomFactor: 0.35,
        blunderChance: 0.18,
        candidateRange: 50,
        thinkTimeRange: [2500, 5000]
    },
    // rating 900-1000: 新手级
    rating_900: {
        depth: 1,
        randomFactor: 0.30,
        blunderChance: 0.15,
        candidateRange: 45,
        thinkTimeRange: [2000, 4500]
    },
    // rating 1000-1100: 初学级
    rating_1000: {
        depth: 2,
        randomFactor: 0.25,
        blunderChance: 0.12,
        candidateRange: 40,
        thinkTimeRange: [1800, 4000]
    },
    // rating 1100-1200: 入门进阶
    rating_1100: {
        depth: 2,
        randomFactor: 0.20,
        blunderChance: 0.09,
        candidateRange: 35,
        thinkTimeRange: [1500, 3500]
    },
    // rating 1200-1300: 中级入门
    rating_1200: {
        depth: 2,
        randomFactor: 0.15,
        blunderChance: 0.06,
        candidateRange: 30,
        thinkTimeRange: [1300, 3000]
    },
    // rating 1300-1400: 中级
    rating_1300: {
        depth: 2,
        randomFactor: 0.12,
        blunderChance: 0.04,
        candidateRange: 25,
        thinkTimeRange: [1100, 2800]
    },
    // rating 1400-1500: 中高级
    rating_1400: {
        depth: 3,
        randomFactor: 0.10,
        blunderChance: 0.025,
        candidateRange: 22,
        thinkTimeRange: [1000, 2500]
    },
    // rating 1500-1600: 高级
    rating_1500: {
        depth: 3,
        randomFactor: 0.08,
        blunderChance: 0.015,
        candidateRange: 20,
        thinkTimeRange: [900, 2300]
    },
    // rating 1600-1700: 专家入门
    rating_1600: {
        depth: 3,
        randomFactor: 0.06,
        blunderChance: 0.008,
        candidateRange: 18,
        thinkTimeRange: [800, 2000]
    },
    // rating 1700-1800: 专家级
    rating_1700: {
        depth: 3,
        randomFactor: 0.04,
        blunderChance: 0.004,
        candidateRange: 15,
        thinkTimeRange: [600, 1800]
    },
    // rating 1800-1900: 大师入门
    rating_1800: {
        depth: 4,
        randomFactor: 0.02,
        blunderChance: 0.002,
        candidateRange: 12,
        thinkTimeRange: [500, 1500]
    },
    // rating 1900-2000: 大师级
    rating_1900: {
        depth: 4,
        randomFactor: 0.01,
        blunderChance: 0,
        candidateRange: 10,
        thinkTimeRange: [400, 1300]
    },
    // rating 2000+: 宗师级
    rating_2000: {
        depth: 5,
        randomFactor: 0,
        blunderChance: 0,
        candidateRange: 8,
        thinkTimeRange: [300, 1000]
    }
};

/**
 * 根据 rating 获取 AI 强度配置 (100分一档)
 */
function getStrengthByRating(rating) {
    if (rating < 900) return AI_STRENGTH_CONFIG.rating_800;
    if (rating < 1000) return AI_STRENGTH_CONFIG.rating_900;
    if (rating < 1100) return AI_STRENGTH_CONFIG.rating_1000;
    if (rating < 1200) return AI_STRENGTH_CONFIG.rating_1100;
    if (rating < 1300) return AI_STRENGTH_CONFIG.rating_1200;
    if (rating < 1400) return AI_STRENGTH_CONFIG.rating_1300;
    if (rating < 1500) return AI_STRENGTH_CONFIG.rating_1400;
    if (rating < 1600) return AI_STRENGTH_CONFIG.rating_1500;
    if (rating < 1700) return AI_STRENGTH_CONFIG.rating_1600;
    if (rating < 1800) return AI_STRENGTH_CONFIG.rating_1700;
    if (rating < 1900) return AI_STRENGTH_CONFIG.rating_1800;
    if (rating < 2000) return AI_STRENGTH_CONFIG.rating_1900;
    return AI_STRENGTH_CONFIG.rating_2000;
}

/**
 * 根据 rating 获取强度等级名称 (用于 AIPlayerManager 分类)
 */
function getStrengthLevelByRating(rating) {
    if (rating < 900) return 'rating_800';
    if (rating < 1000) return 'rating_900';
    if (rating < 1100) return 'rating_1000';
    if (rating < 1200) return 'rating_1100';
    if (rating < 1300) return 'rating_1200';
    if (rating < 1400) return 'rating_1300';
    if (rating < 1500) return 'rating_1400';
    if (rating < 1600) return 'rating_1500';
    if (rating < 1700) return 'rating_1600';
    if (rating < 1800) return 'rating_1700';
    if (rating < 1900) return 'rating_1800';
    if (rating < 2000) return 'rating_1900';
    return 'rating_2000';
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
 * @param {number} moveCount - 当前回合数（用于开局库判断）
 * @returns {Object} { move, thinkTime }
 */
function calculateBestMove(board, aiColor, rating = 1200, moveCount = 0) {
    const strength = getStrengthByRating(rating);
    
    console.log(`[ChessAIEngine] Calculating move for ${aiColor}, rating=${rating}, depth=${strength.depth}`);
    
    // 尝试使用开局库（前8步）
    let openingMove = null;
    try {
        const OpeningBook = require('./OpeningBook');
        if (moveCount < 8) {
            openingMove = OpeningBook.getOpeningMove(board, aiColor, moveCount, rating);
            if (openingMove) {
                console.log(`[ChessAIEngine] Using opening book move`);
                const thinkTime = randomInRange(800, 2000);
                return {
                    move: openingMove,
                    thinkTime
                };
            }
        }
    } catch (err) {
        // 开局库不存在或出错，继续使用搜索
        console.log('[ChessAIEngine] Opening book not available, using search');
    }
    
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
        // 正常计算：评估所有走法的分数
        const moveScores = [];
        for (const move of allMoves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;
            
            const result = minimax(newBoard, strength.depth - 1, -Infinity, Infinity, false, aiColor);
            moveScores.push({ move, score: -result.score });
        }
        
        // 按分数排序（高分在前）
        moveScores.sort((a, b) => b.score - a.score);
        
        const bestScore = moveScores[0].score;
        const candidateRange = strength.candidateRange || 15;
        
        // 多候选随机选择：选取分数在 bestScore - candidateRange 范围内的所有走法
        const candidates = moveScores.filter(ms => ms.score >= bestScore - candidateRange);
        
        // 是否使用随机因子选择次优解
        if (Math.random() < strength.randomFactor && candidates.length > 1) {
            console.log(`[ChessAIEngine] Randomly selecting from ${candidates.length} candidates (range: ${candidateRange})`);
            const randomIndex = Math.floor(Math.random() * candidates.length);
            selectedMove = candidates[randomIndex].move;
        } else {
            // 即使不使用随机因子，如果有多个最优解也随机选一个
            const topCandidates = candidates.filter(ms => ms.score === bestScore);
            if (topCandidates.length > 1) {
                const randomIndex = Math.floor(Math.random() * topCandidates.length);
                selectedMove = topCandidates[randomIndex].move;
            } else {
                selectedMove = moveScores[0].move;
            }
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
    getStrengthLevelByRating,
    AI_STRENGTH_CONFIG
};
