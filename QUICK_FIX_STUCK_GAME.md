# "走不动" 问题 - 快速排查

## 可能原因

| 原因 | 症状 | 解决方案 |
|------|------|--------|
| **不是你的回合** | Console显示 `currentTurn≠mySide` | 等待对方移动 |
| **mySide未初始化** | Console显示 `mySide: undefined` | 重新加入游戏或刷新 |
| **游戏已结束** | Console显示 `isPlaying: false` | 返回房间并开始新局 |
| **网络断开** | WebSocket连接为红色/断开 | 检查网络，刷新页面 |
| **棋盘数据错误** | 棋子位置显示错误 | 刷新页面重新同步 |

## Console快速检查

打开 F12 → Console，查看这些日志：

### 正常状态
```
[ChineseChessDisplay] updateGameState: {turn: "r", mySide: "r", isPlaying: true}
[BoardClick] Is My Turn: true
```

### 异常状态
```
[ChineseChessDisplay] updateGameState: {turn: "b", mySide: "r", isPlaying: true}
                                        ↑ 轮到对方
```

```
[ChineseChessDisplay] updateGameState: {turn: "r", mySide: undefined, isPlaying: true}
                                                      ↑ 我方信息丢失
```

## 解决步骤

1. **打开 F12** (或 Ctrl+Shift+I)
2. **切换到 Console 标签**
3. **在棋盘上尝试移动**
4. **查看日志中的 turn 和 mySide**
5. **根据上表对应解决**

## 长期修复（开发者）

已添加的诊断日志包括：
- `updateGameState()` - 显示 turn/mySide/isPlaying 状态
- `handleBoardClick()` - 显示为什么无法移动的具体原因
- `handleMove()` (服务器) - 显示服务器为什么拒绝移动

## 详细诊断

查看完整诊断指南：`STUCK_GAME_DIAGNOSIS.md`

