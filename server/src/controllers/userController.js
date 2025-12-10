/**
 * User Controller
 * Handles user authentication, profile retrieval, and updates.
 */

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const UserGameStats = require('../models/UserGameStats');
const jwt = require('jsonwebtoken');

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

        // 获取该用户所有游戏的统计数据
        const gameStats = {};
        const stats = await UserGameStats.find({ userId });
        
        stats.forEach(stat => {
            gameStats[stat.gameType] = {
                rating: stat.rating,
                title: stat.title,
                titleRank: stat.titleRank,
                titleColor: stat.titleColor,
                gamesPlayed: stat.gamesPlayed,
                wins: stat.wins,
                losses: stat.losses,
                draws: stat.draws,
                lastPlayedAt: stat.lastPlayedAt
            };
        });

        res.json({
            _id: user._id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar,
            referralCode: user.referralCode,
            referralLevel: user.referralLevel,
            referralStats: user.referralStats,
            referrer: user.referrer ? user.referrer.username : 'None',
            assets: {
                happyBeans: wallet ? wallet.happyBeans : 0,
                piBalance: wallet ? wallet.piBalance : 0,
                totalCommission: wallet ? wallet.totalCommissionEarned : 0
            },
            gameStats: gameStats  // 添加游戏统计数据
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Login or Register
 * Authenticates a user via Pi Network ID. 
 * NOTE: Only login is allowed here. User registration must be done via /api/user/register endpoint.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.loginOrRegister = async (req, res) => {
    try {
        const { username, referralCode, piId, avatar } = req.body;

        // ========== 强制使用 happygames 数据库 ==========
        const mongoose = require('mongoose');
        const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
        const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || 'unknown';
        
        console.log(`[Pi登录] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);
        
        // 严格检查：必须连接到 happygames，否则拒绝
        if (currentDb !== expectedDbName && currentDb !== 'unknown') {
            console.error(`[Pi登录] ❌ 错误: 错误的数据库! 当前=${currentDb}`);
            return res.status(500).json({
                success: false,
                message: `数据库连接错误: 当前数据库为 ${currentDb}, 应该连接到 ${expectedDbName}`
            });
        }
        if (currentDb === 'unknown') {
            console.warn(`[Pi登录] ⚠️ 警告: 无法确定连接的数据库！使用默认: ${expectedDbName}`);
        }

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

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '30d' });

            console.log(`[Pi登录] ✅ 成功登录用户: ${username}`);

            return res.json({
                message: 'Login successful',
                user,
                token,
                isNew: false
            });
        }

        // 2. User not found - must register via /api/user/register first
        console.log(`[Pi登录] ❌ 用户未注册: ${username}`);
        return res.status(401).json({
            success: false,
            message: '用户未注册。请先通过 /api/user/register 端点注册账号。'
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

/**
 * Get Referrals
 * Retrieves list of users invited by the current user.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getReferrals = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ message: 'User ID required' });

        const referrals = await User.find({ referrer: userId })
            .select('username nickname avatar createdAt referralLevel')
            .sort({ createdAt: -1 });

        res.json(referrals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get Commission History
 * Retrieves commission transactions for the user.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCommissionHistory = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ message: 'User ID required' });

        const commissions = await Transaction.find({
            user: userId,
            type: 'COMMISSION'
        }).sort({ createdAt: -1 });

        res.json(commissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
