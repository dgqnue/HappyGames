const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    // ========== 基础身份信息 ==========
    userId: {
        type: String,
        required: true,
        unique: true,
        immutable: true, // 永远不可更改
        index: true
    },

    // Pi Network 用户名（登录凭证，不可更改）
    username: {
        type: String,
        required: true,
        unique: true,
        immutable: true, // 永远不可更改
        trim: true,
        index: true
    },

    // Pi Network ID
    piId: {
        type: String,
        unique: true,
        sparse: true,
        immutable: true // 永远不可更改
    },

    // ========== 个人资料 ==========
    // 昵称（可更改，但不能与其他用户重复）
    nickname: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },

    // 头像 URL
    avatar: {
        type: String,
        default: '/images/default-avatar.jpg' // 默认头像
    },

    // 性别（male/female，第一次登录随机生成，可更改）
    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },

    // ========== 游戏货币 ==========
    // 欢乐豆数量
    happyBeans: {
        type: Number,
        default: 0, // 新用户初始为 0
        min: 0
    },

    // ========== 游戏数据 ==========
    // 游戏统计数据（每个游戏一个对象）
    gameStats: [{
        gameType: {
            type: String,
            required: true,
            index: true
        },
        gameName: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            default: 1200 // 初始等级分
        },
        title: {
            type: String,
            default: '初出茅庐' // 称号
        },
        titleColor: {
            type: String,
            default: '#666666' // 称号颜色
        },
        gamesPlayed: {
            type: Number,
            default: 0
        },
        wins: {
            type: Number,
            default: 0
        },
        losses: {
            type: Number,
            default: 0
        },
        draws: {
            type: Number,
            default: 0
        },
        disconnects: {
            type: Number,
            default: 0
        },
        // 胜率（百分比）
        winRate: {
            type: Number,
            default: 0
        },
        // 掉线率（百分比）
        disconnectRate: {
            type: Number,
            default: 0
        },
        // 最高连胜
        maxWinStreak: {
            type: Number,
            default: 0
        },
        // 当前连胜
        currentWinStreak: {
            type: Number,
            default: 0
        },
        // 游戏特定数据（JSON 格式，每个游戏可以自定义）
        gameSpecificData: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },
        // 最后游戏时间
        lastPlayedAt: {
            type: Date,
            default: null
        },
        // 首次游戏时间
        firstPlayedAt: {
            type: Date,
            default: Date.now
        }
    }],

    // ========== 推荐系统 ==========
    referralCode: {
        type: String,
        unique: true,
        index: true
    },
    referrer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    referralLevel: {
        type: Number,
        default: 1,
        min: 1,
        max: 5
    },
    referralStats: {
        inviteCount: { type: Number, default: 0 },
        totalFlow: { type: Number, default: 0 }
    },
    isInvited: {
        type: Boolean,
        default: false
    },

    // ========== 账户状态 ==========
    // 账户状态（active/banned/suspended）
    accountStatus: {
        type: String,
        enum: ['active', 'banned', 'suspended'],
        default: 'active'
    },

    // 最后登录时间
    lastLoginAt: {
        type: Date,
        default: Date.now
    },

    // 登录次数
    loginCount: {
        type: Number,
        default: 0
    },

    // 账户创建时间
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },

    // 最后更新时间
    updatedAt: {
        type: Date,
        default: Date.now
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
    return this.gameStats.reduce((sum, stat) => sum + stat.gamesPlayed, 0);
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
    const count = await this.countDocuments();
    return `HG${String(count + 1).padStart(8, '0')}`; // 例如: HG00000001
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
