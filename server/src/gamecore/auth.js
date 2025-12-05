const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 辅助函数：处理头像 URL
const processAvatarUrl = (avatarPath) => {
    // 如果是默认头像路径，返回前端本地路径
    if (!avatarPath || avatarPath.includes('default-avatar')) return '/images/default-avatar.png';

    // 如果已经是绝对路径或 Base64，直接返回
    if (avatarPath.startsWith('http') || avatarPath.startsWith('data:')) return avatarPath;

    // 检查是否在 Render 环境中
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        const baseUrl = process.env.API_BASE_URL || 'https://happygames-tfdz.onrender.com';
        return `${baseUrl}${avatarPath}`;
    }

    // 本地开发环境
    return `http://localhost:5000${avatarPath}`;
};

const verifyToken = async (token) => {
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        const user = await User.findById(decoded._id).select('-password');

        // 处理头像 URL
        if (user) {
            user.avatar = processAvatarUrl(user.avatar);
        }

        return user;
    } catch (err) {
        return null;
    }
};

/**
 * 生成推荐码
 */
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * 创建新用户
 */
async function createNewUser(piUserData) {
    try {
        // 生成唯一的 userId
        const userId = await User.generateUserId();

        // 随机生成性别
        const gender = Math.random() > 0.5 ? 'male' : 'female';

        // 创建用户
        const user = new User({
            userId,
            username: piUserData.username,
            piId: piUserData.uid || piUserData.piId,
            nickname: piUserData.username, // 默认昵称与 Pi 用户名相同
            avatar: '/images/default-avatar.svg', // 默认头像
            gender,
            // happyBeans 使用模型默认值 0
            referralCode: generateReferralCode(),
            accountStatus: 'active',
            loginCount: 1,
            lastLoginAt: new Date(),
            gameStats: [] // 初始无游戏数据
        });

        await user.save();

        console.log(`新用户创建成功: ${user.userId} (${user.username})`);

        return user;
    } catch (error) {
        console.error('创建用户失败:', error);
        throw error;
    }
}

/**
 * Pi Network 认证中间件 (Express)
 */
async function piAuth(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        let user = await User.findOne({ username: decoded.username });

        if (!user) {
            user = await createNewUser(decoded);
        } else {
            user.lastLoginAt = new Date();
            user.loginCount += 1;
            await user.save();
        }

        if (user) {
            user.avatar = processAvatarUrl(user.avatar);
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('认证失败:', error);
        res.status(401).json({
            success: false,
            message: '认证失败'
        });
    }
}

/**
 * 可选认证中间件
 */
async function optionalAuth(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
            const user = await User.findOne({ username: decoded.username });
            if (user) {
                user.avatar = processAvatarUrl(user.avatar);
                req.user = user;
                req.token = token;
            }
        }
        next();
    } catch (error) {
        next();
    }
}

module.exports = {
    verifyToken,
    piAuth,
    optionalAuth,
    createNewUser,
    processAvatarUrl
};
