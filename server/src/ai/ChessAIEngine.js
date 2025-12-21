/**
 * 象棋 AI 引擎 (服务端版本)
 * 
 * 基于专业象棋引擎设计原则：
 * - Minimax + Alpha-Beta 剪枝算法
 * - 置换表 (Transposition Table) 避免重复计算
 * - 静态搜索 (Quiescence Search) 解决地平线效应
 * - 棋子-位置价值表 (Piece-Square Table) 精确评估
 * - 杀手走法启发 (Killer Move Heuristic)
 * - 历史表启发 (History Heuristic)
 * 
 * 参考资料：象棋百科全书 (xqbase.com)
 * 
 * 文件位置: server/src/ai/ChessAIEngine.js
 */

const ChineseChessRules = require('../games/chinesechess/logic/ChineseChessRules');

// ============ 棋子基础分值 ============
const PIECE_VALUES = {
    'k': 10000, 'K': 10000, // 帅/将
    'r': 1000,  'R': 1000,  // 车 (提高价值)
    'n': 450,   'N': 450,   // 马
    'c': 450,   'C': 450,   // 炮
    'a': 200,   'A': 200,   // 士
    'b': 200,   'B': 200,   // 象
    'p': 100,   'P': 100    // 兵
};

// ============ 棋子-位置价值表 (Piece-Square Table) ============
// 每个棋子在不同位置的附加价值，基于象棋理论

// 红方兵的位置价值表 (y=0-9, x=0-8，红方在下方 y=5-9)
const RED_PAWN_PST = [
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=0 黑方底线
    [ 90, 90, 95,100,100,100, 95, 90, 90],  // y=1
    [ 80, 85, 90, 95, 95, 95, 90, 85, 80],  // y=2
    [ 70, 75, 80, 85, 85, 85, 80, 75, 70],  // y=3
    [ 40, 50, 60, 70, 70, 70, 60, 50, 40],  // y=4 河界
    [  5, 10, 15, 20, 20, 20, 15, 10,  5],  // y=5 刚过河
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=6
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=7
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=8
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=9 红方底线
];

// 黑方卒的位置价值表
const BLACK_PAWN_PST = [
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=0 黑方底线
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=1
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=2
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=3
    [  5, 10, 15, 20, 20, 20, 15, 10,  5],  // y=4 刚过河
    [ 40, 50, 60, 70, 70, 70, 60, 50, 40],  // y=5 河界
    [ 70, 75, 80, 85, 85, 85, 80, 75, 70],  // y=6
    [ 80, 85, 90, 95, 95, 95, 90, 85, 80],  // y=7
    [ 90, 90, 95,100,100,100, 95, 90, 90],  // y=8
    [  0,  0,  0,  0,  0,  0,  0,  0,  0],  // y=9 红方底线
];

// 马的位置价值表 (通用)
const KNIGHT_PST = [
    [ 70, 80, 90, 90, 90, 90, 90, 80, 70],  // y=0
    [ 80, 90,100,100,100,100,100, 90, 80],  // y=1
    [ 90,100,105,110,110,110,105,100, 90],  // y=2
    [ 90,100,110,115,115,115,110,100, 90],  // y=3
    [ 90,100,110,115,120,115,110,100, 90],  // y=4
    [ 90,100,110,115,120,115,110,100, 90],  // y=5
    [ 90,100,110,115,115,115,110,100, 90],  // y=6
    [ 90,100,105,110,110,110,105,100, 90],  // y=7
    [ 80, 90,100,100,100,100,100, 90, 80],  // y=8
    [ 70, 80, 90, 90, 90, 90, 90, 80, 70],  // y=9
];

// 车的位置价值表
const ROOK_PST = [
    [190,200,200,205,210,205,200,200,190],  // y=0
    [195,205,205,210,215,210,205,205,195],  // y=1
    [195,205,205,210,215,210,205,205,195],  // y=2
    [195,205,210,215,220,215,210,205,195],  // y=3
    [195,205,210,215,225,215,210,205,195],  // y=4
    [195,205,210,215,225,215,210,205,195],  // y=5
    [195,205,210,215,220,215,210,205,195],  // y=6
    [195,205,205,210,215,210,205,205,195],  // y=7
    [195,205,205,210,215,210,205,205,195],  // y=8
    [190,200,200,205,210,205,200,200,190],  // y=9
];

// 炮的位置价值表
const CANNON_PST = [
    [100,100,100,100,105,100,100,100,100],  // y=0
    [100,105,105,110,115,110,105,105,100],  // y=1
    [100,105,105,110,115,110,105,105,100],  // y=2
    [100,105,110,115,120,115,110,105,100],  // y=3
    [100,105,110,115,120,115,110,105,100],  // y=4
    [100,105,110,115,120,115,110,105,100],  // y=5
    [100,105,110,115,120,115,110,105,100],  // y=6
    [100,105,105,110,115,110,105,105,100],  // y=7
    [100,105,105,110,115,110,105,105,100],  // y=8
    [100,100,100,100,105,100,100,100,100],  // y=9
];

// ============ 置换表 (Transposition Table) ============
// 置换表条目类型
const HASH_EXACT = 0;  // 精确值
const HASH_ALPHA = 1;  // 上界 (alpha)
const HASH_BETA = 2;   // 下界 (beta)

// 置换表大小 (2^16 = 65536 个条目)
const HASH_SIZE = 65536;
const HASH_MASK = HASH_SIZE - 1;

// 置换表
let transpositionTable = new Array(HASH_SIZE).fill(null);

// Zobrist 哈希键 (简化版，使用棋盘状态字符串的哈希)
function computeZobristKey(board) {
    let hash = 0;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (piece) {
                // 简单的哈希函数
                const pieceCode = piece.charCodeAt(0);
                hash ^= (pieceCode * (y * 9 + x + 1) * 31);
                hash = (hash << 5) - hash + pieceCode;
                hash = hash & 0x7FFFFFFF; // 保持为正整数
            }
        }
    }
    return hash;
}

// 查询置换表
function probeHash(board, depth, alpha, beta) {
    const key = computeZobristKey(board);
    const entry = transpositionTable[key & HASH_MASK];
    
    if (entry && entry.key === key && entry.depth >= depth) {
        if (entry.flag === HASH_EXACT) {
            return { score: entry.score, move: entry.bestMove };
        }
        if (entry.flag === HASH_ALPHA && entry.score <= alpha) {
            return { score: alpha, move: entry.bestMove };
        }
        if (entry.flag === HASH_BETA && entry.score >= beta) {
            return { score: beta, move: entry.bestMove };
        }
    }
    return null;
}

// 记录到置换表
function recordHash(board, depth, score, flag, bestMove) {
    const key = computeZobristKey(board);
    const index = key & HASH_MASK;
    const existing = transpositionTable[index];
    
    // 深度优先替换策略
    if (!existing || existing.depth <= depth) {
        transpositionTable[index] = {
            key: key,
            depth: depth,
            score: score,
            flag: flag,
            bestMove: bestMove
        };
    }
}

// 清空置换表
function clearTranspositionTable() {
    transpositionTable = new Array(HASH_SIZE).fill(null);
}

// ============ 杀手走法启发 ============
// 每层保存2个杀手走法
const killerMoves = [];
const MAX_DEPTH = 20;
for (let i = 0; i < MAX_DEPTH; i++) {
    killerMoves.push([null, null]);
}

function isKillerMove(move, depth) {
    if (depth >= MAX_DEPTH) return false;
    const killers = killerMoves[depth];
    for (const killer of killers) {
        if (killer && 
            killer.from.x === move.from.x && killer.from.y === move.from.y &&
            killer.to.x === move.to.x && killer.to.y === move.to.y) {
            return true;
        }
    }
    return false;
}

function recordKillerMove(move, depth) {
    if (depth >= MAX_DEPTH) return;
    const killers = killerMoves[depth];
    // 如果不是吃子走法才记录为杀手走法
    if (!move.captured) {
        // 避免重复
        if (killers[0] && 
            killers[0].from.x === move.from.x && killers[0].from.y === move.from.y &&
            killers[0].to.x === move.to.x && killers[0].to.y === move.to.y) {
            return;
        }
        // 移动杀手走法
        killers[1] = killers[0];
        killers[0] = { from: move.from, to: move.to, piece: move.piece };
    }
}

// ============ 历史表启发 ============
// 历史表：记录走法产生截断的次数
const historyTable = {};

function getHistoryScore(move) {
    const key = `${move.piece}_${move.from.x}_${move.from.y}_${move.to.x}_${move.to.y}`;
    return historyTable[key] || 0;
}

function recordHistoryMove(move, depth) {
    const key = `${move.piece}_${move.from.x}_${move.from.y}_${move.to.x}_${move.to.y}`;
    historyTable[key] = (historyTable[key] || 0) + depth * depth;
}

function clearHistoryTable() {
    for (const key in historyTable) {
        delete historyTable[key];
    }
}

// 位置加分表（过河兵、中心控制等）- 保留向后兼容
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

// 历史走法记录（用于检测重复走法）
// 格式: { 'roomId': [{ from: {x,y}, to: {x,y}, piece }, ...] }
const moveHistory = new Map();

// 清理历史记录
function clearMoveHistory(roomId) {
    if (roomId) {
        moveHistory.delete(roomId);
    } else {
        moveHistory.clear();
    }
}

// 记录走法
function recordMove(roomId, move) {
    if (!moveHistory.has(roomId)) {
        moveHistory.set(roomId, []);
    }
    const history = moveHistory.get(roomId);
    history.push({
        from: { x: move.from.x, y: move.from.y },
        to: { x: move.to.x, y: move.to.y },
        piece: move.piece
    });
    // 只保留最近30步
    if (history.length > 30) {
        history.shift();
    }
}

// 检测是否是重复走法（同一棋子在两个位置之间来回）
function isRepeatedMove(roomId, move) {
    if (!moveHistory.has(roomId)) return false;
    
    const history = moveHistory.get(roomId);
    if (history.length < 2) return false;
    
    // 检查最近6步内是否有相同棋子的来回移动
    const recentMoves = history.slice(-6);
    let backAndForth = 0;
    
    for (const prevMove of recentMoves) {
        // 同一棋子，从当前目标位置移动到当前起始位置 = 走回去
        if (prevMove.piece === move.piece &&
            prevMove.from.x === move.to.x && prevMove.from.y === move.to.y &&
            prevMove.to.x === move.from.x && prevMove.to.y === move.from.y) {
            backAndForth++;
        }
    }
    
    return backAndForth >= 1; // 如果发现一次来回就标记为重复
}

/**
 * AI 棋力等级配置 (100分一档，共13个等级)
 * 
 * 参数说明：
 * - depth: 搜索深度（2-6层）
 * - randomFactor: 走次优解的概率（增加变化性）
 * - blunderChance: 犯错概率（走较差走法）
 * - candidateRange: 多候选走法的分数容差（用于随机选择）
 * - thinkTimeRange: 思考时间范围（毫秒）
 */
const AI_STRENGTH_CONFIG = {
    // rating 800-900: 入门级
    rating_800: {
        depth: 2,
        randomFactor: 0.20,
        blunderChance: 0.08,
        candidateRange: 15,
        thinkTimeRange: [2500, 5000]
    },
    // rating 900-1000: 新手级
    rating_900: {
        depth: 2,
        randomFactor: 0.15,
        blunderChance: 0.06,
        candidateRange: 12,
        thinkTimeRange: [2000, 4500]
    },
    // rating 1000-1100: 初学级
    rating_1000: {
        depth: 3,
        randomFactor: 0.12,
        blunderChance: 0.04,
        candidateRange: 10,
        thinkTimeRange: [1800, 4000]
    },
    // rating 1100-1200: 入门进阶
    rating_1100: {
        depth: 3,
        randomFactor: 0.10,
        blunderChance: 0.03,
        candidateRange: 8,
        thinkTimeRange: [1500, 3500]
    },
    // rating 1200-1300: 中级入门
    rating_1200: {
        depth: 3,
        randomFactor: 0.08,
        blunderChance: 0.02,
        candidateRange: 6,
        thinkTimeRange: [1300, 3000]
    },
    // rating 1300-1400: 中级
    rating_1300: {
        depth: 4,
        randomFactor: 0.06,
        blunderChance: 0.01,
        candidateRange: 5,
        thinkTimeRange: [1100, 2800]
    },
    // rating 1400-1500: 中高级
    rating_1400: {
        depth: 4,
        randomFactor: 0.04,
        blunderChance: 0.005,
        candidateRange: 4,
        thinkTimeRange: [1000, 2500]
    },
    // rating 1500-1600: 高级
    rating_1500: {
        depth: 4,
        randomFactor: 0.03,
        blunderChance: 0.002,
        candidateRange: 3,
        thinkTimeRange: [900, 2300]
    },
    // rating 1600-1700: 专家入门
    rating_1600: {
        depth: 5,
        randomFactor: 0.02,
        blunderChance: 0.001,
        candidateRange: 3,
        thinkTimeRange: [800, 2000]
    },
    // rating 1700-1800: 专家级
    rating_1700: {
        depth: 5,
        randomFactor: 0.01,
        blunderChance: 0,
        candidateRange: 2,
        thinkTimeRange: [600, 1800]
    },
    // rating 1800-1900: 大师入门
    rating_1800: {
        depth: 5,
        randomFactor: 0.005,
        blunderChance: 0,
        candidateRange: 2,
        thinkTimeRange: [500, 1500]
    },
    // rating 1900-2000: 大师级
    rating_1900: {
        depth: 6,
        randomFactor: 0,
        blunderChance: 0,
        candidateRange: 1,
        thinkTimeRange: [400, 1300]
    },
    // rating 2000+: 宗师级
    rating_2000: {
        depth: 6,
        randomFactor: 0,
        blunderChance: 0,
        candidateRange: 0,
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
 * 获取某方所有合法走法（带启发式排序）
 * @param {number} depth - 当前搜索深度（用于杀手走法启发）
 */
function getAllLegalMoves(board, turn, depth = 0) {
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
                                const move = {
                                    from: { x, y },
                                    to: { x: tx, y: ty },
                                    piece,
                                    captured,
                                    priority: 0
                                };
                                
                                // MVV/LVA 排序：最有价值受害者 / 最没价值攻击者
                                if (captured) {
                                    // 吃子走法优先级 = 被吃棋子价值 * 10 - 攻击者价值
                                    const victimValue = PIECE_VALUES[captured] || 0;
                                    const attackerValue = PIECE_VALUES[piece] || 0;
                                    move.priority = victimValue * 10 - attackerValue + 100000;
                                } else if (isKillerMove(move, depth)) {
                                    // 杀手走法次优先
                                    move.priority = 90000;
                                } else {
                                    // 历史表启发
                                    move.priority = getHistoryScore(move);
                                }
                                
                                moves.push(move);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 按优先级排序（高优先级在前）
    moves.sort((a, b) => b.priority - a.priority);
    
    return moves;
}

/**
 * 获取吃子走法（用于静态搜索）
 */
function getCaptureMoves(board, turn) {
    const moves = [];
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (!piece) continue;
            
            const pieceSide = ChineseChessRules.isRed(piece) ? 'r' : 'b';
            if (pieceSide !== turn) continue;

            for (let ty = 0; ty < 10; ty++) {
                for (let tx = 0; tx < 9; tx++) {
                    const target = board[ty][tx];
                    if (!target) continue; // 只看吃子走法
                    
                    if (ChineseChessRules.isValidMoveV2(board, x, y, tx, ty, turn)) {
                        if (!ChineseChessRules.isSelfCheckAfterMove(board, x, y, tx, ty, turn)) {
                            if (!ChineseChessRules.isFlyingGeneralAfterMove(board, x, y, tx, ty)) {
                                const victimValue = PIECE_VALUES[target] || 0;
                                const attackerValue = PIECE_VALUES[piece] || 0;
                                
                                // 只考虑"好的"吃子（被吃棋子价值 >= 攻击者价值 - 100）
                                // 这样可以避免静态搜索膨胀
                                if (victimValue >= attackerValue - 100) {
                                    moves.push({
                                        from: { x, y },
                                        to: { x: tx, y: ty },
                                        piece,
                                        captured: target,
                                        priority: victimValue * 10 - attackerValue
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // 按 MVV/LVA 排序
    moves.sort((a, b) => b.priority - a.priority);
    
    return moves;
}

/**
 * 检查某个位置的棋子是否被敌方威胁
 * @param {Array} board - 棋盘
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @returns {boolean} 是否被威胁
 */
function isPieceUnderThreat(board, x, y) {
    const piece = board[y][x];
    if (!piece) return false;
    
    const isRed = ChineseChessRules.isRed(piece);
    const enemySide = isRed ? 'b' : 'r';
    
    // 检查敌方是否有棋子可以吃掉这个位置
    for (let ey = 0; ey < 10; ey++) {
        for (let ex = 0; ex < 9; ex++) {
            const enemyPiece = board[ey][ex];
            if (!enemyPiece) continue;
            
            // 跳过己方棋子，只检查敌方棋子
            const enemyPieceIsRed = ChineseChessRules.isRed(enemyPiece);
            if (enemyPieceIsRed === isRed) continue; // 同一方的棋子，跳过
            
            // 检查敌方棋子是否可以移动到目标位置
            if (ChineseChessRules.isValidMoveV2(board, ex, ey, x, y, enemySide)) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * 检查某个位置的棋子是否被己方保护
 * @param {Array} board - 棋盘
 * @param {number} x - x坐标
 * @param {number} y - y坐标
 * @returns {boolean} 是否被保护
 */
function isPieceProtected(board, x, y) {
    const piece = board[y][x];
    if (!piece) return false;
    
    const isRed = ChineseChessRules.isRed(piece);
    const friendSide = isRed ? 'r' : 'b';
    
    // 临时移除该棋子，检查己方是否有棋子可以移动到这个位置
    const tempPiece = board[y][x];
    board[y][x] = null;
    
    let isProtected = false;
    
    for (let fy = 0; fy < 10; fy++) {
        for (let fx = 0; fx < 9; fx++) {
            const friendPiece = board[fy][fx];
            if (!friendPiece) continue;
            if (fx === x && fy === y) continue;
            
            // 只检查己方棋子
            const friendPieceIsRed = ChineseChessRules.isRed(friendPiece);
            if (friendPieceIsRed === isRed) { // 同一方的棋子
                if (ChineseChessRules.isValidMoveV2(board, fx, fy, x, y, friendSide)) {
                    isProtected = true;
                    break;
                }
            }
        }
        if (isProtected) break;
    }
    
    // 恢复棋子
    board[y][x] = tempPiece;
    
    return isProtected;
}

/**
 * 局面评估函数（使用棋子-位置价值表）
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
            
            // 使用棋子-位置价值表
            switch (pieceType) {
                case 'p':
                    positionBonus = isRed ? RED_PAWN_PST[y][x] : BLACK_PAWN_PST[y][x];
                    break;
                case 'n':
                    positionBonus = KNIGHT_PST[y][x];
                    break;
                case 'r':
                    positionBonus = ROOK_PST[y][x];
                    break;
                case 'c':
                    positionBonus = CANNON_PST[y][x];
                    break;
                case 'a':
                    // 士守在九宫中心较好
                    if ((x === 4 && (y === 1 || y === 8))) {
                        positionBonus = 10;
                    }
                    break;
                case 'b':
                    // 象守在中路较好
                    if (x === 2 || x === 6) {
                        positionBonus = 5;
                    }
                    break;
                case 'k':
                    // 将帅在中路
                    if (x === 4) {
                        positionBonus = 5;
                    }
                    break;
            }
            
            const totalValue = baseValue + positionBonus;
            score += isRed ? totalValue : -totalValue;
        }
    }
    
    return score;
}

/**
 * 静态搜索 (Quiescence Search)
 * 在搜索结束时继续搜索吃子走法，避免地平线效应
 * 
 * @param {Array} board - 棋盘
 * @param {number} alpha - alpha值
 * @param {number} beta - beta值
 * @param {boolean} isMaximizing - 是否是最大化方
 * @param {string} aiColor - AI的颜色（用于确定评估方向）
 * @returns {number} 评估分数（从AI视角）
 */
function quiescenceSearch(board, alpha, beta, isMaximizing, aiColor) {
    // 获取当前轮到谁走
    const turn = isMaximizing ? aiColor : (aiColor === 'r' ? 'b' : 'r');
    
    // 评估当前局面（从AI视角）
    let standPat = evaluateBoard(board);
    if (aiColor === 'b') standPat = -standPat; // 如果AI是黑方，取反评估
    
    if (isMaximizing) {
        // AI 在选择最大化分数
        if (standPat >= beta) {
            return beta;
        }
        if (standPat > alpha) {
            alpha = standPat;
        }
        
        // 只搜索吃子走法
        const captureMoves = getCaptureMoves(board, turn);
        
        for (const move of captureMoves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;
            
            const score = quiescenceSearch(newBoard, alpha, beta, false, aiColor);
            
            if (score >= beta) {
                return beta;
            }
            if (score > alpha) {
                alpha = score;
            }
        }
        
        return alpha;
    } else {
        // 对手在选择最小化分数
        if (standPat <= alpha) {
            return alpha;
        }
        if (standPat < beta) {
            beta = standPat;
        }
        
        // 只搜索吃子走法
        const captureMoves = getCaptureMoves(board, turn);
        
        for (const move of captureMoves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;
            
            const score = quiescenceSearch(newBoard, alpha, beta, true, aiColor);
            
            if (score <= alpha) {
                return alpha;
            }
            if (score < beta) {
                beta = score;
            }
        }
        
        return beta;
    }
}

/**
 * Minimax 搜索 + Alpha-Beta 剪枝 + 置换表 + 静态搜索
 */
function minimax(board, depth, alpha, beta, isMaximizing, aiColor, currentDepth = 0) {
    // 查询置换表
    const hashResult = probeHash(board, depth, alpha, beta);
    if (hashResult !== null) {
        return hashResult;
    }
    
    if (depth === 0) {
        // 直接评估，不使用静态搜索（简化，确保基本功能正确）
        let score = evaluateBoard(board);
        // 将评估转换为 AI 视角
        if (aiColor === 'b') score = -score;
        return { score: score };
    }

    const turn = isMaximizing ? aiColor : (aiColor === 'r' ? 'b' : 'r');
    const moves = getAllLegalMoves(board, turn, currentDepth);

    if (moves.length === 0) {
        // 无路可走 = 被将死
        return { score: isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth) };
    }

    let bestMove = null;
    let hashFlag = HASH_ALPHA;
    
    if (isMaximizing) {
        let maxScore = -Infinity;
        for (const move of moves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;

            const result = minimax(newBoard, depth - 1, alpha, beta, false, aiColor, currentDepth + 1);
            
            if (result.score > maxScore) {
                maxScore = result.score;
                bestMove = move;
            }
            if (maxScore > alpha) {
                alpha = maxScore;
                hashFlag = HASH_EXACT;
            }
            if (beta <= alpha) {
                // Beta 截断 - 记录杀手走法和历史表
                recordKillerMove(move, currentDepth);
                recordHistoryMove(move, depth);
                hashFlag = HASH_BETA;
                break;
            }
        }
        // 记录到置换表
        recordHash(board, depth, maxScore, hashFlag, bestMove);
        return { score: maxScore, move: bestMove };
    } else {
        let minScore = Infinity;
        for (const move of moves) {
            const newBoard = board.map(row => [...row]);
            newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
            newBoard[move.from.y][move.from.x] = null;

            const result = minimax(newBoard, depth - 1, alpha, beta, true, aiColor, currentDepth + 1);
            
            if (result.score < minScore) {
                minScore = result.score;
                bestMove = move;
            }
            if (minScore < beta) {
                beta = minScore;
                hashFlag = HASH_EXACT;
            }
            if (beta <= alpha) {
                // Alpha 截断 - 记录杀手走法和历史表
                recordKillerMove(move, currentDepth);
                recordHistoryMove(move, depth);
                hashFlag = HASH_ALPHA;
                break;
            }
        }
        // 记录到置换表
        recordHash(board, depth, minScore, hashFlag, bestMove);
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
 * @param {string} roomId - 房间ID（用于追踪历史走法，防止重复）
 * @returns {Object} { move, thinkTime }
 */
function calculateBestMove(board, aiColor, rating = 1200, moveCount = 0, roomId = null) {
    const strength = getStrengthByRating(rating);
    
    console.log(`[ChessAIEngine] Calculating move for ${aiColor}, rating=${rating}, depth=${strength.depth}, moveCount=${moveCount}, roomId=${roomId}`);
    
    // 清空置换表和启发表（每次新搜索开始时）
    clearTranspositionTable();
    clearHistoryTable();
    // 不清空杀手走法表，因为连续走法可能有相关性
    
    // 获取所有合法走法（提前获取，用于验证开局库走法）
    const allMoves = getAllLegalMoves(board, aiColor);
    
    if (allMoves.length === 0) {
        console.warn('[ChessAIEngine] No legal moves available!');
        return null;
    }
    
    // 尝试使用经典棋谱（前20步）
    try {
        const ClassicGames = require('./ClassicGames');
        if (moveCount < 20) {
            const classicMove = ClassicGames.findClassicMove(board, aiColor, moveCount, rating);
            if (classicMove) {
                // 验证经典棋谱走法是否在合法走法列表中
                const isValidClassic = allMoves.some(m => 
                    m.from.x === classicMove.from.x && 
                    m.from.y === classicMove.from.y &&
                    m.to.x === classicMove.to.x && 
                    m.to.y === classicMove.to.y
                );
                
                if (isValidClassic) {
                    console.log(`[ChessAIEngine] Using classic game move: (${classicMove.from.x},${classicMove.from.y}) -> (${classicMove.to.x},${classicMove.to.y})`);
                    const thinkTime = randomInRange(1000, 2500);
                    return {
                        move: classicMove,
                        thinkTime
                    };
                } else {
                    console.log(`[ChessAIEngine] Classic game move is invalid for current position`);
                }
            }
        }
    } catch (err) {
        console.log('[ChessAIEngine] Classic games error:', err.message);
    }
    
    // 尝试使用开局库（前8步）
    try {
        const OpeningBook = require('./OpeningBook');
        if (moveCount < 8) {
            const openingMove = OpeningBook.getOpeningMove(board, aiColor, moveCount, rating);
            if (openingMove) {
                // 验证开局库走法是否在合法走法列表中
                const isValidOpening = allMoves.some(m => 
                    m.from.x === openingMove.from.x && 
                    m.from.y === openingMove.from.y &&
                    m.to.x === openingMove.to.x && 
                    m.to.y === openingMove.to.y
                );
                
                if (isValidOpening) {
                    console.log(`[ChessAIEngine] Using opening book move: (${openingMove.from.x},${openingMove.from.y}) -> (${openingMove.to.x},${openingMove.to.y})`);
                    const thinkTime = randomInRange(800, 2000);
                    return {
                        move: openingMove,
                        thinkTime
                    };
                } else {
                    console.log(`[ChessAIEngine] Opening book move is invalid for current position, using search`);
                }
            }
        }
    } catch (err) {
        // 开局库不存在或出错，继续使用搜索
        console.log('[ChessAIEngine] Opening book error:', err.message);
    }
    
    if (allMoves.length === 1) {
        // 只有一个选择，直接返回
        const selectedMove = allMoves[0];
        if (roomId) recordMove(roomId, selectedMove);
        return {
            move: selectedMove,
            thinkTime: randomInRange(500, 1000)
        };
    }
    
    let selectedMove;
    
    // 正常计算：评估所有走法的分数
    const moveScores = [];
    for (const move of allMoves) {
        const newBoard = board.map(row => [...row]);
        newBoard[move.to.y][move.to.x] = newBoard[move.from.y][move.from.x];
        newBoard[move.from.y][move.from.x] = null;
        
        // 走完这步后，轮到对手走（isMaximizing=false）
        // minimax 返回的分数从 AI 角度评估，分数越高对 AI 越有利
        const result = minimax(newBoard, strength.depth - 1, -Infinity, Infinity, false, aiColor);
        let score = result.score; // 不需要取反，分数已经是从 AI 视角的评估
        
        // 吃子奖励：如果这步能吃子，给予额外奖励，确保 AI 不会错过明显的吃子机会
        // 但在开局阶段（前10步），要谨慎吃子，避免落入陷阱
        if (move.captured) {
            const captureValue = PIECE_VALUES[move.captured] || 0;
            const capturedType = move.captured.toLowerCase();
            
            // 开局阶段（前10步）的吃子策略
            if (moveCount < 10) {
                // 开局吃马/炮通常是陷阱，大幅降低奖励甚至惩罚
                if (capturedType === 'n' || capturedType === 'c') {
                    // 检查吃完后自己的棋子是否会被攻击
                    const pieceAfterCapture = newBoard[move.to.y][move.to.x];
                    const willBeAttacked = isPieceUnderThreat(newBoard, move.to.x, move.to.y);
                    const willBeProtected = isPieceProtected(newBoard, move.to.x, move.to.y);
                    
                    if (willBeAttacked && !willBeProtected) {
                        // 吃完会被反吃，这可能是陷阱，大幅惩罚
                        score -= captureValue * 0.5;
                        console.log(`[ChessAIEngine] Opening trap detected: capturing ${capturedType} would expose piece`);
                    } else if (willBeAttacked) {
                        // 吃完虽然被攻击但有保护，小幅惩罚（可能是换子）
                        score -= captureValue * 0.1;
                    } else {
                        // 吃完不会被攻击，正常小额奖励
                        score += captureValue * 0.1;
                    }
                } else if (capturedType === 'r') {
                    // 开局吃车通常是好事，但也要检查是否是陷阱
                    const willBeAttacked = isPieceUnderThreat(newBoard, move.to.x, move.to.y);
                    if (!willBeAttacked) {
                        score += captureValue * 0.2;
                    }
                } else {
                    // 吃兵/士/象，正常小额奖励
                    score += captureValue * 0.1;
                }
            } else {
                // 中局以后，正常奖励吃子走法，奖励值为被吃棋子价值的20%
                score += captureValue * 0.2;
            }
        }
        
        // 开局阶段优先发展子力
        if (moveCount < 10) {
            const pieceType = move.piece.toLowerCase();
            // 鼓励出动车、马、炮（从初始位置移动）
            if (pieceType === 'r' || pieceType === 'n' || pieceType === 'c') {
                // 检查是否是从初始位置出动
                const isRedPiece = ChineseChessRules.isRed(move.piece);
                const homeRow = isRedPiece ? 9 : 0;
                const secondRow = isRedPiece ? 7 : 2;
                
                if (move.from.y === homeRow || move.from.y === secondRow) {
                    // 从初始位置出动，给予小额奖励
                    score += 15;
                }
            }
        }
        
        // 重复走法惩罚：如果这步是来回跳，大幅扣分
        if (roomId && isRepeatedMove(roomId, move)) {
            console.log(`[ChessAIEngine] Penalizing repeated move: ${move.piece} (${move.from.x},${move.from.y}) -> (${move.to.x},${move.to.y})`);
            score -= 200; // 扣200分，相当于2个兵的价值
        }
        
        moveScores.push({ move, score });
    }
    
    // 按分数排序（高分在前）
    moveScores.sort((a, b) => b.score - a.score);
    
    const bestScore = moveScores[0].score;
    const worstScore = moveScores[moveScores.length - 1].score;
    
    // 是否犯错（随机走一步较差的棋）
    // 修复：从评估过的走法中选择，而不是未评估的走法
    // 限制 blunder 不会选择太差的走法（最多差 200 分，避免送掉大子）
    if (Math.random() < strength.blunderChance && moveScores.length > 1) {
        console.log('[ChessAIEngine] AI making a blunder...');
        // 从中间偏下的走法中选择（分数在中位数附近，但不选最差的）
        // 避免选择会丢失大子的走法（评分差距超过150分的走法可能涉及丢子）
        const blunderThreshold = Math.max(bestScore - 150, worstScore);
        const blunderCandidates = moveScores.filter(ms => 
            ms.score < bestScore - 20 && ms.score >= blunderThreshold
        );
        
        if (blunderCandidates.length > 0) {
            const randomIndex = Math.floor(Math.random() * blunderCandidates.length);
            selectedMove = blunderCandidates[randomIndex].move;
            console.log(`[ChessAIEngine] Blunder selected (score: ${blunderCandidates[randomIndex].score} vs best: ${bestScore})`);
        } else {
            // 没有合适的 blunder 走法，走最优
            selectedMove = moveScores[0].move;
            console.log('[ChessAIEngine] No suitable blunder, using best move');
        }
    } else {
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
    
    // 记录走法到历史
    if (roomId) {
        recordMove(roomId, selectedMove);
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
    clearMoveHistory,
    clearTranspositionTable,
    AI_STRENGTH_CONFIG,
    PIECE_VALUES
};
