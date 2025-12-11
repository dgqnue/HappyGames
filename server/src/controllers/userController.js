/**
 * 用户控制器
 * 处理用户的身份验证、个人资料获取和更新。
 */

const User = require('../models/User'); // 导入用户模型
const Wallet = require('../models/Wallet'); // 导入钱包模型
const Transaction = require('../models/Transaction'); // 导入交易模型
const UserGameStats = require('../models/UserGameStats'); // 导入用户游戏统计模型
const jwt = require('jsonwebtoken'); // 导入 JSON Web Token 库

/**
 * 获取用户个人资料
 * 该方法会检索用户的详细信息、钱包余额以及推荐统计数据。
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.query.userId; // 从查询参数中获取用户 ID

        if (!userId) {
            return res.status(400).json({ message: '需要提供用户 ID' });
        }

        const user = await User.findById(userId).populate('referrer', 'username'); // 查找用户并填充推荐人信息
        if (!user) {
            return res.status(404).json({ message: '未找到用户' });
        }

        const wallet = await Wallet.findOne({ user: userId }); // 查找用户的钱包信息

        // 获取该用户所有游戏的统计数据
        const gameStats = {};
        const stats = await UserGameStats.find({ userId });
        
        stats.forEach(stat => {
            gameStats[stat.gameType] = {
                rating: stat.rating, // 用户的游戏评分
                title: stat.title, // 用户的游戏头衔
                titleRank: stat.titleRank, // 用户头衔的排名
                titleColor: stat.titleColor, // 用户头衔的颜色
                gamesPlayed: stat.gamesPlayed, // 用户参与的游戏数量
                wins: stat.wins, // 用户赢得的游戏数量
                losses: stat.losses, // 用户输掉的游戏数量
                draws: stat.draws, // 用户平局的游戏数量
                lastPlayedAt: stat.lastPlayedAt // 用户最后一次游戏时间
            };
        });

        res.json({
            _id: user._id, // 用户 ID
            username: user.username, // 用户名
            nickname: user.nickname, // 用户昵称
            avatar: user.avatar, // 用户头像
            referralCode: user.referralCode, // 用户的推荐码
            referralLevel: user.referralLevel, // 用户的推荐等级
            referralStats: user.referralStats, // 用户的推荐统计数据
            referrer: user.referrer ? user.referrer.username : '无', // 推荐人的用户名
            assets: {
                happyBeans: wallet ? wallet.happyBeans : 0, // 用户的 HappyBeans 数量
                piBalance: wallet ? wallet.piBalance : 0, // 用户的 Pi 币余额
                totalCommission: wallet ? wallet.totalCommissionEarned : 0 // 用户赚取的总佣金
            },
            gameStats: gameStats  // 用户的游戏统计数据
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '服务器错误' });
    }
};

/**
 * 登录或注册
 * 通过 Pi Network ID 验证用户身份。
 * 注意：此方法仅用于登录，用户注册必须通过 /api/user/register 端点完成。
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
exports.loginOrRegister = async (req, res) => {
    try {
        const { username, referralCode, piId, avatar } = req.body; // 从请求体中获取用户信息

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
            return res.status(400).json({ message: '需要提供用户名和 Pi ID' });
        }

        // 1. 尝试通过 Pi ID 或用户名查找现有用户
        let user = await User.findOne({ $or: [{ piId }, { username }] });

        if (user) {
            // 如果需要，更新用户信息（例如头像，或补全缺失的 piId）
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
                message: '登录成功',
                user,
                token,
                isNew: false
            });
        }

        // 2. 用户未找到 - 必须先通过 /api/user/register 注册
        console.log(`[Pi登录] ❌ 用户未注册: ${username}`);
        return res.status(401).json({
            success: false,
            message: '用户未注册。请先通过 /api/user/register 端点注册账号。'
        });

    } catch (error) {
        console.error('登录错误:', error);
        // 处理重复键错误
        if (error.code === 11000) {
            return res.status(400).json({ message: '用户名或 Pi ID 已存在' });
        }
        res.status(500).json({ message: '服务器错误: ' + error.message });
    }
};

/**
 * 重置数据库（仅限开发环境）
 * 清空所有用户和钱包数据。
 */
exports.resetDb = async (req, res) => {
    try {
        await User.deleteMany({}); // 删除所有用户数据
        await Wallet.deleteMany({}); // 删除所有钱包数据
        res.json({ message: '数据库已成功清空' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 更新用户个人资料
 * 更新用户的昵称和头像，并检查昵称的唯一性。
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
exports.updateProfile = async (req, res) => {
    try {
        const { userId, nickname, avatar } = req.body; // 从请求体中获取用户信息

        if (!userId) {
            return res.status(400).json({ message: '需要提供用户 ID' });
        }

        const user = await User.findById(userId); // 查找用户
        if (!user) {
            return res.status(404).json({ message: '未找到用户' });
        }

        if (nickname) {
            // 检查昵称唯一性
            const existingUser = await User.findOne({ nickname });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(400).json({ message: '昵称已被占用' });
            }
            user.nickname = nickname;
        }
        if (avatar) user.avatar = avatar;

        await user.save();

        res.json({ message: '个人资料已更新', user });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 获取推荐用户
 * 检索当前用户邀请的用户列表。
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
exports.getReferrals = async (req, res) => {
    try {
        const userId = req.query.userId; // 从查询参数中获取用户 ID
        if (!userId) return res.status(400).json({ message: '需要提供用户 ID' });

        const referrals = await User.find({ referrer: userId })
            .select('username nickname avatar createdAt referralLevel') // 选择需要的字段
            .sort({ createdAt: -1 }); // 按创建时间倒序排序

        res.json(referrals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 获取佣金历史
 * 检索用户的佣金交易记录。
 * @param {Object} req - Express 请求对象
 * @param {Object} res - Express 响应对象
 */
exports.getCommissionHistory = async (req, res) => {
    try {
        const userId = req.query.userId; // 从查询参数中获取用户 ID
        if (!userId) return res.status(400).json({ message: '需要提供用户 ID' });

        const commissions = await Transaction.find({
            user: userId,
            type: 'COMMISSION' // 仅检索佣金类型的交易
        }).sort({ createdAt: -1 }); // 按创建时间倒序排序

        res.json(commissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
