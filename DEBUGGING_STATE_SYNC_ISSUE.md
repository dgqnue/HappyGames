# 故障排查指南：游戏退出后房间状态不同步

## 问题症状
- **玩家A看到**：游戏桌状态正确（空闲或等待）
- **玩家B看到**：游戏桌仍在游戏中，两人还在游戏（错误状态）

## 已实施的修复

### 1. MatchPlayers._playerLeave() 增强日志
**文件**：`server/src/gamecore/matching/MatchPlayers.js` (1421-1487 行)

**改动**：
```javascript
// 新增：记录状态和玩家数的变化
const statusBefore = this.matchState.status;
const playerCountBefore = this.matchState.players.length;

// ... 处理逻辑 ...

const statusAfter = this.matchState.status;
const playerCountAfter = this.matchState.players.length;

console.log(`[MatchPlayers] After removePlayer - status: ${statusBefore}→${statusAfter}, players: ${playerCountBefore}→${playerCountAfter}`);
```

**效果**：能够清晰地看到状态转换过程

### 2. ChineseChessTable.playerLeave() 增强日志
**文件**：`server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` (66-88 行)

**改动**：
```javascript
console.log(`[ChineseChess] playerLeave: calling matchPlayers.playerLeave for ${socket.user._id}`);
const result = this.matchPlayers.playerLeave(socket);
console.log(`[ChineseChess] playerLeave: returned, table status now=${this.matchPlayers.matchState.status}, players=${this.matchPlayers.matchState.players.length}`);
```

**效果**：能够追踪游戏层到匹配层的转移过程

### 3. ChineseChessTable.broadcastRoomState() 增强日志
**文件**：`server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` (387-421 行)

**改动**：
```javascript
const currentStatus = this.status;  // 使用 getter
const currentPlayers = this.players;

console.log(`[ChineseChessTable] Broadcasting room state for table ${this.tableId}: status=${currentStatus}, players=${currentPlayers.length}`);
```

**效果**：明确显示每次广播时的状态和玩家数

## 调试步骤

### 第1步：启动服务器并监控日志
```bash
cd server
npm start
# 观察控制台输出，特别是 [MatchPlayers] 和 [ChineseChess] 的日志
```

### 第2步：复现问题
1. 打开两个浏览器标签页（模拟玩家A和B）
2. 两个玩家进入中国象棋房间
3. 双方点击"准备"
4. 游戏开始（状态变为 PLAYING）
5. **玩家A点击"退出游戏"按钮**

### 第3步：查看服务器日志

**应该看到的日志序列（修复后）：**

```
[ChineseChess] Player 66666 left during game, forfeiting.
[ChineseChess] 游戏结束: tableId123, 结果: { winner: 'b', winnerId: 77777 }

[MatchPlayers] Game ended in room room123

[MatchPlayers] Broadcasting game_ended event
[MatchPlayers] Broadcasting players_unready
[MatchPlayers] Broadcasting room state: status=MATCHING, players=2  ← 第一次广播，还有2人

[ChineseChess] playerLeave: calling matchPlayers.playerLeave for 66666
[MatchPlayers] playerLeave called for userId: 66666, roomId: room123
[MatchPlayers] Before leave - players: 2, status: MATCHING

[MatchPlayers] After removePlayer - status: MATCHING→WAITING, players: 2→1  ← 关键！状态应该变为 WAITING

[MatchPlayers] Socket left room, will broadcast room state. Current players: 1, status: WAITING
[MatchPlayers] Broadcasting room state: status=WAITING, players=1  ← 第二次广播，只有1人

[ChineseChess] playerLeave: returned, table status now=WAITING, players=1
```

**注意观察的关键点：**
- ✅ 第一次 `broadcastRoomState()` 显示 `status=MATCHING, players=2`
- ✅ `removePlayer()` 后状态从 `MATCHING→WAITING`
- ✅ 第二次 `broadcastRoomState()` 显示 `status=WAITING, players=1`

### 第4步：客户端验证

#### 玩家A（主动退出）的视图
- 应该看到游戏结束消息
- 返回房间后应该看到：
  - 游戏桌状态：**WAITING**（等待中）或 **IDLE**（空闲）
  - 玩家数：**1**（只有自己）或 **0**（如果完全离开）

#### 玩家B（被判负）的视图
- 应该看到游戏结束消息（对方赢了）
- 返回房间后应该看到：
  - 游戏桌状态：**WAITING**（等待中）
  - 玩家数：**1**（只有自己）
  - **不应该**看到对方还在游戏中

## 如果问题仍然存在

### 检查点1：Socket.IO 消息顺序
添加临时日志来追踪每条消息：

```javascript
broadcastRoomState() {
    const timestamp = Date.now();
    console.log(`[Broadcast-${timestamp}] Sending table_update: status=${currentStatus}, players=${currentPlayers.length}`);
    this.io.to(this.tableId).emit('table_update', { 
        ...state, 
        broadcastTimestamp: timestamp 
    });
}
```

在客户端检查接收的消息顺序：
```javascript
socket.on('table_update', (state) => {
    console.log(`[Received-${state.broadcastTimestamp || 'unknown'}] status=${state.status}, players=${state.players.length}`);
});
```

### 检查点2：客户端缓存
检查前端代码，看是否有缓存逻辑导致状态不更新：

**可能的问题代码模式：**
```javascript
// ❌ 错误：缓存了状态，没有及时更新
if (cachedState && cachedState.status === 'MATCHING') {
    // 直接显示缓存的状态，不更新
}

// ✅ 正确：每次接收都更新
socket.on('table_update', (newState) => {
    this.setState(newState);  // 强制更新
});
```

### 检查点3：GameCenter 广播干扰
`broadcastRoomState()` 调用了 `this.gameCenter.broadcastRoomList()`，这可能导致房间列表的状态与游戏桌内的状态不一致。

检查 `GameCenter.broadcastRoomList()` 是否使用了正确的状态：

```javascript
// server/src/core/GameCenter.js
broadcastRoomList(tier) {
    const tables = this.tables.filter(t => t.tier === tier);
    const roomList = tables.map(t => ({
        tableId: t.tableId,
        status: t.status,  // ← 确保这个状态是最新的
        players: t.players.length,
        maxPlayers: t.maxPlayers,
        ...
    }));
    
    this.io.to(`lobby_${tier}`).emit('room_list_update', roomList);
}
```

### 检查点4：玩家断线处理
检查 `handlePlayerDisconnect()` 是否有类似问题：

```javascript
// server/src/gamecore/matching/MatchPlayers.js - 1487 行附近
async handlePlayerDisconnect(socket) {
    const userId = socket.user._id.toString();
    console.log(`[MatchPlayers] Player ${socket.user.username} disconnected`);

    const wasInGame = this.matchState.status === MatchingRules.TABLE_STATUS.PLAYING;

    // 移除玩家
    this.playerLeave(socket);

    // 如果是游戏中断线，通知游戏桌处理
    if (wasInGame && typeof this.table.onPlayerDisconnectDuringGame === 'function') {
        this.table.onPlayerDisconnectDuringGame(userId);
    }
}
```

**验证**：断线和正常退出是否有相同的日志输出？

## 期望的最终效果

修复后，无论是正常退出还是断线，两个玩家看到的房间状态应该完全相同：

| 场景 | 期望状态 | 期望玩家数 |
|------|---------|----------|
| 游戏中，A退出 | WAITING 或重新匹配状态 | 1（只有B） |
| 游戏中，A断线 | 同上 | 1（只有B） |
| 等待中，A退出 | WAITING | 1（只有B） |
| 匹配中，A退出 | 取消匹配，WAITING | 1（只有B） |
| 所有人都离开 | IDLE | 0 |

## 相关代码文件映射

| 文件 | 功能 | 修复内容 |
|------|------|---------|
| `MatchPlayers.js` | 玩家匹配管理 | 增强日志，明确状态转换 |
| `ChineseChessTable.js` | 象棋游戏桌 | 增强日志，确保广播状态正确 |
| `MatchingRules.js` | 状态转换规则 | 验证 `getStateAfterPlayerLeave()` 逻辑 |
| `client/...GameRoom.tsx` | 客户端房间显示 | 需要验证是否正确处理 `table_update` 事件 |

## 性能影响

这次修复添加的日志会对性能有轻微影响，但仅在玩家加入/退出时触发，不会影响游戏进行中的性能。

建议在问题解决后，将某些详细日志改为 `debug` 级别以减少日志量。

## 总结

核心问题是**状态转换过程不透明**，导致难以追踪。通过增强日志，我们能够：
1. ✅ 清晰看到两次 `broadcastRoomState()` 的状态差异
2. ✅ 验证 `removePlayer()` 中的状态计算是否正确
3. ✅ 识别是否存在消息顺序或网络延迟问题
4. ✅ 快速定位问题根源

如果修复后问题仍存在，日志将提供精确的诊断信息。
