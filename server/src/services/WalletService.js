const Wallet = require('../models/Wallet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// Constants
const EXCHANGE_RATE = 10000; // 1 Pi = 10000 Beans
const PI_FEE = 0.01; // Fixed fee in Pi
const MIN_EXCHANGE_PI = 1;
const MIN_EXCHANGE_BEANS = 10000;

/**
 * Wallet Service
 * Handles all wallet-related operations including balance management,
 * exchanges between Pi and Happy Beans, and transaction history.
 */
class WalletService {

    /**
     * Get Wallet
     * Retrieves or creates a wallet for a user.
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Wallet document
     */
    static async getWallet(userId) {
        let wallet = await Wallet.findOne({ user: userId });
        if (!wallet) {
            wallet = await Wallet.create({ user: userId });
        }
        return wallet;
    }

    /**
     * Exchange Pi to Beans (Deposit)
     * Simulates detecting a Pi transaction and crediting Happy Beans.
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Updated wallet and amount received
     */
    static async exchangePiToBeans(userId) {
        // Mock: Simulate checking blockchain for new transactions
        const randomAmount = Math.floor(Math.random() * 90) + 10; // Random 10-100 Pi
        const amountPi = randomAmount;
        const beansReceived = amountPi * EXCHANGE_RATE;

        const wallet = await this.getWallet(userId);

        // 1. Update Wallet
        wallet.happyBeans += beansReceived;
        await wallet.save();

        // 2. Create Transaction Record
        const orderId = 'DEP_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        await Transaction.create({
            user: userId,
            type: 'DEPOSIT',
            amount: beansReceived, // Store Beans amount
            currency: 'BEANS',     // Store as BEANS
            status: 'COMPLETED',
            txHash: 'mock_auto_detect_' + Date.now(),
            orderId: orderId,
            description: `Deposited ${amountPi} Pi (Auto-detected)`
        });

        return { wallet, beansReceived, orderId };
    }

    /**
     * Exchange Beans to Pi (Withdrawal)
     * Deducts Happy Beans and simulates sending Pi to the user.
     * @param {string} userId - User ID
     * @param {number} amountBeans - Amount of Beans to withdraw
     * @param {string} destinationAddress - Pi Wallet Address
     * @returns {Promise<Object>} Updated wallet and Pi received
     */
    static async exchangeBeansToPi(userId, amountBeans, destinationAddress) {
        if (!amountBeans || isNaN(amountBeans) || amountBeans <= 0) {
            throw new Error('Invalid withdrawal amount');
        }

        if (amountBeans < MIN_EXCHANGE_BEANS) {
            throw new Error(`Minimum exchange is ${MIN_EXCHANGE_BEANS} Beans`);
        }

        const wallet = await this.getWallet(userId);

        if (wallet.happyBeans < amountBeans) {
            throw new Error('Insufficient Happy Beans');
        }

        const piToReceive = (amountBeans / EXCHANGE_RATE) - PI_FEE;

        if (piToReceive <= 0) {
            throw new Error('Amount too small to cover fees');
        }

        // 1. Deduct Beans first
        wallet.happyBeans -= amountBeans;
        await wallet.save();

        // 2. Create Transaction Record
        const orderId = 'WTH_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

        // In real app, this would be PENDING until blockchain confirms
        await Transaction.create({
            user: userId,
            type: 'WITHDRAWAL',
            amount: amountBeans, // Store Beans amount
            currency: 'BEANS',   // Store as BEANS
            status: 'COMPLETED', // Mock: Instant success
            txHash: 'mock_tx_' + Date.now(),
            orderId: orderId,
            description: `Withdrew ${amountBeans} Beans to ${destinationAddress}`
        });

        console.log(`[MOCK] Sending ${piToReceive} Pi to ${destinationAddress}`);

        return { wallet, piReceived: piToReceive };
    }

    /**
     * Get Transactions
     * Retrieves recent transaction history for a user.
     * @param {string} userId - User ID
     * @returns {Promise<Array>} List of transactions
     */
    static async getTransactions(userId) {
        return await Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(20);
    }

    /**
     * Check Eco Pool Health
     * Calculates the total assets in the system to ensure solvency.
     * @returns {Promise<Object>} Health stats
     */
    static async checkEcoPoolHealth() {
        const result = await Wallet.aggregate([
            {
                $group: {
                    _id: null,
                    totalBeans: { $sum: "$happyBeans" },
                    totalPi: { $sum: "$piBalance" }
                }
            }
        ]);

        if (result.length === 0) return { healthy: true, surplus: 0 };

        const { totalBeans, totalPi } = result[0];
        const requiredPi = totalBeans / EXCHANGE_RATE;

        return {
            totalBeans,
            totalPi,
            requiredPi,
            healthy: totalPi >= requiredPi,
            surplus: totalPi - requiredPi
        };
    }
}

module.exports = WalletService;
