# 部署检查清单 - 注册/登录功能

## 需要部署的更改

### 后端更改
1. ✅ 安装了 `bcryptjs` 依赖
2. ✅ 更新了 `User` 模型，添加了 `password` 字段
3. ✅ 在 `server/src/routes/user.js` 中添加了注册和登录路由
4. ✅ 创建了默认头像 SVG 文件

### 前端更改
1. ✅ 更新了 `client/src/app/page.tsx`，添加了注册/登录界面
2. ✅ 移除了 Mock 登录逻辑
3. ✅ 更新了 `UserProfile.tsx`，移除了 Mock 模式

## 部署步骤

### 1. 提交代码到 Git
```bash
cd c:\Users\Administrator\.gemini\antigravity\scratch\HappyGames
git add .
git commit -m "feat: 添加用户名/密码注册和登录功能"
git push origin main
```

### 2. 配置环境变量（在 Render Dashboard）
确保在 Render 的服务器环境变量中添加：
- `JWT_SECRET`: 一个随机的安全字符串（例如：`your_super_secret_jwt_key_here_change_this`）
- `MONGODB_URI`: MongoDB 连接字符串
- `PORT`: 5000（或 Render 自动分配）

### 3. 等待自动部署完成
- Render 会自动检测到 Git 推送并开始部署
- 等待构建和部署完成（通常需要 3-5 分钟）
- 检查部署日志，确保没有错误

### 4. 验证部署
访问以下端点测试：
- `https://your-server.onrender.com/` - 应该返回 "HappyGames API is running"
- `https://your-server.onrender.com/api/user/register` - POST 请求应该可以注册新用户

## 当前错误分析

**错误信息**: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

**原因**: 
- 服务器返回的是 HTML 页面而不是 JSON
- 这通常意味着请求没有到达正确的 API 端点
- 或者服务器还没有部署最新的代码

**解决方案**:
1. 确保服务器已经重新部署（包含新的注册路由）
2. 检查前端的 `NEXT_PUBLIC_API_URL` 环境变量是否正确
3. 检查 CORS 配置是否允许前端域名

## 本地测试（可选）

如果想在本地测试：

### 启动后端
```bash
cd server
npm install
npm run dev
```

### 启动前端
```bash
cd client
npm install
npm run dev
```

### 测试注册
```bash
curl -X POST http://localhost:5000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

## 注意事项

1. **密码安全**: 密码已使用 bcrypt 加密存储
2. **Token 有效期**: JWT Token 有效期为 7 天
3. **默认头像**: 新用户会自动获得默认 SVG 头像
4. **性别随机**: 注册时性别会随机分配（可在个人资料页修改）
5. **Pi 登录保留**: Pi Network 登录功能仍然保留，两种登录方式可以共存

## 故障排查

如果注册仍然失败：
1. 检查浏览器控制台的网络请求，查看实际请求的 URL
2. 检查服务器日志，查看是否有错误信息
3. 确认 `bcryptjs` 已经在服务器上安装
4. 确认数据库连接正常
