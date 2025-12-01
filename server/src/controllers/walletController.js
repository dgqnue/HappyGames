const WalletService = require('../services/WalletService');

/**
 * Get Wallet Balance
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        const wallet = await WalletService.getWallet(userId);
        res.json(wallet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Deposit (Exchange Pi -> Beans)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deposit = async (req, res) => {
    try {
        const { userId } = req.body;
        const result = await WalletService.exchangePiToBeans(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Withdraw (Exchange Beans -> Pi)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.withdraw = async (req, res) => {
    try {
        const { userId, amountBeans, destinationAddress } = req.body;
        const result = await WalletService.exchangeBeansToPi(userId, amountBeans, destinationAddress);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Get Transaction History
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        const transactions = await WalletService.getTransactions(userId);
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
