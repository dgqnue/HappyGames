const User = require('../models/User');
const { getFullAvatarUrl } = require('../utils/urlUtils');

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
            // 数据库有记录，转换并返回
            return getFullAvatarUrl(user.avatar);
        } else {
            // 用户不存在或字段为空，返回默认
            return getFullAvatarUrl(null);
        }
    } catch (error) {
        console.warn(`[AvatarUtils] 获取用户 ${userId} 头像失败:`, error.message);
        // 发生错误（如 ID 格式不对），降级使用默认头像
        return getFullAvatarUrl(null);
    }
}

module.exports = {
    fetchLatestAvatarUrl
};
