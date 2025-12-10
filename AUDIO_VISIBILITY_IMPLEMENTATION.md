# 音效可见性实现说明

## 概述

为了解决"红方吃子的音效，黑方听不到"的问题，我们实现了音效可见性控制：
- **公开音效**（两个玩家都能听到）：吃子音效（CHESS_EAT.mp3）
- **私有音效**（只有己方能听到）：选中棋子（CHESS_SELECT.mp3）、胜利（CHESS_WIN.mp3）、失败（CHESS_LOSE.mp3）

## 实现原理

### 服务器端（ChineseChessTable.js）

服务器在 `handleMove()` 方法中广播 `move` 事件时，包含 `captured` 标志：

```javascript
this.broadcast('move', {
    move,
    captured: captured ? captured : null,  // 指示是否有吃子
    turn: this.turn,
    board: this.board
});
```

这个事件会被发送给房间内的所有客户端（包括两个玩家和观众）。

### 客户端（ChineseChessDisplayPlugin.tsx）

#### 音效分类

1. **公开音效 - 吃子（eat）**
   - 来源：服务器广播的 `move` 事件
   - 回调：`onMove` 回调接收服务器事件，当 `data.captured` 存在时播放
   - 听众：双方都听到

2. **私有音效 - 选中棋子（select）**
   - 来源：本地用户交互
   - 回调：`handleBoardClick()` 中选中棋子时调用
   - 听众：只有操作者听到

3. **私有音效 - 胜利/失败（win/lose）**
   - 来源：本地游戏状态更新
   - 回调：需要在游戏结束时调用（待实现）
   - 听众：只有该玩家听到

#### 实现细节

```typescript
// 监听服务器广播的移动事件
(tableClient as any).onMove = (data: any) => {
    if (data.captured) {
        playSound('eat');  // 吃子音效是公开的
    }
};

// 本地交互事件
if (isClickedMyPiece) {
    setSelectedPiece({ row, col });
    playSound('select');  // 选中音效是私有的
}
```

#### 防重复机制

使用 100ms 防抖机制防止音效重复播放：

```typescript
const lastAudioTimeRef = useRef<{ [key: string]: number }>({ 
    select: 0, 
    eat: 0, 
    win: 0, 
    lose: 0 
});

if (now - lastTime < 100) {
    return;  // 跳过播放
}
```

## 文件修改

### 已修改文件

1. **client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx**
   - 更新 `onMove` 回调说明注释
   - 扩展 `playSound()` 支持所有音效类型（select、eat、win、lose）
   - 更新 `lastAudioTimeRef` 初始化以支持所有音效类型

### 无需修改文件

- **server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js** 
  - 已经在广播 `captured` 标志，无需修改

## 音效文件清单

需要确保以下音效文件存在：

| 文件 | 类型 | 用途 | 听众 |
|------|------|------|------|
| `/audio/effects/CHESS_SELECT.mp3` | 私有 | 选中棋子 | 己方 |
| `/audio/effects/CHESS_EAT.mp3` | 公开 | 吃子 | 双方 |
| `/audio/effects/CHESS_WIN.mp3` | 私有 | 胜利 | 获胜者 |
| `/audio/effects/CHESS_LOSE.mp3` | 私有 | 失败 | 失败者 |

## 测试清单

- [ ] 红方吃子时，黑方能听到吃子音效
- [ ] 黑方吃子时，红方能听到吃子音效
- [ ] 选中棋子时，只有自己能听到选中音效
- [ ] 没有音效重复播放（防抖机制正常工作）
- [ ] 游戏结束时，获胜者听到胜利音效
- [ ] 游戏结束时，失败者听到失败音效

## 后续改进

1. **胜利/失败音效集成**
   - 在 `handleWin()` 服务器方法完成时，通知客户端播放音效
   - 可以通过客户端监听游戏状态变化来实现

2. **移动音效优化**
   - 可以为普通移动（未吃子）添加音效
   - 添加类型：'move'，来自服务器广播

3. **音量控制**
   - 为每种音效添加独立的音量控制
   - 保存用户偏好设置

4. **音效预加载**
   - 游戏开始时预加载所有音效文件
   - 提高播放响应速度

## 架构优势

1. **公开音效通过服务器广播**
   - 确保所有客户端同时听到
   - 避免网络延迟导致音效不同步

2. **私有音效本地播放**
   - 立即响应用户交互
   - 无网络延迟

3. **防重复机制**
   - 防止快速连续触发的重复播放
   - 保护用户听觉体验

4. **易于扩展**
   - 新增音效类型只需修改 playSound() 参数
   - 清晰的公开/私有分类标准
