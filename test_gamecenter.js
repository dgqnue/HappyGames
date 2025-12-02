// 测试 GameCenter 和 GameRoom 的初始化 (Refactored)
const path = require('path');

// Mock io
const mockIo = {
    to: () => ({ emit: () => { } }),
    on: () => { },
    sockets: {
        sockets: {
            get: () => ({
                join: () => { },
                leave: () => { },
                emit: () => { },
                user: { _id: 'test_user', username: 'TestUser' }
            })
        }
    }
};

// 加载必要的类
const ChineseChessCenter = require('./server/src/games/chinesechess/rooms/ChineseChessCenter');

console.log('=== 测试 ChineseChessCenter 初始化 (Refactored) ===\n');

try {
    // 创建一个 ChineseChessCenter 实例
    const gameCenter = new ChineseChessCenter(mockIo, null);

    console.log('✓ GameCenter 创建成功');
    console.log('游戏类型:', gameCenter.gameType);
    console.log('游戏房间数量:', gameCenter.gameRooms.size);

    // 检查每个房间
    for (const [roomId, gameRoom] of gameCenter.gameRooms) {
        console.log(`\n房间: ${roomId} (${gameRoom.name})`);
        console.log('  游戏桌数量:', gameRoom.tables.length);

        // 检查每张桌子
        gameRoom.tables.forEach((table, index) => {
            console.log(`  桌子 ${index + 1}:`, {
                id: table.tableId || table.roomId,
                gameType: table.gameType,
                maxPlayers: table.maxPlayers,
                tier: table.tier,
                // 验证 MatchPlayers 是否存在
                hasMatchPlayers: !!table.matchPlayers,
                playerCount: table.players.length // 验证 getter
            });

            if (!table.matchPlayers) {
                throw new Error('MatchPlayers not initialized!');
            }
        });
    }

    // 测试 getTableList
    console.log('\n=== 测试 getTableList ===\n');
    const freeRoom = gameCenter.gameRooms.get('free');
    if (freeRoom) {
        const tableList = freeRoom.getTableList();
        console.log('免豆室桌子列表:', JSON.stringify(tableList, null, 2));
    }

} catch (error) {
    console.error('❌ 错误:', error);
    console.error(error.stack);
}
