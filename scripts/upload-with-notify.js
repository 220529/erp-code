#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const notifier = require('node-notifier');

/**
 * 增强版上传脚本 - 带通知
 * 将业务代码上传到 erp-core 的数据库，并显示明显的成功/失败提示
 */

// 简洁输出，不使用 ANSI 颜色代码（避免在 VSCode 输出面板显示异常）

// ============================================
// 解析参数
// ============================================
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    env: 'dev',
    file: null,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--env=')) {
      config.env = arg.split('=')[1];
    } else if (arg.startsWith('--file=')) {
      config.file = arg.split('=')[1];
    } else if (!arg.startsWith('--')) {
      config.file = arg;
    }
  });

  return config;
}

// ============================================
// 读取配置
// ============================================
function loadConfig(env) {
  const configPath = path.join(__dirname, '..', 'config', `${env}.json`);

  if (!fs.existsSync(configPath)) {
    console.error(`❌ 配置文件不存在: ${configPath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// ============================================
// 更新文件中的 @updateTime
// ============================================
function updateFileTimestamp(filePath, code, newUpdateTime) {
  try {
    // 使用正则替换 @updateTime
    const updateTimeRegex = /(@updateTime\s+)\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/;
    const updatedContent = code.replace(updateTimeRegex, `$1${newUpdateTime}`);

    // 写回文件
    if (updatedContent !== code) {
      fs.writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`  ✏️  已更新文件时间戳: ${newUpdateTime}`);
    }
  } catch (error) {
    console.warn(`  ⚠️  更新文件时间戳失败: ${error.message}`);
  }
}

// ============================================
// 提取文件元数据
// ============================================
function extractMetadata(filePath, code) {
  const flowKeyMatch = code.match(/@flowKey\s+(.+)/);
  const flowNameMatch = code.match(/@flowName\s+(.+)/);
  const descriptionMatch = code.match(/@description\s+(.+)/);
  const updateTimeMatch = code.match(/@updateTime\s+(.+)/);

  // 从文件路径提取分类和名称
  const relativePath = filePath.replace(/\\/g, '/');
  const match = relativePath.match(/flows\/(.+?)\/(.+?)\.js$/);

  let category = '';
  let name = '';

  if (match) {
    category = match[1];
    name = match[2];
  }

  return {
    key: flowKeyMatch ? flowKeyMatch[1].trim() : `${category}/${name}`,
    name: flowNameMatch ? flowNameMatch[1].trim() : name,
    category: category || null,
    description: descriptionMatch ? descriptionMatch[1].trim() : null,
    updateTime: updateTimeMatch ? updateTimeMatch[1].trim() : null,
  };
}

// ============================================
// 打印成功横幅
// ============================================
function printSuccessBanner(metadata, config, result) {
  const action = result?.action === 'created' ? '✨ 新建' : '🔄 更新';
  const newUpdateTime = result?.data?.updateTime || '';

  const banner = `
╔${'═'.repeat(58)}╗
║                    ✅ 上传成功！                          ║
╚${'═'.repeat(58)}╝
  📁 文件: ${metadata.name}
  🔑 流程key: ${metadata.key}
  📂 分类: ${metadata.category || '无'}
  🗄️  数据库: ${config.dbName}
  ⏰ 原时间: ${metadata.updateTime || '首次创建'}
  🆕 新时间: ${newUpdateTime}
  ${action} | ${new Date().toLocaleTimeString('zh-CN')}
${'─'.repeat(60)}
`;
  console.log(banner);
}

// ============================================
// 打印失败横幅
// ============================================
function printErrorBanner(error) {
  const banner = `
╔${'═'.repeat(58)}╗
║                    ❌ 上传失败！                          ║
╚${'═'.repeat(58)}╝
  ⚠️  错误: ${error.message}
  🕐 时间: ${new Date().toLocaleTimeString('zh-CN')}
${'─'.repeat(60)}
`;
  console.log(banner);
}

// ============================================
// 上传到 erp-core
// ============================================
async function upload(filePath, config, env) {
  try {
    // 读取文件内容
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const metadata = extractMetadata(filePath, code);

    // 调用 erp-core API
    const apiUrl = `${config.apiEndpoint}/api/code/upload`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-access-secret': config.apiKey, // API Key 认证
        ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
      },
      body: JSON.stringify({
        filePath: filePath.replace(/\\/g, '/'),
        code,
        key: metadata.key,
        name: metadata.name,
        category: metadata.category,
        description: metadata.description,
        updateTime: metadata.updateTime,
        timestamp: Date.now(), // 防重放攻击
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 请求失败: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const actualResult = result.data || result;

    // 检查是否有冲突
    if (actualResult.success === false && actualResult.action === 'conflict') {
      const conflictInfo = actualResult.data || {};
      throw new Error(
        `⚠️  更新冲突！代码已被他人修改\n` +
          `文件时间: ${conflictInfo.fileUpdateTime}\n` +
          `数据库时间: ${conflictInfo.dbUpdateTime}\n` +
          `\n💡 请修改文件中的 @updateTime 为: ${conflictInfo.dbUpdateTime}`,
      );
    }

    // 更新文件中的 @updateTime（如果 API 返回了新的时间）
    if (actualResult.data && actualResult.data.updateTime) {
      updateFileTimestamp(filePath, code, actualResult.data.updateTime);
    }

    // 打印成功横幅
    printSuccessBanner(metadata, config, actualResult);

    // 系统通知
    notifier.notify({
      title: '✅ 上传成功',
      message: `${metadata.name}\n${actualResult.action === 'created' ? '新建' : '更新'}完成`,
      sound: false,
      wait: false,
    });

    return actualResult;
  } catch (error) {
    // 打印失败横幅
    printErrorBanner(error);

    // 失败通知（使用和成功相同的配置）
    const errorMsg = error.message || '未知错误';
    const shortMsg = errorMsg.length > 60 ? errorMsg.substring(0, 60) + '...' : errorMsg;

    notifier.notify(
      {
        title: '❌ 上传失败',
        message: shortMsg,
        sound: false,
        wait: false,
      },
      (err) => {
        // 通知发送完成后再退出
        if (error.code === 'ECONNREFUSED') {
          console.error(`💡 提示: 请确认 erp-core 服务已启动 (${config.apiEndpoint})\n`);
        }
        setTimeout(() => process.exit(1), 100); // 延迟 100ms 确保通知显示
      },
    );
  }
}

// ============================================
// 主函数
// ============================================
async function main() {
  const { env, file } = parseArgs();

  if (!file) {
    console.error(`❌ 请指定要上传的文件`);
    console.error('用法: node upload-with-notify.js --env=dev src/flows/客户管理/创建客户.js');
    process.exit(1);
  }

  const config = loadConfig(env);
  await upload(file, config, env);
}

// ============================================
// 执行
// ============================================
main().catch((error) => {
  console.error(`❌ 执行失败:`, error);
  process.exit(1);
});
