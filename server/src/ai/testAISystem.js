/**
 * 测试 AI 系统
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/happygames';

async function testAISystem() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected\n');

        // 初始化 AI 管理器
        console.log('🤖 Initializing AIPlayerManager...');
        const AIPlayerManager = require('./AIPlayerManager');
        await AIPlayerManager.initialize();
        
        // 打印统计
        const stats = AIPlayerManager.getStats();
        console.log('\n📊 AIPlayerManager Stats:');
        console.log('  Initialized:', stats.initialized);
        console.log('  Total AI:', stats.totalAI);
        console.log('  Busy AI:', stats.busyAI);
        console.log('  Pool distribution:', stats.poolStats);
        
        // 测试获取 AI
        console.log('\n🎯 Testing getAvailableAI...');
        
        const testRatings = [900, 1100, 1300, 1500, 1700, 1900];
        for (const rating of testRatings) {
            const ai = AIPlayerManager.getAvailableAI(rating);
            if (ai) {
                console.log(`  Rating ${rating} -> AI: ${ai.nickname} (${ai.rating}), odid: ${ai.odid.substring(0, 8)}...`);
            } else {
                console.log(`  Rating ${rating} -> No AI available!`);
            }
        }
        
        console.log('\n✅ AI system test completed!');
        
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected');
    }
}

testAISystem();
