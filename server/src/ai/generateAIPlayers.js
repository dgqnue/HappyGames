/**
 * AI 玩家生成脚本
 * 
 * 批量生成 200 个 AI 玩家，分布在各个分数段
 * 运行方式: node server/src/ai/generateAIPlayers.js
 * 
 * 文件位置: server/src/ai/generateAIPlayers.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');
const { AI_STRENGTH_CONFIG } = require('./ChessAIEngine');

// 数据库连接
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';

// AI 昵称库（中文风格，让玩家觉得是真人）
const NICKNAMES = {
    prefixes: [
        '快乐', '阳光', '微笑', '星空', '清风', '明月', '云端', '晨曦', '暮色', '静默',
        '悠然', '自在', '逍遥', '淡然', '从容', '安静', '温柔', '坚强', '勇敢', '智慧',
        '棋', '弈', '将', '帅', '兵', '马', '炮', '车', '象', '士',
        '江南', '塞北', '关外', '山东', '河北', '岭南', '蜀中', '西北', '东海', '南山'
    ],
    middles: [
        '小', '大', '老', '阿', '', '', '', '', '', '',
        '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'
    ],
    suffixes: [
        '棋手', '高手', '新手', '菜鸟', '大侠', '少侠', '先生', '女士', '哥', '姐',
        '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '周', '吴',
        '龙', '虎', '鹰', '狼', '熊', '豹', '鹤', '凤', '麟', '龟'
    ],
    // 完整昵称模板
    templates: [
        '{prefix}{suffix}',
        '{prefix}的{suffix}',
        '{middle}{suffix}',
        '{prefix}{middle}',
        '爱下棋的{suffix}',
        '{prefix}棋友',
        '象棋{suffix}',
        '{prefix}{prefix2}',
        '快乐{suffix}',
        '{suffix}爱象棋'
    ]
};

// 默认头像列表（部分用系统默认，部分用预设）
const AVATARS = [
    '/images/default-avatar.svg',           // 系统默认
    '/images/avatars/ai/avatar_01.png',
    '/images/avatars/ai/avatar_02.png',
    '/images/avatars/ai/avatar_03.png',
    '/images/avatars/ai/avatar_04.png',
    '/images/avatars/ai/avatar_05.png',
    '/images/avatars/ai/avatar_06.png',
    '/images/avatars/ai/avatar_07.png',
    '/images/avatars/ai/avatar_08.png',
    '/images/avatars/ai/avatar_09.png',
    '/images/avatars/ai/avatar_10.png'
];

// 分数分布配置（rating 范围 -> 玩家数量，100分一档）
const RATING_DISTRIBUTION = [
    { min: 800, max: 900, count: 12, strength: 'rating_800' },    // 入门级
    { min: 900, max: 1000, count: 14, strength: 'rating_900' },   // 新手级
    { min: 1000, max: 1100, count: 16, strength: 'rating_1000' }, // 初学级
    { min: 1100, max: 1200, count: 18, strength: 'rating_1100' }, // 入门进阶
    { min: 1200, max: 1300, count: 20, strength: 'rating_1200' }, // 中级入门
    { min: 1300, max: 1400, count: 22, strength: 'rating_1300' }, // 中级
    { min: 1400, max: 1500, count: 20, strength: 'rating_1400' }, // 中高级
    { min: 1500, max: 1600, count: 18, strength: 'rating_1500' }, // 高级
    { min: 1600, max: 1700, count: 16, strength: 'rating_1600' }, // 专家入门
    { min: 1700, max: 1800, count: 14, strength: 'rating_1700' }, // 专家级
    { min: 1800, max: 1900, count: 12, strength: 'rating_1800' }, // 大师入门
    { min: 1900, max: 2000, count: 10, strength: 'rating_1900' }, // 大师级
    { min: 2000, max: 2100, count: 8, strength: 'rating_2000' }   // 宗师级
];

/**
 * 生成随机昵称
 */
function generateNickname(usedNicknames) {
    const { prefixes, middles, suffixes, templates } = NICKNAMES;
    let nickname;
    let attempts = 0;
    
    do {
        const template = templates[Math.floor(Math.random() * templates.length)];
        nickname = template
            .replace('{prefix}', prefixes[Math.floor(Math.random() * prefixes.length)])
            .replace('{prefix2}', prefixes[Math.floor(Math.random() * prefixes.length)])
            .replace('{middle}', middles[Math.floor(Math.random() * middles.length)])
            .replace('{suffix}', suffixes[Math.floor(Math.random() * suffixes.length)]);
        
        // 添加随机数字后缀避免重复
        if (attempts > 5) {
            nickname += Math.floor(Math.random() * 1000);
        }
        attempts++;
    } while (usedNicknames.has(nickname) && attempts < 20);
    
    usedNicknames.add(nickname);
    return nickname;
}

/**
 * 生成随机头像
 */
function generateAvatar() {
    // 60% 概率使用系统默认头像
    if (Math.random() < 0.6) {
        return '/images/default-avatar.svg';
    }
    return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

/**
 * 根据 rating 获取对应的称号
 */
function getTitleByRating(rating) {
    // 简化版称号分配（与 Grade.js 保持一致的逻辑）
    if (rating >= 1800) return { title: '登峰造极', titleColor: '#800080' };
    if (rating >= 1600) return { title: '傲视群雄', titleColor: '#7b2cbf' };
    if (rating >= 1400) return { title: '名满江湖', titleColor: '#ffba08' };
    if (rating >= 1200) return { title: '炉火纯青', titleColor: '#06bee1' };
    if (rating >= 1000) return { title: '出类拔萃', titleColor: '#FF0000' };
    if (rating >= 800) return { title: '锋芒毕露', titleColor: '#0000FF' };
    return { title: '初出茅庐', titleColor: '#000000' };
}

/**
 * 生成单个 AI 玩家
 */
async function createAIPlayer(index, ratingConfig, usedNicknames) {
    const nickname = generateNickname(usedNicknames);
    const rating = Math.floor(Math.random() * (ratingConfig.max - ratingConfig.min)) + ratingConfig.min;
    const titleInfo = getTitleByRating(rating);
    
    // 模拟一些游戏历史数据
    const gamesPlayed = Math.floor(Math.random() * 200) + 20;
    const winRate = 0.4 + Math.random() * 0.3; // 40%-70% 胜率
    const wins = Math.floor(gamesPlayed * winRate);
    const losses = gamesPlayed - wins;
    
    const aiUserId = `ai_player_${String(index).padStart(4, '0')}`;
    
    // 创建用户
    const user = new User({
        userId: aiUserId,
        username: `ai_${nickname.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '')}`,
        nickname: nickname,
        avatar: generateAvatar(),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        happyBeans: Math.floor(Math.random() * 50000) + 1000,
        isAI: true,
        aiConfig: {
            strengthLevel: ratingConfig.strength,
            personality: ['aggressive', 'defensive', 'balanced'][Math.floor(Math.random() * 3)]
        },
        accountStatus: 'active',
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // 随机过去90天内
    });
    
    await user.save();
    
    // 创建游戏统计
    const stats = new UserGameStats({
        userId: aiUserId,
        gameType: 'chinesechess',
        rating: rating,
        gamesPlayed: gamesPlayed,
        wins: wins,
        losses: losses,
        draws: 0,
        disconnects: 0,
        title: titleInfo.title,
        titleRank: getTitleRank(titleInfo.title),
        titleColor: titleInfo.titleColor,
        lastPlayedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 过去7天内
    });
    
    await stats.save();
    
    return { user, stats };
}

/**
 * 获取称号排名
 */
function getTitleRank(title) {
    const ranks = {
        '初出茅庐': 1,
        '小试牛刀': 2,
        '渐入佳境': 3,
        '锋芒毕露': 4,
        '出类拔萃': 5,
        '炉火纯青': 6,
        '名满江湖': 7,
        '傲视群雄': 8,
        '登峰造极': 9,
        '举世无双': 10
    };
    return ranks[title] || 1;
}

/**
 * 生成指定数量的 AI 玩家（可被外部调用）
 * @param {number} targetCount - 目标 AI 玩家总数
 * @param {boolean} force - 是否强制删除现有 AI 重新生成
 * @returns {Promise<number>} - 实际创建的数量
 */
async function ensureAIPlayers(targetCount = 200, force = false) {
    // 检查是否已存在 AI 玩家
    const existingAICount = await User.countDocuments({ isAI: true });
    
    if (existingAICount >= targetCount && !force) {
        console.log(`[AIGenerator] ✅ Already have ${existingAICount} AI players (target: ${targetCount})`);
        return 0;
    }
    
    if (force && existingAICount > 0) {
        console.log(`[AIGenerator] 🗑️ Deleting ${existingAICount} existing AI players...`);
        await User.deleteMany({ isAI: true });
        await UserGameStats.deleteMany({ userId: /^ai_player_/ });
    }
    
    const needToCreate = force ? targetCount : (targetCount - existingAICount);
    console.log(`[AIGenerator] 🤖 Creating ${needToCreate} AI players...`);
    
    const usedNicknames = new Set();
    
    // 获取已有昵称避免重复
    if (!force) {
        const existingUsers = await User.find({ isAI: true }).select('nickname').lean();
        existingUsers.forEach(u => usedNicknames.add(u.nickname));
    }
    
    let totalCreated = 0;
    let playerIndex = force ? 1 : existingAICount + 1;
    
    // 按比例分配到各个分数段
    const distribution = RATING_DISTRIBUTION.map(config => ({
        ...config,
        count: Math.round(config.count * needToCreate / 200) // 按比例调整
    }));
    
    for (const config of distribution) {
        for (let i = 0; i < config.count && totalCreated < needToCreate; i++) {
            try {
                await createAIPlayer(playerIndex, config, usedNicknames);
                totalCreated++;
                playerIndex++;
                
                if (totalCreated % 50 === 0) {
                    console.log(`[AIGenerator]   ✅ Created ${totalCreated}/${needToCreate} players...`);
                }
            } catch (err) {
                console.error(`[AIGenerator]   ❌ Failed to create player ${playerIndex}:`, err.message);
                playerIndex++;
            }
        }
    }
    
    console.log(`[AIGenerator] 🎉 Successfully created ${totalCreated} AI players!`);
    return totalCreated;
}

/**
 * 主函数：生成所有 AI 玩家（命令行调用）
 */
async function generateAllAIPlayers() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        // 检查是否已存在 AI 玩家
        const existingAICount = await User.countDocuments({ isAI: true });
        if (existingAICount > 0) {
            console.log(`⚠️ Found ${existingAICount} existing AI players.`);
            console.log('   Run with --force to delete and regenerate.');
            
            if (process.argv.includes('--force')) {
                console.log('🗑️ Deleting existing AI players...');
                await User.deleteMany({ isAI: true });
                await UserGameStats.deleteMany({ userId: /^ai_player_/ });
                console.log('✅ Deleted existing AI players');
            } else {
                console.log('❌ Aborting. Use --force to regenerate.');
                process.exit(0);
            }
        }
        
        console.log('\n🤖 Generating AI players...\n');
        
        const usedNicknames = new Set();
        let totalCreated = 0;
        let playerIndex = 1;
        
        for (const config of RATING_DISTRIBUTION) {
            console.log(`📊 Creating ${config.count} players (rating ${config.min}-${config.max}, ${config.strength})...`);
            
            for (let i = 0; i < config.count; i++) {
                try {
                    const { user, stats } = await createAIPlayer(playerIndex, config, usedNicknames);
                    totalCreated++;
                    playerIndex++;
                    
                    if (totalCreated % 20 === 0) {
                        console.log(`   ✅ Created ${totalCreated} players...`);
                    }
                } catch (err) {
                    console.error(`   ❌ Failed to create player ${playerIndex}:`, err.message);
                    playerIndex++;
                }
            }
        }
        
        console.log(`\n🎉 Successfully created ${totalCreated} AI players!\n`);
        
        // 打印统计
        const stats = await UserGameStats.aggregate([
            { $match: { userId: /^ai_player_/ } },
            { $group: { 
                _id: null, 
                avgRating: { $avg: '$rating' },
                minRating: { $min: '$rating' },
                maxRating: { $max: '$rating' },
                count: { $sum: 1 }
            }}
        ]);
        
        if (stats.length > 0) {
            console.log('📈 AI Players Statistics:');
            console.log(`   Total: ${stats[0].count}`);
            console.log(`   Rating Range: ${stats[0].minRating} - ${stats[0].maxRating}`);
            console.log(`   Average Rating: ${Math.round(stats[0].avgRating)}`);
        }
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// 导出供其他模块使用
module.exports = {
    ensureAIPlayers,
    generateNickname,
    getTitleByRating,
    RATING_DISTRIBUTION
};

// 仅在直接运行时执行
if (require.main === module) {
    generateAllAIPlayers();
}
