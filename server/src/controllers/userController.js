/**
 * User Controller
 * Handles user authentication, profile retrieval, and updates.
 */

const User = require('../models/User');
const Wallet = require('../models/Wallet');

/**
 * Get User Profile
 * Retrieves user details, wallet balance, and referral stats.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.query.userId;

        if (!userId) {
            return res.status(400).json({ message: 'User ID required' });
        }

        const user = await User.findById(userId).populate('referrer', 'username');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const wallet = await Wallet.findOne({ user: userId });

        res.json({
            _id: user._id,
            username: user.username,
            nickname: user.nickname,
            referralCode: user.referralCode,
            referralLevel: user.referralLevel,
            referralStats: user.referralStats,
            referrer: user.referrer ? user.referrer.username : 'None',
            assets: {
                happyBeans: wallet ? wallet.happyBeans : 0,
                piBalance: wallet ? wallet.piBalance : 0,
                totalCommission: wallet ? wallet.totalCommissionEarned : 0
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Login or Register
 * Authenticates a user via Pi Network ID. Creates a new account if one doesn't exist.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.loginOrRegister = async (req, res) => {
    try {
        const { username, referralCode, piId, avatar } = req.body;

        if (!username || !piId) {
            return res.status(400).json({ message: 'Username and Pi ID are required' });
        }

        // 1. Try to find existing user by Pi ID (more stable) or Username
        let user = await User.findOne({ $or: [{ piId }, { username }] });

        if (user) {
            // Update user info if needed (e.g. avatar, or backfill piId if missing)
            let updated = false;
            if (!user.piId) {
                user.piId = piId;
                updated = true;
            }
            if (avatar && user.avatar !== avatar) {
                user.avatar = avatar;
                updated = true;
            }
            if (updated) await user.save();

            return res.json({
                message: 'Login successful',
                user,
                isNew: false
            });
        }

        // 2. Register new user
        let referrer = null;
        let isInvited = false;

        if (referralCode) {
            referrer = await User.findOne({ referralCode });
            if (referrer) {
                isInvited = true;
                referrer.referralStats.inviteCount += 1;
                await referrer.save();
            }
        }

        // Create User
        user = await User.create({
            username,
            nickname: username,
            piId,
            avatar: avatar || '',
            password: 'pi_user_no_password',
            referralCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
            referrer: referrer ? referrer._id : null,
            isInvited
        });

        // Create Wallet
        await Wallet.create({ user: user._id });

        res.status(201).json({
            message: 'Account created',
            user,
            isNew: true
        });

    } catch (error) {
        console.error('Login Error:', error);
        // Handle duplicate key error specifically
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Username or Pi ID already exists' });
        }
        res.status(500).json({ message: 'Server Error: ' + error.message });
    }
};

/**
 * Reset Database (Dev Only)
 * Clears all users and wallets.
 */
exports.resetDb = async (req, res) => {
    try {
        await User.deleteMany({});
        await Wallet.deleteMany({});
        res.json({ message: 'Database cleared successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Update User Profile
 * Updates user nickname and avatar. Checks for nickname uniqueness.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateProfile = async (req, res) => {
    try {
        const { userId, nickname, avatar } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (nickname) {
            // Check uniqueness
            const existingUser = await User.findOne({ nickname });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: 'Nickname already taken' });
            }
            user.nickname = nickname;
        }
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
