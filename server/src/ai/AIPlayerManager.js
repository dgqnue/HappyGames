/**
 * AI 玩家管理器
 * 
 * 负责：
 * 1. 管理 AI 玩家池（可用/忙碌状态）
 * 2. 按分数匹配合适的 AI 对手
 * 3. 控制 AI 玩家的游戏行为
 * 4. 自动检测并生成 AI 玩家
 * 
 * 文件位置: server/src/ai/AIPlayerManager.js
 */

const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');
const ChessAIEngine = require('./ChessAIEngine');
const { ensureAIPlayers } = require('./generateAIPlayers');
const AIMatchConfig = require('./AIMatchConfig');

// 目标 AI 玩家数量
const TARGET_AI_PLAYER_COUNT = 200;

// 所有强度等级（100分一档，共13级）
const ALL_STRENGTH_LEVELS = [
    'rating_800', 'rating_900', 'rating_1000', 'rating_1100',
    'rating_1200', 'rating_1300', 'rating_1400', 'rating_1500',
    'rating_1600', 'rating_1700', 'rating_1800', 'rating_1900',
    'rating_2000'
];

class AIPlayerManager {
    constructor() {
        // AI 玩家池（按分数段分类，100分一档）
        this.aiPlayerPool = {};
        ALL_STRENGTH_LEVELS.forEach(level => {
            this.aiPlayerPool[level] = [];
        });
        
        // 当前正在游戏中的 AI（userId -> gameInfo）
        this.busyAIPlayers = new Map();
        
        // AI 匹配等待计时器（tableId -> timerId）
        this.matchTimers = new Map();
        
        // 是否已初始化
        this.initialized = false;
    }
    
    /**
     * 初始化 AI 玩家池（服务器启动时调用）
     */
    async initialize() {
        if (this.initialized) return;
        
        console.log('[AIPlayerManager] Initializing AI player pool...');
        
        try {
            // 检查并自动生成 AI 玩家（如果数量不足）
            const existingCount = await User.countDocuments({ isAI: true });
            if (existingCount < TARGET_AI_PLAYER_COUNT) {
                console.log(`[AIPlayerManager] AI players insufficient (${existingCount}/${TARGET_AI_PLAYER_COUNT}), auto-generating...`);
                await ensureAIPlayers(TARGET_AI_PLAYER_COUNT, false);
            }
            
            // 从数据库加载所有 AI 玩家
            const aiUsers = await User.find({ isAI: true, accountStatus: 'active' }).lean();
            
            if (aiUsers.length === 0) {
                console.error('[AIPlayerManager] Failed to load AI players after generation!');
                return;
            }
            
            // 获取所有 AI 玩家的游戏统计（使用 User._id 查询）
            const aiUserObjectIds = aiUsers.map(u => u._id);
            const statsMap = new Map();
            
            const allStats = await UserGameStats.find({ 
                userId: { $in: aiUserObjectIds },
                gameType: 'chinesechess'
            }).lean();
            
            // 使用 ObjectId 字符串作为 key
            allStats.forEach(s => statsMap.set(s.userId.toString(), s));
            
            // 按分数段分类（根据 rating 动态计算 strengthLevel，不使用数据库中的旧值）
            for (const user of aiUsers) {
                const stats = statsMap.get(user._id.toString());
                const rating = stats?.rating || 1200;
                // 始终根据 rating 计算 strengthLevel，确保匹配新的分段格式
                const strengthLevel = this.getStrengthByRating(rating);
                
                const odid = user._id.toString();
                const aiPlayer = {
                    id: user._id,                           // ObjectId
                    odid: odid,                              // 使用 ObjectId 字符串，与真实玩家一致
                    userId: odid,                           // 也保存为 userId
                    originalUserId: user.userId,            // 保留原始的 userId 字符串（如 ai_player_0001）
                    nickname: user.nickname,
                    avatar: user.avatar,
                    rating: rating,
                    title: stats?.title || '无',
                    titleColor: stats?.titleColor || '#666666',
                    strengthLevel: strengthLevel
                };
                
                if (this.aiPlayerPool[strengthLevel]) {
                    this.aiPlayerPool[strengthLevel].push(aiPlayer);
                }
            }
            
            // 打印统计
            const totalCount = Object.values(this.aiPlayerPool).reduce((sum, arr) => sum + arr.length, 0);
            console.log(`[AIPlayerManager] Loaded ${totalCount} AI players:`);
            for (const [level, players] of Object.entries(this.aiPlayerPool)) {
                console.log(`  - ${level}: ${players.length} players`);
            }
            
            this.initialized = true;
            
        } catch (err) {
            console.error('[AIPlayerManager] Failed to initialize:', err);
        }
    }
    
    /**
     * 根据 rating 获取强度等级 (100分一档)
     */
    getStrengthByRating(rating) {
        return ChessAIEngine.getStrengthLevelByRating(rating);
    }
    
    /**
     * 获取一个合适的 AI 对手
     * @param {number} playerRating - 人类玩家的等级分
     * @param {number} ratingTolerance - 分数容差（默认 200）
     * @returns {Object|null} AI 玩家信息
     */
    getAvailableAI(playerRating, ratingTolerance = 200) {
        if (!this.initialized) {
            console.warn('[AIPlayerManager] Not initialized yet!');
            return null;
        }
        
        // 确定搜索的分数段
        const targetStrength = this.getStrengthByRating(playerRating);
        const searchOrder = this.getSearchOrder(targetStrength);
        
        // 按优先级搜索各分数段
        for (const strength of searchOrder) {
            const pool = this.aiPlayerPool[strength];
            if (!pool || pool.length === 0) continue;
            
            // 过滤掉正在忙碌的 AI
            const availablePlayers = pool.filter(ai => !this.busyAIPlayers.has(ai.odid));
            
            if (availablePlayers.length === 0) continue;
            
            // 在可用玩家中找分数最接近的
            const suitable = availablePlayers.filter(ai => 
                Math.abs(ai.rating - playerRating) <= ratingTolerance
            );
            
            if (suitable.length > 0) {
                // 随机选一个（避免总是匹配同一个 AI）
                const selected = suitable[Math.floor(Math.random() * suitable.length)];
                console.log(`[AIPlayerManager] Selected AI: ${selected.nickname} (rating: ${selected.rating})`);
                return selected;
            }
            
            // 如果没有在容差范围内的，扩大搜索
            if (availablePlayers.length > 0) {
                const selected = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
                console.log(`[AIPlayerManager] Selected AI (fallback): ${selected.nickname} (rating: ${selected.rating})`);
                return selected;
            }
        }
        
        console.warn('[AIPlayerManager] No available AI player found!');
        return null;
    }
    
    /**
     * 获取分数段搜索顺序（优先匹配接近的段位）
     */
    getSearchOrder(targetStrength) {
        const targetIndex = ALL_STRENGTH_LEVELS.indexOf(targetStrength);
        
        // 从目标段位开始，交替向上下搜索
        const order = [targetStrength];
        for (let i = 1; i < ALL_STRENGTH_LEVELS.length; i++) {
            if (targetIndex - i >= 0) order.push(ALL_STRENGTH_LEVELS[targetIndex - i]);
            if (targetIndex + i < ALL_STRENGTH_LEVELS.length) order.push(ALL_STRENGTH_LEVELS[targetIndex + i]);
        }
        return order;
    }
    
    /**
     * 标记 AI 玩家为忙碌状态
     */
    markAsBusy(aiUserId, tableId) {
        this.busyAIPlayers.set(aiUserId, {
            tableId,
            startTime: Date.now()
        });
        console.log(`[AIPlayerManager] AI ${aiUserId} marked as busy (table: ${tableId})`);
    }
    
    /**
     * 释放 AI 玩家
     */
    releaseAI(aiUserId) {
        if (this.busyAIPlayers.has(aiUserId)) {
            this.busyAIPlayers.delete(aiUserId);
            console.log(`[AIPlayerManager] AI ${aiUserId} released`);
        }
    }
    
    /**
     * 开始 AI 匹配计时器（配置的延迟后触发）
     * @param {string} tableId - 游戏桌 ID
     * @param {number} playerRating - 人类玩家等级分
     * @param {Function} onTimeout - 超时回调（传入选中的 AI 玩家）
     * @param {string} gameType - 游戏类型（用于获取配置）
     */
    startMatchTimer(tableId, playerRating, onTimeout, gameType = 'chinesechess') {
        // 如果已有计时器，先清除
        this.cancelMatchTimer(tableId);
        
        // 从配置获取延迟时间，加上随机浮动 (0-3秒)
        const baseDelay = AIMatchConfig.getTableMatchDelay(gameType);
        const delay = baseDelay + Math.floor(Math.random() * 3000);
        
        console.log(`[AIPlayerManager] Starting match timer for table ${tableId}, delay: ${delay}ms (base: ${baseDelay}ms)`);
        
        const timerId = setTimeout(() => {
            console.log(`[AIPlayerManager] Match timer triggered for table ${tableId}`);
            this.matchTimers.delete(tableId);
            
            // 获取合适的 AI（使用配置的分数容差）
            const ratingTolerance = AIMatchConfig.getRatingTolerance(gameType);
            const aiPlayer = this.getAvailableAI(playerRating, ratingTolerance);
            if (aiPlayer) {
                onTimeout(aiPlayer);
            } else {
                console.warn(`[AIPlayerManager] No AI available for table ${tableId}`);
            }
        }, delay);
        
        this.matchTimers.set(tableId, timerId);
    }
    
    /**
     * 取消匹配计时器（真人加入时调用）
     */
    cancelMatchTimer(tableId) {
        if (this.matchTimers.has(tableId)) {
            clearTimeout(this.matchTimers.get(tableId));
            this.matchTimers.delete(tableId);
            console.log(`[AIPlayerManager] Match timer cancelled for table ${tableId}`);
        }
    }
    
    /**
     * 计算 AI 的下一步棋
     * @param {Array} board - 当前棋盘
     * @param {string} aiColor - AI 执的颜色
     * @param {string} aiUserId - AI 玩家 ID (ObjectId 字符串)
     * @param {number} moveCount - 当前回合数（用于开局库判断）
     * @returns {Promise<Object>} { move, thinkTime }
     */
    async calculateMove(board, aiColor, aiUserId, moveCount = 0) {
        const mongoose = require('mongoose');
        
        // 获取 AI 的 rating（使用 ObjectId 查询）
        let aiObjectId;
        try {
            aiObjectId = new mongoose.Types.ObjectId(aiUserId);
        } catch (e) {
            console.warn(`[AIPlayerManager] Invalid ObjectId: ${aiUserId}`);
            aiObjectId = aiUserId;
        }
        
        const stats = await UserGameStats.findOne({
            userId: aiObjectId,
            gameType: 'chinesechess'
        }).lean();
        
        const rating = stats?.rating || 1200;
        
        // 调用 AI 引擎计算（传入 moveCount）
        return ChessAIEngine.calculateBestMove(board, aiColor, rating, moveCount);
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        const poolStats = {};
        for (const [level, players] of Object.entries(this.aiPlayerPool)) {
            poolStats[level] = players.length;
        }
        
        return {
            initialized: this.initialized,
            totalAI: Object.values(this.aiPlayerPool).reduce((sum, arr) => sum + arr.length, 0),
            busyAI: this.busyAIPlayers.size,
            pendingMatches: this.matchTimers.size,
            poolStats
        };
    }
}

// 单例模式
module.exports = new AIPlayerManager();
