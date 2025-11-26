# HappyGames 开发文档

## 1. 项目概览 (Project Overview)
HappyGames 是一个基于 Pi Network 生态的游戏平台，允许用户通过 Pi 币兑换“欢乐豆”参与游戏，并赚取佣金。项目采用现代化的 Web 技术栈，注重用户体验和视觉效果。

### 技术栈 (Tech Stack)
- **前端**: Next.js 14 (React), TailwindCSS, TypeScript
- **后端**: Node.js, Express, Socket.io, MongoDB
- **国际化**: 自研 React Context i18n 方案 (支持 14 种语言)

---

## 2. 项目风格与设计 (Project Style & Design)

### 视觉主题 (Visual Theme)
项目采用 **“活力橙黄” (Vibrant Amber/Yellow)** 为主色调，营造轻松、快乐的游戏氛围。

- **背景**: 全局使用亮黄色渐变背景，从淡黄 (`#FFF176`) 过渡到橙黄 (`#FFA726`)，方向为 135 度。
- **质感**: 大量使用 **Glassmorphism (毛玻璃)** 效果。
    - 容器背景: `bg-white/90` (90% 不透明度白色)
    - 模糊效果: `backdrop-blur-sm`
    - 边框: `border-white/50` (半透明白色边框)
    - 阴影: `shadow-xl` 或 `shadow-2xl`
- **圆角**: 统一使用大圆角 (`rounded-2xl`, `rounded-xl`)，增强亲和力。
- **字体颜色**:
    - 主标题/强调文字: `text-amber-900` (深琥珀色)
    - 次要文字: `text-gray-600`
    - 成功/收益: `text-green-600`
    - 支出/警告: `text-red-600`

---

## 3. 页面布局与设置 (Page Layouts)

### 3.1 首页 (Home Page)
- **布局**: 居中布局，全屏显示。
- **顶部导航 (Header)**:
    - 左侧: 品牌名称 "HappyGames"
    - 右侧: 语言切换器 (Language Switcher) + 用户头像/用户名 (登录后)
- **核心区域 (Hero Section)**:
    - **大标题**: "HappyGames" (Games 字样使用琥珀色高亮)
    - **副标题**: 多语言支持的欢迎语。
    - **登录卡片 (Login Card)**:
        - 仅在未登录时显示。
        - 包含 "Login with Pi" 按钮，点击触发 Pi SDK 认证。
        - 底部显示隐私协议提示。
    - **进入大厅按钮**: 登录后显示，绿色渐变按钮，引导用户进入游戏大厅。
- **装饰元素**: 背景中有动态漂浮的模糊光斑，增加页面层次感。

### 3.2 个人中心 (User Profile)
- **布局**: 响应式布局。移动端为单列，桌面端为双列。
- **头部信息栏 (Profile Header)**:
    - 左侧: 用户大头像 (带琥珀色光晕) + 用户名 + 徽章 (等级/推广员) + ID 显示。
    - 右侧: 语言切换器 + 退出登录按钮 (红色幽灵按钮)。
- **内容区域**:
    - **左列**: **资产中心 (Asset Center)** - *核心功能区*
    - **右列**: **推广数据 (Referral Stats)**
        - 显示已邀请人数。
        - 显示总流水 (Total Flow)。
        - 显示专属推广链接 (可复制)。

---

## 4. 资产中心详细布局 (Asset Center Layout)
位于 `WalletExchange.tsx` 组件中，是用户进行充值和提现的核心面板。

### 4.1 顶部概览
- **标题**: "💰 资产中心" (带图标)。
- **余额卡片**: 并排展示两个卡片。
    - **欢乐豆 (HAPPY BEANS)**: 橙色背景 (`bg-orange-50`)，显示当前游戏货币余额。
    - **佣金 (COMMISSION)**: 紫色背景 (`bg-purple-50`)，显示推广赚取的佣金余额。
- **提示栏**: 蓝色背景 (`bg-blue-50`) 的信息框，说明支持灵活转账。

### 4.2 操作选项卡 (Tabs)
- 使用 `bg-gray-100` 的胶囊式切换器。
- **充值 (Deposit)**: 选中时白色背景，琥珀色文字。
- **提现 (Withdraw)**: 选中时白色背景，琥珀色文字。

### 4.3 充值面板 (Deposit Panel)
设计为“扫码/转账 -> 确认”的流程。
1.  **标题**: "您的专属充值地址"。
2.  **二维码区域**: 居中显示的二维码占位符 (白色方块，虚线边框)。
3.  **地址显示**: 
    - 样式: `font-mono` (等宽字体)，加粗，方便阅读。
    - 背景: 白色背景，独立边框。
4.  **免备注提示**: 绿色胶囊标签，强调 "无需备注 (No Memo Required)"。
5.  **操作步骤**: 简明的两步指引 (Step 1 转账, Step 2 确认)。
6.  **确认按钮**: 
    - 文字: "我已转账 (检查充值)"
    - 样式: 橙色渐变 (`from-amber-500 to-orange-600`)，全宽大按钮。
    - 交互: 点击后触发后端查询，模拟区块链扫描延迟。
7.  **充值成功弹窗 (Success Modal)**:
    - 替代原生的 `alert` 弹窗。
    - **UI**: 白色圆角卡片，绿色成功图标，显示充值金额和 Order ID。
    - **交互**: 点击 "Great!" 按钮关闭弹窗。

### 4.4 提现面板 (Withdraw Panel)
表单式布局。
1.  **提现地址输入框**:
    - 标签: "提现地址" (大写，灰色)。
    - 输入框: 大圆角，白色背景，输入 Pi 钱包地址 (G-...)。
2.  **数量输入框**:
    - 标签: "数量 (欢乐豆)"。
    - 输入框: 数字输入。
3.  **提现按钮**:
    - 文字: "提现"
    - 样式: 同充值按钮，橙色渐变。
    - 逻辑: 检查余额 -> 扣除欢乐豆 -> 模拟发送 Pi -> 生成交易记录。

### 4.5 交易记录 (Transaction History)
- **标题**: "交易记录" (大写，灰色小字)。
- **列表**: 滚动列表 (`max-h-60 overflow-y-auto`)。
- **单条记录**:
    - 左侧: 类型 (充值/提现) + 日期。
    - 右侧: 
        - 欢乐豆变动 (充值绿色 `+`, 提现红色 `-`)。
        - 估算 Pi 价值 (灰色小字)。

---

## 5. 国际化支持 (Internationalization)
- **支持语言**: 14 种 (英语, 中文, 日语, 韩语, 俄语, 德语, 法语, 阿拉伯语, 越南语, 西班牙语, 葡萄牙语, 繁体中文, 马来语, 希伯来语)。
- **实现方式**: 
    - `LanguageContext`: 全局管理当前语言状态，持久化到 `localStorage`。
    - `translations` 对象: 包含所有文本的键值对字典。
    - 动态替换: 页面所有文本均通过 `t.key` 方式获取，确保切换语言时无缝更新。

---

## 6. 用户资料增强 (User Profile Enhancements)

### 6.1 昵称系统 (Nickname System)
- **显示逻辑**: 优先显示用户设置的昵称 (`nickname`)，若未设置则回退显示用户名 (`username`)。
- **修改功能**:
    - **入口**: 个人中心用户名旁的“编辑”图标 (✏️)。
    - **交互**: 点击图标弹出自定义模态框 (Modal)。
    - **模态框设计**:
        - 风格与全局一致 (白色圆角卡片，阴影，磨砂背景遮罩)。
        - 包含输入框和“取消/保存”按钮。
    - **验证逻辑**:
        - **唯一性检查**: 后端 API (`/api/users/update`) 在更新前会查询数据库，确保昵称全平台唯一。
        - **错误处理**: 若昵称已存在，返回 400 错误，前端弹出 Alert 提示 "Nickname already taken"。

---

## 7. 游戏逻辑与经济模型 (Game Logic & Economics)

### 7.1 游戏结算服务 (Game Settlement Service)
由 `GameService.js` 统一处理游戏结束后的资金流转。

1.  **下注扣除**:
    - 游戏开始或结算时，直接从玩家钱包 (`Wallet`) 中扣除下注金额 (`happyBeans`)。
    - 生成类型为 `BET` 的交易记录。

2.  **平台服务费 (Platform Fee)**:
    - **费率**: 固定为 **5%** (`PLATFORM_FEE_RATE = 0.05`)。
    - **计算方式**: `总服务费 = 总下注池 (Total Pot) * 0.05`。
    - **单人贡献记录**: 系统会记录每位玩家在该局游戏中实际贡献的服务费金额 (`玩家下注额 * 0.05`)，用于后续佣金计算。

3.  **奖金分配**:
    - `净奖池 (Net Pot) = 总下注池 - 总服务费`。
    - 净奖池平分给所有赢家。
    - 生成类型为 `WIN` 的交易记录。

### 7.2 佣金机制 (Commission Mechanism)
采用 **“单人贡献制”**，确保佣金计算精确且公平。

- **核心原则**: 推广员获得的佣金，直接来源于其下线玩家在游戏中**实际贡献的平台服务费**。
- **计算公式**:
    > `佣金 = 下线玩家贡献的服务费 * 推广员等级对应比例`
- **等级比例**:
    - Lv1: 10%
    - Lv2: 15%
    - Lv3: 20%
    - Lv4: 25%
    - Lv5: 30%
- **示例**:
    - 玩家 A (下线) 下注 1000 豆。
    - 贡献服务费 = 1000 * 5% = 50 豆。
    - 推广员 B (Lv2, 15%) 获得佣金 = 50 * 15% = 7.5 豆。

### 7.3 流水与升级 (Flow & Level Up)
- **流水定义**: 玩家的**下注金额**计入其上级推广员的“总流水”。
- **实时更新**: 每次游戏结算时，自动累加流水到推广员的 `referralStats.totalFlow`。
- **自动升级**: 系统根据最新的邀请人数和总流水，自动判断并提升推广员等级。

---

## 8. 游戏大厅 (Game Lobby)
位于 `GameList.tsx`，是玩家进入游戏的入口。

### 8.1 界面设计
- **风格**: 延续全局的 "Glassmorphism" + "Vibrant Amber" 风格。
- **数据看板**:
    - **在线玩家 (Online Players)**: 蓝色卡片，实时显示当前在线人数。
    - **生态池 (Eco Pool)**: 绿色卡片，显示当前生态池的 Pi 储备量。
- **游戏列表**:
    - 采用卡片式设计，展示游戏名称、图标、最低准入金额。
    - "Happy Poker" 带有 "HOT" 标签。

### 8.2 匹配功能
- **快速匹配 (Quick Match)**:
    - 按钮带有加载状态 (Loading Spinner)。
    - 点击后触发 socket `start_matchmaking` 事件。
    - 匹配成功后弹出提示并跳转 (目前为 Alert)。

### 8.3 大厅动态 (Lobby Feed)
替代原有的匹配设置面板，展示大厅内的实时动态，增加活跃氛围。
- **展示内容**:
    - 用户进入大厅 (Join)。
    - 用户赢得游戏 (Win)。
    - 用户中大奖 (Jackpot)。
- **UI**: 列表式展示，不同类型的事件带有不同的图标和颜色背景。

### 8.4 国际化新增键值

### 8.3 国际化新增键值
- `lobby_title`: 游戏大厅
- `online_players`: 在线玩家
- `eco_pool`: 生态池
- `quick_match`: 快速匹配
- `game_poker`: 欢乐扑克
- `start_matching`: 开始匹配
- `lobby_feed`: 大厅动态
- `recent_activity`: 最新动态


---

## 9. 平台核心架构 (Platform Core Architecture)
为了支持多游戏快速扩展与高并发稳定性，平台采用了 **插件化 + 持久化** 的核心架构。

### 9.1 服务端架构 (Server Side)
位于 `server/src/gamecore`，实现了游戏逻辑与平台服务的解耦。

#### A. 插件化分发器 (SocketDispatcher)
- **文件**: `server/src/gamecore/socket.js`
- **功能**: 
    - 自动扫描 `server/src/games/` 目录，动态加载所有游戏管理器。
    - 统一处理 Socket 连接鉴权 (`verifyToken`)。
    - 根据 `start_game` 事件将流量分发至对应的游戏管理器。

#### B. 游戏基类 (BaseGameRoom)
- **文件**: `server/src/gamecore/BaseGameRoom.js`
- **功能**: 所有游戏房间的父类，提供标准接口。
    - `broadcast(event, data)`: 房间广播。
    - `settle(result)`: **异步结算**。自动生成 `BatchId`、时间戳与 Nonce，并使用 HMAC-SHA256 签名请求结算 API。

#### C. 资金安全系统 (Wallet & Settlement)
- **文件**: `server/src/gamecore/wallet.js` & `routes/settle.js`
- **机制**:
    - **幂等性 (Idempotency)**: 使用 `Batch` 数据库模型记录每一笔结算的 `BatchId`。在事务 (Transaction) 中原子性地检查 `BatchId` 是否重复，防止资金双重扣除。
    - **签名验证**: 结算 API 校验 HTTP Header 中的 `x-signature`，防止伪造请求。

#### D. 持久化层 (Persistence Layer)
- **状态管理**: `server/src/gamecore/StateManager.js`
    - 使用文件系统 (`server/data/gamestate.json`) 持久化存储游戏状态，防止服务器重启导致对局数据丢失。
- **消息队列**: `server/src/gamecore/queue.js`
    - 使用文件系统 (`server/data/queue.json`) 持久化结算任务。即使在处理结算时服务器宕机，重启后也会自动恢复并重试任务。

### 9.2 客户端架构 (Client Side)
位于 `client/src/gamecore`，实现了前端游戏逻辑的插件化。

#### A. 游戏客户端基类 (BaseGameClient)
- **文件**: `client/src/gamecore/BaseGameClient.ts`
- **功能**: 抽象类，封装了 Socket 通信的基础逻辑。
    - `init/dispose`: 统一管理事件监听器的生命周期。
    - `updateState`: 标准化的状态更新与 UI 通知机制。

#### B. 客户端管理器 (GameClientManager)
- **文件**: `client/src/gamecore/GameClientManager.ts`
- **功能**: 单例模式，管理当前激活的游戏客户端实例，负责不同游戏之间的切换与资源释放。

---

## 10. ELO 等级分系统 (ELO Rating System)
为双人竞技类游戏提供公平的技能评估与匹配机制。

### 10.1 动态 K 值计算
采用双因素平滑算法，避免积分剧烈波动。

#### 公式
```
K_Final = 4 + 36 × f_rating × f_games
```

- **对局数因子 (f_games)**:
  ```
  f_games = 1 / (1 + Games/50)
  ```
  新手玩家（对局数少）K值较高，积分变化快；老手K值低，积分稳定。

- **等级分因子 (f_rating)**:
  ```
  若 Rating < mu_dynamic: f_rating = 1
  若 Rating >= mu_dynamic: f_rating = 1 / (1 + (Rating - mu_dynamic)/1000)
  ```
  `mu_dynamic` 为当前游戏所有玩家的平均等级分，每日 11:00 UTC 计算，12:00 UTC 生效。

#### 预期胜率与积分变动
- **预期胜率**: `E_A = 1 / (1 + 10^((R_B - R_A)/400))`
- **积分变动**: `Delta = Round(K_Final × (实际得分 - 预期得分))`
  - 胜: 1分，和: 0.5分，负: 0分

### 10.2 时间衰减机制
防止高分玩家长期不活跃导致排行榜僵化。

- **衰减阈值**: 1600分
- **不活跃周期**: 7天
- **衰减率**: 每周 1%
- **衰减公式**: `Decay = 0.01 × (Rating - 1600)`
- **执行时间**: 每日 10:00 UTC

### 10.3 实现文件
- **服务端**: `server/src/gamecore/EloService.js`
- **数据模型**: `server/src/models/UserGameStats.js`, `server/src/models/GameMeta.js`
- **定时任务**: `server/src/cron/eloCron.js`

---

## 11. 称号系统 (Title System)
基于百分比排名的荣誉称号体系，适用于中国象棋等竞技游戏。

### 11.1 称号分段
| 编号 | 称号名称 | 人数占比 | 颜色 | 定位 |
|------|----------|----------|------|------|
| 1 | 初出茅庐 | 22% | 黑色 #000000 | 新手 |
| 2 | 小试牛刀 | 19% | 棕色 #8f2d56 | 普通进阶 |
| 3 | 渐入佳境 | 16% | 绿色 #00FF00 | 低中水平 |
| 4 | 锋芒毕露 | 13% | 蓝色 #0000FF | 中等偏上 |
| 5 | 出类拔萃 | 10% | 红色 #FF0000 | 高水平精英 |
| 6 | 炉火纯青 | 8% | 青色 #00FFFF | 顶尖技术 |
| 7 | 名满江湖 | 6% | 黄色 #ffee32 | 稀有强者 |
| 8 | 傲视群雄 | 4% | 紫色 #800080 | 高端极少数 |
| 9 | 登峰造极 | 2% | 金色 #ffba08 | 服务器顶尖 |
| 10 | 举世无双 | 仅1人 | 橙色 #FF6200 | 绝对唯一荣誉 |

### 11.2 更新机制
- **统计时间**: 每日 9:00 UTC
- **生效时间**: 次日 9:00 UTC
- **计算逻辑**: 按等级分降序排列，根据百分比分配称号
- **显示位置**: 用户名后，使用对应颜色

### 11.3 实现文件
- **服务端**: `server/src/gamecore/TitleService.js`
- **定时任务**: `server/src/cron/eloCron.js`

---

## 12. 中国象棋游戏 (Chinese Chess - Xiangqi)
完整实现中国象棋游戏规则与分级房间系统。

### 12.1 游戏架构
采用插件化设计，完全符合平台核心架构规范。

#### 服务端结构
```
server/src/games/chinesechess/
├── index.js                    # ChineseChessManager (游戏管理器)
├── logic/
│   └── XiangqiRules.js        # 规则引擎
└── rooms/
    └── ChineseChessRoom.js    # 游戏房间逻辑
```

#### 客户端结构
```
client/src/
├── app/game/chinesechess/
│   ├── page.tsx               # 游戏中心 (房间选择)
│   └── play/page.tsx          # 游戏对局页面
└── components/ChineseChess/
    ├── ChineseChessClient.ts  # 游戏客户端逻辑
    └── ChessBoard.tsx         # 棋盘 UI (Canvas)
```

### 12.2 房间分级系统
| 房间类型 | 等级分要求 | 底豆 | 说明 |
|----------|------------|------|------|
| 免费室 | 无限制 | 0 | 所有玩家可参与，不消耗游戏豆 |
| 初级室 | < 1500 | 100 | 新手专属 |
| 中级室 | 1500-1800 | 1000 | 中等水平玩家 |
| 高级室 | > 1800 | 10000 | 高手对决 |

- **访问控制**: 玩家只能进入符合自己等级分的房间对局
- **观战功能**: 可进入任意房间观战

### 12.3 游戏规则实现
`XiangqiRules.js` 完整实现所有棋子走法验证：

- **帅/将 (King)**: 九宫格内直线移动1步
- **仕/士 (Advisor)**: 九宫格内斜线移动1步
- **相/象 (Elephant)**: 田字移动，不可过河，检查象眼阻挡
- **马 (Horse)**: 日字移动，检查马腿阻挡
- **车 (Rook)**: 直线移动，路径无阻挡
- **炮 (Cannon)**: 直线移动，吃子需隔一子
- **兵/卒 (Pawn)**: 过河前只能前进，过河后可横移

### 12.4 棋盘渲染
- **技术**: HTML5 Canvas
- **尺寸**: 9×10 格
- **棋子**: 使用中文字符 (帅/将、仕/士、相/象、马、车、炮、兵/卒)
- **颜色**: 红方 (#FF6B6B)，黑方 (#4ECDC4)
- **交互**: 点击选中，再次点击移动

### 12.5 结算流程
1. **胜负判定**: 吃掉对方将/帅
2. **ELO 更新**: 调用 `EloService.processMatchResult()`
3. **游戏豆结算**: 非免费室调用 `BaseGameRoom.settle()`
4. **称号刷新**: 次日 9:00 UTC 自动更新

### 12.6 国际化支持
游戏中心和对局页面已集成多语言支持，主要文本键值：
- `chess_center`: 象棋中心
- `free_room`: 免费室
- `beginner_room`: 初级室
- `intermediate_room`: 中级室
- `advanced_room`: 高级室
- `your_turn`: 你的回合
- `waiting_opponent`: 等待对手


