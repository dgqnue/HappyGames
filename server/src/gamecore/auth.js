const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 辅助函数：处理头像 URL
const processAvatarUrl = (avatarPath) => {
    // 如果是默认头像路径，返回前端本地路径
    if (!avatarPath || avatarPath.includes('default-avatar')) return '/images/default-avatar.svg';

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

module.exports = { verifyToken };
