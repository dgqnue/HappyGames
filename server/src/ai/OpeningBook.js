/**
 * 象棋开局库
 * 
 * 包含常见的开局走法，用于增加AI的多样性和棋路变化。
 * 根据AI的rating等级选择不同复杂度的开局。
 * 
 * 文件位置: server/src/ai/OpeningBook.js
 */

/**
 * 开局库数据结构
 * 
 * 棋盘坐标说明：
 * - x: 0-8 (左到右)
 * - y: 0-9 (上到下，黑方在上 y=0-4，红方在下 y=5-9)
 * 
 * 开局分类：
 * - 中炮开局（当头炮）：红方第一步炮二平五
 * - 仕角炮：红方第一步炮八平六
 * - 过宫炮：红方第一步炮二平六
 * - 飞相局：红方第一步相三进五
 * - 起马局：红方第一步马二进三
 */

// ============ 红方开局 (AI 执红) ============

const RED_OPENINGS = {
    // 中炮开局（最常见）
    zhongpao: {
        name: '中炮开局',
        difficulty: 'all',  // 适合所有难度
        weight: 30,         // 权重（选择概率）
        moves: [
            // 第1步：炮二平五（当头炮）
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },
        ],
        // 对方应对后的后续变化
        variations: {
            // 黑方屏风马（马8进7）
            'n_1_2': [
                { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },  // 马二进三
            ],
            // 黑方单提马（马2进3）
            'n_7_5': [
                { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },  // 马八进七
            ],
            // 黑方中炮对攻
            'default': [
                { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },  // 马二进三
            ]
        }
    },
    
    // 仕角炮开局
    shijiaoopao: {
        name: '仕角炮',
        difficulty: 'medium', // 中等以上难度使用
        weight: 15,
        moves: [
            // 第1步：炮八平六
            { from: { x: 1, y: 7 }, to: { x: 3, y: 7 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },  // 马二进三
            ]
        }
    },
    
    // 过宫炮开局
    guogongpao: {
        name: '过宫炮',
        difficulty: 'high',  // 高难度使用
        weight: 12,
        moves: [
            // 第1步：炮二平六
            { from: { x: 7, y: 7 }, to: { x: 3, y: 7 } },
        ],
        variations: {
            'default': [
                { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },  // 马八进七
            ]
        }
    },
    
    // 飞相局
    feixiang: {
        name: '飞相局',
        difficulty: 'medium',
        weight: 18,
        moves: [
            // 第1步：相三进五
            { from: { x: 6, y: 9 }, to: { x: 4, y: 7 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },  // 马二进三
            ]
        }
    },
    
    // 起马局
    qima: {
        name: '起马局',
        difficulty: 'low',  // 低难度也可使用
        weight: 15,
        moves: [
            // 第1步：马二进三
            { from: { x: 7, y: 9 }, to: { x: 6, y: 7 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 9 }, to: { x: 2, y: 7 } },  // 马八进七
            ]
        }
    },
    
    // 进兵局
    jinbing: {
        name: '仙人指路',
        difficulty: 'medium',
        weight: 10,
        moves: [
            // 第1步：兵七进一（仙人指路）
            { from: { x: 2, y: 6 }, to: { x: 2, y: 5 } },
        ],
        variations: {
            'default': [
                { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } },  // 炮二平五
            ]
        }
    }
};

// ============ 黑方开局 (AI 执黑) ============

const BLACK_OPENINGS = {
    // 屏风马（应对中炮）
    pingfengma: {
        name: '屏风马',
        difficulty: 'all',
        weight: 35,
        // 应对红方中炮的第一步
        triggerMoves: [
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } }  // 红方炮二平五
        ],
        moves: [
            // 马8进7
            { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
        ],
        variations: {
            'default': [
                { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },  // 马2进3
            ]
        }
    },
    
    // 反宫马
    fangongma: {
        name: '反宫马',
        difficulty: 'high',
        weight: 12,
        triggerMoves: [
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } }
        ],
        moves: [
            // 马2进3
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 2 }, to: { x: 4, y: 2 } },  // 炮8平5
            ]
        }
    },
    
    // 顺炮（中炮对中炮）
    shunpao: {
        name: '顺炮',
        difficulty: 'medium',
        weight: 18,
        triggerMoves: [
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } }
        ],
        moves: [
            // 炮8平5（顺炮）
            { from: { x: 1, y: 2 }, to: { x: 4, y: 2 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },  // 马8进7
            ]
        }
    },
    
    // 列炮（中炮对列炮）
    liepao: {
        name: '列炮',
        difficulty: 'high',
        weight: 10,
        triggerMoves: [
            { from: { x: 7, y: 7 }, to: { x: 4, y: 7 } }
        ],
        moves: [
            // 炮2平5（列炮）
            { from: { x: 7, y: 2 }, to: { x: 4, y: 2 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            ]
        }
    },
    
    // 单提马（应对起马局等）
    dantima: {
        name: '单提马',
        difficulty: 'low',
        weight: 25,
        triggerMoves: [],  // 通用应对
        moves: [
            // 马2进3
            { from: { x: 7, y: 0 }, to: { x: 6, y: 2 } },
        ],
        variations: {
            'default': [
                { from: { x: 1, y: 0 }, to: { x: 2, y: 2 } },
            ]
        }
    }
};

/**
 * 根据难度过滤可用的开局
 */
function filterOpeningsByDifficulty(openings, rating) {
    const result = [];
    
    for (const [key, opening] of Object.entries(openings)) {
        let canUse = false;
        
        switch (opening.difficulty) {
            case 'all':
                canUse = true;
                break;
            case 'low':
                canUse = rating < 1400;  // 低难度AI使用
                break;
            case 'medium':
                canUse = rating >= 1200; // 中等及以上使用
                break;
            case 'high':
                canUse = rating >= 1500; // 高难度使用
                break;
            default:
                canUse = true;
        }
        
        if (canUse) {
            result.push({ key, ...opening });
        }
    }
    
    return result;
}

/**
 * 根据权重随机选择一个开局
 */
function selectOpeningByWeight(openings) {
    if (openings.length === 0) return null;
    
    const totalWeight = openings.reduce((sum, o) => sum + (o.weight || 10), 0);
    let random = Math.random() * totalWeight;
    
    for (const opening of openings) {
        random -= (opening.weight || 10);
        if (random <= 0) {
            return opening;
        }
    }
    
    return openings[0];
}

/**
 * 检查棋盘是否匹配初始状态（用于判断回合数）
 */
function isInitialBoard(board) {
    // 简单检查：看红方帅是否在原位
    return board[9][4] === 'K' && board[0][4] === 'k';
}

/**
 * 生成棋盘的哈希键（用于开局库匹配）
 */
function getBoardHash(board) {
    return board.map(row => row.map(p => p || '.').join('')).join('/');
}

/**
 * 获取开局走法
 * 
 * @param {Array} board - 当前棋盘状态
 * @param {string} aiColor - AI执的颜色 ('r' 或 'b')
 * @param {number} moveCount - 当前回合数（0表示第一步）
 * @param {number} rating - AI的等级分
 * @returns {Object|null} 开局走法或null
 */
function getOpeningMove(board, aiColor, moveCount, rating) {
    // 只在前8步使用开局库
    if (moveCount >= 8) {
        return null;
    }
    
    const openings = aiColor === 'r' ? RED_OPENINGS : BLACK_OPENINGS;
    const availableOpenings = filterOpeningsByDifficulty(openings, rating);
    
    if (availableOpenings.length === 0) {
        return null;
    }
    
    // 第一步：随机选择一个开局
    if (moveCount === 0 && aiColor === 'r') {
        const selectedOpening = selectOpeningByWeight(availableOpenings);
        if (selectedOpening && selectedOpening.moves && selectedOpening.moves.length > 0) {
            console.log(`[OpeningBook] Selected opening: ${selectedOpening.name}`);
            return selectedOpening.moves[0];
        }
    }
    
    // 黑方第一步：根据红方走法选择应对
    if (moveCount === 0 && aiColor === 'b') {
        const selectedOpening = selectOpeningByWeight(availableOpenings);
        if (selectedOpening && selectedOpening.moves && selectedOpening.moves.length > 0) {
            console.log(`[OpeningBook] Selected opening: ${selectedOpening.name}`);
            return selectedOpening.moves[0];
        }
    }
    
    // 后续步骤：查找变化
    // 这里简化处理：随机返回一个变化走法
    if (moveCount > 0 && moveCount < 4) {
        const selectedOpening = selectOpeningByWeight(availableOpenings);
        if (selectedOpening && selectedOpening.variations && selectedOpening.variations.default) {
            const variationMoves = selectedOpening.variations.default;
            const moveIndex = Math.min(moveCount - 1, variationMoves.length - 1);
            if (moveIndex >= 0 && variationMoves[moveIndex]) {
                console.log(`[OpeningBook] Using variation from: ${selectedOpening.name}`);
                return variationMoves[moveIndex];
            }
        }
    }
    
    // 没有匹配的开局走法
    return null;
}

/**
 * 验证走法是否合法（简单检查）
 */
function isValidOpeningMove(board, move, aiColor) {
    const piece = board[move.from.y][move.from.x];
    if (!piece) return false;
    
    // 检查是否是自己的棋子
    const isRed = /^[A-Z]$/.test(piece);
    if ((aiColor === 'r' && !isRed) || (aiColor === 'b' && isRed)) {
        return false;
    }
    
    // 检查目标位置是否可走
    const target = board[move.to.y][move.to.x];
    if (target) {
        const targetIsRed = /^[A-Z]$/.test(target);
        if ((aiColor === 'r' && targetIsRed) || (aiColor === 'b' && !targetIsRed)) {
            return false;  // 不能吃自己的子
        }
    }
    
    return true;
}

module.exports = {
    getOpeningMove,
    RED_OPENINGS,
    BLACK_OPENINGS,
    filterOpeningsByDifficulty,
    selectOpeningByWeight
};
