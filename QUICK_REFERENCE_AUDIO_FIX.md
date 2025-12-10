# 音效重复播放问题 - 快速参考

## 问题
吃子音效有时被调用多次

## 解决方案已实施

### 核心修复：防重触发机制与多监听器支持
1. **防重触发**：在 `ChineseChessDisplayPlugin.tsx` 中添加了 **100毫秒防重机制**
   - 同一音效在100ms内最多播放一次
2. **多监听器支持**：在 `ChineseChessTableClient.ts` 中引入了 `addMoveListener` 模式
   - 解决了 `onMove` 回调可能被覆盖或丢失的问题
   - 确保红黑双方都能稳定接收到移动事件并播放音效

### 实施位置

| 文件 | 修改内容 |
|------|----------|
| `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx` | 使用 `addMoveListener` 注册音效回调 |
| `client/src/games/chinesechess/gamepagehierarchy/ChineseChessTableClient.ts` | 添加 `moveListeners` 数组及管理方法 |
| `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` | 添加移动事件广播日志 |

## 验证日志

打开浏览器开发者工具（F12），在 Console 中查看：

### 预期日志流程
```
1. [ChineseChessTableClient] Move event received from server: {move: {...}, captured: "R"}
2. [ChineseChessTableClient] handleMove: Calling 1 move listeners
3. [ChineseChessDisplay] onMove callback triggered: {captured: "R"}
4. [ChineseChessDisplay] Playing eat sound at 1701234567890
```

### 异常日志
如果看到以下日志，说明防重机制在工作：
```
[ChineseChessDisplay] Skipping audio eat - played too recently
```

## 服务器日志

检查服务器日志中的 move 事件广播：
```
[ChineseChessTable] Broadcasting move: captured=R, from=(4,6) to=(5,5)
```

如果同一个移动被广播多次，会看到多条相同的日志。

## 如果问题仍然存在

1. **查看浏览器日志**：确认音效播放次数
2. **查看服务器日志**：确认 move 事件是否被多次广播
3. **信息提供给开发者**：
   - 浏览器控制台完整日志
   - 服务器完整日志
   - 具体步骤（哪个棋子吃掉了对方哪个棋子）

## 技术细节

### 防重机制原理
```typescript
const lastAudioTimeRef = useRef({ select: 0, eat: 0 });

const playSound = (type: 'select' | 'eat') => {
  const now = Date.now();
  const lastTime = lastAudioTimeRef.current[type];
  
  // 如果距离上次播放不足100ms，则跳过
  if (now - lastTime < 100) return;
  
  lastAudioTimeRef.current[type] = now;
  // 播放音效...
};
```

### 为什么选择100毫秒
- 足够防止快速的重复调用
- 用户的听觉分辨率：人类很难区分100ms内的声音
- 性能考虑：不会对游戏性能产生影响

## 相关文件

- 详细报告：`AUDIO_DUPLICATION_FIX.md`
- 快速参考：本文件

