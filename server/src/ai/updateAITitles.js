/**
 * 更新所有玩家（包括 AI）的称号
 * 
 * 这个脚本调用 Grade.updateAllPlayerTitles() 方法，
 * 根据所有玩家的分数排名重新计算称号。
 * AI 玩家和真实玩家一起参与排名。
 * 
 * 运行方式: node server/src/ai/updateAITitles.js
 * 
 * 文件位置: server/src/ai/updateAITitles.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Grade = require('../games/chinesechess/grade/Grade');
const UserGameStats = require('../models/UserGameStats');
const User = require('../models/User');

// 数据库连接
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';

async function updateAllTitles() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB\n');

        // 1. 先显示当前统计
        const totalUsers = await User.countDocuments();
        const aiUsers = await User.countDocuments({ isAI: true });
        const humanUsers = totalUsers - aiUsers;
        
        console.log('📊 Current User Statistics:');
        console.log(`   Total users: ${totalUsers}`);
        console.log(`   AI players: ${aiUsers}`);
        console.log(`   Human players: ${humanUsers}\n`);

        // 2. 显示游戏统计
        const statsWithGames = await UserGameStats.countDocuments({ 
            gameType: 'chinesechess', 
            gamesPlayed: { $gt: 0 } 
        });
        
        // 获取 AI 玩家的 userId 列表
        const aiUserList = await User.find({ isAI: true }).select('userId').lean();
        const aiUserIds = aiUserList.map(u => u.userId);
        
        const aiStatsWithGames = await UserGameStats.countDocuments({ 
            gameType: 'chinesechess', 
            gamesPlayed: { $gt: 0 },
            userId: { $in: aiUserIds }
        });
        
        console.log('🎮 Game Statistics (chinesechess):');
        console.log(`   Players with games: ${statsWithGames}`);
        console.log(`   AI players with games: ${aiStatsWithGames}`);
        console.log(`   Human players with games: ${statsWithGames - aiStatsWithGames}\n`);

        // 3. 调用 Grade 更新所有玩家称号
        console.log('🏆 Updating all player titles based on ranking...\n');
        const grade = new Grade();
        const results = await grade.updateAllPlayerTitles('chinesechess');

        // 4. 统计称号分布
        const titleDistribution = {};
        for (const userId in results) {
            const title = results[userId].title;
            titleDistribution[title] = (titleDistribution[title] || 0) + 1;
        }

        console.log('\n📈 Title Distribution After Update:');
        const titleOrder = [
            '举世无双', '登峰造极', '傲视群雄', '名满江湖', 
            '炉火纯青', '出类拔萃', '锋芒毕露', '渐入佳境', 
            '小试牛刀', '初出茅庐'
        ];
        for (const title of titleOrder) {
            if (titleDistribution[title]) {
                console.log(`   ${title}: ${titleDistribution[title]} players`);
            }
        }

        // 5. 显示 Top 10 玩家
        console.log('\n🥇 Top 10 Players:');
        const top10 = await UserGameStats.find({ 
            gameType: 'chinesechess', 
            gamesPlayed: { $gt: 0 } 
        })
        .sort({ rating: -1 })
        .limit(10)
        .lean();

        // 创建 AI userId 集合用于快速查找
        const aiUserIdSet = new Set(aiUserIds);

        for (let i = 0; i < top10.length; i++) {
            const stats = top10[i];
            const isAI = aiUserIdSet.has(stats.userId) ? '🤖' : '👤';
            console.log(`   ${i + 1}. ${isAI} ${stats.userId} - Rating: ${stats.rating}, Title: ${stats.title}`);
        }

        console.log('\n✅ All titles updated successfully!');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// 运行
updateAllTitles();
