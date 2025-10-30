# 配置文件说明

## ⚠️ 安全提示

配置文件包含敏感信息（API Key），**已在 .gitignore 中排除，不会提交到 Git**。

## 配置格式

创建 `dev.json` 和 `prod.json`：

```json
{
  "apiEndpoint": "http://localhost:3000",
  "apiToken": "",
  "apiKey": "YOUR_API_KEY_HERE",
  "dbName": "erp_core"
}
```

## 字段说明

| 字段          | 说明                         | 示例                    |
| ------------- | ---------------------------- | ----------------------- |
| `apiEndpoint` | erp-core API 地址            | `http://localhost:3000` |
| `apiToken`    | JWT Token（可选）            | `""`                    |
| `apiKey`      | API 访问密钥（用于上传代码） | `0689caf...`            |
| `dbName`      | 数据库名称（仅用于日志显示） | `erp_core`              |

## 获取 API Key

**开发环境默认 Key：**

```
0689caf138107efec54461b6c1d7d8d71922b895fc41831b313cb9e9b4ea4320
```

**生成生产环境 Key：**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

⚠️ **生产环境必须使用不同的 API Key！**

## 与 erp-core 对应

`apiKey` 必须与 `erp-core` 项目的 `UPLOAD_ACCESS_SECRET` 环境变量一致。
