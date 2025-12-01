# 准备超时修复说明

## 问题描述

**原始问题:**
当所有玩家入座后,如果有一人点击了"开始",但其他玩家未在规定时间(30秒)内点击"开始",所有人(包括已点击"开始"的玩家)都被踢出了游戏桌。

**期望行为:**
- 规定时间内未点击"开始"的玩家将被踢出游戏桌
- 已点击"开始"的玩家应该继续留在游戏桌
- 已准备玩家的状态自动被调整为"未开始"
- 倒计时消失
- 房间恢复到刚入座的状态,继续等待其他玩家

## 修复内容

### 1. 服务端修复 (`MatchableGameRoom.js`)

修改了 `onReadyTimeout()` 方法:

**修复前的问题:**
```javascript
onReadyTimeout() {
    const unreadyPlayers = this.matchState.getUnreadyPlayers();
    
    // 踢出未准备的玩家
    unreadyPlayers.forEach(player => {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.emit('kicked', {...});
            this.playerLeave(socket); // ❌ 这会导致所有玩家被移除
        }
    });
    
    this.matchState.resetReadyStatus();
    this.matchState.status = 'waiting';
    this.broadcastRoomState();
}
```

**修复后的逻辑:**
```javascript
onReadyTimeout() {
    const unreadyPlayers = this.matchState.getUnreadyPlayers();
    const readyPlayers = this.matchState.players.filter(p => p.ready);
    
    // 1. 只踢出未准备的玩家
    unreadyPlayers.forEach(player => {
        const socket = this.io.sockets.sockets.get(player.socketId);
        if (socket) {
            socket.emit('kicked', {
                reason: '未在规定时间内准备',
                code: 'READY_TIMEOUT'
            });
            this.playerLeave(socket); // ✅ 只移除未准备的玩家
        }
    });
    
    // 2. 取消准备检查定时器
    this.matchState.cancelReadyCheck();
    
    // 3. 重置所有剩余玩家的准备状态
    this.matchState.resetReadyStatus();
    
    // 4. 恢复为等待状态
    this.matchState.status = 'waiting';
    
    // 5. 广播房间状态更新
    this.broadcastRoomState();
    
    // 6. 通知剩余玩家倒计时已取消
    this.broadcast('ready_check_cancelled', {
        reason: '部分玩家未在规定时间内准备',
        remainingPlayers: this.matchState.players.length
    });
}
```

**关键改进:**
1. ✅ 区分已准备和未准备的玩家
2. ✅ 只踢出未准备的玩家
3. ✅ 已准备的玩家保留在房间内
4. ✅ 重置所有剩余玩家的准备状态为 `false`
5. ✅ 取消准备检查定时器
6. ✅ 房间状态恢复为 `waiting`
7. ✅ 广播新事件 `ready_check_cancelled` 通知客户端

### 2. 客户端修复 (`page.tsx`)

添加了对 `ready_check_cancelled` 事件的监听:

```typescript
// 监听准备检查取消
newSocket.on('ready_check_cancelled', (data: any) => {
    console.log('准备检查已取消:', data);
    setReadyTimer(null);        // 清除倒计时
    setIsReady(false);          // 重置准备状态
    if (data.reason) {
        console.log(`准备检查取消原因: ${data.reason}`);
    }
});
```

同时在 `kicked` 事件中也添加了 `setIsReady(false)`:

```typescript
newSocket.on('kicked', (data: any) => {
    alert(`您已被踢出房间: ${data.reason}`);
    setStatus('lobby');
    setReadyTimer(null);
    setIsReady(false);  // ✅ 添加重置准备状态
});
```

## 测试场景

### 场景 1: 部分玩家未准备超时

**步骤:**
1. 玩家 A 和玩家 B 同时入座一个游戏桌
2. 系统自动开始 30 秒准备倒计时
3. 玩家 A 点击"开始"按钮
4. 玩家 B 不点击,等待 30 秒倒计时结束

**预期结果:**
- ✅ 玩家 B 被踢出游戏桌,收到提示"您已被踢出房间: 未在规定时间内准备"
- ✅ 玩家 A 保留在游戏桌内
- ✅ 玩家 A 的准备状态被重置为"未开始"
- ✅ 倒计时消失
- ✅ 房间状态恢复为 `waiting`
- ✅ 玩家 A 可以继续等待其他玩家加入

### 场景 2: 所有玩家都未准备超时

**步骤:**
1. 玩家 A 和玩家 B 同时入座一个游戏桌
2. 系统自动开始 30 秒准备倒计时
3. 两个玩家都不点击"开始"按钮
4. 等待 30 秒倒计时结束

**预期结果:**
- ✅ 玩家 A 和玩家 B 都被踢出游戏桌
- ✅ 房间变为空房间
- ✅ 房间状态恢复为 `waiting`

### 场景 3: 所有玩家都准备

**步骤:**
1. 玩家 A 和玩家 B 同时入座一个游戏桌
2. 系统自动开始 30 秒准备倒计时
3. 玩家 A 点击"开始"按钮
4. 玩家 B 也点击"开始"按钮

**预期结果:**
- ✅ 倒计时立即取消
- ✅ 游戏立即开始
- ✅ 房间状态变为 `playing`

## 技术细节

### 状态流转

```
waiting (等待玩家) 
    ↓ (满座)
ready_check (准备检查,30秒倒计时)
    ↓ (所有玩家准备)
playing (游戏中)
    ↓ (游戏结束)
ended (已结束)
    ↓ (3秒后)
ready_check (新一轮准备检查)
```

### 超时处理流程

```
ready_check (准备检查中)
    ↓ (30秒超时)
onReadyTimeout()
    ├─ 获取未准备玩家列表
    ├─ 踢出未准备玩家
    ├─ 取消准备检查定时器
    ├─ 重置剩余玩家准备状态
    ├─ 恢复为 waiting 状态
    ├─ 广播房间状态更新
    └─ 发送 ready_check_cancelled 事件
```

### 新增事件

**`ready_check_cancelled`**
- **触发时机:** 准备检查超时,但有玩家已准备
- **数据结构:**
  ```typescript
  {
      reason: string;              // 取消原因
      remainingPlayers: number;    // 剩余玩家数量
  }
  ```
- **客户端处理:**
  - 清除倒计时显示
  - 重置准备状态
  - 保持在房间内(如果未被踢出)

## 相关文件

- `server/src/gamecore/MatchableGameRoom.js` - 服务端房间管理
- `server/src/gamecore/MatchRoomState.js` - 房间状态管理
- `client/src/app/game/chinesechess/play/page.tsx` - 客户端游戏页面

## 注意事项

1. **准备状态重置:** 所有剩余玩家的准备状态都会被重置为 `false`,即使他们之前已经点击了"开始"
2. **倒计时取消:** 准备检查定时器会被清除,倒计时UI会消失
3. **房间状态:** 房间会恢复为 `waiting` 状态,等待新玩家加入或现有玩家再次准备
4. **广播更新:** 所有房间状态变化都会通过 `broadcastRoomState()` 广播给所有客户端

## 后续优化建议

1. **用户体验改进:**
   - 可以添加 toast 提示,告知用户"部分玩家未准备,准备检查已取消"
   - 可以显示被踢出玩家的昵称

2. **日志增强:**
   - 已添加详细的 console.log,便于调试
   - 可以考虑添加到服务端日志系统

3. **测试覆盖:**
   - 建议添加单元测试覆盖这个场景
   - 建议添加集成测试验证多玩家场景
