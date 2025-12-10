/**
 * 删除不需要的数据库
 */

const { MongoClient } = require('mongodb');

const cleanupDatabases = async () => {
    const client = new MongoClient(
        'mongodb+srv://HappyGames_db_user:hnb7egvyGMU4hTFT@happygames.ao5zdwu.mongodb.net/?appName=HappyGames'
    );

    try {
        await client.connect();
        console.log('Connected to MongoDB cluster...\n');

        // 要删除的数据库
        const databasesToDelete = ['test', 'sample_mflix'];

        console.log('========== DATABASE CLEANUP ==========\n');

        for (const dbName of databasesToDelete) {
            try {
                const db = client.db(dbName);
                await db.dropDatabase();
                console.log(`✅ Deleted: ${dbName}`);
            } catch (error) {
                console.log(`⚠️  Failed to delete ${dbName}: ${error.message}`);
            }
        }

        console.log('\n========== VERIFICATION ==========\n');

        const admin = client.db('admin').admin();
        const databases = await admin.listDatabases();

        console.log('Remaining databases:');
        for (const db of databases.databases) {
            console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
        }

        console.log('\n========== ✅ CLEANUP COMPLETE ==========');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
};

cleanupDatabases();
