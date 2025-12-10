// 文件：server/src/games/chinesechess/grade/Grade.js
const UserGameStats = require('../../../models/UserGameStats');

const TITLES = [
    { rank: 1, name: '初出茅庐', percent: 22, color: '#000000' },
    { rank: 2, name: '小试牛刀', percent: 19, color: '#8f2d56' },
    { rank: 3, name: '渐入佳境', percent: 16, color: '#00FF00' },
    { rank: 4, name: '锋芒毕露', percent: 13, color: '#0000FF' },
    { rank: 5, name: '出类拔萃', percent: 10, color: '#FF0000' },
    { rank: 6, name: '炉火纯青', percent: 8, color: '#00FFFF' },
    { rank: 7, name: '名满江湖', percent: 6, color: '#ffee32' },
    { rank: 8, name: '傲视群雄', percent: 4, color: '#800080' },
    { rank: 9, name: '登峰造极', percent: 2, color: '#ffba08' },
    { rank: 10, name: '举世无双', percent: 0, count: 1, color: '#FF6200' } // Special case
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
     * @param {number} rank 玩家的排名（1 based）
     * @param {number} totalPlayers 总玩家数
     * @returns {object} { rank, name, color, percent }
     */
    getTitleByRank(rank, totalPlayers) {
        // 排名百分比 = (排名 - 1) / 总人数
        const percentile = (rank - 1) / totalPlayers;
        
        // 特殊情况：排名第1（百分比最高）→ 举世无双
        if (rank === 1) {
            return TITLES[9]; // 举世无双
        }

        // 从高到低遍历称号配置（百分比从小到大排列）
        for (let i = 8; i >= 0; i--) {
            const titleConfig = TITLES[i];
            const thresholdPercent = titleConfig.percent / 100;
            
            if (percentile < thresholdPercent) {
                return titleConfig;
            }
        }

        // 默认返回最低等级
        return TITLES[0]; // 初出茅庐
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
