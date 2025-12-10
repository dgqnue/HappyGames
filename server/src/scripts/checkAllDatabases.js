/**
 * 检查 MongoDB 集群中的数据库
 */

const { MongoClient } = require('mongodb');

const checkDatabases = async () => {
    const client = new MongoClient(
        'mongodb+srv://HappyGames_db_user:hnb7egvyGMU4hTFT@happygames.ao5zdwu.mongodb.net/?appName=HappyGames'
    );

    try {
        await client.connect();
        const admin = client.db('admin').admin();
        
        const databases = await admin.listDatabases();
        
        console.log('========== MONGODB CLUSTER DATABASES ==========\n');
        
        for (const db of databases.databases) {
            console.log(`Database: ${db.name}`);
            console.log(`  Size: ${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
            console.log('');
        }

        console.log('========== ANALYSIS ==========\n');
        
        const happygamesExists = databases.databases.some(db => db.name === 'happygames');
        const testExists = databases.databases.some(db => db.name === 'test');

        console.log(`✅ happygames database: ${happygamesExists ? '存在' : '不存在'}`);
        console.log(`${testExists ? '⚠️' : '✅'} test database: ${testExists ? '存在（需要删除）' : '已删除'}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
};

checkDatabases();
