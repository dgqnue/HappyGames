/**
 * 修复 AI 玩家的 UserGameStats 记录
 * 
 * 由于之前生成时 userId 类型不匹配，需要重新创建 UserGameStats
 * 使用 User._id (ObjectId) 而不是 User.userId (String)
 * 
 * 运行方式: node server/src/ai/fixAIGameStats.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const UserGameStats = require('../models/UserGameStats');
const Grade = require('../games/chinesechess/grade/Grade');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';

// 分数分布配置（与 generateAIPlayers.js 保持一致）
const RATING_DISTRIBUTION = [
    { min: 800, max: 1000, strength: 'beginner' },
    { min: 1000, max: 1200, strength: 'easy' },
    { min: 1200, max: 1400, strength: 'medium' },
    { min: 1400, max: 1600, strength: 'hard' },
    { min: 1600, max: 1800, strength: 'expert' },
    { min: 1800, max: 2000, strength: 'master' }
];

/**
 * 根据强度等级获取分数范围
 */
function getRatingRange(strengthLevel) {
    const config = RATING_DISTRIBUTION.find(c => c.strength === strengthLevel);
    return config || { min: 1000, max: 1400 };
}

/**
 * 生成随机分数
 */
function generateRating(strengthLevel) {
    const range = getRatingRange(strengthLevel);
    return Math.floor(Math.random() * (range.max - range.min)) + range.min;
}

async function fixAIGameStats() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // 1. 获取所有 AI 玩家
        const aiUsers = await User.find({ isAI: true }).lean();
        console.log(`📊 Found ${aiUsers.length} AI players\n`);

        if (aiUsers.length === 0) {
            console.log('❌ No AI players found!');
            return;
        }

        // 2. 检查哪些 AI 玩家缺少 UserGameStats
        let created = 0;
        let skipped = 0;

        for (const user of aiUsers) {
            // 使用 User._id (ObjectId) 查询
            const existingStats = await UserGameStats.findOne({ 
                userId: user._id, 
                gameType: 'chinesechess' 
            });

            if (existingStats) {
                skipped++;
                continue;
            }

            // 获取强度等级
            const strengthLevel = user.aiConfig?.strengthLevel || 'medium';
            const rating = generateRating(strengthLevel);
            
            // 模拟一些游戏历史数据
            const gamesPlayed = Math.floor(Math.random() * 200) + 20;
            const winRate = 0.4 + Math.random() * 0.3;
            const wins = Math.floor(gamesPlayed * winRate);
            const losses = gamesPlayed - wins;

            // 创建 UserGameStats，使用 User._id
            const stats = new UserGameStats({
                userId: user._id,  // 使用 ObjectId
                gameType: 'chinesechess',
                rating: rating,
                gamesPlayed: gamesPlayed,
                wins: wins,
                losses: losses,
                draws: 0,
                disconnects: 0,
                title: '初出茅庐',  // 临时称号，稍后会更新
                titleRank: 1,
                titleColor: '#000000',
                lastPlayedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
            });

            await stats.save();
            created++;

            if (created % 50 === 0) {
                console.log(`   ✅ Created ${created} UserGameStats...`);
            }
        }

        console.log(`\n📈 Results:`);
        console.log(`   Created: ${created}`);
        console.log(`   Skipped (already exists): ${skipped}`);

        // 3. 更新所有玩家的称号
        if (created > 0) {
            console.log('\n🏆 Updating all player titles based on ranking...');
            const grade = new Grade();
            await grade.updateAllPlayerTitles('chinesechess');
            console.log('✅ Titles updated!');
        }

        // 4. 显示统计
        const totalStats = await UserGameStats.countDocuments({ gameType: 'chinesechess' });
        const statsWithGames = await UserGameStats.countDocuments({ 
            gameType: 'chinesechess', 
            gamesPlayed: { $gt: 0 } 
        });

        console.log('\n📊 Final Statistics:');
        console.log(`   Total UserGameStats: ${totalStats}`);
        console.log(`   Players with games: ${statsWithGames}`);

        // 5. 显示称号分布
        const titleDist = await UserGameStats.aggregate([
            { $match: { gameType: 'chinesechess', gamesPlayed: { $gt: 0 } } },
            { $group: { _id: '$title', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        console.log('\n🏅 Title Distribution:');
        for (const t of titleDist) {
            console.log(`   ${t._id}: ${t.count} players`);
        }

        // 6. 显示 Top 10
        console.log('\n🥇 Top 10 Players:');
        const top10 = await UserGameStats.find({ 
            gameType: 'chinesechess', 
            gamesPlayed: { $gt: 0 } 
        })
        .sort({ rating: -1 })
        .limit(10)
        .populate('userId', 'nickname isAI')
        .lean();

        for (let i = 0; i < top10.length; i++) {
            const stats = top10[i];
            const user = stats.userId;
            const isAI = user?.isAI ? '🤖' : '👤';
            const name = user?.nickname || 'Unknown';
            console.log(`   ${i + 1}. ${isAI} ${name} - Rating: ${stats.rating}, Title: ${stats.title}`);
        }

        console.log('\n✅ Fix completed successfully!');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// 运行
fixAIGameStats();
