/**
 * 显示称号统计信息
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const UserGameStats = require('../models/UserGameStats');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';

async function showStats() {
    try {
        await mongoose.connect(MONGO_URI);
        
        console.log('\n📊 统计信息');
        console.log('='.repeat(50));
        
        const total = await UserGameStats.countDocuments({
            gameType: 'chinesechess',
            gamesPlayed: { $gt: 0 }
        });
        console.log('总玩家数(有对局记录):', total);
        
        // 称号分布
        const dist = await UserGameStats.aggregate([
            { $match: { gameType: 'chinesechess', gamesPlayed: { $gt: 0 } } },
            { $group: { _id: '$title', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n🏅 称号分布:');
        const titleOrder = ['举世无双', '登峰造极', '傲视群雄', '名满江湖', '炉火纯青', '出类拔萃', '锋芒毕露', '渐入佳境', '小试牛刀', '初出茅庐'];
        const distMap = {};
        dist.forEach(d => distMap[d._id] = d.count);
        titleOrder.forEach(title => {
            if (distMap[title]) {
                console.log('  ', title + ':', distMap[title], '人');
            }
        });
        
        // Top 10
        const top = await UserGameStats.find({
            gameType: 'chinesechess',
            gamesPlayed: { $gt: 0 }
        })
        .sort({ rating: -1 })
        .limit(10)
        .populate('userId', 'nickname isAI')
        .lean();
        
        console.log('\n🥇 Top 10 玩家:');
        top.forEach((t, i) => {
            const user = t.userId;
            const icon = user?.isAI ? '🤖' : '👤';
            const name = user?.nickname || 'Unknown';
            console.log('  ', (i + 1) + '.', icon, name, '- 分数:', t.rating, '- 称号:', t.title);
        });
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

showStats();
