/**
 * 修改汇总：确保客户端注册只使用 HappyGames 数据库
 */

已修改的文件:
1. server/src/routes/user.js
   - 在 POST /api/user/register 接口中添加数据库验证
   - 在 POST /api/user/login 接口中添加数据库验证
   - 打印日志以确保使用正确的数据库

修改内容:
- 获取当前连接的数据库名称
- 从 MONGO_URI 环境变量中读取期望的数据库名称（happygames）
- 如果不匹配，返回错误并拒绝注册/登录请求
- 添加日志输出便于调试

数据库配置:
- .env 中的 MONGO_URI 已确认指向 happygames 数据库
- mongodb+srv://.../happygames?appName=HappyGames

重要说明:
1. 需要重启应用服务器才能使修改生效
2. 确保应用启动时读取最新的 .env 配置
3. 修改后，所有新注册的账号将仅在 happygames 数据库中创建

验证步骤:
1. 启动服务器后，尝试注册新账号
2. 查看控制台日志，应该看到 "[注册] 连接数据库: happygames, 期望: happygames"
3. 使用命令 node src/scripts/checkAllDatabases.js 验证数据库列表
4. 确认没有新的 test 数据库被创建
