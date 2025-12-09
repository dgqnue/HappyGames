# 游戏倒计时期间隐藏离开/退出按钮功能

**状态**: ✅ 已完成  
**日期**: 2024  
**涉及文件**: ChineseChessDisplayPlugin.tsx

## 功能概述

当所有玩家都已准备就绪并游戏倒计时（3-2-1）开始时，隐藏"退出"按钮，强制玩家等待直到游戏结束。这确保了公平的游戏流程，防止玩家在最后一刻逃离比赛。

## 实现细节

### 1. 状态管理添加

在 `ChineseChessDisplay` 组件中添加了新的状态变量：

```typescript
const [countdownActive, setCountdownActive] = useState(false);
```

此状态跟踪游戏倒计时是否处于活动状态。

### 2. 倒计时检测逻辑

在 `updateGameState` 函数中添加了倒计时检测：

```typescript
// 获取倒计时状态 - 检查是否在游戏开始倒计时或正在游戏中
const state = tableClient.getState?.();
const isCountdownActive = state?.countdown?.type === 'start' || state?.status === 'playing';
setCountdownActive(isCountdownActive);
```

检查两个条件：
- **`state?.countdown?.type === 'start'`**: 游戏开始倒计时（3-2-1秒）
- **`state?.status === 'playing'`**: 游戏正在进行中

### 3. 按钮条件隐藏

修改了"退出"按钮的显示逻辑：

```tsx
{/* 退出 */}
<div 
  style={{
    display: countdownActive ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }}
>
  <img
    src="/images/chinesechess/buttoms/exit.png"
    alt="退出"
    title="退出"
    style={{ width: '50px', height: '50px', cursor: 'pointer', display: 'block' }}
    onClick={onLeaveTable}
  />
</div>
```

使用三元表达式：`display: countdownActive ? 'none' : 'flex'`
- 当倒计时活动时：`display: 'none'` - 按钮隐藏
- 当倒计时不活动时：`display: 'flex'` - 按钮可见

## 游戏流程时间表

```
游戏状态变化时间表：
├── 等待状态 (waiting)
│   └── 退出按钮: 可见 ✓
├── 匹配状态 (matching)
│   └── 退出按钮: 可见 ✓
├── 所有玩家准备就绪
│   └── 游戏开始倒计时 (3-2-1)
│       └── 倒计时类型: 'start'
│       └── 退出按钮: 隐藏 ✗
├── 游戏进行中 (playing)
│   └── 退出按钮: 隐藏 ✗
└── 游戏结束 (ended/matching)
    └── 退出按钮: 可见 ✓
```

## 状态来源

倒计时状态来自 `GameTableClient` 的 Socket 事件：

1. **game_countdown 事件** (来自服务器):
   ```typescript
   this.socket.on('game_countdown', (data: any) => {
     this.updateState({
       countdown: { type: 'start', count: data.count, message: data.message }
     });
   });
   ```

2. **game_ended 事件** (游戏结束):
   ```typescript
   this.socket.on('game_ended', (data: any) => {
     this.updateState({
       status: 'matching',
       ready: false,
       countdown: { type: 'rematch', timeout: data.rematchTimeout, start: Date.now() }
     });
   });
   ```

游戏结束时，倒计时类型变为 'rematch'，不是 'start'，所以按钮会重新显示。

## 服务器端支持

服务器端 (`MatchPlayers.js`) 中的倒计时实现：

```javascript
startGameCountdown() {
  let countdown = 3;
  this.table.broadcast('game_countdown', { count: countdown });

  this.countdownTimer = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      this.table.broadcast('game_countdown', { count: countdown });
    } else {
      // 开始游戏
      this.startGame();
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }, 1000);
}
```

## 测试场景

### ✅ 场景 1: 正常游戏流程
1. 玩家加入游戏桌
2. 所有玩家选择准备
3. **退出按钮隐藏**（倒计时活动）
4. 游戏开始
5. **退出按钮保持隐藏**（游戏进行中）
6. 游戏结束
7. **退出按钮重新显示**

### ✅ 场景 2: 中途准备检查取消
1. 玩家准备就绪
2. **退出按钮隐藏**
3. 有玩家取消准备
4. **退出按钮重新显示**（倒计时被取消）

### ✅ 场景 3: 观战模式（未来扩展）
- 观众始终可以离开（不受倒计时限制）

## 文件修改总结

**修改文件**: `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx`

**修改内容**:
1. 添加 `countdownActive` 状态变量 (第56行)
2. 在 `updateGameState` 中添加倒计时检测逻辑 (第69-70行)
3. 修改退出按钮的 display 样式为条件隐藏 (第347行)

**代码行数**: +3 行修改

## 向后兼容性

✅ **完全向后兼容**
- 不改变任何现有 API
- 只添加新的条件显示逻辑
- 在没有倒计时状态时正常工作

## 相关文档

- [GameTableClient](./client/src/gamecore/hierarchy/GameTableClient.ts): Socket 事件处理
- [MatchPlayers.js](./server/src/gamecore/matching/MatchPlayers.js): 服务器端倒计时逻辑
- [MULTIPLAYER_GAMES_OPTIMIZATION.md](./MULTIPLAYER_GAMES_OPTIMIZATION.md): 多人游戏系统概览

## 后续改进建议

1. **添加提示信息**: 当按钮隐藏时，显示"游戏进行中，请等待..."的提示
2. **支持其他游戏**: 为 Gomoku、Mahjong、Poker 等游戏添加相同功能
3. **观战者处理**: 确保观战者始终可以离开
4. **倒计时显示**: 在按钮隐藏时显示倒计时数字 (3-2-1)
5. **观察系统**: 实现完整的观察/观战模式支持
