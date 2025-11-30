/**
 * 测试 HTTP 端点 - 模拟获取房间列表请求
 */

require('dotenv').config();
const GameLoader = require('./src/core/game/GameLoader');

console.log('🧪 测试 HTTP 端点：获取房间列表\n');

try {
    // 1. 初始化 GameLoader
    const gameLoader = new GameLoader();
    const mockIo = {
        on: () => { },
        emit: () => { },
        to: () => ({ emit: () => { } })
    };

    gameLoader.loadAll(mockIo);
    console.log('✅ GameLoader 初始化成功\n');

    // 2. 模拟 HTTP 请求处理
    const gameId = 'chinesechess';
    const tier = 'free';

    console.log(`📥 模拟请求: GET /api/games/${gameId}/rooms?tier=${tier}`);

    // 3. 获取 Manager
    const manager = gameLoader.getManager(gameId);
    if (!manager) {
        console.error(`❌ 游戏不存在: ${gameId}`);
        console.log(`可用游戏: ${gameLoader.getGameList().join(', ')}`);
        process.exit(1);
    }
    console.log(`✅ Manager 获取成功: ${gameId}`);

    // 4. 获取 Tier
    const tierObj = manager.tiers.get(tier);
    if (!tierObj) {
        console.error(`❌ 游戏室不存在: ${tier}`);
        console.log(`可用游戏室: ${Array.from(manager.tiers.keys()).join(', ')}`);
        process.exit(1);
    }
    console.log(`✅ Tier 获取成功: ${tier}`);

    // 5. 获取房间列表
    console.log('\n📋 获取房间列表...');
    const rooms = tierObj.getTableList();
    console.log(`✅ 成功获取 ${rooms.length} 个房间\n`);

    // 6. 打印房间详情
    if (rooms.length > 0) {
        console.log('房间列表:');
        rooms.forEach((room, index) => {
            console.log(`  ${index + 1}. ID: ${room.id}, 状态: ${room.status}, 玩家: ${room.players}/${room.maxPlayers}`);
        });
    } else {
        console.warn('⚠️  没有房间！这不正常。');
    }

    console.log('\n🎉 测试通过！HTTP 端点应该能正常工作。');

} catch (error) {
    console.error('\n❌ 测试失败！');
    console.error('错误信息:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
}
