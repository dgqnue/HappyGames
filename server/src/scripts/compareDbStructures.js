/**
 * 对比两个数据库的数据结构
 */

require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

const compareDbStructures = async () => {
    try {
        console.log('Connecting to MongoDB...');
        const mongoUri = process.env.MONGO_URI;
        
        if (!mongoUri) {
            console.error('MONGO_URI not set in .env');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        
        const conn = mongoose.connection;

        // 获取两个数据库
        const happyGamesDb = conn.client.db('happygames');
        const testDb = conn.client.db('test');

        console.log('========== DATABASE COMPARISON ==========\n');

        // 获取两个数据库的集合
        const hgCollections = await happyGamesDb.listCollections().toArray();
        const testCollections = await testDb.listCollections().toArray();

        const dbInfo = [
            { name: 'happygames', db: happyGamesDb, collections: hgCollections },
            { name: 'test', db: testDb, collections: testCollections }
        ];

        for (const { name, db, collections } of dbInfo) {
            console.log(`\n========== DATABASE: ${name.toUpperCase()} ==========`);
            console.log(`Total collections: ${collections.length}\n`);

            for (const collection of collections) {
                const collName = collection.name;
                const count = await db.collection(collName).countDocuments();
                
                console.log(`Collection: ${collName}`);
                console.log(`  Documents: ${count}`);

                if (count > 0) {
                    // 取第一个文档来查看结构
                    const sample = await db.collection(collName).findOne({});
                    
                    if (sample) {
                        console.log(`  Fields:`);
                        const keys = Object.keys(sample).sort();
                        for (const key of keys) {
                            const value = sample[key];
                            const type = Array.isArray(value) ? 'Array' : typeof value;
                            
                            if (key === '_id') {
                                console.log(`    - ${key}: ObjectId`);
                            } else if (type === 'object' && value !== null) {
                                console.log(`    - ${key}: ${typeof value} (nested)`);
                                const subKeys = Object.keys(value).slice(0, 3);
                                for (const subKey of subKeys) {
                                    console.log(`        └─ ${subKey}: ${typeof value[subKey]}`);
                                }
                                if (Object.keys(value).length > 3) {
                                    console.log(`        └─ ... (${Object.keys(value).length - 3} more)`);
                                }
                            } else {
                                console.log(`    - ${key}: ${type}`);
                            }
                        }
                    }
                } else {
                    console.log(`  (Empty collection)`);
                }

                console.log('');
            }
        }

        console.log('\n========== STRUCTURE COMPARISON ==========\n');

        // 对比关键集合的结构
        const keyCollections = ['users', 'usergamestats', 'wallets'];

        for (const collName of keyCollections) {
            console.log(`\n--- ${collName.toUpperCase()} ---`);
            
            const hgSample = await happyGamesDb.collection(collName).findOne({});
            const testSample = await testDb.collection(collName).findOne({});

            const hgFields = hgSample ? Object.keys(hgSample).sort() : [];
            const testFields = testSample ? Object.keys(testSample).sort() : [];

            const allFields = [...new Set([...hgFields, ...testFields])];

            console.log(`Fields comparison:`);
            for (const field of allFields) {
                const inHG = hgFields.includes(field) ? '✓' : '✗';
                const inTest = testFields.includes(field) ? '✓' : '✗';
                console.log(`  ${field}: happygames=${inHG}, test=${inTest}`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

compareDbStructures();
