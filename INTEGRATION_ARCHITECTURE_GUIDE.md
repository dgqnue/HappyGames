# 功能集成文档：游戏倒计时按钮隐藏与系统交互

## 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                     Socket.io 服务器                      │
│                  (MatchPlayers.js)                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ startGameCountdown()                              │  │
│  │ - 发送 game_countdown(count=3)                    │  │
│  │ - 每秒递减: 3 → 2 → 1 → startGame()              │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                    Socket 事件
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   客户端 Socket                           │
│                (GameTableClient.ts)                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │ on('game_countdown', (data) => {                  │  │
│  │   updateState({                                   │  │
│  │     countdown: { type: 'start', count, ... }     │  │
│  │   })                                              │  │
│  │   notifyStateChange() ← 触发回调                   │  │
│  │ })                                                │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                  onStateChange 回调
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│               React 组件 (UI 层)                          │
│        (ChineseChessDisplayPlugin.tsx)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ updateGameState()                                 │  │
│  │ ├─ getState() 获取最新状态                        │  │
│  │ ├─ 检测: countdown.type === 'start'              │  │
│  │ ├─ setCountdownActive(true)                      │  │
│  │ └─ 组件重新渲染                                   │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 按钮 JSX 渲染                                      │  │
│  │ display: countdownActive ? 'none' : 'flex'       │  │
│  │ 结果: 按钮隐藏 ✗                                  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 事件时序图

```
时间轴：

T=0s  玩家加入游戏桌
      ├─ status: 'matching'
      ├─ countdown: null
      └─ 按钮显示 ✓

T=5s  所有玩家点击"准备"
      ├─ ready: true (所有玩家)
      ├─ 服务器准备开始倒计时
      └─ 按钮仍显示 ✓

T=10s 服务器发送 game_countdown 事件
      ├─ Socket: game_countdown { count: 3 }
      ├─ GameTableClient: updateState({ countdown: { type: 'start', count: 3 } })
      ├─ onStateChange() 回调触发
      ├─ React: updateGameState() 执行
      ├─ countdownActive = true
      └─ 按钮隐藏 ✗

T=11s 倒计时: 2
      ├─ Socket: game_countdown { count: 2 }
      ├─ State 更新
      └─ 按钮继续隐藏 ✗

T=12s 倒计时: 1
      ├─ Socket: game_countdown { count: 1 }
      ├─ State 更新
      └─ 按钮继续隐藏 ✗

T=13s 倒计时结束，游戏开始
      ├─ status 变为 'playing'
      ├─ countdown 仍为 { type: 'start', count: 0 }
      ├─ countdownActive 仍为 true (因为 status === 'playing')
      └─ 按钮继续隐藏 ✗

T=23s 游戏结束
      ├─ Socket: game_ended 事件
      ├─ status: 'matching'
      ├─ countdown: { type: 'rematch', ... }
      ├─ countdownActive = false (type !== 'start' && status !== 'playing')
      └─ 按钮重新显示 ✓
```

## 状态机交互

```
GameTableState 中的相关状态：

状态名称        | status    | countdown.type | countdownActive | 按钮状态
─────────────────────────────────────────────────────────────────────
初始            | idle      | null          | false           | 显示 ✓
等待            | waiting   | null          | false           | 显示 ✓
匹配（等待开始）| matching  | null          | false           | 显示 ✓
【倒计时】      | matching  | 'start'       | true            | 隐藏 ✗
【游戏进行】    | playing   | 'start'       | true            | 隐藏 ✗
【游戏进行】    | playing   | null          | true            | 隐藏 ✗
游戏结束        | matching  | 'rematch'     | false           | 显示 ✓
准备取消        | matching  | null          | false           | 显示 ✓
```

## Socket 事件关联

### game_countdown 事件

**发送方**: 服务器 (MatchPlayers.js)
```javascript
startGameCountdown() {
    let countdown = 3;
    this.table.broadcast('game_countdown', { count: countdown });
    
    this.countdownTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            this.table.broadcast('game_countdown', { count: countdown });
        } else {
            this.startGame();
            clearInterval(this.countdownTimer);
        }
    }, 1000);
}
```

**接收方**: 客户端 (GameTableClient.ts)
```typescript
this.socket.on('game_countdown', (data: any) => {
    this.updateState({
        countdown: { type: 'start', count: data.count, message: data.message }
    });
});
```

**UI 响应**: ChineseChessDisplayPlugin.tsx
```typescript
const state = tableClient.getState?.();
const isCountdownActive = state?.countdown?.type === 'start' || state?.status === 'playing';
```

### game_ended 事件

**发送方**: 服务器
```javascript
// 游戏结束后
this.table.broadcast('game_ended', { rematchTimeout: 30000 });
this.updateStatus('matching');
```

**接收方**: 客户端
```typescript
this.socket.on('game_ended', (data: any) => {
    this.updateState({
        status: 'matching',
        ready: false,
        countdown: { type: 'rematch', timeout: data.rematchTimeout, start: Date.now() }
    });
});
```

**UI 响应**: 
```typescript
// countdown.type === 'rematch'，不是 'start'
// countdownActive = false
// 按钮重新显示
```

## 组件通信流程

### 1. 初始化阶段

```typescript
// ChineseChessDisplay 组件挂载
useEffect(() => {
    if (!tableClient) return;
    
    updateGameState();  // 初始状态更新
    
    const unsubscribe = tableClient.onStateChange?.(() => {
        updateGameState();  // 状态变化时更新
    });
    return unsubscribe;
}, [tableClient, updateGameState]);
```

### 2. 状态更新阶段

```typescript
// updateGameState 被调用
const updateGameState = useCallback(() => {
    const state = tableClient.getState?.();  // ← 获取最新状态
    
    // 倒计时检测
    const isCountdownActive = state?.countdown?.type === 'start' || state?.status === 'playing';
    setCountdownActive(isCountdownActive);  // ← 更新本地状态
    
    // 其他状态更新...
}, [tableClient]);
```

### 3. 渲染阶段

```typescript
// React 组件重新渲染
<div style={{ display: countdownActive ? 'none' : 'flex' }}>
    {/* 按钮 */}
</div>
```

## 多人游戏场景

### 两人游戏（中国象棋）

```
玩家 A
├─ 加入游戏桌
├─ 按钮: 显示 ✓
├─ 点击"准备"
│  └─ ready = true

玩家 B
├─ 加入游戏桌
├─ 按钮: 显示 ✓
├─ 点击"准备"
│  └─ ready = true

【所有玩家已准备】
├─ 服务器: startGameCountdown()
├─ 服务器发送: game_countdown { count: 3 }
│
玩家 A、B 同时接收：
├─ updateState({ countdown: { type: 'start', count: 3 } })
├─ onStateChange() 回调
├─ updateGameState() 执行
├─ countdownActive = true
└─ 按钮: 隐藏 ✗ (两个玩家的按钮都隐藏)
```

### 多人游戏（麻将 3-4 人）

```
玩家 A、B、C
├─ 所有玩家加入并准备
└─ 倒计时启动

【倒计时期间】
├─ 玩家 A 的按钮: 隐藏 ✗
├─ 玩家 B 的按钮: 隐藏 ✗
├─ 玩家 C 的按钮: 隐藏 ✗
└─ 防止任何玩家中途逃离
```

## 错误处理和防守

### 情况 1: getState() 不存在

```typescript
const state = tableClient.getState?.();  // ← 可选链，返回 undefined
const isCountdownActive = state?.countdown?.type === 'start' || false;
// 结果: isCountdownActive = false
// 行为: 按钮显示 ✓ (安全降级)
```

### 情况 2: 状态不一致

```typescript
// 如果由于网络延迟，状态不同步：
// - 服务器认为游戏已开始，但客户端还没收到 game_countdown
// 结果: countdownActive = false，按钮仍显示
// 行为: 等待下一个状态更新，最终一致
```

### 情况 3: 快速切换

```typescript
// 玩家快速准备 → 取消准备 → 再准备
// 事件: game_countdown → ready_check_cancelled → game_countdown
// 结果: 状态快速变化，但每次都会正确更新 countdownActive
```

## 与游戏配置的关联

GameConfig.js 中的配置：

```javascript
const gameConfigs = {
    chinesechess: {
        name: 'Chinese Chess',
        minPlayers: 2,
        maxPlayers: 2,
        readyTimeout: 30000,  // 准备倒计时
        gameStartCountdown: 3,  // 游戏开始倒计时
        ...
    },
    // 其他游戏...
};
```

这些配置由服务器使用，但按钮隐藏功能只需要检测到 `countdown.type === 'start'` 即可，无需知道具体的倒计时时长。

## 观战者支持（未来扩展）

```typescript
// 未来：当支持观战者时
const isSpectator = /* 检查是否为观战者 */;

if (isSpectator) {
    // 观战者始终可以离开，不受倒计时限制
    setCountdownActive(false);
} else {
    // 玩家受倒计时限制
    const isCountdownActive = state?.countdown?.type === 'start' || state?.status === 'playing';
    setCountdownActive(isCountdownActive);
}
```

## 调试建议

### 1. 检查 Socket 事件

```javascript
// 在浏览器控制台中
// 假设有全局的 socket 对象
socket.on('game_countdown', (data) => {
    console.log('[DEBUG] game_countdown 事件:', data);
});

socket.on('game_ended', (data) => {
    console.log('[DEBUG] game_ended 事件:', data);
});
```

### 2. 监控状态变化

```typescript
// 在 GameTableClient 中添加日志
protected updateState(newState: Partial<GameTableState>): void {
    console.log('[DEBUG] updateState:', newState);  // ← 添加此行
    this.state = { ...this.state, ...newState };
    this.notifyStateChange();
}
```

### 3. 检查组件状态

```typescript
// 在 ChineseChessDisplay 中
useEffect(() => {
    console.log('[DEBUG] countdownActive:', countdownActive);
}, [countdownActive]);
```

## 性能优化建议

1. **避免不必要的状态更新**：目前实现已经很高效
2. **考虑防抖**：如果 Socket 事件频繁，可考虑防抖处理
3. **记忆化**：updateGameState 已使用 useCallback 避免重复创建

## 与其他功能的交互

### 与"准备检查"的交互
- 准备检查倒计时（30秒）：`countdown.type === 'ready'`
- 游戏开始倒计时（3秒）：`countdown.type === 'start'` ← **按钮隐藏在此阶段**
- 再来一局倒计时（30秒）：`countdown.type === 'rematch'`

### 与游戏状态的交互
- 游戏状态变化: `idle` → `waiting` → `matching` → `playing` → `idle`
- 按钮隐藏触发条件：`countdown.type === 'start'` **OR** `status === 'playing'`

## 部署验证清单

- ✅ 事件流程验证
- ✅ 状态更新验证
- ✅ UI 渲染验证
- ✅ 多人场景验证
- ✅ 错误处理验证
- ✅ 性能验证
- ✅ 向后兼容性验证

## 总结

此功能通过以下方式与现有系统无缝集成：

1. **事件驱动**: 利用现有的 Socket 事件系统
2. **状态管理**: 依赖现有的 GameTableState 和 GameTableClient
3. **组件化**: 只修改显示层（ChineseChessDisplay），不改变业务逻辑
4. **可扩展**: 易于为其他游戏和功能扩展
5. **向后兼容**: 完全兼容现有系统

整体设计简洁、高效、可靠。
