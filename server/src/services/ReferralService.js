const User = require('../models/User');
const Wallet = require('../models/Wallet');

// Commission Rates
const REFERRAL_LEVELS = {
    1: { rate: 0.10, name: '普通推广员' },
    2: { rate: 0.15, name: '活跃推广员' },
    3: { rate: 0.20, name: '高级推广员' },
    4: { rate: 0.25, name: '金牌推广员' },
    5: { rate: 0.30, name: '顶级推广员' }
};

class ReferralService {

    // Calculate and distribute commission for a single player's contribution
    static async distributeCommissionForPlayer(userId, feeContribution) {
        const player = await User.findById(userId).populate('referrer');

        if (player && player.referrer) {
            const referrer = player.referrer;
            const level = REFERRAL_LEVELS[referrer.referralLevel] || REFERRAL_LEVELS[1];
            const commission = feeContribution * level.rate;

            if (commission > 0) {
                // Add to referrer's wallet
                const referrerWallet = await Wallet.findOne({ user: referrer._id });
                if (referrerWallet) {
                    referrerWallet.happyBeans += commission;
                    referrerWallet.totalCommissionEarned += commission;
                    await referrerWallet.save();

                    // Optional: Create Transaction for Commission?
                    // await Transaction.create({ ... type: 'COMMISSION' ... });
                }
            }
        }
    }

    // Legacy: Calculate and distribute commission for a game (Split total)
    static async distributeCommissions(platformFeeTotal, playerIds) {
        if (!playerIds || playerIds.length === 0) return;

        const contributionPerPlayer = platformFeeTotal / playerIds.length;

        for (const playerId of playerIds) {
            const player = await User.findById(playerId).populate('referrer');

            if (player && player.referrer) {
                const referrer = player.referrer;
                const level = REFERRAL_LEVELS[referrer.referralLevel] || REFERRAL_LEVELS[1];
                const commission = contributionPerPlayer * level.rate;

                if (commission > 0) {
                    // Add to referrer's wallet
                    const referrerWallet = await Wallet.findOne({ user: referrer._id });
                    if (referrerWallet) {
                        referrerWallet.happyBeans += commission;
                        referrerWallet.totalCommissionEarned += commission;
                        await referrerWallet.save();
                    }
                }

                // Update referrer stats (flow)
                // "Cumulative flow refers to total base beans of all downlines... regardless of win/loss"
                // This function is called after game, but flow update might be separate or here.
                // If this function is only for commission, we need another for flow.
            }
        }
    }

    // Update flow stats and check for level up
    static async updateReferralStats(userId, gameBaseBeans) {
        const user = await User.findById(userId).populate('referrer');
        if (!user || !user.referrer) return;

        const referrer = user.referrer;

        // Update total flow
        referrer.referralStats.totalFlow += gameBaseBeans;
        await referrer.save();

        await this.checkLevelUp(referrer);
    }

    static async processGameEnd(gameRecord) {
        // gameRecord has players and baseBeans
        const uniqueReferrers = new Set();
        const playerReferrerMap = new Map(); // playerId -> referrerId

        // 1. Identify referrers
        for (const p of gameRecord.players) {
            const user = await User.findById(p.user);
            if (user && user.referrer) {
                playerReferrerMap.set(p.user.toString(), user.referrer.toString());
                uniqueReferrers.add(user.referrer.toString());
            }
        }

        // 2. Update Flow for unique referrers
        for (const referrerId of uniqueReferrers) {
            const referrer = await User.findById(referrerId);
            if (referrer) {
                referrer.referralStats.totalFlow += gameRecord.baseBeans;
                await referrer.save();
                await this.checkLevelUp(referrer);
            }
        }

        // 3. Distribute Commissions (Per player contribution)
        const contributionPerPlayer = gameRecord.platformFee / gameRecord.players.length;

        for (const p of gameRecord.players) {
            const referrerId = playerReferrerMap.get(p.user.toString());
            if (referrerId) {
                const referrer = await User.findById(referrerId); // Refetch to get latest level?
                if (referrer) {
                    const level = REFERRAL_LEVELS[referrer.referralLevel] || REFERRAL_LEVELS[1];
                    const commission = contributionPerPlayer * level.rate;

                    // Add commission
                    const w = await Wallet.findOne({ user: referrerId });
                    if (w) {
                        w.happyBeans += commission;
                        w.totalCommissionEarned += commission;
                        await w.save();
                    }
                }
            }
        }
    }

    static async checkLevelUp(user) {
        // Check conditions
        const { inviteCount, totalFlow } = user.referralStats;
        let newLevel = user.referralLevel;

        // Check Lv5
        if (inviteCount >= 500 || totalFlow >= 200000000) newLevel = 5;
        else if (inviteCount >= 200 || totalFlow >= 50000000) newLevel = 4;
        else if (inviteCount >= 100 || totalFlow >= 10000000) newLevel = 3;
        else if (inviteCount >= 10 || totalFlow >= 500000) newLevel = 2;
        else if (inviteCount >= 1) newLevel = 1;

        if (newLevel > user.referralLevel) {
            user.referralLevel = newLevel;
            await user.save();
        }
    }
}

module.exports = ReferralService;
