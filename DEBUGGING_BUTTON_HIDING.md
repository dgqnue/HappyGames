# 按钮隐藏功能 - 调试指南

## 问题描述

1. **问题 1**: 玩家都就绪后，倒计时期间按钮还是可见并且可点击
2. **问题 2**: 进入游戏后，退出按钮完全没有了

## 调试步骤

### 第一步：检查浏览器控制台日志

打开浏览器的开发者工具（F12），切换到 Console 标签页，查看以下日志：

```
[ChineseChessDisplay] updateGameState - current state: { status, countdownType, countdownCount }
[ChineseChessDisplay] isCountdownActive: true/false
[ChineseChessDisplay] countdownActive changed: true/false
[ChineseChessTableClient] game_countdown 事件: { count: 3 }
```

### 第二步：确认倒计时事件

在倒计时期间（3-2-1），应该看到类似的日志：

```
[ChineseChessDisplay] updateGameState - current state: { 
  status: 'matching', 
  countdownType: 'start',
  countdownCount: 3
}
[ChineseChessDisplay] isCountdownActive: true
[ChineseChessDisplay] countdownActive changed: true
```

**如果没有看到这些日志**，说明 `game_countdown` 事件没有被触发或没有更新状态。

### 第三步：检查游戏进行中的状态

游戏开始后，应该看到：

```
[ChineseChessDisplay] updateGameState - current state: { 
  status: 'playing',
  countdownType: null (或 'start')
}
[ChineseChessDisplay] isCountdownActive: true
[ChineseChessDisplay] countdownActive changed: true
```

---

## 常见原因和解决方案

### 问题 1：倒计时期间按钮仍可见

#### 可能原因 1：game_countdown 事件未被触发

**诊断**:
- 在浏览器控制台搜索 `game_countdown`
- 如果看不到相关日志，说明服务器没有发送该事件

**解决方案**:
1. 检查服务器是否调用了 `startGameCountdown()`
2. 检查 Socket 连接是否正常
3. 查看服务器日志是否有错误

**服务器代码位置**: `server/src/gamecore/matching/MatchPlayers.js` 中的 `startGameCountdown()` 方法

#### 可能原因 2：状态更新后没有触发组件重新渲染

**诊断**:
- 看是否有 `onStateChange triggered` 日志
- 如果没有，说明状态更新没有触发回调

**解决方案**:
1. 确保 `tableClient.onStateChange()` 被正确订阅
2. 检查 GameTableClient 中的 `stateChangeCallbacks` 是否为空

#### 可能原因 3：状态检测逻辑错误

**诊断**:
```javascript
// 在浏览器控制台执行
console.log(tableClient.getState());
// 检查输出中的 countdown 和 status 字段
```

**检查点**:
- `countdown.type` 应该是 `'start'`（不是其他值）
- `status` 应该是 `'matching'` 或 `'playing'`

---

### 问题 2：游戏进行中按钮完全没有了

这个行为实际上是**正确的**！当 `status === 'playing'` 时，按钮会隐藏。

但可能用户的**预期**是：
- 游戏进行中应该显示"认输"、"讲和"、"悔棋"等游戏按钮
- 但"退出"按钮应该隐藏

#### 解决方案：改进按钮显示逻辑

如果需要在游戏进行中显示某些按钮，但隐藏退出按钮，需要区分处理。

目前的代码是：
```tsx
<div 
  style={{
    display: countdownActive ? 'none' : 'flex',
    ...
  }}
>
  {/* 退出按钮 */}
</div>
```

这会在 `countdownActive === true` 时完全隐藏整个按钮容器。

如果需要游戏进行中也显示其他按钮，可以将按钮分组：

```tsx
{/* 游戏控制按钮 - 随时显示 */}
<div>催促、复盘、开始、悔棋、认输、讲和等</div>

{/* 退出按钮 - 倒计时和游戏进行中隐藏 */}
<div style={{ display: countdownActive ? 'none' : 'flex' }}>
  {/* 退出按钮 */}
</div>
```

---

## 快速诊断脚本

在浏览器控制台粘贴以下代码来快速诊断：

```javascript
// 获取当前状态
const state = window.tableClient?.getState?.();
console.log('=== 游戏状态诊断 ===');
console.log('状态 (status):', state?.status);
console.log('倒计时类型:', state?.countdown?.type);
console.log('倒计时数字:', state?.countdown?.count);
console.log('应隐藏按钮?:', state?.countdown?.type === 'start' || state?.status === 'playing');

// 检查回调是否已注册
console.log('状态变化回调数量:', window.tableClient?.stateChangeCallbacks?.length || 'N/A');

// 手动触发更新
console.log('正在检查组件状态...');
```

---

## 解决步骤总结

### 如果倒计时期间按钮仍可见：

1. **第一步**: 打开浏览器控制台
2. **第二步**: 复制上面的诊断脚本并执行
3. **第三步**: 检查输出，看 `countdown.type` 是否为 `'start'`
4. **第四步**: 检查是否有任何 JavaScript 错误
5. **第五步**: 如果没有 `game_countdown` 事件，检查服务器日志

### 如果游戏进行中按钮没有了：

1. 这是**预期行为**（根据当前实现）
2. 如果需要改进，需要修改按钮布局和显示逻辑

---

## 相关文件

- **组件代码**: `client/src/games/chinesechess/gamepagehierarchy/ChineseChessDisplayPlugin.tsx`
- **状态管理**: `client/src/gamecore/hierarchy/GameTableClient.ts`
- **服务器倒计时**: `server/src/gamecore/matching/MatchPlayers.js`

---

## 在线测试

如果要在线测试按钮隐藏功能，可以：

1. **加入游戏桌**
2. **所有玩家点击准备**
3. **观察退出按钮**：
   - 倒计时期间应该隐藏
   - 游戏进行中应该隐藏
   - 游戏结束后应该显示

---

**更新**: 已添加详细日志，方便调试。请查看浏览器控制台的输出。
