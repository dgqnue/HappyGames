# 音效可见性 - 快速参考

## 音效分类总结

### 公开音效（两方都听到）
```
CHESS_EAT.mp3    - 吃子音效
  ├─ 来源：服务器广播的 move 事件
  ├─ 触发：当 captured 标志存在时
  └─ 听众：房间内所有客户端
```

### 私有音效（只有己方听到）
```
CHESS_SELECT.mp3 - 选中棋子音效
  ├─ 来源：本地 handleBoardClick()
  ├─ 触发：点击己方棋子时
  └─ 听众：仅操作者

CHESS_WIN.mp3    - 胜利音效
  ├─ 来源：本地游戏状态或服务器通知
  ├─ 触发：游戏结束且己方获胜时
  └─ 听众：仅获胜者

CHESS_LOSE.mp3   - 失败音效
  ├─ 来源：本地游戏状态或服务器通知
  ├─ 触发：游戏结束且己方失败时
  └─ 听众：仅失败者
```

## 关键代码位置

### 服务器端
- `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js:275`
  - broadcast('move') 包含 captured 标志

### 客户端
- `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx:115`
  - onMove 回调处理公开音效
- `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx:177`
  - playSound() 函数支持所有音效类型
- `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx:260`
  - handleBoardClick() 触发私有的 select 音效

## 防重复机制

```typescript
const lastAudioTimeRef = useRef<{ [key: string]: number }>({ 
    select: 0,  // 选中棋子
    eat: 0,     // 吃子
    win: 0,     // 胜利
    lose: 0     // 失败
});

// 100ms 内的重复播放会被跳过
if (now - lastTime < 100) return;
```

## 测试方式

1. **吃子音效测试**（公开）
   ```
   红方吃黑方的棋子 → 双方都听到 CHESS_EAT.mp3
   黑方吃红方的棋子 → 双方都听到 CHESS_EAT.mp3
   ```

2. **选中音效测试**（私有）
   ```
   玩家A选中棋子 → 只有玩家A听到 CHESS_SELECT.mp3
   玩家B选中棋子 → 只有玩家B听到 CHESS_SELECT.mp3
   ```

3. **防重复测试**
   ```
   快速重复点击同一棋子 → 音效不重复播放
   快速进行多个移动 → 音效不重叠
   ```

## 需要准备的文件

如果还没有 win/lose 音效文件，需要添加：
- `public/audio/effects/CHESS_WIN.mp3`
- `public/audio/effects/CHESS_LOSE.mp3`

或在 playSound() 中条件判断这些文件是否存在再播放。
