const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * @route   POST /api/users/login
 * @desc    Login or register a new user
 * @access  Public
 */
router.post('/login', userController.loginOrRegister);

/**
 * @route   GET /api/users/profile
 * @desc    Get user profile details
 * @access  Public (should be protected in prod)
 */
router.get('/profile', userController.getUserProfile);

/**
 * @route   POST /api/users/update
 * @desc    Update user profile (nickname, avatar)
 * @access  Public
 */
router.post('/update', userController.updateProfile);

/**
 * @route   GET /api/users/reset
 * @desc    Reset database (Dev only)
 * @access  Public
 */
router.get('/reset', userController.resetDb); // Temporary dev route

router.get('/referrals', userController.getReferrals);
router.get('/commissions', userController.getCommissionHistory);

module.exports = router;
