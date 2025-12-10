/**
 * 删除 test 数据库中的新建 dgqnu 账号
 */

const { MongoClient } = require('mongodb');

const cleanupTestDb = async () => {
    const client = new MongoClient(
        'mongodb+srv://HappyGames_db_user:hnb7egvyGMU4hTFT@happygames.ao5zdwu.mongodb.net/?appName=HappyGames'
    );

    try {
        await client.connect();
        const testDb = client.db('test');

        console.log('========== CLEANUP TEST DATABASE ==========\n');

        // 删除 test 数据库中的 dgqnu 账号
        const usersCollection = testDb.collection('users');
        const dgqnuInTest = await usersCollection.findOne({ username: 'dgqnu' });

        if (dgqnuInTest) {
            const userId = dgqnuInTest._id;
            console.log(`Found dgqnu in test DB: ${userId}\n`);

            // 删除用户
            await usersCollection.deleteOne({ _id: userId });
            console.log(`✅ Deleted user: ${userId}`);

            // 删除对应的钱包
            const walletsCollection = testDb.collection('wallets');
            const result = await walletsCollection.deleteOne({ user: userId });
            console.log(`✅ Deleted wallet: ${result.deletedCount} document(s)`);

            // 删除对应的游戏统计
            const statsCollection = testDb.collection('usergamestats');
            const result2 = await statsCollection.deleteMany({ userId: userId });
            console.log(`✅ Deleted game stats: ${result2.deletedCount} document(s)`);
        } else {
            console.log('No dgqnu account found in test DB');
        }

        console.log('\n========== VERIFY CLEANUP ==========\n');

        // 验证是否删除成功
        const collections = await testDb.listCollections().toArray();
        for (const collection of collections) {
            const count = await testDb.collection(collection.name).countDocuments();
            console.log(`${collection.name}: ${count} documents`);
        }

        console.log('\n========== NOW DELETING TEST DATABASE ==========\n');

        // 删除整个 test 数据库
        await testDb.dropDatabase();
        console.log('✅ test database deleted');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
};

cleanupTestDb();
