# 将军音效实现完整方案

## 概述

将军音效已完整实现，包括后端检测和前端播放。当发生将军时，所有玩家都会听到将军音效。

## 实现步骤

### 1. 后端：检测将军状态 ✅

#### 文件：`server/src/games/chinesechess/logic/ChineseChessRules.js`

添加了三个新方法：

**① `getKingPosition(board, side)`**
- 找到指定方的将/帅位置
- 参数：棋盘、方向（'r' 或 'b'）
- 返回：{x, y} 或 null

**② `isKingUnderAttack(board, kingX, kingY, side)`**
- 检查将/帅是否受到敌方攻击
- 遍历所有敌方棋子，检查是否能攻击到该位置
- 返回：boolean

**③ `isCheckAfterMove(board, fromX, fromY, toX, toY, side)`**
- 检查移动后是否形成将军（核心方法）
- 深拷贝棋盘，模拟该移动
- 找到对方国王位置
- 检查对方国王是否受到新的攻击
- 返回：boolean

#### 文件：`server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js`

修改了 `handleMove` 方法：

```javascript
// 检查是否形成将军
const check = ChineseChessRules.isCheckAfterMove(this.board, fromX, fromY, toX, toY, side);

// 广播移动（添加 check 标志）
this.broadcast('move', {
    move,
    captured: captured ? captured : null,
    check: check,                    // ✨ 新增
    turn: this.turn,
    board: this.board
});
```

### 2. 前端：接收并播放将军音效 ✅

#### 文件：`client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx`

**① 预加载将军音效**

```javascript
// 初始化时加载
loadBuffer('/audio/effects/jiangjun.mp3', 'check')
```

**② 监听移动事件并检测将军**

```javascript
const onMoveHandler = (data: any) => {
    // ... 其他处理 ...
    
    // 处理将军事件
    if (data.check) {
        console.log('[ChineseChessDisplay] Playing check sound');
        playSound('check');
    }
};
```

## 调用流程

```
玩家A移动棋子
    ↓
前端发送 move 事件 → 后端 handleMove()
    ↓
后端检测：isCheckAfterMove() → 是否形成将军
    ↓
后端广播 move 事件（包含 check: true/false）
    ↓
前端 onMoveHandler() 接收
    ↓
if (data.check) playSound('check')
    ↓
播放将军音效 🔊
```

## 音效文件

- **文件名**: `jiangjun.mp3`
- **位置**: `/client/public/audio/effects/`
- **触发条件**: 当后端检测到 `check: true` 时
- **播放对象**: 所有玩家都能听到（公开音效）
- **防重放**: 100ms 内不会重复播放同一音效

## 测试步骤

1. **启动游戏**
   - 确保后端服务运行
   - 启动前端应用

2. **进行对局**
   - 两个玩家进入棋局
   - 进行正常的棋子移动

3. **观察将军检测**
   - 当一个移动导致对方国王被攻击时
   - 后端日志应该显示：`check=true`
   - 前端日志应该显示：`Playing check sound`

4. **验证音效**
   - 听到将军音效播放
   - 音效在 100ms 防护期内不会重复播放

## 调试方法

### 后端调试

查看服务器日志：
```
[ChineseChessTable] Broadcasting move: ... check=true
```

### 前端调试

打开浏览器控制台，查看：
```
[ChineseChessDisplay] Playing check sound (public event from server)
```

### 音效验证

1. 检查音效是否已加载：
   ```
   [ChineseChessDisplay] Loaded audio: check
   ```

2. 检查播放路径：
   ```
   [ChineseChessDisplay] Playing check sound via Web Audio API
   // 或
   [ChineseChessDisplay] Playing check sound via HTML5 Audio
   ```

## 常见问题

### Q: 为什么没有听到将军音效？

**可能原因及解决方案：**

1. **后端未检测到将军**
   - 检查日志是否显示 `check=true`
   - 确认移动确实形成了将军（使用棋局规则手动验证）
   - 检查 `isCheckAfterMove` 方法的逻辑

2. **前端未接收到 check 标志**
   - 打开浏览器控制台
   - 查看 `onMoveHandler` 是否被调用
   - 检查 `data.check` 是否为 true

3. **音效文件未加载**
   - 确认 `jiangjun.mp3` 存在于 `/public/audio/effects/`
   - 检查网络请求（F12 → Network）
   - 查看控制台日志中的加载状态

4. **浏览器音频被禁用**
   - 检查浏览器音量是否为 0
   - 检查浏览器对该页面的音频权限
   - 尝试在其他网站播放音频

5. **防重放机制阻止播放**
   - 短时间内多次产生将军会被防护
   - 这是正常的防护机制，防止音效过度播放

### Q: 如何禁用防重放保护？

修改前端代码中的防护时间：

```javascript
// 改这个值（单位毫秒）
if (now - lastTime < 100) {  // ← 改这个 100
    return;
}
```

### Q: 音效质量如何改善？

1. **后端优化**
   - 确保 `isCheckAfterMove` 的检测准确
   - 减少虚假将军警告

2. **前端优化**
   - 调整音效音量
   - 使用不同的音效文件
   - 考虑添加其他视觉反馈

## 技术细节

### 将军检测算法

```
isCheckAfterMove(board, move, side):
  1. 深拷贝棋盘
  2. 执行该移动
  3. 找到对方国王位置
  4. 遍历所有我方棋子
  5. 检查是否有我方棋子能"走"到对方国王位置
  6. 如果能，返回 true（形成将军）
```

**性能**: O(n²) 其中 n=81（棋盘格子数）

### 音效播放顺序

1. **Web Audio API**（优先）
   - 预加载的 AudioBuffer
   - 低延迟，高精度

2. **HTML5 Audio**（降级）
   - 直接播放文件
   - 兼容性更好

## 相关文件清单

### 后端
- ✅ `server/src/games/chinesechess/logic/ChineseChessRules.js` - 棋规和将军检测
- ✅ `server/src/games/chinesechess/gamepagehierarchy/ChineseChessTable.js` - 移动处理和广播

### 前端
- ✅ `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx` - 音效加载和播放

### 资源
- ✅ `client/public/audio/effects/jiangjun.mp3` - 将军音效文件

## 后续改进

可以考虑的改进方向：

1. **更精确的将军检测**
   - 考虑将军的具体类型（正面、侧面、后面）
   - 添加不同的音效表现

2. **视觉反馈**
   - 棋盘闪烁或变色
   - 国王位置高亮显示
   - 危险信号提示

3. **音效优化**
   - 使用不同的将军音效
   - 添加音效交集处理（避免音效重叠）

4. **游戏规则**
   - 实现"双将不能吃"的规则
   - 实现"长将"判负规则
   - 实现"卧槽"等其他约束

## 最后验证

确保以下代码都已添加：

✅ 后端：`ChineseChessRules.isCheckAfterMove()`
✅ 后端：`handleMove()` 中添加 `check` 检测
✅ 后端：广播中包含 `check: check`
✅ 前端：预加载 `jiangjun.mp3`
✅ 前端：`onMoveHandler` 检查 `data.check`
✅ 前端：`playSound('check')` 调用
✅ 音效文件：存在于 `/public/audio/effects/jiangjun.mp3`
