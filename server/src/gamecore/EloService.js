// 文件：server/src/gamecore/EloService.js
const UserGameStats = require('../models/UserGameStats');
const GameMeta = require('../models/GameMeta');

class EloService {
    constructor() {
        this.K_MAX = 40;
        this.K_MIN = 4;
        this.DECAY_THRESHOLD = 1600;
        this.DECAY_RATE = 0.01;
        this.INACTIVE_DAYS = 7;
    }

    /**
     * Calculate Dynamic K Value
     * K_Final = 4 + 36 * f_rating * f_games
     */
    calculateK(rating, gamesPlayed, muDynamic) {
        // 1. Games Factor: f_games = 1 / (1 + Games/50)
        const f_games = 1 / (1 + gamesPlayed / 50);

        // 2. Rating Factor
        let f_rating = 1;
        if (rating >= muDynamic) {
            f_rating = 1 / (1 + (rating - muDynamic) / 1000);
        }

        // 3. Final K
        const k_final = 4 + 36 * f_rating * f_games;
        return k_final; // Float, will be used in delta calc
    }

    /**
     * Calculate Expected Score
     * E_A = 1 / (1 + 10^((R_B - R_A) / 400))
     */
    calculateExpected(ratingA, ratingB) {
        return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }

    /**
     * Calculate Rating Delta
     * Delta = Round(K * (Actual - Expected))
     */
    calculateDelta(k, actualScore, expectedScore) {
        return Math.round(k * (actualScore - expectedScore));
    }

    /**
     * Process Match Result
     * @param {string} gameType 
     * @param {string} playerAId 
     * @param {string} playerBId 
     * @param {number} resultA 1 (Win), 0.5 (Draw), 0 (Loss)
     */
    async processMatchResult(gameType, playerAId, playerBId, resultA) {
        console.log(`[EloService] processMatchResult called: gameType=${gameType}, A=${playerAId}, B=${playerBId}, resultA=${resultA}`);
        
        // Get Stats
        const statsA = await this.getOrCreateStats(playerAId, gameType);
        const statsB = await this.getOrCreateStats(playerBId, gameType);

        // Get Mu Dynamic
        const meta = await GameMeta.findOne({ gameType });
        const muDynamic = meta ? meta.muDynamic : 1200;

        // Calculate K
        const kA = this.calculateK(statsA.rating, statsA.gamesPlayed, muDynamic);
        const kB = this.calculateK(statsB.rating, statsB.gamesPlayed, muDynamic);

        // Calculate Expected
        const expectedA = this.calculateExpected(statsA.rating, statsB.rating);
        const expectedB = this.calculateExpected(statsB.rating, statsA.rating);

        // Calculate Delta
        const resultB = 1 - resultA;
        const deltaA = this.calculateDelta(kA, resultA, expectedA);
        const deltaB = this.calculateDelta(kB, resultB, expectedB);

        // Update Stats A
        statsA.rating += deltaA;
        statsA.gamesPlayed += 1;
        statsA.lastPlayedAt = new Date();
        if (resultA === 1) statsA.wins++;
        else if (resultA === 0.5) statsA.draws++;
        else statsA.losses++;
        await statsA.save();

        // Update Stats B
        statsB.rating += deltaB;
        statsB.gamesPlayed += 1;
        statsB.lastPlayedAt = new Date();
        if (resultB === 1) statsB.wins++;
        else if (resultB === 0.5) statsB.draws++;
        else statsB.losses++;
        await statsB.save();

        return {
            playerA: { userId: playerAId, oldRating: statsA.rating - deltaA, newRating: statsA.rating, delta: deltaA },
            playerB: { userId: playerBId, oldRating: statsB.rating - deltaB, newRating: statsB.rating, delta: deltaB }
        };
    }

    async getOrCreateStats(userId, gameType) {
        let stats = await UserGameStats.findOne({ userId, gameType });
        if (!stats) {
            stats = new UserGameStats({ userId, gameType });
        }
        return stats;
    }

    /**
     * Update Mu Dynamic (Scheduled Task)
     * mu = Sum(Ratings) / Count
     */
    async updateMuDynamic(gameType) {
        // Aggregate average rating
        const result = await UserGameStats.aggregate([
            { $match: { gameType } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } }
        ]);

        const newMu = result.length > 0 ? Math.round(result[0].avgRating) : 1200;

        // Update Meta
        // User requested: Calculate at 11:00, Effective at 12:00.
        // We will store it in 'pendingMuDynamic' if we want strictly separate effective time,
        // or just update it. The prompt says "Effective 12:00".
        // Let's store in pending for now, and have another job apply it?
        // Or simpler: The job runs at 11:00, saves to pending.
        // Another job at 12:00 moves pending to active.

        let meta = await GameMeta.findOne({ gameType });
        if (!meta) meta = new GameMeta({ gameType });

        meta.pendingMuDynamic = newMu;
        meta.lastUpdated = new Date();
        await meta.save();

        console.log(`[ELO] Calculated Mu Dynamic for ${gameType}: ${newMu} (Pending)`);
    }

    async applyPendingMu(gameType) {
        const meta = await GameMeta.findOne({ gameType });
        if (meta && meta.pendingMuDynamic) {
            meta.muDynamic = meta.pendingMuDynamic;
            meta.pendingMuDynamic = undefined;
            await meta.save();
            console.log(`[ELO] Applied Mu Dynamic for ${gameType}: ${meta.muDynamic}`);
        }
    }

    /**
     * Apply Time Decay (Scheduled Task)
     * Decay = 0.01 * (Rating - 1600) if Inactive > 7 days
     */
    async applyTimeDecay() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.INACTIVE_DAYS);

        // Find players eligible for decay
        const cursor = UserGameStats.find({
            lastPlayedAt: { $lt: cutoffDate },
            rating: { $gt: this.DECAY_THRESHOLD }
        }).cursor();

        let count = 0;
        for (let stats = await cursor.next(); stats != null; stats = await cursor.next()) {
            const decay = Math.round(this.DECAY_RATE * (stats.rating - this.DECAY_THRESHOLD));
            if (decay > 0) {
                stats.rating -= decay;
                // Do NOT update lastPlayedAt, as it's a passive decay
                await stats.save();
                count++;
            }
        }
        console.log(`[ELO] Applied decay to ${count} players.`);
    }
}

module.exports = new EloService();
