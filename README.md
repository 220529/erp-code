# ERP 业务代码仓库 (erp-code)

## 📖 项目简介

这是 ERP 系统的**业务代码仓库**，用于存储和管理动态业务逻辑。

### 项目架构

- **erp-core** (`E:\frame\erp-core`) - Nest.js 实现的核心后端服务
- **erp-code** (`E:\frame\erp-code`) - 本项目，存储最核心的业务流程代码

### 设计原则

- ✅ **不过度设计** - 保持简洁实用
- ✅ **业务闭环** - 功能完整，流程完整
- ✅ **流程精简** - 避免复杂冗余
- ✅ **麻雀虽小，五脏俱全** - 虽然精简但功能完备

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境

创建 `config/dev.json`，填入 API Key：

```json
{
  "apiEndpoint": "http://localhost:3000",
  "apiToken": "",
  "apiKey": "0689caf138107efec54461b6c1d7d8d71922b895fc41831b313cb9e9b4ea4320",
  "dbName": "erp_core"
}
```

详见：[config/README.md](./config/README.md)

### 3. 安装 VSCode 插件

在 VSCode 中安装：**Run On Save** (emeraldwalk.RunOnSave)

### 4. 开始开发

打开任意流程文件，如 `src/flows/客户管理/创建客户.js`，修改后按 `Ctrl+S` 保存，代码会自动上传到测试环境数据库。

## 📁 目录结构

```
erp-code/
├── config/                    # 配置文件
│   └── README.md             # 配置说明
├── src/                       # 源代码
│   └── flows/                # 业务流程
│       ├── 客户管理/
│       │   └── 创建客户.js
│       └── 订单管理/
├── scripts/                   # 工具脚本
│   └── upload-with-notify.js # 上传脚本（带通知）
├── docs/                      # 文档
│   └── updateTime机制说明.md
└── README.md
```

## 💻 开发流程

### 1. 创建新流程

在 `src/flows/` 下创建新文件，格式如下：

```javascript
/**
 * @flowKey customer/create   ← 对应数据库中的 key 字段
 * @flowName 创建客户
 * @description 创建客户并记录初次跟进
 * @updateTime 2025-10-30 15:00:00
 */

// ============================================
// 1. 解构上下文
// ============================================
const { repositories, params, user } = context;
const { customerRepository } = repositories;

// ============================================
// 2. 参数校验
// ============================================
const { name, phone } = params;

if (!name) {
  throw new Error('客户名称不能为空');
}

// ============================================
// 3. 业务逻辑
// ============================================
const customer = await customerRepository.save({
  name,
  phone,
  createdBy: user.id,
});

// ============================================
// 4. 返回结果
// ============================================
return {
  success: true,
  data: { customerId: customer.id },
  message: '客户创建成功',
};
```

### 2. 保存代码

按 `Ctrl+S` 保存文件，会看到如下输出：

```
╔══════════════════════════════════════════════════════════╗
║                    ✅ 上传成功！                          ║
╚══════════════════════════════════════════════════════════╝
  📁 文件: 创建客户
  🔑 流程码: customer/create
  📂 分类: 客户管理
  🗄️  数据库: erp_core
  ⏰ 原时间: 2025-10-30 15:00:00
  🆕 新时间: 2025-10-30 15:02:33
  ✨ 新建 | 15:02:33
────────────────────────────────────────────────────────────
  ✏️  已更新文件时间戳: 2025-10-30 15:02:33
```

### 3. 手动上传

也可以使用命令行手动上传：

```bash
# 上传到开发环境
npm run upload:dev src/flows/客户管理/创建客户.js

# 上传到生产环境
npm run upload:prod src/flows/客户管理/创建客户.js
```

## 🔒 @updateTime 机制

`@updateTime` 是一个**乐观锁机制**，用于防止多人协作时的代码覆盖冲突。

### 工作原理

1. **创建时**：文件中的 @updateTime 会被写入数据库
2. **更新时**：对比文件中的时间和数据库中的时间
   - ✅ **一致** → 允许保存，自动更新时间
   - ❌ **不一致** → 拒绝保存，提示冲突
3. **成功后**：自动更新文件中的 @updateTime

### 冲突示例

```
╔══════════════════════════════════════════════════════════╗
║                    ❌ 上传失败！                          ║
╚══════════════════════════════════════════════════════════╝
  ⚠️  错误: ⚠️  更新冲突！代码已被他人修改
文件时间: 2025-10-30 10:00:00
数据库时间: 2025-10-30 10:30:00

💡 请修改文件中的 @updateTime 为: 2025-10-30 10:30:00
```

详细说明：[docs/updateTime机制说明.md](./docs/updateTime机制说明.md)

## 📝 可用的 Repository

在流程代码中，可以使用以下 Repository：

```javascript
const {
  userRepository, // 用户
  companyRepository, // 公司
  departmentRepository, // 部门
  roleRepository, // 角色
  customerRepository, // 客户
  customerFollowRepository, // 客户跟进
  materialRepository, // 物料
  orderRepository, // 订单
  orderMaterialRepository, // 订单物料
  paymentRepository, // 支付
  projectRepository, // 项目
  fileRepository, // 文件
  dictRepository, // 字典
  menuRepository, // 菜单
  roleMenuRepository, // 角色菜单
  logRepository, // 日志
} = repositories;
```

## 🛠️ 命令说明

```bash
# 上传到开发环境
npm run upload:dev -- <文件路径>

# 上传到生产环境
npm run upload:prod -- <文件路径>

# 示例
npm run upload:dev src/flows/客户管理/创建客户.js
```

## 📚 相关文档

- [配置说明](./config/README.md) - API Key 配置和安全最佳实践
- [updateTime 机制说明](./docs/updateTime机制说明.md) - 乐观锁机制详解

## 🎯 最佳实践

1. **命名规范**
   - 文件名：使用中文，清晰表达业务含义
   - flowKey：使用英文，斜杠分隔，如 `customer/create`（对应数据库 key 字段）
   - flowName：使用中文，简洁明了

2. **代码结构**
   - 使用注释分隔不同业务逻辑块
   - 参数校验放在最前面
   - 业务逻辑清晰分层
   - 返回统一格式的结果

3. **错误处理**
   - 使用 `throw new Error()` 抛出业务错误
   - 错误信息要清晰友好

4. **并发控制**
   - 编辑前先拉取最新代码
   - 保存后检查 @updateTime 是否更新
   - 遇到冲突时，合并修改后重新保存

## 🔗 相关项目

- **erp-core**: `E:\frame\erp-core` - Nest.js 后端服务
- **t1-api**: `E:\t1-pro\t1-api` - 原基础项目
- **t1-code**: `E:\t1-pro\t1-code` - 原业务项目
- **t1-api-v2**: `E:\t1-pro\t1-api-v2` - 原 v2 项目

## 📄 License

ISC
