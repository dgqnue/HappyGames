/**
 * 用户模型
 * 定义用户的数据库结构、索引、虚拟字段、实例方法和静态方法。
 */

const mongoose = require('mongoose');

// 定义用户的 Schema
const UserSchema = new mongoose.Schema({
    // ========== 基础身份信息 ==========
    userId: {
        type: String, // 用户唯一标识符
        required: true, // 必填字段
        unique: true, // 必须唯一
        immutable: true, // 不可更改
        index: true // 创建索引以加速查询
    },

    username: {
        type: String, // Pi Network 用户名
        required: true, // 必填字段
        unique: true, // 必须唯一
        immutable: true, // 不可更改
        trim: true, // 去除首尾空格
        index: true // 创建索引
    },

    piId: {
        type: String, // Pi Network ID
        unique: true, // 必须唯一
        sparse: true, // 允许 null 值重复
        immutable: true // 不可更改
    },

    password: {
        type: String, // 用户密码（加密存储）
        select: false // 默认查询时不返回该字段
    },

    // ========== 个人资料 ==========
    nickname: {
        type: String, // 用户昵称
        required: true, // 必填字段
        unique: true, // 必须唯一
        trim: true, // 去除首尾空格
        index: true // 创建索引
    },

    avatar: {
        type: String, // 用户头像 URL
        default: '/images/default-avatar.svg' // 默认头像路径
    },

    gender: {
        type: String, // 用户性别
        enum: ['male', 'female'], // 限定值为 male 或 female
        required: true // 必填字段
    },

    // ========== 游戏货币 ==========
    happyBeans: {
        type: Number, // 欢乐豆数量
        default: 0, // 默认值为 0
        min: 0 // 最小值为 0
    },

    // ========== 游戏数据 ==========
    gameStats: [{
        gameType: {
            type: String, // 游戏类型
            required: true, // 必填字段
            index: true // 创建索引
        },
        gameName: {
            type: String, // 游戏名称
            required: true // 必填字段
        },
        rating: {
            type: Number, // 游戏评分
            default: 1200 // 默认初始评分
        },
        title: {
            type: String, // 游戏称号
            default: '初出茅庐' // 默认称号
        },
        titleColor: {
            type: String, // 称号颜色
            default: '#666666' // 默认颜色
        },
        gamesPlayed: {
            type: Number, // 游戏场次
            default: 0 // 默认值为 0
        },
        wins: {
            type: Number, // 胜利场次
            default: 0 // 默认值为 0
        },
        losses: {
            type: Number, // 失败场次
            default: 0 // 默认值为 0
        },
        draws: {
            type: Number, // 平局场次
            default: 0 // 默认值为 0
        },
        disconnects: {
            type: Number, // 掉线场次
            default: 0 // 默认值为 0
        },
        winRate: {
            type: Number, // 胜率（百分比）
            default: 0 // 默认值为 0
        },
        disconnectRate: {
            type: Number, // 掉线率（百分比）
            default: 0 // 默认值为 0
        },
        maxWinStreak: {
            type: Number, // 最高连胜
            default: 0 // 默认值为 0
        },
        currentWinStreak: {
            type: Number, // 当前连胜
            default: 0 // 默认值为 0
        },
        gameSpecificData: {
            type: mongoose.Schema.Types.Mixed, // 游戏特定数据（JSON 格式）
            default: {} // 默认值为空对象
        },
        lastPlayedAt: {
            type: Date, // 最后游戏时间
            default: null // 默认值为空
        },
        firstPlayedAt: {
            type: Date, // 首次游戏时间
            default: Date.now // 默认值为当前时间
        }
    }], // 修复缺少的逗号

    // ========== 推荐系统 ==========
    referralCode: {
        type: String, // 推荐码
        unique: true, // 必须唯一
        sparse: true, // 允许 null 值重复
        index: true // 创建索引
    },
    referrer: {
        type: mongoose.Schema.Types.ObjectId, // 推荐人 ID
        ref: 'User', // 关联到 User 模型
        default: null // 默认值为空
    },
    referralLevel: {
        type: Number, // 推荐等级
        default: 1, // 默认值为 1
        min: 1, // 最小值为 1
        max: 5 // 最大值为 5
    },
    referralStats: {
        inviteCount: { type: Number, default: 0 }, // 邀请人数
        totalFlow: { type: Number, default: 0 } // 总流水
    },
    isInvited: {
        type: Boolean, // 是否被邀请
        default: false // 默认值为 false
    },

    // ========== 账户状态 ==========
    accountStatus: {
        type: String, // 账户状态
        enum: ['active', 'banned', 'suspended'], // 限定值
        default: 'active' // 默认值为 active
    },

    lastLoginAt: {
        type: Date, // 最后登录时间
        default: Date.now // 默认值为当前时间
    },

    loginCount: {
        type: Number, // 登录次数
        default: 0 // 默认值为 0
    },

    createdAt: {
        type: Date, // 账户创建时间
        default: Date.now, // 默认值为当前时间
        immutable: true // 不可更改
    },

    updatedAt: {
        type: Date, // 最后更新时间
        default: Date.now // 默认值为当前时间
    }
}, {
    timestamps: true // 自动管理 createdAt 和 updatedAt
});

// ========== 索引 ==========
UserSchema.index({ userId: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ nickname: 1 });
UserSchema.index({ 'gameStats.gameType': 1 });

// ========== 虚拟字段 ==========
// 总游戏场次
UserSchema.virtual('totalGamesPlayed').get(function () {
    return this.gameStats.reduce((sum, stat) => sum + stat.gamesPlayed, 0); // 计算总游戏场次
});

// ========== 实例方法 ==========
/**
 * 获取或创建游戏统计数据
 */
UserSchema.methods.getOrCreateGameStats = function (gameType, gameName) {
    let stats = this.gameStats.find(s => s.gameType === gameType);

    if (!stats) {
        stats = {
            gameType,
            gameName,
            rating: 1200,
            title: '初出茅庐',
            titleColor: '#666666',
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            disconnects: 0,
            winRate: 0,
            disconnectRate: 0,
            maxWinStreak: 0,
            currentWinStreak: 0,
            gameSpecificData: {},
            firstPlayedAt: new Date()
        };
        this.gameStats.push(stats);
    }

    return stats;
};

/**
 * 更新游戏统计数据
 */
UserSchema.methods.updateGameStats = function (gameType, updates) {
    const stats = this.gameStats.find(s => s.gameType === gameType);

    if (stats) {
        Object.assign(stats, updates);

        // 重新计算胜率和掉线率
        if (stats.gamesPlayed > 0) {
            stats.winRate = Math.round((stats.wins / stats.gamesPlayed) * 100);
            stats.disconnectRate = Math.round((stats.disconnects / stats.gamesPlayed) * 100);
        }

        stats.lastPlayedAt = new Date();
    }

    return stats;
};

/**
 * 增加欢乐豆
 */
UserSchema.methods.addHappyBeans = function (amount) {
    this.happyBeans += amount;
    if (this.happyBeans < 0) this.happyBeans = 0;
    return this.happyBeans;
};

/**
 * 扣除欢乐豆
 */
UserSchema.methods.deductHappyBeans = function (amount) {
    if (this.happyBeans < amount) {
        return false; // 余额不足
    }
    this.happyBeans -= amount;
    return true;
};

// ========== 静态方法 ==========
/**
 * 生成唯一的 userId
 */
UserSchema.statics.generateUserId = async function () {
    // 根本改进：使用随机数生成 ID，避免并发冲突和全表扫描性能问题
    // 这种方式在分布式环境中更安全，且不依赖数据库当前的文档总数
    let isUnique = false;
    let userId = '';
    let attempts = 0;

    while (!isUnique && attempts < 5) {
        // 生成 8 位随机数字 (10000000 - 99999999)
        const random = Math.floor(10000000 + Math.random() * 90000000);
        userId = `HG${random}`;

        // 检查唯一性
        const existing = await this.findOne({ userId });
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }

    // 极低概率兜底（如果连续5次随机都冲突）：使用时间戳后8位
    if (!isUnique) {
        userId = `HG${Date.now().toString().slice(-8)}`;
    }

    return userId;
};

/**
 * 检查昵称是否可用
 */
UserSchema.statics.isNicknameAvailable = async function (nickname, excludeUserId = null) {
    const query = { nickname };
    if (excludeUserId) {
        query.userId = { $ne: excludeUserId };
    }
    const user = await this.findOne(query);
    return !user;
};

module.exports = mongoose.model('User', UserSchema);
