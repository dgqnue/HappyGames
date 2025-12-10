// 文件：server/src/games/chinesechess/grade/Grade.js
const UserGameStats = require('../../../models/UserGameStats');

const TITLES = [
    { rank: 1, name: '初出茅庐', percent: 22, minPercentile: 0.78, color: '#000000' },
    { rank: 2, name: '小试牛刀', percent: 19, minPercentile: 0.59, color: '#8f2d56' },
    { rank: 3, name: '渐入佳境', percent: 16, minPercentile: 0.43, color: '#00FF00' },
    { rank: 4, name: '锋芒毕露', percent: 13, minPercentile: 0.30, color: '#0000FF' },
    { rank: 5, name: '出类拔萃', percent: 10, minPercentile: 0.20, color: '#FF0000' },
    { rank: 6, name: '炉火纯青', percent: 8, minPercentile: 0.12, color: '#00FFFF' },
    { rank: 7, name: '名满江湖', percent: 6, minPercentile: 0.06, color: '#ffee32' },
    { rank: 8, name: '傲视群雄', percent: 4, minPercentile: 0.02, color: '#800080' },
    { rank: 9, name: '登峰造极', percent: 2, minPercentile: 0.01, color: '#ffba08' },
    { rank: 10, name: '举世无双', percent: 0, minPercentile: 0.00, color: '#FF6200' } // top 1
];

class Grade {
    /**
     * 根据等级分获取对应的称号配置
     * @param {number} rating 
     * @returns {object} { rank, name, color }
     */
    getTitleByRating(rating, rank, totalPlayers) {
        return this.getTitleByRank(rank, totalPlayers);
    }

    /**
     * 根据排名获取称号配置
     * 核心逻辑：
     * 1. 第1名玩家：直接授予 "举世无双"，不参与百分比计算
     * 2. 剩余 N-1 个玩家：按照等级百分比分配 "初出茅庐" 到 "登峰造极" 的9个等级
     * 
     * 例如：2个玩家
     * - rank=1 → 举世无双（特殊）
     * - rank=2 → 在剩余1个玩家中，按百分比分配，得到相应等级
     * 
     * 例如：100个玩家
     * - rank=1 → 举世无双（特殊）
     * - rank=2-99 → 在剩余99个玩家中按百分比分配 9 个等级
     * 
     * @param {number} rank 玩家的排名（1 based，1=最强）
     * @param {number} totalPlayers 总玩家数
     * @returns {object} { rank, name, color, percent }
     */
    getTitleByRank(rank, totalPlayers) {
        console.log(`[GRADE] getTitleByRank: rank=${rank}, total=${totalPlayers}`);
        
        // 第1名玩家：直接返回 "举世无双"
        if (rank === 1) {
            console.log(`  ✓ matched 举世无双 (rank 1)`);
            return TITLES[9];
        }
        
        // 剩余玩家的相对排名（在剩余 N-1 个玩家中的排名）
        const remainingRank = rank - 1;  // 在剩余玩家中的排名（1-based）
        const remainingPlayers = totalPlayers - 1;  // 剩余玩家数
        
        // 定义 9 个等级（不含 "举世无双"）的百分比分配
        const titlePercentages = [
            { titleIndex: 8, percent: 2, name: '登峰造极' },       // top 2%
            { titleIndex: 7, percent: 4, name: '傲视群雄' },       // top 4%
            { titleIndex: 6, percent: 6, name: '名满江湖' },       // top 6%
            { titleIndex: 5, percent: 8, name: '炉火纯青' },       // top 8%
            { titleIndex: 4, percent: 10, name: '出类拔萃' },      // top 10%
            { titleIndex: 3, percent: 13, name: '锋芒毕露' },      // top 13%
            { titleIndex: 2, percent: 16, name: '渐入佳境' },      // top 16%
            { titleIndex: 1, percent: 19, name: '小试牛刀' },      // top 19%
            { titleIndex: 0, percent: 22, name: '初出茅庐' }       // 剩余所有人
        ];
        
        // 从高等级到低等级遍历，找到该玩家对应的等级
        let currentRankThreshold = 1;  // 从第1名（相对）开始
        
        for (let i = 0; i < titlePercentages.length; i++) {
            const titleInfo = titlePercentages[i];
            
            // 计算该等级包含的玩家数（至少1人）
            const playerCount = Math.max(1, Math.ceil(remainingPlayers * (titleInfo.percent / 100)));
            
            // 该等级的名次范围：[currentRankThreshold, currentRankThreshold + playerCount - 1]
            const maxRankForThisTitle = currentRankThreshold + playerCount - 1;
            
            console.log(`  checking ${titleInfo.name}: remaining rank in [${currentRankThreshold}, ${maxRankForThisTitle}]? count=${playerCount}`);
            
            if (remainingRank >= currentRankThreshold && remainingRank <= maxRankForThisTitle) {
                console.log(`  ✓ matched ${titleInfo.name}`);
                return TITLES[titleInfo.titleIndex];
            }
            
            currentRankThreshold += playerCount;
        }
        
        // 理论上不会到达这里，但以防万一返回最低等级
        console.log(`  ✓ default to 初出茅庐`);
        return TITLES[0];
    }

    /**
     * 批量更新所有玩家的称号（定时任务，每天执行一次）
     * @param {string} gameType 
     */
    async updateAllPlayerTitles(gameType) {
        console.log(`[GRADE] Starting title update for ${gameType}...`);

        try {
            // 1. 获取所有玩家，按等级分降序排列
            const allStats = await UserGameStats.find({ gameType }).sort({ rating: -1 });
            const totalPlayers = allStats.length;

            if (totalPlayers === 0) {
                console.log(`[GRADE] No players found for ${gameType}`);
                return;
            }

            console.log(`[GRADE] Total players: ${totalPlayers}`);

            // 2. 为每个玩家分配称号
            for (let i = 0; i < totalPlayers; i++) {
                const stats = allStats[i];
                const rank = i + 1; // 1-based ranking
                const titleConfig = this.getTitleByRank(rank, totalPlayers);
                
                // 更新称号信息
                stats.title = titleConfig.name;
                stats.titleRank = titleConfig.rank;
                stats.titleColor = titleConfig.color;
                
                await stats.save();
                
                console.log(`[GRADE] Updated ${stats.userId}: rank=${rank}, title=${titleConfig.name}, color=${titleConfig.color}`);
            }

            console.log(`[GRADE] Title update complete for ${gameType}. Updated ${totalPlayers} players.`);
        } catch (err) {
            console.error(`[GRADE] Error updating titles for ${gameType}:`, err);
        }
    }

    /**
     * 更新指定玩家的称号（游戏结束后立即调用）
     * @param {string} userId 玩家ID
     * @param {string} gameType 游戏类型
     * @returns {object} { title, titleRank, titleColor }
     */
    async updatePlayerTitle(userId, gameType) {
        try {
            const stats = await UserGameStats.findOne({ userId, gameType });
            if (!stats) {
                console.warn(`[GRADE] Player stats not found for userId=${userId}, gameType=${gameType}`);
                return null;
            }

            // 获取该玩家在该游戏中的排名
            const betterPlayers = await UserGameStats.countDocuments({
                gameType,
                rating: { $gt: stats.rating }
            });
            const rank = betterPlayers + 1; // 1-based ranking

            // 获取总玩家数
            const totalPlayers = await UserGameStats.countDocuments({ gameType });

            // 根据排名获取称号
            const titleConfig = this.getTitleByRank(rank, totalPlayers);

            // 更新玩家信息
            stats.title = titleConfig.name;
            stats.titleRank = titleConfig.rank;
            stats.titleColor = titleConfig.color;
            await stats.save();

            console.log(`[GRADE] Updated title for userId=${userId}: rank=${rank}/${totalPlayers}, title=${titleConfig.name}, color=${titleConfig.color}`);

            return {
                title: titleConfig.name,
                titleRank: titleConfig.rank,
                titleColor: titleConfig.color
            };
        } catch (err) {
            console.error(`[GRADE] Error updating title for userId=${userId}:`, err);
            return null;
        }
    }

    /**
     * 更新多个玩家的称号（游戏结束后）
     * @param {array} userIds 玩家ID数组
     * @param {string} gameType 游戏类型
     * @returns {object} { userId: { title, titleRank, titleColor } }
     */
    async updatePlayerTitles(userIds, gameType) {
        const results = {};
        
        for (const userId of userIds) {
            const titleInfo = await this.updatePlayerTitle(userId, gameType);
            if (titleInfo) {
                results[userId] = titleInfo;
            }
        }

        return results;
    }

    /**
     * 获取玩家的当前称号信息
     * @param {string} userId 
     * @param {string} gameType 
     * @returns {object}
     */
    async getPlayerTitleInfo(userId, gameType) {
        const stats = await UserGameStats.findOne({ userId, gameType });
        if (!stats) {
            return null;
        }

        return {
            title: stats.title,
            titleRank: stats.titleRank,
            titleColor: stats.titleColor,
            rating: stats.rating
        };
    }
}

module.exports = new Grade();
