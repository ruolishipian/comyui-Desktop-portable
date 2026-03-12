#!/usr/bin/env node

/**
 * Git 自动备份脚本
 * 自动提交并推送当前修改到远程仓库
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  commitMessage: `auto: 自动备份 - ${new Date().toLocaleString('zh-CN')}`,
  branch: 'new-main',
  maxRetries: 3,
  retryDelay: 1000
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 执行命令
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 检查是否有修改
function hasChanges() {
  const status = execCommand('git status --porcelain', { silent: true });
  if (!status.success) {
    log('❌ 无法检查 git 状态', 'red');
    return false;
  }
  return status.output.trim().length > 0;
}

// 添加所有修改
function addChanges() {
  log('\n📦 正在添加修改...', 'blue');
  const result = execCommand('git add .');
  return result.success;
}

// 提交修改
function commitChanges() {
  log('\n💾 正在提交修改...', 'blue');
  const result = execCommand(`git commit -m "${CONFIG.commitMessage}"`);
  return result.success;
}

// 推送到远程
function pushChanges(retryCount = 0) {
  log('\n🚀 正在推送到远程仓库...', 'blue');
  const result = execCommand(`git push origin ${CONFIG.branch}`);

  if (result.success) {
    return true;
  }

  // 重试逻辑
  if (retryCount < CONFIG.maxRetries) {
    log(`⚠️  推送失败，正在重试 (${retryCount + 1}/${CONFIG.maxRetries})...`, 'yellow');
    setTimeout(() => {
      return pushChanges(retryCount + 1);
    }, CONFIG.retryDelay);
    return false;
  }

  log('❌ 推送失败，请检查网络连接或权限', 'red');
  return false;
}

// 主函数
function main() {
  log('\n========================================', 'green');
  log('       Git 自动备份脚本启动', 'green');
  log('========================================', 'green');

  // 检查是否在 git 仓库中
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    log('❌ 当前目录不是 git 仓库', 'red');
    process.exit(1);
  }

  // 检查是否有修改
  if (!hasChanges()) {
    log('\n✅ 没有需要备份的修改', 'green');
    return;
  }

  log('\n📝 检测到以下修改：', 'yellow');
  execCommand('git status -s');

  // 执行备份流程
  if (!addChanges()) {
    log('❌ 添加修改失败', 'red');
    process.exit(1);
  }

  if (!commitChanges()) {
    log('❌ 提交修改失败', 'red');
    process.exit(1);
  }

  if (!pushChanges()) {
    log('❌ 推送失败', 'red');
    process.exit(1);
  }

  log('\n========================================', 'green');
  log('✅ 备份完成！', 'green');
  log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`, 'blue');
  log(`🌿 分支: ${CONFIG.branch}`, 'blue');
  log('========================================\n', 'green');
}

// 错误处理
process.on('uncaughtException', error => {
  log(`\n❌ 发生错误: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  log(`\n❌ 未处理的 Promise 拒绝: ${reason}`, 'red');
  process.exit(1);
});

// 运行
main();
