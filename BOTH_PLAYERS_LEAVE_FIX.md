# 双方都退出后游戏桌不重置问题 - 修复报告

## 问题描述
当两个玩家都点击退出游戏后，游戏桌仍然显示两个玩家在游戏中，状态没有回到空闲，其他玩家看不到这张桌子变成可用状态。

## 根本原因分析

### 问题流程
1. **第一个玩家在游戏中离开**
   - 调用 `ChineseChessTable.playerLeave(socket1)`
   - 状态是 `'playing'`，所以调用 `handleWin(winnerSide)` 判对方获胜
   - `handleWin` → `endGame` → `onGameEnd`
   - `onGameEnd` 将状态改为 `'matching'`（等待再来一局）
   - 启动 10 秒的再来一局倒计时
   - 然后调用 `matchPlayers.playerLeave(socket1)` 移除玩家 1
   - 此时还有 1 个玩家，所以不会清除定时器

2. **第二个玩家也离开**
   - 调用 `ChineseChessTable.playerLeave(socket2)`
   - 状态是 `'matching'`（不是 'playing'），所以不会调用 `handleWin`
   - 直接调用 `matchPlayers.playerLeave(socket2)`
   - 现在玩家数是 0，应该重置状态为 IDLE
   - MatchPlayers 中的 `_playerLeave` 确实会清除定时器和重置状态
   - **但是** - 在 MatchPlayers 中重置后，游戏桌的 `resetBoard()` 没有被调用
   - 同时，某些状态可能没有被正确同步到客户端

### 关键问题
当通过 MatchPlayers 重置状态时，它清除了定时器但可能没有完全重置游戏数据，尤其是在从 `'matching'` 状态回到 `'idle'` 时。

## 实施的修复

在 `ChineseChessTable.js` 的 `playerLeave` 方法中添加了**游戏桌级别的清理**：

```javascript
// 关键修复：如果所有玩家都离开了，需要立即重置游戏桌状态为 IDLE
if (playerCountAfter === 0) {
    console.log(`[ChineseChess] All players left table ${this.tableId}, resetting game state to IDLE`);
    
    // 1. 重置游戏状态
    this.matchPlayers.matchState.status = 'idle';
    
    // 2. 重置棋盘（清除游戏数据）
    this.resetBoard();
    
    // 3. 清除所有定时器
    if (this.matchPlayers.matchState.rematchTimer) {
        clearTimeout(this.matchPlayers.matchState.rematchTimer);
        this.matchPlayers.matchState.rematchTimer = null;
    }
    if (this.matchPlayers.countdownTimer) {
        clearTimeout(this.matchPlayers.countdownTimer);
        this.matchPlayers.countdownTimer = null;
    }
    
    // 4. 广播最终的房间状态
    this.broadcastRoomState();
}
```

## 修复的关键要点

1. **双重安全检查**
   - MatchPlayers 中的 `_playerLeave` 已经有清除定时器的代码
   - ChineseChessTable 的 `playerLeave` 现在添加了额外的清理，确保游戏数据完全重置

2. **游戏数据重置**
   - 调用 `resetBoard()` 确保棋盘数据被清除
   - 这对于下一局游戏的开始很重要

3. **广播更新**
   - 调用 `broadcastRoomState()` 确保所有客户端收到最新的状态
   - 状态从 'matching' 变为 'idle'，从 2 个玩家变为 0 个玩家

4. **详细的日志**
   - 添加了多个日志点便于诊断
   - 可以看到清除了哪些定时器

## 修改文件

- `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` - playerLeave 方法

## 验证修复

当两个玩家都退出时，应该看到以下日志：

```
[ChineseChess] Player xxx left during game, forfeiting.
[ChineseChess] playerLeave: calling matchPlayers.playerLeave for xxx
[ChineseChess] playerLeave: returned result=true, table status now=matching, players count=1

[ChineseChess] playerLeave: calling matchPlayers.playerLeave for yyy
[ChineseChess] playerLeave: returned result=true, table status now=idle, players count=0
[ChineseChess] All players left table tableId, resetting game state to IDLE
[ChineseChess] Cleared rematch timer in playerLeave cleanup
[ChineseChessTable] Broadcasting room state for table tableId: status=idle, players=0
```

## 客户端影响

当客户端收到 `table_update` 事件，显示：
- `status: 'idle'`
- `players: []` (空数组)

UI 应该立即更新，显示游戏桌为空闲，其他玩家可以选择加入。

