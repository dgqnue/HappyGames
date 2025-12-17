// 文件：server/src/games/chinesechess/grade/Grade.js
const UserGameStats = require('../../../models/UserGameStats');

// 9个常规等级（不含特殊的"举世无双"）
const TITLES = [
    { rank: 1, name: '初出茅庐', percent: 22, minPercentile: 0.78, color: '#000000' },
    { rank: 2, name: '小试牛刀', percent: 19, minPercentile: 0.59, color: '#8f2d56' },
    { rank: 3, name: '渐入佳境', percent: 16, minPercentile: 0.43, color: '#00FF00' },
    { rank: 4, name: '锋芒毕露', percent: 13, minPercentile: 0.30, color: '#0000FF' },
    { rank: 5, name: '出类拔萃', percent: 10, minPercentile: 0.20, color: '#FF0000' },
    { rank: 6, name: '炉火纯青', percent: 8, minPercentile: 0.12, color: '#06bee1' },
    { rank: 7, name: '名满江湖', percent: 6, minPercentile: 0.06, color: '#ffba08' },
    { rank: 8, name: '傲视群雄', percent: 4, minPercentile: 0.02, color: '#7b2cbf' },
    { rank: 9, name: '登峰造极', percent: 2, minPercentile: 0.01, color: '#800080' }
];

// 特殊的第1名称号（不参与其他玩家的计算）
const SUPREME_TITLE = { rank: 10, name: '举世无双', percent: 0, minPercentile: 0.00, color: '#FF6200' };

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
            return SUPREME_TITLE;
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
     * 批量更新所有玩家的称号（定时任务，也在游戏结束后调用）
     * 关键点：根据数据库中所有玩家的最新 rating 重新计算排名和称号
     * 更新：排除未参与过游戏（gamesPlayed = 0）的玩家
     * @param {string} gameType 
     * @returns {object} 返回所有更新的玩家信息
     */
    async updateAllPlayerTitles(gameType) {
        console.log(`[GRADE] Starting title update for all players in ${gameType}...`);

        try {
            // 0. 先将所有 gamesPlayed = 0 的玩家称号重置为 "无"
            await UserGameStats.updateMany(
                { gameType, gamesPlayed: 0 },
                { 
                    $set: { 
                        title: '无', 
                        titleRank: 0, 
                        titleColor: '#999999' 
                    } 
                }
            );

            // 1. 获取所有参与过游戏的玩家，按 rating 降序排列（rating 最高 = rank 1）
            const allStats = await UserGameStats.find({ gameType, gamesPlayed: { $gt: 0 } }).sort({ rating: -1 });
            const totalPlayers = allStats.length;

            if (totalPlayers === 0) {
                console.log(`[GRADE] No active players found for ${gameType}`);
                return {};
            }

            console.log(`[GRADE] Total active players: ${totalPlayers}`);

            const results = {};

            // 2. 为每个玩家分配称号（按照数据库中的排名顺序）
            for (let i = 0; i < totalPlayers; i++) {
                const stats = allStats[i];
                const rank = i + 1; // 1-based ranking (1 = 最强)
                const titleConfig = this.getTitleByRank(rank, totalPlayers);
                
                // 更新称号信息
                stats.title = titleConfig.name;
                stats.titleRank = titleConfig.rank;
                stats.titleColor = titleConfig.color;
                
                await stats.save();
                
                results[stats.userId] = {
                    title: titleConfig.name,
                    titleRank: titleConfig.rank,
                    titleColor: titleConfig.color,
                    rank: rank,
                    rating: stats.rating
                };
                
                console.log(`[GRADE] ✓ Updated userId=${stats.userId}: rank=${rank}/${totalPlayers}, rating=${stats.rating}, title=${titleConfig.name}, color=${titleConfig.color}`);
            }

            console.log(`[GRADE] ✓ Title update complete for ${gameType}. Updated ${totalPlayers} active players.`);
            return results;
        } catch (err) {
            console.error(`[GRADE] ✗ Error updating titles for ${gameType}:`, err);
            throw err;
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
            console.log(`[GRADE] updatePlayerTitle: fetching stats for userId=${userId}, gameType=${gameType}`);
            
            // 确保获取最新的数据（在计算排名之前刷新）
            const stats = await UserGameStats.findOne({ userId, gameType }).lean(false);
            if (!stats) {
                console.warn(`[GRADE] Player stats not found for userId=${userId}, gameType=${gameType}`);
                return null;
            }

            // 如果玩家没有玩过游戏，直接返回无称号（虽然理论上 updatePlayerTitle 是在游戏后调用的）
            if (stats.gamesPlayed === 0) {
                console.log(`[GRADE] Player has 0 games played, setting title to None`);
                stats.title = '无';
                stats.titleRank = 0;
                stats.titleColor = '#999999';
                await stats.save();
                return { title: '无', titleRank: 0, titleColor: '#999999' };
            }

            console.log(`[GRADE] Found stats: rating=${stats.rating}, currentTitle=${stats.title}`);

            // 获取该玩家在该游戏中的排名
            // 注意：这里 stats.rating 已经是 ELO 更新后的新值
            // 排除 gamesPlayed = 0 的玩家
            const betterPlayers = await UserGameStats.countDocuments({
                gameType,
                rating: { $gt: stats.rating },
                gamesPlayed: { $gt: 0 }
            });
            const rank = betterPlayers + 1; // 1-based ranking

            // 获取总活跃玩家数
            const totalPlayers = await UserGameStats.countDocuments({ gameType, gamesPlayed: { $gt: 0 } });

            console.log(`[GRADE] updatePlayerTitle: rank=${rank}, totalActivePlayers=${totalPlayers}, currentRating=${stats.rating}`);

            // 根据排名获取称号
            const titleConfig = this.getTitleByRank(rank, totalPlayers);

            console.log(`[GRADE] Got titleConfig: ${titleConfig.name}, rank=${titleConfig.rank}`);

            // 更新玩家信息
            stats.title = titleConfig.name;
            stats.titleRank = titleConfig.rank;
            stats.titleColor = titleConfig.color;
            
            console.log(`[GRADE] Saving stats to DB: userId=${userId}, newTitle=${titleConfig.name}`);
            await stats.save();

            console.log(`[GRADE] ✓ Successfully updated title for userId=${userId}: rank=${rank}/${totalPlayers}, title=${titleConfig.name}, color=${titleConfig.color}`);

            return {
                title: titleConfig.name,
                titleRank: titleConfig.rank,
                titleColor: titleConfig.color
            };
        } catch (err) {
            console.error(`[GRADE] ✗ Error updating title for userId=${userId}:`, err);
            throw err;
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
        
        console.log(`[GRADE] updatePlayerTitles called with userIds:`, userIds, `gameType:`, gameType);
        
        for (const userId of userIds) {
            try {
                const titleInfo = await this.updatePlayerTitle(userId, gameType);
                if (titleInfo) {
                    results[userId] = titleInfo;
                    console.log(`[GRADE] updatePlayerTitles: userId=${userId} updated successfully`);
                } else {
                    console.warn(`[GRADE] updatePlayerTitles: userId=${userId} returned null`);
                }
            } catch (err) {
                console.error(`[GRADE] updatePlayerTitles: error updating userId=${userId}:`, err);
            }
        }

        console.log(`[GRADE] updatePlayerTitles completed. Results:`, results);
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
