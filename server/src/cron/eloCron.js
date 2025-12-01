// 文件：server/src/cron/eloCron.js
const cron = require('node-cron');
const EloService = require('../gamecore/EloService');
const TitleService = require('../gamecore/TitleService');

// Define supported game types
const GAME_TYPES = ['chinesechess', 'gomoku', 'poker'];

const initCronJobs = () => {
    console.log('[CRON] Initializing ELO Cron Jobs...');

    // 1. Calculate Mu Dynamic (Daily 11:00 UTC)
    // "世界时每日上午11：00分按当前系统数据计算"
    cron.schedule('0 11 * * *', async () => {
        console.log('[CRON] Starting Mu Dynamic Calculation...');
        for (const gameType of GAME_TYPES) {
            await EloService.updateMuDynamic(gameType);
        }
    });

    // 2. Apply Mu Dynamic (Daily 12:00 UTC)
    // "上午12:00生效"
    cron.schedule('0 12 * * *', async () => {
        console.log('[CRON] Applying Pending Mu Dynamic...');
        for (const gameType of GAME_TYPES) {
            await EloService.applyPendingMu(gameType);
        }
    });

    // 3. Time Decay (Daily 10:00 UTC)
    // "世界时每日上午10:00自动查询...若上次对局时间...超过7天，则扣除"
    cron.schedule('0 10 * * *', async () => {
        console.log('[CRON] Starting Time Decay Check...');
        await EloService.applyTimeDecay();
    });

    // 4. Title Update (Daily 9:00 UTC)
    // "世界时每日上午9:00后端系统自动统计...按百分比确定玩家段位"
    cron.schedule('0 9 * * *', async () => {
        console.log('[CRON] Starting Title Update...');
        for (const gameType of GAME_TYPES) {
            await TitleService.updateTitles(gameType);
        }
    });

    console.log('[CRON] ELO Jobs Scheduled.');
};

module.exports = initCronJobs;
