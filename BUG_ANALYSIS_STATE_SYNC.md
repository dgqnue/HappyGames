# Bug 分析：游戏退出后房间状态不同步

## 问题描述
玩家A和B在游戏中，A退出游戏返回房间：
- **B看到的状态**：游戏桌上还有两人在游戏，游戏状态，满座
- **A看到的状态**：游戏桌是空闲状态（IDLE）
- **预期**：两个玩家应该看到相同的房间状态

## 根本原因

### 问题1：playerLeave() 的执行顺序问题

**在 ChineseChessTable.js 中：**
```javascript
playerLeave(socket) {
    // 🔴 问题：这里调用 handleWin() 会触发 onGameEnd()
    if (this.status === 'playing') {
         // ... 判负逻辑 ...
         this.handleWin(winnerSide);  // 导致游戏结束，广播 game_ended
    }
    
    // ✅ 然后才调用 playerLeave()
    return this.matchPlayers.playerLeave(socket);
}
```

**执行顺序：**
1. **Socket A 调用 playerLeave()**
2. 检测到游戏中，调用 `handleWin()` → `endGame()` → `matchPlayers.onGameEnd()`
3. `onGameEnd()` 中：
   - 将状态变为 `MATCHING` 
   - 调用 `broadcastRoomState()` - **向房间广播状态为 MATCHING**
4. 然后调用 `matchPlayers.playerLeave(socket)`
5. `playerLeave()` 中：
   - 移除玩家：`this.matchState.players.length` 从 2 → 1
   - **状态仍为 MATCHING**（因为 removePlayer 后的状态计算没有将玩家数为1的PLAYING转为IDLE）
   - 广播房间状态 - **现在有1个玩家，状态为 MATCHING**

### 问题2：状态转换逻辑缺陷

**在 MatchPlayers._playerLeave() 中：**
```javascript
_playerLeave(socket) {
    const wasMatching = this.matchState.status === MatchingRules.TABLE_STATUS.MATCHING;
    
    // 移除玩家
    const wasPlayer = this.matchState.removePlayer(userId);
    
    // 🔴 问题：当玩家数 = 0 时才重置为 IDLE
    if (this.matchState.players.length === 0) {
        this.matchState.status = MatchingRules.TABLE_STATUS.IDLE;
        // ...
    }
    
    // 如果玩家数 = 1，状态仍为之前的 MATCHING（来自 onGameEnd）
    this.table.broadcastRoomState();  // 广播状态为 MATCHING + 1个玩家
}
```

### 问题3：RoomState 数据不一致

**在 ChineseChessTable.broadcastRoomState() 中：**
```javascript
broadcastRoomState() {
    const roomInfo = this.matchPlayers.matchState.getRoomInfo();
    
    const state = {
        ...roomInfo,           // 包含 status: 'MATCHING'
        status: this.status,   // 🔴 这里的 this.status 是什么？
        players: this.players  // 🔴 这是什么？是否与 matchState.players 同步？
    };
}
```

**两个状态不同步的可能性：**
- `this.players` 是 ChineseChessTable 的属性
- `this.matchPlayers.matchState.players` 是 MatchPlayers 的属性
- 玩家移除时可能只更新了其中一个

## 状态同步时间序列

```
时间 t1: A 调用 playerLeave()
├─ 检查 this.status === 'playing' ✓
├─ 调用 handleWin('b')
│  ├─ 调用 endGame()
│  │  └─ 调用 matchPlayers.onGameEnd()
│  │     ├─ this.matchState.status = MATCHING
│  │     └─ broadcastRoomState() 
│  │        └─ 广播给所有人: {status: MATCHING, players: 2, ...}
│  │        └─ B 接收到这个消息，认为游戏继续中
│  └─ ELO结算、游戏豆结算完成
├─ 调用 matchPlayers.playerLeave(socket)
│  ├─ removePlayer(A)
│  ├─ this.matchState.players.length = 1
│  ├─ 因为 players.length != 0，不重置为 IDLE
│  └─ broadcastRoomState()
│     └─ 广播给所有人: {status: MATCHING, players: 1, ...}
│     └─ A 接收到这个消息，看到1个玩家，MATCHING状态
│     └─ B 也接收到，但可能有缓存或前一条消息的影响

时间 t2: B 的网络可能延迟，或者两条广播消息顺序问题
```

## 为什么B仍然看到两个人在游戏？

**可能的原因：**

1. **消息顺序问题**：
   - B 收到的第二条 `table_update` 消息可能没有刷新UI（使用了缓存）
   - 或者 B 的前端有状态缓存

2. **GameCenter 广播问题**：
   - `broadcastRoomState()` 调用了 `this.gameCenter.broadcastRoomList()`
   - 这可能导致房间列表的状态与游戏桌内的状态不同步

3. **Socket 消息顺序不保证**：
   - `table_update` 可能在 `game_ended` 之后到达
   - 或者两次 `table_update` 的顺序不正确

## 解决方案

### 方案1：在 playerLeave 中检查游戏是否真的结束（推荐）

**修改 ChineseChessTable.playerLeave()：**
```javascript
playerLeave(socket) {
    const userId = socket.user._id.toString();
    
    // 如果正在游戏中，且离开的是玩家，判负
    if (this.status === 'playing') {
        const player = this.players.find(p => p.userId === userId);
        if (player) {
            console.log(`[ChineseChess] Player ${userId} left during game, forfeiting.`);
            // 判对方获胜
            const redPlayer = this.players[0];
            const winnerSide = userId === redPlayer.userId ? 'b' : 'r';
            
            // 🔧 修复：在 handleWin 中添加标志，防止 onGameEnd 被重复调用
            this.isEndingGame = true;
            this.handleWin(winnerSide);
            // handleWin 会调用 endGame -> onGameEnd
            // onGameEnd 会广播状态变为 MATCHING + 2个玩家
        }
    }

    // 移除游戏特定事件监听
    socket.removeAllListeners(`${this.gameType}_move`);
    socket.removeAllListeners(`${this.gameType}_check_state_consistency`);
    
    // 现在移除玩家 - 如果游戏已结束，则状态会从 MATCHING 变为其他状态
    const result = this.matchPlayers.playerLeave(socket);
    
    this.isEndingGame = false;
    
    return result;
}
```

### 方案2：在 MatchPlayers._playerLeave 中修复状态

**修改 MatchPlayers._playerLeave()：**
```javascript
_playerLeave(socket) {
    const wasPlayer = this.matchState.removePlayer(userId);
    
    // 🔧 修复：玩家离开后，重新计算状态
    if (wasPlayer && this.matchState.players.length > 0) {
        // 如果还有玩家，但如果之前是 PLAYING，需要检查是否应该变为 IDLE
        const newState = MatchingRules.getStateAfterPlayerLeave(
            this.matchState.players.length, 
            this.maxPlayers
        );
        if (newState && newState !== this.matchState.status) {
            this.matchState.status = newState;
        }
    }
    
    // ... rest of the code
}
```

### 方案3：确保状态同步的完整性

**在 broadcastRoomState() 中：**
```javascript
broadcastRoomState() {
    const roomInfo = this.matchPlayers.matchState.getRoomInfo();
    
    // 🔧 修复：确保所有状态来自同一个对象
    const state = {
        ...roomInfo,
        tableId: this.tableId,
        roomId: this.tableId,
        status: this.matchPlayers.matchState.status,  // 使用 matchState 的状态
        players: this.matchPlayers.matchState.players.map(p => ({
            userId: p.userId,
            socketId: p.socketId,
            nickname: p.nickname,
            // ...
        }))
    };

    console.log(`[ChineseChessTable] Broadcasting room state for table ${this.tableId}: status=${state.status}, players=${state.players.length}`);

    // 广播给房间内所有人
    this.io.to(this.tableId).emit('table_update', state);

    // 通知 GameCenter
    if (this.gameCenter) {
        this.gameCenter.broadcastRoomList(this.tier);
    }
}
```

## 验证步骤

1. **A 和 B 进入游戏桌**
2. **开始游戏（PLAYING 状态）**
3. **A 点击退出游戏**
   - 验证日志：是否调用了 `handleWin()` 和 `playerLeave()`
   - 验证顺序：`handleWin()` 应该在 `playerLeave()` 前
4. **检查广播消息：**
   - 第1条：`game_ended` + `broadcastRoomState()` (status: MATCHING, players: 2)
   - 第2条：`broadcastRoomState()` (status: ?, players: 1)
5. **验证最终状态：**
   - A 看到的状态（应该是：IDLE 或 MATCHING，0个玩家 或 A自己）
   - B 看到的状态（应该是：同样的状态）

## 建议的修复优先级

1. **高优先级**（直接解决问题）：修改 `_playerLeave()` 中的状态转换逻辑
2. **中优先级**（防止类似问题）：确保 `broadcastRoomState()` 使用一致的状态源
3. **低优先级**（优化）：添加消息序列号确保顺序性
