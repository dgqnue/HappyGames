/**
 * 检查 test 数据库中的内容
 */

const { MongoClient } = require('mongodb');

const checkTestDb = async () => {
    const client = new MongoClient(
        'mongodb+srv://HappyGames_db_user:hnb7egvyGMU4hTFT@happygames.ao5zdwu.mongodb.net/?appName=HappyGames'
    );

    try {
        await client.connect();
        const testDb = client.db('test');

        console.log('========== TEST DATABASE CONTENTS ==========\n');

        const collections = await testDb.listCollections().toArray();
        console.log(`Collections found: ${collections.length}\n`);

        for (const collection of collections) {
            const collName = collection.name;
            const count = await testDb.collection(collName).countDocuments();
            console.log(`📦 ${collName}: ${count} documents`);

            if (count > 0) {
                const samples = await testDb.collection(collName).find({}).limit(3).toArray();
                for (const doc of samples) {
                    console.log(`   - ${JSON.stringify(doc).substring(0, 100)}...`);
                }
            }
            console.log('');
        }

        console.log('='.repeat(60));
        console.log('========== ✅ CHECK COMPLETE ==========\n');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
};

checkTestDb();
