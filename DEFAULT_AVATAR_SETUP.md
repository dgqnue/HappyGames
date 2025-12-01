# 默认头像设置说明

## 步骤

### 1. 创建目录结构

```bash
# 在服务器根目录执行
mkdir -p server/public/images
mkdir -p server/public/uploads/avatars
```

### 2. 保存默认头像

将卡通小熊图片保存为：
```
server/public/images/default-avatar.png
```

**图片要求：**
- 文件名：`default-avatar.png`
- 位置：`server/public/images/`
- 格式：PNG（推荐）或 JPG
- 建议尺寸：200x200 像素

### 3. 验证设置

启动服务器后，访问以下 URL 应该能看到默认头像：
```
http://localhost:5000/images/default-avatar.png
```

### 4. 权限设置（Linux/Mac）

```bash
chmod 755 server/public/images
chmod 755 server/public/uploads
chmod 755 server/public/uploads/avatars
```

## 目录结构

```
server/
├── public/
│   ├── images/
│   │   └── default-avatar.png     ← 默认头像（所有新用户）
│   └── uploads/
│       └── avatars/                ← 用户上传的头像
│           ├── avatar-1234567.png
│           ├── avatar-7654321.jpg
│           └── ...
```

## 使用说明

### 新用户
- 首次登录时，`avatar` 字段自动设置为 `/images/default-avatar.png`
- 用户可在个人主页上传自定义头像

### 头像上传
- 最大文件大小：1MB
- 支持格式：JPEG, JPG, PNG, GIF
- 上传后旧头像会自动删除（默认头像除外）

### 访问头像

**默认头像：**
```
http://localhost:5000/images/default-avatar.png
```

**用户上传的头像：**
```
http://localhost:5000/uploads/avatars/avatar-1234567.png
```

## 注意事项

1. **文件路径**：确保 `default-avatar.png` 在正确的位置
2. **文件权限**：确保服务器有读取权限
3. **备份**：建议备份默认头像文件
4. **CDN**：生产环境建议使用 CDN 托管静态文件

## 故障排除

### 问题：无法访问默认头像

**检查清单：**
1. 文件是否存在：`server/public/images/default-avatar.png`
2. 文件名是否正确（区分大小写）
3. 服务器是否正确配置静态文件服务
4. 检查 `server/src/index.js` 中的配置：
   ```javascript
   app.use('/images', express.static(path.join(__dirname, '../public/images')));
   ```

### 问题：用户头像上传失败

**检查清单：**
1. 目录是否存在：`server/public/uploads/avatars`
2. 目录是否有写权限
3. 文件大小是否超过 1MB
4. 文件格式是否支持

### 问题：旧头像未删除

**原因：**
- 默认头像不会被删除（设计如此）
- 只有用户上传的头像才会在更换时被删除

## 生产环境建议

### 使用云存储

生产环境建议使用云存储服务（如 AWS S3, 阿里云 OSS）：

1. **优点：**
   - 更好的性能
   - 自动备份
   - CDN 加速
   - 无需担心服务器存储空间

2. **修改点：**
   - 更新 `multer` 配置使用云存储
   - 更新默认头像 URL
   - 更新头像删除逻辑

### 示例配置（AWS S3）

```javascript
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'happygames-avatars',
        key: function (req, file, cb) {
            cb(null, `avatars/${Date.now()}-${file.originalname}`);
        }
    })
});
```

## 相关文件

- `server/src/models/User.js` - 用户模型（包含 avatar 字段）
- `server/src/routes/user.js` - 头像上传 API
- `server/src/middleware/auth.js` - 创建新用户时设置默认头像
- `server/src/index.js` - 静态文件服务配置
