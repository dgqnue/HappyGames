/**
 * 查询所有 dgqnu 账号
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const queryDgqnuAccounts = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        console.log('========== SEARCHING FOR DGQNU ACCOUNTS ==========\n');

        // 查询所有包含 dgqnu 的账户（精确或模糊匹配）
        const users = await db.collection('users').find({
            $or: [
                { username: 'dgqnu' },
                { username: /dgqnu/i }
            ]
        }).toArray();

        console.log(`Found ${users.length} account(s):\n`);

        if (users.length === 0) {
            console.log('No dgqnu accounts found.');
        } else {
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                const userId = user._id.toString();

                console.log(`${i + 1}. Username: ${user.username}`);
                console.log(`   ID: ${userId}`);
                console.log(`   Nickname: ${user.nickname}`);
                console.log(`   Pi ID: ${user.piId}`);
                console.log(`   Created: ${new Date(user.createdAt).toLocaleString('zh-CN')}`);
                console.log(`   Last Login: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : 'Never'}`);
                console.log(`   Login Count: ${user.loginCount || 0}`);

                // 查询该账户的游戏统计
                const gameStats = await db.collection('usergamestats').findOne({
                    userId: new mongoose.Types.ObjectId(userId)
                });

                if (gameStats) {
                    console.log(`   Game Stats: ${gameStats.gamesPlayed} games, ${gameStats.wins}W-${gameStats.losses}L-${gameStats.draws}D`);
                } else {
                    console.log(`   Game Stats: No stats found`);
                }

                // 查询该账户的钱包
                const wallet = await db.collection('wallets').findOne({
                    user: new mongoose.Types.ObjectId(userId)
                });

                if (wallet) {
                    console.log(`   Wallet: ${wallet.happyBeans} Beans`);
                } else {
                    console.log(`   Wallet: Not found`);
                }

                console.log('');
            }
        }

        console.log('='.repeat(60));
        console.log('========== ✅ SEARCH COMPLETE ==========\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

queryDgqnuAccounts();
