const User = require('../models/User');
const path = require('path');

/**
 * 辅助函数：将相对路径的头像转换为完整 URL
 * 约定：
 *   - 数据库存储相对路径（/images/xxx.png 或 /uploads/avatars/xxx.png）
 *   - 对外所有接口一律返回完整 URL，前端无需再拼接
 */
const getFullAvatarUrl = (avatarPath) => {
    // 空值或明显异常时统一回退到默认头像相对路径
    if (!avatarPath) {
        avatarPath = '/images/default-avatar.png';
    }

    // 已经是完整 URL 或 data URL，直接返回
    if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://') || avatarPath.startsWith('data:')) {
        return avatarPath;
    }

    // 确保是以 / 开头的相对路径，否则回退为默认头像
    if (!avatarPath.startsWith('/')) {
        avatarPath = '/images/default-avatar.png';
    }

    // 优化：如果是默认头像，直接返回相对路径
    // 这样前端可以直接使用本地资源，避免跨域问题或服务器静态资源配置问题
    if (avatarPath === '/images/default-avatar.png') {
        return '/images/default-avatar.png?v=new';
    }

    // Render / 生产环境：优先使用 API_BASE_URL，其次使用固定线上域名
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        const baseUrl = process.env.API_BASE_URL || 'https://happygames-tfdz.onrender.com';
        return `${baseUrl}${avatarPath}`;
    }

    // 本地开发环境 - 优先使用 API_BASE_URL (方便局域网调试)，否则回退到 localhost
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${avatarPath}`;
};

/**
 * 获取用户最新的头像 URL
 * 
 * 核心原则：
 * 1. 优先查询数据库获取最新头像路径 (解决缓存/同步问题)
 * 2. 如果数据库无记录或未上传，使用默认头像
 * 3. 自动转换为完整 URL (处理本地/生产环境差异)
 * 
 * @param {String|ObjectId} userId - 用户ID
 * @returns {Promise<String>} 完整的头像 URL
 */
async function fetchLatestAvatarUrl(userId) {
    if (!userId) {
        return getFullAvatarUrl(null);
    }

    try {
        // 尝试查找用户，只取 avatar 字段
        const user = await User.findById(userId).select('avatar').lean();
        
        if (user && user.avatar) {
            // 拦截旧的 SVG Base64 默认头像，强制使用新的图片文件默认头像
            if (user.avatar.startsWith('data:image/svg+xml') || user.avatar.endsWith('.svg')) {
                return '/images/default-avatar.png?v=new';
            }

            // 数据库有记录，转换并返回
            const fullUrl = getFullAvatarUrl(user.avatar);
            // console.log(`[AvatarUtils] Found avatar for ${userId}: ${fullUrl}`);
            return fullUrl;
        } else {
            // 用户不存在或字段为空，返回默认
            // console.log(`[AvatarUtils] No avatar found for ${userId}, using default`);
            return getFullAvatarUrl(null);
        }
    } catch (error) {
        console.warn(`[AvatarUtils] 获取用户 ${userId} 头像失败:`, error.message);
        // 发生错误（如 ID 格式不对），降级使用默认头像
        return getFullAvatarUrl(null);
    }
}

module.exports = {
    fetchLatestAvatarUrl,
    getFullAvatarUrl
};
