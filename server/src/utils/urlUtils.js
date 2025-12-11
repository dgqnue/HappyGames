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

    // Render / 生产环境：优先使用 API_BASE_URL，其次使用固定线上域名
    if (process.env.RENDER || process.env.NODE_ENV === 'production') {
        const baseUrl = process.env.API_BASE_URL || 'https://happygames-tfdz.onrender.com';
        return `${baseUrl}${avatarPath}`;
    }

    // 本地开发环境 - 优先使用 API_BASE_URL (方便局域网调试)，否则回退到 localhost
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:5000';
    return `${baseUrl}${avatarPath}`;
};

module.exports = { getFullAvatarUrl };
