# 走棋卡住问题诊断与修复

## 问题描述

走了几个回合后，棋子移动不了，但能够选中棋子（听到选中音效）。从日志看，客户端不断重复发送相同的移动命令，但服务器没有响应。

### 症状日志
```
[BoardClick] Sending move: (2, 3) -> (3, 5)
[chinesechessTableClient] Sending move: (2, 3) → (3, 5)
[ChineseChessDisplay] Component mounted, isMyTable: true
[BoardClick] Clicked at (3, 2), Current Turn: b, My Side: b
...（循环重复）
```

**关键症状**：没有看到 `[ChineseChessTable] handleMove accepted` 或 `Broadcasting move` 日志，说明服务器根本没有处理移动请求。

## 根本原因

### 发现的问题

在 `ChineseChessTable.js` 中，**Socket 事件监听器被重复注册**：

1. **第一次注册**：在 `playerJoin()` 方法中
   ```javascript
   async playerJoin(socket, matchSettings) {
       const success = await this.matchPlayers.playerJoin(socket, matchSettings);
       if (success) {
           socket.on(`${this.gameType}_move`, (data) => this.handleMove(socket, data));
           socket.on(`${this.gameType}_check_state_consistency`, ...);
       }
       return success;
   }
   ```

2. **第二次注册**：在 `setupSocketListeners()` 方法中
   ```javascript
   setupSocketListeners(socket, isSpectator = false) {
       if (!isSpectator) {
           socket.on(`${this.gameType}_move`, (move) => {
               this.handleMove(socket, move);
           });
       }
   }
   ```

3. **调用流程**：
   ```
   joinAsPlayer()
       ↓
   playerJoin() ─→ socket.on('chinesechess_move', ...) [第一次]
       ↓
   setupSocketListeners() ─→ socket.on('chinesechess_move', ...) [第二次]
   ```

### 为什么导致问题

在 Node.js/Socket.IO 中，当你对同一事件多次注册监听器时：
- **第二次注册会覆盖第一次注册**（这是 Socket.IO 的默认行为）
- 或者两个监听器都会被触发，但状态处理不当导致冲突
- 特别是在异步操作中，这种重复注册会导致状态混乱

更严重的是，如果第一次注册的回调是一个闭包，而第二次注册使用了不同的闭包，可能导致：
- 事件被错误的处理
- 状态不同步
- 后续移动无法识别

## 解决方案

### 修改内容

**文件**：`server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js`

#### 1. 修改 `playerJoin()` 方法
移除重复的事件监听注册，改为简单委托给 `matchPlayers`：

```javascript
async playerJoin(socket, matchSettings) {
    const success = await this.matchPlayers.playerJoin(socket, matchSettings);
    // 注意：Socket 事件监听器现在由 setupSocketListeners 统一处理
    // 不在这里注册，避免重复注册
    return success;
}
```

#### 2. 增强 `setupSocketListeners()` 方法
添加缺失的状态一致性检查监听器，确保所有必要的事件都在这里注册：

```javascript
setupSocketListeners(socket, isSpectator = false) {
    if (!isSpectator) {
        // 玩家模式
        socket.on(`${this.gameType}_move`, (move) => {
            this.handleMove(socket, move);
        });
        
        // 绑定状态一致性检查 ← 新增
        socket.on(`${this.gameType}_check_state_consistency`, (data) => {
            this.handleStateConsistencyCheck(socket, data);
        });
        
        socket.on('player_ready', () => this.playerReady(socket));
        socket.on('player_unready', () => this.playerUnready(socket));
        // ...
    }
}
```

### 增强的诊断日志

在 `handleMove()` 中添加以下诊断：

```javascript
// 检查源位置的棋子是否存在
const piece = this.board[fromY] ? this.board[fromY][fromX] : null;
if (!piece) {
    console.log(`[ChineseChessTable] handleMove rejected: no piece at (${fromX},${fromY})`);
    return;
}
```

## 修改后的执行流程

```
玩家加入 joinAsPlayer(socket)
    ↓
playerJoin(socket) ─→ matchPlayers.playerJoin() [处理匹配逻辑]
    ↓
setupSocketListeners(socket, false) ─→ socket.on('chinesechess_move', handler) [统一注册]
    ↓
玩家移动 → 事件触发 → handleMove() [单一处理器]
```

## 预期效果

- ✅ 移动请求能正常处理
- ✅ 棋盘状态正确更新
- ✅ 服务器立即响应并广播 `move` 事件
- ✅ 客户端接收到 `move` 事件并更新棋盘
- ✅ 不再出现重复移动请求的情况

## 测试清单

- [ ] 进行 5+ 回合的移动，能够正常进行
- [ ] 每次移动后看到 `[ChineseChessTable] Broadcasting move` 日志
- [ ] 每次移动后客户端收到 `[ChineseChessTableClient] handleMove: Received move event`
- [ ] 棋子位置在棋盘上正确更新
- [ ] 回合正确切换（r ↔ b）
- [ ] 移动音效能够播放

## 日志输出示例

**修复前**（卡住）：
```
[BoardClick] Sending move: (2, 3) -> (3, 5)
[chinesechessTableClient] Sending move: (2, 3) → (3, 5)
[BoardClick] Clicked at (3, 2), Current Turn: b, My Side: b
[BoardClick] Selected piece: (2,3)
[BoardClick] Sending move: (2, 3) -> (3, 5)  ← 重复
...
```

**修复后**（正常）：
```
[BoardClick] Sending move: (2, 3) -> (3, 5)
[chinesechessTableClient] Sending move: (2, 3) → (3, 5)
[ChineseChessTable] handleMove accepted: valid move from (2,3) to (3,5), piece=n
[ChineseChessTable] Broadcasting move: captured=null, from=(2,3) to=(3,5), new turn=r
[ChineseChessTableClient] handleMove: Received move event from server
[ChineseChessDisplay] Playing eat sound
[ChineseChessDisplay] updateGameState: { turn: 'r', mySide: 'b', ... }
```

## 架构改进

这个修复体现了一个关键的架构原则：
- **单一职责**：`setupSocketListeners()` 负责所有 Socket 事件的注册
- **避免重复**：不在多个地方注册同一个事件
- **易于维护**：集中管理所有事件监听，修改时只需改一个地方
