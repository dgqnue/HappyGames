/**
 * 查询 dgqnu 和 heroskin 的中国象棋游戏等级分和称号
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const queryPlayerStats = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        console.log('========== PLAYER GAME STATISTICS ==========\n');

        // 获取两个用户的ID
        const users = await db.collection('users').find({
            username: { $in: ['dgqnu', 'heroskin'] }
        }).toArray();

        for (const user of users) {
            const userId = user._id.toString();
            const username = user.username;

            console.log(`\n👤 User: ${username}`);
            console.log(`   ID: ${userId}`);
            console.log('─'.repeat(60));

            // 查询该用户的游戏统计
            const gameStats = await db.collection('usergamestats').findOne({
                userId: new mongoose.Types.ObjectId(userId),
                gameType: 'chinesechess'
            });

            if (gameStats) {
                console.log(`\n📊 中国象棋 (Chinese Chess):`);
                console.log(`   等级分(Rating):    ${gameStats.rating}`);
                console.log(`   称号(Title):       ${gameStats.title}`);
                console.log(`   段位(Rank):        ${gameStats.titleRank}`);
                console.log(`   段位颜色(Color):   ${gameStats.titleColor}`);
                console.log(`\n   📈 战绩统计:`);
                console.log(`   总局数:            ${gameStats.gamesPlayed}`);
                console.log(`   胜场:              ${gameStats.wins}`);
                console.log(`   负场:              ${gameStats.losses}`);
                console.log(`   平局:              ${gameStats.draws}`);
                console.log(`   断线次数:          ${gameStats.disconnects}`);
                console.log(`   断线率:            ${gameStats.disconnectRate}%`);
                console.log(`   最后游戏时间:      ${new Date(gameStats.lastPlayedAt).toLocaleString('zh-CN')}`);
            } else {
                console.log('   ⚠️ No game statistics found for chinesechess');
            }
        }

        console.log('\n' + '='.repeat(60));
        console.log('========== ✅ QUERY COMPLETE ==========\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

queryPlayerStats();
