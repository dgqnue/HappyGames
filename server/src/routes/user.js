const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');
const { piAuth } = require('../gamecore/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { fetchLatestAvatarUrl, getFullAvatarUrl } = require('../utils/avatarUtils');

// 辅助函数：将相对路径的头像转换为完整 URL
// 约定：
//   - 数据库存储相对路径（/images/xxx.png 或 /uploads/avatars/xxx.png）
//   - 对外所有接口一律返回完整 URL，前端无需再拼接
// const getFullAvatarUrl = (avatarPath) => {
//     // Moved to ../utils/urlUtils.js
// };

// ========== 公开路由 (无需认证) ==========

/**
 * 用户注册
 * POST /api/user/register
 */
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        // ========== 强制使用 happygames 数据库 ==========
        const mongoose = require('mongoose');
        // 无论环境变量如何，我们都期望连接到 happygames
        const expectedDbName = 'happygames';
        
        // 多种方式获取当前数据库名
        const dbName1 = mongoose.connection.name;
        const dbName2 = mongoose.connection.db?.databaseName;
        const dbName3 = mongoose.connection.db?.getName?.();
        const currentDb = dbName1 || dbName2 || 'unknown';
        
        console.log(`[注册] 详细DB检查:`);
        console.log(`  - connection.name: ${dbName1}`);
        console.log(`  - db.databaseName: ${dbName2}`);
        console.log(`  - db.getName(): ${dbName3}`);
        console.log(`  - 期望: ${expectedDbName}`);
        console.log(`  - 最终确定的DB: ${currentDb}`);
        console.log(`  - MONGO_URI: ${process.env.MONGO_URI?.substring(0, 50)}...`);
        
        // 严格检查：必须连接到 happygames，否则拒绝
        if (currentDb !== expectedDbName && currentDb !== 'unknown') {
            console.error(`[注册] ❌ 错误: 错误的数据库! 当前=${currentDb}`);
            return res.status(500).json({
                success: false,
                message: `数据库连接错误: 当前数据库为 ${currentDb}, 应该连接到 ${expectedDbName}`
            });
        }
        if (currentDb === 'unknown') {
            console.warn(`[注册] ⚠️ 警告: 无法确定连接的数据库！使用默认: ${expectedDbName}`);
        }

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少为6位'
            });
        }

        // 检查用户名是否已存在
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名已存在'
            });
        }

        // 生成 userId
        const userId = await User.generateUserId();

        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 创建新用户
        const newUser = new User({
            userId,
            username,
            password: hashedPassword,
            nickname: username, // 默认昵称
            gender: Math.random() > 0.5 ? 'male' : 'female', // 随机性别
            avatar: '/images/default-avatar.png'
        });

        await newUser.save();

        // 为新用户创建钱包
        const Wallet = require('../models/Wallet');
        await Wallet.create({ user: newUser._id });

        // 生成 JWT Token
        const token = jwt.sign(
            { _id: newUser._id, userId: newUser.userId, username: newUser.username },
            process.env.JWT_SECRET || 'your_jwt_secret', // 建议使用环境变量
            { expiresIn: '7d' }
        );

        console.log(`[注册] ✅ 成功注册用户: ${username}`);

        res.status(201).json({
            success: true,
            message: '注册成功',
            token,
            user: {
                userId: newUser.userId,
                username: newUser.username,
                nickname: newUser.nickname,
                avatar: getFullAvatarUrl(newUser.avatar)
            }
        });

    } catch (error) {
        console.error('注册失败 - 详细错误:', error);
        console.error('错误堆栈:', error.stack);
        console.error('错误名称:', error.name);
        console.error('错误消息:', error.message);

        res.status(500).json({
            success: false,
            message: '服务器错误: ' + error.message, // 直接将错误显示在消息中
            error: error.message,
            stack: error.stack // 包含堆栈信息
        });
    }
});

/**
 * 用户登录
 * POST /api/user/login
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // ========== 强制使用 happygames 数据库 ==========
        const mongoose = require('mongoose');
        const expectedDbName = process.env.MONGO_URI?.match(/\/([^/?]+)\?/)?.[1] || 'happygames';
        const currentDb = mongoose.connection.name || mongoose.connection.db?.databaseName || 'unknown';
        
        console.log(`[登录] DB检查: 当前=${currentDb}, 期望=${expectedDbName}, connection.name=${mongoose.connection.name}`);
        
        // 严格检查：必须连接到 happygames，否则拒绝
        if (currentDb !== expectedDbName && currentDb !== 'unknown') {
            console.error(`[登录] ❌ 错误: 错误的数据库! 当前=${currentDb}`);
            return res.status(500).json({
                success: false,
                message: `数据库连接错误: 当前数据库为 ${currentDb}, 应该连接到 ${expectedDbName}`
            });
        }
        if (currentDb === 'unknown') {
            console.warn(`[登录] ⚠️ 警告: 无法确定连接的数据库！使用默认: ${expectedDbName}`);
        }

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名和密码不能为空'
            });
        }

        // 查找用户 (显式选择密码字段)
        const user = await User.findOne({ username }).select('+password');
        if (!user) {
            return res.status(400).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        // 注意：如果是 Pi 用户（没有密码），这里会失败，这是预期的
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: '该账号请使用 Pi 登录'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 生成 JWT Token
        const token = jwt.sign(
            { _id: user._id, userId: user.userId, username: user.username },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '7d' }
        );

        console.log(`[登录] ✅ 成功登录用户: ${username}`);

        res.json({
            success: true,
            message: '登录成功',
            token,
            user: {
                userId: user.userId,
                username: user.username,
                nickname: user.nickname,
                avatar: getFullAvatarUrl(user.avatar)
            }
        });

    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

// ========== 受保护路由 (需要认证) ==========
// 应用认证中间件到所有后续路由
router.use(piAuth);

// 配置头像上传
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/avatars');
        try {
            await fsPromises.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 // 1MB 限制
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif)'));
        }
    }
});

/**
 * 获取当前用户信息
 * GET /api/user/profile
 */
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-__v');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 转换头像为完整 URL
        const userData = user.toObject();
        userData.avatar = await fetchLatestAvatarUrl(user._id);

        // 获取并合并游戏数据 (UserGameStats)
        // User.gameStats 字段可能未更新，以 UserGameStats 集合为准
        const stats = await UserGameStats.find({ userId: user._id });
        
        const GAME_NAMES = {
            'chinesechess': 'Chinese Chess',
            'gomoku': 'Gomoku'
        };

        userData.gameStats = stats.map(stat => {
            const gamesPlayed = stat.gamesPlayed || 0;
            const wins = stat.wins || 0;
            const disconnects = stat.disconnects || 0;

            return {
                gameType: stat.gameType,
                gameName: GAME_NAMES[stat.gameType] || stat.gameType,
                rating: stat.rating,
                title: stat.title,
                titleColor: stat.titleColor,
                gamesPlayed: gamesPlayed,
                wins: wins,
                losses: stat.losses || 0,
                draws: stat.draws || 0,
                winRate: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0,
                disconnectRate: gamesPlayed > 0 ? Math.round((disconnects / gamesPlayed) * 100) : 0,
                maxWinStreak: 0, // TODO: Add to UserGameStats
                currentWinStreak: 0 // TODO: Add to UserGameStats
            };
        });

        res.json({
            success: true,
            data: userData
        });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

/**
 * 更新用户昵称
 * PUT /api/user/nickname
 */
router.put('/nickname', async (req, res) => {
    try {
        const { nickname } = req.body;

        if (!nickname || nickname.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '昵称不能为空'
            });
        }

        if (nickname.length > 14) {
            return res.status(400).json({
                success: false,
                message: '昵称长度不能超过14个字符'
            });
        }

        // 检查昵称是否已被使用
        const isAvailable = await User.isNicknameAvailable(nickname, req.user.userId);

        if (!isAvailable) {
            return res.status(400).json({
                success: false,
                message: '该昵称已被使用'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { nickname: nickname.trim() },
            { new: true }
        ).select('-__v');

        res.json({
            success: true,
            message: '昵称更新成功',
            data: user
        });
    } catch (error) {
        console.error('更新昵称失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

/**
 * 更新用户性别
 * PUT /api/user/gender
 */
router.put('/gender', async (req, res) => {
    try {
        const { gender } = req.body;

        if (!['male', 'female'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: '性别无效'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { gender },
            { new: true }
        ).select('-__v');

        res.json({
            success: true,
            message: '性别更新成功',
            data: user
        });
    } catch (error) {
        console.error('更新性别失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

/**
 * 上传/更新头像
 * POST /api/user/avatar
 */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
    try {
        console.log('[Avatar Upload] 收到头像上传请求');
        if (!req.file) {
            console.error('[Avatar Upload] 未接收到文件');
            return res.status(400).json({
                success: false,
                message: '请选择要上传的图片'
            });
        }

        console.log('[Avatar Upload] 文件信息:', req.file);

        // 获取相对路径
        const avatarPath = `/uploads/avatars/${req.file.filename}`;
        console.log('[Avatar Upload] 生成的相对路径:', avatarPath);

        // 验证文件是否真实存在
        const fullPath = req.file.path;
        if (fs.existsSync(fullPath)) {
            console.log('[Avatar Upload] 文件已成功写入磁盘:', fullPath);
        } else {
            console.error('[Avatar Upload] 警告：文件未找到于磁盘:', fullPath);
        }

        // 更新用户头像
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { avatar: avatarPath },
            { new: true }
        ).select('-__v');

        console.log('[Avatar Upload] 数据库更新成功, user.avatar:', user.avatar);

        // 转换头像为完整 URL
        const userData = user.toObject();
        userData.avatar = await fetchLatestAvatarUrl(user._id);
        console.log('[Avatar Upload] 返回给前端的完整 URL:', userData.avatar);

        res.json({
            success: true,
            message: '头像上传成功',
            data: userData
        });
    } catch (error) {
        console.error('上传头像失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '服务器错误'
        });
    }
});

module.exports = router;
