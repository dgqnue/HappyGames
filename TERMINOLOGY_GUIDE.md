# HappyGames 术语规范

## 核心概念层级

```
平台大厅 (Platform Lobby)
    └── 游戏中心 (Game Center)
            └── 游戏室 (Game Room / Tier)
                    └── 游戏桌 (Game Table)
```

## 详细说明

### 1. 平台大厅 (Platform Lobby)
- **定义**: 用户登录后看到的主界面
- **功能**: 显示所有可用游戏的入口
- **代码对应**: `/lobby` 路由

### 2. 游戏中心 (Game Center)
- **定义**: 特定游戏的主界面
- **示例**: "中国象棋游戏中心"
- **功能**: 显示该游戏的所有游戏室选项
- **代码对应**: `/game/chinesechess` 路由

### 3. 游戏室 (Game Room / Tier)
- **定义**: 按等级分类的游戏区域
- **示例**: 
  - 免豆室 (free)
  - 初级室 (beginner) - 等级分 < 1500
  - 中级室 (intermediate) - 等级分 1500-1800
  - 高级室 (advanced) - 等级分 > 1800
- **功能**: 
  - 玩家点击游戏室图标后进入
  - 显示该游戏室内的所有游戏桌
  - 提供快速开始功能
- **代码对应**: 
  - `tier` 参数 (free/beginner/intermediate/advanced)
  - `/game/chinesechess/play?tier=beginner` 路由

### 4. 游戏桌 (Game Table)
- **定义**: 具体的对局实例，玩家坐在桌上进行游戏
- **示例**: `chinesechess_beginner_0`
- **功能**:
  - 玩家入座
  - 等待对手
  - 进行游戏
  - 旁观
- **代码对应**:
  - `roomId` (例如: `chinesechess_beginner_0`)
  - `MatchableGameRoom` 类的实例

## 代码中的术语使用

### 变量命名
```javascript
// ✅ 正确
const tier = 'beginner';           // 游戏室等级
const roomId = 'chess_beginner_0'; // 游戏桌ID
const room = new ChineseChessRoom(); // 游戏桌实例

// ❌ 避免混淆
// 不要用 room 指代 tier
// 不要用 tier 指代具体的游戏桌
```

### 注释规范
```javascript
// ✅ 正确
// 创建游戏桌
const room = new ChineseChessRoom(io, roomId, tier);

// 将游戏桌添加到对应游戏室
this.rooms[tier].push(room);

// 玩家进入游戏室
router.push(`/game/chinesechess/play?tier=beginner`);

// 玩家加入游戏桌
room.playerJoin(socket);
```

### 日志输出规范
```javascript
// ✅ 正确
console.log(`Created game table: ${roomId} in ${tier} room`);
console.log(`Player joined ${tier} room`);
console.log(`Sending ${count} tables from ${tier} room to player`);

// ❌ 避免
console.log(`Created room: ${roomId}`); // 不明确是游戏室还是游戏桌
```

## UI 文本规范

### 中文界面
- **游戏中心**: "中国象棋游戏中心"
- **游戏室**: "初级室"、"中级室"、"高级室"、"免豆室"
- **游戏桌**: "游戏桌 1"、"游戏桌 2" 或 "桌号: 1"
- **按钮文本**:
  - "进入游戏室" (点击游戏室图标)
  - "入座" (加入游戏桌)
  - "返回游戏中心" (从游戏室返回)
  - "返回大厅" (从游戏中心返回)

### 英文界面
- **Game Center**: "Chinese Chess Game Center"
- **Game Room**: "Beginner Room", "Intermediate Room", "Advanced Room", "Free Room"
- **Game Table**: "Table 1", "Table 2"
- **Button Text**:
  - "Enter Room" (进入游戏室)
  - "Sit Down" (入座)
  - "Back to Game Center" (返回游戏中心)
  - "Back to Lobby" (返回大厅)

## 数据结构

### BaseGameManager.rooms
```javascript
{
  free: [room1, room2, room3],      // 免豆室的游戏桌列表
  beginner: [room1, room2, room3],  // 初级室的游戏桌列表
  intermediate: [room1, room2],     // 中级室的游戏桌列表
  advanced: [room1]                 // 高级室的游戏桌列表
}
```

### 游戏桌对象
```javascript
{
  roomId: 'chinesechess_beginner_0',  // 游戏桌ID
  tier: 'beginner',                   // 所属游戏室
  status: 'waiting',                  // 游戏桌状态
  players: [...],                     // 玩家列表
  spectators: [...]                   // 观众列表
}
```

## 常见错误示例

### ❌ 错误
```javascript
// 混淆游戏室和游戏桌
console.log('Player joined room beginner'); // 不明确

// 使用 room 指代游戏室
const room = 'beginner'; // 应该用 tier

// 注释不准确
// 创建房间
const table = new ChineseChessRoom(); // 应该说"创建游戏桌"
```

### ✅ 正确
```javascript
// 明确区分
console.log('Player entered beginner game room');
console.log('Player joined game table: chess_beginner_0');

// 正确命名
const tier = 'beginner';
const roomId = 'chess_beginner_0';

// 准确注释
// 创建游戏桌并添加到对应游戏室
const table = new ChineseChessRoom(io, roomId, tier);
this.rooms[tier].push(table);
```

## 总结

**记住这个层级关系**:
1. 玩家从**平台大厅**选择游戏
2. 进入**游戏中心**
3. 选择**游戏室**等级
4. 看到该游戏室内的所有**游戏桌**
5. 选择一个**游戏桌**入座或快速开始自动匹配

**核心原则**: 
- `tier` = 游戏室等级
- `room`/`roomId` = 游戏桌
- 始终明确区分这两个概念
