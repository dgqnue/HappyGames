const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const ReferralService = require('./ReferralService');

const PLATFORM_FEE_RATE = 0.05; // 5% Platform Fee

class GameService {

    /**
     * Settle a game
     * @param {string} roomId 
     * @param {Array} players - Array of { userId, betAmount, isWinner }
     */
    static async settleGame(roomId, players) {
        console.log(`Settling game ${roomId}...`);

        let totalPot = 0;
        let totalFee = 0;
        const winners = [];
        const playerContributions = []; // { userId, feeContribution }

        // 1. Process Bets & Deductions
        for (const p of players) {
            const wallet = await Wallet.findOne({ user: p.userId });
            if (!wallet) continue;

            // Deduct Bet
            if (wallet.happyBeans < p.betAmount) {
                throw new Error(`User ${p.userId} has insufficient beans`);
            }
            wallet.happyBeans -= p.betAmount;
            await wallet.save();

            // Create Bet Transaction
            await Transaction.create({
                user: p.userId,
                type: 'BET',
                amount: -p.betAmount,
                currency: 'BEANS',
                status: 'COMPLETED',
                orderId: 'BET' + Date.now() + Math.floor(Math.random() * 100000),
                description: `Bet in game ${roomId}`
            });

            totalPot += p.betAmount;

            // Calculate Fee Contribution (Single-person contribution)
            // Fee is taken from the total pot, but we attribute it to players for commission
            const fee = p.betAmount * PLATFORM_FEE_RATE;
            totalFee += fee;
            playerContributions.push({ userId: p.userId, fee: fee });

            if (p.isWinner) {
                winners.push(p.userId);
            }
        }

        // 2. Distribute Winnings
        const netPot = totalPot - totalFee;
        const winAmountPerUser = winners.length > 0 ? netPot / winners.length : 0; // Split pot equally among winners

        for (const winnerId of winners) {
            const wallet = await Wallet.findOne({ user: winnerId });
            if (wallet) {
                wallet.happyBeans += winAmountPerUser;
                await wallet.save();

                await Transaction.create({
                    user: winnerId,
                    type: 'WIN',
                    amount: winAmountPerUser,
                    currency: 'BEANS',
                    status: 'COMPLETED',
                    orderId: 'WIN' + Date.now() + Math.floor(Math.random() * 100000),
                    description: `Won in game ${roomId}`
                });
            }
        }

        // 3. Distribute Commissions (Single-person contribution)
        // We pass the specific contribution of each player to the ReferralService
        for (const contribution of playerContributions) {
            await ReferralService.distributeCommissionForPlayer(contribution.userId, contribution.fee);
        }

        // 4. Update Referral Stats (Flow)
        // Flow is usually the bet amount (Total Flow)
        for (const p of players) {
            await ReferralService.updateReferralStats(p.userId, p.betAmount);
        }

        return {
            totalPot,
            totalFee,
            netPot,
            winners,
            winAmountPerUser
        };
    }
}

module.exports = GameService;
