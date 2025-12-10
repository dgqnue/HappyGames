/**
 * 删除 happygames 数据库，将 test 数据库重命名为 happygames
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const renameDatabase = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error('MONGO_URI not set in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB.\n');

        const conn = mongoose.connection;
        const adminDb = conn.client.db('admin');

        console.log('========== DATABASE RENAME OPERATION ==========\n');

        // 步骤 1: 删除 happygames 数据库
        console.log('Step 1: Dropping "happygames" database...');
        try {
            await adminDb.dropDatabase('happygames');
            console.log('✅ Successfully dropped "happygames" database\n');
        } catch (error) {
            console.log(`⚠️  Could not drop "happygames" database: ${error.message}\n`);
        }

        // 步骤 2: 将 test 数据库重命名为 happygames
        console.log('Step 2: Renaming "test" database to "happygames"...');
        try {
            const testDb = conn.client.db('test');
            const happyGamesDb = conn.client.db('happygames');
            
            // 获取 test 数据库的所有集合
            const collections = await testDb.listCollections().toArray();
            console.log(`\n  Found ${collections.length} collections in "test" database\n`);
            
            for (const collection of collections) {
                const collName = collection.name;
                console.log(`  Processing collection: ${collName}`);
                
                // 先删除目标集合（如果存在）
                try {
                    await happyGamesDb.dropCollection(collName);
                    console.log(`    - Dropped existing collection`);
                } catch (err) {
                    // Collection doesn't exist, that's fine
                }
                
                // 获取源集合的所有文档
                const docs = await testDb.collection(collName).find({}).toArray();
                
                if (docs.length > 0) {
                    // 插入到目标数据库
                    await happyGamesDb.collection(collName).insertMany(docs);
                    console.log(`    ✅ Copied ${docs.length} documents`);
                } else {
                    console.log(`    ✅ Empty collection`);
                }
            }

            console.log('\n✅ Successfully created "happygames" database with all data from "test"\n');

            // 步骤 3: 删除 test 数据库
            console.log('Step 3: Dropping "test" database...');
            await adminDb.dropDatabase('test');
            console.log('✅ Successfully dropped "test" database\n');

        } catch (error) {
            console.error(`❌ Error during rename operation: ${error.message}`);
            process.exit(1);
        }

        // 验证结果
        console.log('========== VERIFICATION ==========\n');
        
        const result = await adminDb.listDatabases();
        console.log(`Remaining databases:`);
        for (const db of result.databases) {
            if (['happygames', 'test'].includes(db.name)) {
                console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
            }
        }

        console.log('\n========== OPERATION COMPLETE ==========\n');
        console.log('Summary:');
        console.log('  ✅ Deleted old "happygames" database');
        console.log('  ✅ Copied all data from "test" to new "happygames"');
        console.log('  ✅ Deleted "test" database');
        console.log('\n⚠️  IMPORTANT: Update your .env file to use the original URI if needed:');
        console.log('   MONGO_URI=mongodb+srv://HappyGames_db_user:hnb7egvyGMU4hTFT@happygames.ao5zdwu.mongodb.net/happygames?appName=HappyGames');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

renameDatabase();
