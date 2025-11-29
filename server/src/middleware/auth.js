const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Pi Network 认证中间件
 * 验证 JWT token 并加载用户信息
 */
async function piAuth(req, res, next) {
    try {
        // 从请求头获取 token
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // 查找用户
        let user = await User.findOne({ username: decoded.username });

        // 如果用户不存在，创建新用户
        if (!user) {
            user = await createNewUser(decoded);
        } else {
            // 更新最后登录时间和登录次数
            user.lastLoginAt = new Date();
            user.loginCount += 1;
            await user.save();
        }

        // 将用户信息附加到请求对象
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
            avatar: '/images/default-avatar.png', // 默认头像
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
 * Socket.IO 认证中间件
 */
async function socketAuth(socket, next) {
    try {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('未提供认证令牌'));
        }

        // 验证 token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // 查找用户
        let user = await User.findOne({ username: decoded.username });

        // 如果用户不存在，创建新用户
        if (!user) {
            user = await createNewUser(decoded);
        }

        // 将用户信息附加到 socket
        socket.user = user;

        next();
    } catch (error) {
        console.error('Socket 认证失败:', error);
        next(new Error('认证失败'));
    }
}

/**
 * 可选认证中间件（用于不需要强制登录的接口）
 */
async function optionalAuth(req, res, next) {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            const user = await User.findOne({ username: decoded.username });

            if (user) {
                req.user = user;
                req.token = token;
            }
        }

        next();
    } catch (error) {
        // 认证失败不阻止请求，继续执行
        next();
    }
}

module.exports = {
    piAuth,
    socketAuth,
    optionalAuth,
    createNewUser
};
