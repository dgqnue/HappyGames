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
 * Pi Network 认证中间件 (Express)
 * NOTE: This middleware will ONLY login existing users.
 * New user registration must be done via /api/user/register endpoint first.
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

        // ========== 强制使用 happygames 数据库 ==========
        const mongoose = require('mongoose');
        const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
        const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || 'unknown';
        console.log(`[piAuth] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);

        // 严格检查：必须连接到 happygames，否则拒绝
        if (currentDb !== expectedDbName && currentDb !== 'unknown') {
            console.error(`[piAuth] ❌ 错误: 错误的数据库!`);
            return res.status(500).json({
                success: false,
                message: `数据库连接错误: 当前数据库为 ${currentDb}, 应该连接到 ${expectedDbName}`
            });
        }
        if (currentDb === 'unknown') {
            console.warn(`[piAuth] ⚠️ 警告: 无法确定连接的数据库！使用默认: ${expectedDbName}`);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
        let user = await User.findOne({ username: decoded.username });

        if (!user) {
            // User not found - must register via /api/user/register first
            console.log(`[piAuth] ❌ 用户未注册: ${decoded.username}`);
            return res.status(401).json({
                success: false,
                message: '用户未注册。请先通过 /api/user/register 端点注册账号。'
            });
        }

        // Update login info
        user.lastLoginAt = new Date();
        user.loginCount += 1;
        await user.save();
        console.log(`[piAuth] ✅ 成功登录用户: ${user.username}`);

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
    processAvatarUrl
};
