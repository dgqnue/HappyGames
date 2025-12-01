// 文件：server/src/gamecore/TitleService.js
const UserGameStats = require('../models/UserGameStats');

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

class TitleService {
    async updateTitles(gameType) {
        console.log(`[TITLE] Starting title update for ${gameType}...`);

        // 1. Fetch all stats sorted by rating (desc)
        const allStats = await UserGameStats.find({ gameType }).sort({ rating: -1 });
        const totalPlayers = allStats.length;

        if (totalPlayers === 0) return;

        console.log(`[TITLE] Total players: ${totalPlayers}`);

        // 2. Assign Titles
        let currentIndex = 0;

        // Rank 10: Top 1 (Absolute Unique)
        if (totalPlayers > 0) {
            const topPlayer = allStats[0];
            await this.assignTitle(topPlayer, TITLES[9]);
            currentIndex = 1;
        }

        // Calculate remaining counts based on percentages
        // We use the remaining players (total - 1) as the base? 
        // The prompt says "Percent of total players". 
        // Let's stick to total players for percentage calculation to be simple, 
        // but ensure we don't overlap the #1.

        // Iterate from Rank 9 down to Rank 1
        for (let i = 8; i >= 0; i--) {
            const titleConfig = TITLES[i];
            const count = Math.round(totalPlayers * (titleConfig.percent / 100));

            // Assign to next batch of players
            // Ensure we don't go out of bounds
            const end = Math.min(currentIndex + count, totalPlayers);

            for (let j = currentIndex; j < end; j++) {
                await this.assignTitle(allStats[j], titleConfig);
            }

            currentIndex = end;
        }

        // Assign Rank 1 to anyone remaining (rounding errors)
        for (let j = currentIndex; j < totalPlayers; j++) {
            await this.assignTitle(allStats[j], TITLES[0]);
        }

        console.log(`[TITLE] Title update complete for ${gameType}.`);
    }

    async assignTitle(stats, titleConfig) {
        // Only update if changed to minimize DB writes? 
        // For now, just update.
        stats.title = titleConfig.name;
        stats.titleRank = titleConfig.rank;
        await stats.save();
    }
}

module.exports = new TitleService();
