/**
 * 掉线统计服务
 * 
 * 自动记录和更新玩家的掉线次数
 */

const UserGameStats = require('../models/UserGameStats');

class DisconnectTracker {
    /**
     * 记录玩家掉线
     * 
     * @param {String} userId - 用户ID
     * @param {String} gameType - 游戏类型
     * @param {Boolean} wasInGame - 是否在游戏进行中掉线
     */
    static async recordDisconnect(userId, gameType, wasInGame = false) {
        try {
            // 只有在游戏进行中掉线才计入掉线率
            if (!wasInGame) {
                console.log(`[DisconnectTracker] Player ${userId} disconnected but not in game, not counting`);
                return;
            }

            // 查找或创建用户统计
            let stats = await UserGameStats.findOne({ userId, gameType });

            if (!stats) {
                stats = new UserGameStats({
                    userId,
                    gameType,
                    disconnects: 1
                });
            } else {
                stats.disconnects += 1;
            }

            await stats.save();

            const disconnectRate = stats.gamesPlayed > 0
                ? (stats.disconnects / stats.gamesPlayed) * 100
                : 0;

            console.log(`[DisconnectTracker] Recorded disconnect for user ${userId} in ${gameType}`);
            console.log(`[DisconnectTracker] Total disconnects: ${stats.disconnects}, Games played: ${stats.gamesPlayed}, Rate: ${disconnectRate.toFixed(1)}%`);

            return {
                disconnects: stats.disconnects,
                gamesPlayed: stats.gamesPlayed,
                disconnectRate: disconnectRate
            };
        } catch (error) {
            console.error('[DisconnectTracker] Error recording disconnect:', error);
            throw error;
        }
    }

    /**
     * 获取玩家的掉线率
     * 
     * @param {String} userId - 用户ID
     * @param {String} gameType - 游戏类型
     * @returns {Number} 掉线率（百分比）
     */
    static async getDisconnectRate(userId, gameType) {
        try {
            const stats = await UserGameStats.findOne({ userId, gameType });

            if (!stats || stats.gamesPlayed === 0) {
                return 0;
            }

            return (stats.disconnects / stats.gamesPlayed) * 100;
        } catch (error) {
            console.error('[DisconnectTracker] Error getting disconnect rate:', error);
            return 0;
        }
    }

    /**
     * 重置玩家的掉线记录（管理员功能）
     * 
     * @param {String} userId - 用户ID
     * @param {String} gameType - 游戏类型
     */
    static async resetDisconnects(userId, gameType) {
        try {
            const stats = await UserGameStats.findOne({ userId, gameType });

            if (stats) {
                stats.disconnects = 0;
                await stats.save();
                console.log(`[DisconnectTracker] Reset disconnects for user ${userId} in ${gameType}`);
            }
        } catch (error) {
            console.error('[DisconnectTracker] Error resetting disconnects:', error);
            throw error;
        }
    }

    /**
     * 获取玩家的完整统计信息（包括掉线率）
     * 
     * @param {String} userId - 用户ID
     * @param {String} gameType - 游戏类型
     */
    static async getPlayerStats(userId, gameType) {
        try {
            const stats = await UserGameStats.findOne({ userId, gameType });

            if (!stats) {
                return {
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    disconnects: 0,
                    rating: 1200,
                    winRate: 0,
                    disconnectRate: 0
                };
            }

            const winRate = stats.gamesPlayed > 0
                ? (stats.wins / stats.gamesPlayed) * 100
                : 0;

            const disconnectRate = stats.gamesPlayed > 0
                ? (stats.disconnects / stats.gamesPlayed) * 100
                : 0;

            return {
                gamesPlayed: stats.gamesPlayed,
                wins: stats.wins,
                losses: stats.losses,
                draws: stats.draws,
                disconnects: stats.disconnects,
                rating: stats.rating,
                title: stats.title,
                titleColor: stats.titleColor,
                winRate: Math.round(winRate * 10) / 10,
                disconnectRate: Math.round(disconnectRate * 10) / 10
            };
        } catch (error) {
            console.error('[DisconnectTracker] Error getting player stats:', error);
            throw error;
        }
    }
}

module.exports = DisconnectTracker;
