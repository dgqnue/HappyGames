const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

/**
 * @route   GET /api/wallet/:userId
 * @desc    Get user wallet balance
 * @access  Public (should be protected in prod)
 */
router.get('/:userId', walletController.getWallet);

/**
 * @route   GET /api/wallet/transactions/:userId
 * @desc    Get user transaction history
 * @access  Public
 */
router.get('/transactions/:userId', walletController.getTransactions);

/**
 * @route   POST /api/wallet/deposit
 * @desc    Simulate Pi deposit (Exchange Pi -> Beans)
 * @access  Public
 */
router.post('/deposit', walletController.deposit);

/**
 * @route   POST /api/wallet/withdraw
 * @desc    Withdraw Beans (Exchange Beans -> Pi)
 * @access  Public
 */
router.post('/withdraw', walletController.withdraw);

module.exports = router;
