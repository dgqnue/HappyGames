const ChineseChessMatch = require('./src/games/chinesechess/gamepagehierarchy/ChineseChessMatch');

async function testMatch() {
    console.log('--- 测试 ChineseChessMatch ---');

    // 1. 设置
    const match = new ChineseChessMatch('test-match-1');
    const player1 = { id: 'p1', userId: 'user1', name: 'RedPlayer' };
    const player2 = { id: 'p2', userId: 'user2', name: 'BlackPlayer' };

    match.init([player1, player2]);
    console.log('对局初始化:', match.status);

    // 2. 开始
    match.start();
    console.log('对局开始:', match.status);
    console.log('当前回合:', match.turn);

    // 3. 有效移动: 红炮 (行 7, 列 1) 到 中路 (行 7, 列 4) -> "炮二平五"
    // 坐标: x=1, y=7 -> x=4, y=7
    // 等等，让我们检查 ChineseChessMatch.js 中的棋盘设置
    // 行 7: [null, 'C', null, null, null, null, null, 'C', null]
    // 索引 1 是 'C'。索引 7 是 'C'。
    // 从 (1, 7) 移动到 (4, 7)
    console.log('\n--- 移动 1: 红炮平五 ---');
    const move1 = { fromX: 1, fromY: 7, toX: 4, toY: 7 };
    const result1 = match.handleMove(player1, move1);
    console.log('结果:', result1);

    if (!result1.valid) {
        console.error('失败: 有效移动被拒绝');
    } else {
        console.log('通过: 有效移动被接受');
    }

    // 4. 无效移动: 红方再次移动 (应该是黑方的回合)
    console.log('\n--- 移动 2: 红方在非己方回合移动 ---');
    const move2 = { fromX: 0, fromY: 9, toX: 0, toY: 8 }; // 红车进一
    const result2 = match.handleMove(player1, move2);
    console.log('结果:', result2);

    if (result2.valid) {
        console.error('失败: 非回合移动被接受');
    } else {
        console.log('通过: 非回合移动被拒绝');
    }

    // 5. 有效移动: 黑马 (行 0, 列 1) 到 (行 2, 列 2)
    console.log('\n--- 移动 3: 黑马进三 ---');
    const move3 = { fromX: 1, fromY: 0, toX: 2, toY: 2 };
    const result3 = match.handleMove(player2, move3);
    console.log('结果:', result3);

    if (!result3.valid) {
        console.error('失败: 有效移动被拒绝');
    } else {
        console.log('通过: 有效移动被接受');
    }

    // 6. 胜利条件测试 (模拟)
    console.log('\n--- 胜利条件测试 ---');
    // 强制移除黑将进行测试
    // 黑将在 (4, 0)
    match.board[0][4] = null;

    // 触发一个虚拟移动来检查胜利条件
    // 红车移动 (0, 9) 到 (0, 8)
    const moveWin = { fromX: 0, fromY: 9, toX: 0, toY: 8 };
    // 强制轮到红方进行此测试
    match.turn = 'r';

    const resultWin = match.handleMove(player1, moveWin);
    console.log('移动结果:', resultWin);
    console.log('对局状态:', match.status);
    console.log('获胜者:', match.winner);

    if (match.status === 'finished' && match.winner.id === 'p1') {
        console.log('通过: 检测到胜利条件');
    } else {
        console.error('失败: 未检测到胜利条件');
    }
}

testMatch().catch(console.error);
