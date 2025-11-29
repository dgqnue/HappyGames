const express = require('express');
const router = express.Router();
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// 配置头像上传
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/avatars');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
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

        res.json({
            success: true,
            data: user
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

        if (nickname.length > 20) {
            return res.status(400).json({
                success: false,
                message: '昵称长度不能超过20个字符'
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

        if (!gender || !['male', 'female'].includes(gender)) {
            return res.status(400).json({
                success: false,
                message: '性别参数无效'
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
 * 上传头像
 * POST /api/user/avatar
 */
router.post('/avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '请选择要上传的图片'
            });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        // 删除旧头像（如果不是默认头像）
        const user = await User.findById(req.user._id);
        if (user.avatar && !user.avatar.includes('default-avatar')) {
            const oldAvatarPath = path.join(__dirname, '../../public', user.avatar);
            try {
                await fs.unlink(oldAvatarPath);
            } catch (err) {
                console.log('删除旧头像失败:', err.message);
            }
        }

        // 更新头像
        user.avatar = avatarUrl;
        await user.save();

        res.json({
            success: true,
            message: '头像上传成功',
            data: {
                avatar: avatarUrl
            }
        });
    } catch (error) {
        console.error('上传头像失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '服务器错误'
        });
    }
});

/**
 * 获取用户游戏统计
 * GET /api/user/game-stats/:gameType
 */
router.get('/game-stats/:gameType', async (req, res) => {
    try {
        const { gameType } = req.params;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        const gameStats = user.gameStats.find(s => s.gameType === gameType);

        if (!gameStats) {
            return res.json({
                success: true,
                data: null,
                message: '该游戏暂无数据'
            });
        }

        res.json({
            success: true,
            data: gameStats
        });
    } catch (error) {
        console.error('获取游戏统计失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

/**
 * 获取所有游戏统计
 * GET /api/user/game-stats
 */
router.get('/game-stats', async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            data: user.gameStats
        });
    } catch (error) {
        console.error('获取游戏统计失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

/**
 * 检查昵称是否可用
 * GET /api/user/check-nickname/:nickname
 */
router.get('/check-nickname/:nickname', async (req, res) => {
    try {
        const { nickname } = req.params;
        const isAvailable = await User.isNicknameAvailable(nickname, req.user?.userId);

        res.json({
            success: true,
            available: isAvailable
        });
    } catch (error) {
        console.error('检查昵称失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

/**
 * 获取欢乐豆余额
 * GET /api/user/happy-beans
 */
router.get('/happy-beans', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('happyBeans');

        res.json({
            success: true,
            data: {
                happyBeans: user.happyBeans
            }
        });
    } catch (error) {
        console.error('获取欢乐豆余额失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误'
        });
    }
});

module.exports = router;
