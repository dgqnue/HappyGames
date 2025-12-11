# 游戏音效添加完成

## 新增音效

已成功将两个新音效集成到游戏中：

### 1. 将军音效 (`jiangjun.mp3`)
- **位置**: `/client/public/audio/effects/jiangjun.mp3`
- **触发时机**: 当棋局中发生"将军"状态时播放
- **音效类型**: 公开音效（两个玩家都能听到）
- **集成点**: `onMove` 事件处理中，检查 `data.check` 标志

### 2. 棋子移动音效 (`MOVE.WAV`)
- **位置**: `/client/public/audio/effects/MOVE.WAV`
- **触发时机**: 当玩家移动棋子时播放
- **音效类型**: 私有音效（只有移动方能听到）
- **集成点**: `handleBoardClick` 中的 `sendMove` 调用后

## 修改文件

### `ChineseChessDisplayPlugin.tsx`

#### 1. 音效类型声明更新
- 行 62: 在注释中添加了 `'check'`（将军）和 `'move'`（移动）两个新音效类型

#### 2. 音效时间跟踪更新
- 行 63: 在 `lastAudioTimeRef` 中添加了 `check: 0` 和 `move: 0`

#### 3. 音效初始化加载
- 行 253-254: 添加了对两个新音效文件的预加载：
  ```javascript
  loadBuffer('/audio/effects/jiangjun.mp3', 'check'),
  loadBuffer('/audio/effects/MOVE.WAV', 'move')
  ```

#### 4. onMove 事件处理增强
- 行 124-148: 修改了 `onMoveHandler` 以支持将军音效：
  - 添加了 `check: data.check` 的日志记录
  - 添加了检查 `data.check` 标志的逻辑
  - 当检测到将军时调用 `playSound('check')`

#### 5. 音效播放类型定义
- 行 276: 更新了 `playSound` 函数的类型签名，添加 `'check' | 'move'`

#### 6. 音效路径映射
- 行 313-316: 添加了新音效的路径映射：
  - `'check'` → `/audio/effects/jiangjun.mp3`
  - `'move'` → `/audio/effects/MOVE.WAV`

#### 7. 棋子移动音效触发
- 行 388: 在 `sendMove` 后调用 `playSound('move')`

## 音效分类

### 私有音效（只有当前玩家能听到）
- `'select'` - 选中棋子
- `'win'` - 胜利
- `'lose'` - 失败
- `'move'` - 移动棋子 ✨ **新增**

### 公开音效（两个玩家都能听到）
- `'eat'` - 吃子
- `'check'` - 将军 ✨ **新增**

## 防重放机制

所有音效都有 100ms 的重放防护，防止在短时间内重复播放同一音效。

## 后端集成要求

为了使将军音效正常工作，后端需要在 `move` 事件中添加 `check` 标志：

```javascript
{
  captured: true/false,  // 是否吃子
  check: true/false,     // 是否形成将军 ✨ 需要后端支持
  turn: 'r'/'b',         // 下一步轮到谁
  ...
}
```

## 测试步骤

1. ✅ 加载游戏后，两个音效应该被预加载
2. ✅ 移动棋子时应该听到 `MOVE.WAV` 音效
3. ✅ 当后端发送 `check: true` 时，应该听到将军音效
4. ✅ 吃子时应该听到吃子音效（已有功能）

## 浏览器兼容性

- **Web Audio API**: 用于预加载和播放（优先）
- **HTML5 Audio**: 降级方案（如果 Web Audio 不可用）
- **音频上下文挂起处理**: 支持用户交互后恢复 AudioContext

## 文件清单

- ✅ `jiangjun.mp3` - 已存在于 `/client/public/audio/effects/`
- ✅ `MOVE.WAV` - 已存在于 `/client/public/audio/effects/`
- ✅ 代码集成 - 已完成
