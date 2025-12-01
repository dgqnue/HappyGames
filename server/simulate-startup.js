/**
 * 模拟服务器启动脚本
 * 用于检测模块加载和初始化过程中的错误
 */

require('dotenv').config();
const path = require('path');

console.log('🚀 开始模拟服务器启动...');

try {
    // 1. 检查核心模块引用
    console.log('📦 加载核心模块...');
    const SocketServer = require('./src/core/network/SocketServer');
    const GameLoader = require('./src/core/game/GameLoader');
    const HttpService = require('./src/core/network/HttpService');
    console.log('✅ 核心模块加载成功');

    // 2. 模拟初始化 GameLoader
    console.log('🎮 初始化 GameLoader...');
    const gameLoader = new GameLoader();

    // 模拟 Socket.IO 对象
    const mockIo = {
        on: () => { },
        emit: () => { },
        to: () => ({ emit: () => { } })
    };

    gameLoader.loadAll(mockIo);
    console.log(`✅ GameLoader 初始化成功，加载了 ${gameLoader.managers.size} 个游戏`);

    // 3. 检查游戏管理器
    const chineseChessManager = gameLoader.getManager('chinesechess');
    if (chineseChessManager) {
        console.log('✅ ChineseChessManager 获取成功');

        // 检查 Tiers
        if (chineseChessManager.tiers.size > 0) {
            console.log(`✅ 游戏室初始化成功，共 ${chineseChessManager.tiers.size} 个等级`);

            // 检查桌子
            const freeTier = chineseChessManager.tiers.get('free');
            if (freeTier && freeTier.tables.length > 0) {
                console.log(`✅ 免费室桌子初始化成功，共 ${freeTier.tables.length} 张桌子`);
            } else {
                console.error('❌ 免费室桌子初始化失败');
            }
        } else {
            console.error('❌ 游戏室初始化失败');
        }
    } else {
        console.error('❌ ChineseChessManager 获取失败');
    }

    // 4. 模拟 HttpService
    console.log('🌐 初始化 HttpService...');
    const mockApp = {
        get: () => { },
        post: () => { },
        use: () => { }
    };
    new HttpService(mockApp, gameLoader);
    console.log('✅ HttpService 初始化成功');

    console.log('\n🎉 模拟启动完成，未发现明显错误！');

} catch (err) {
    console.error('\n❌ 启动模拟失败！');
    console.error(err);
    process.exit(1);
}
