#!/usr/bin/env node

/**
 * Git 定时自动备份脚本
 * 每隔指定时间自动备份
 */

const { spawn } = require('child_process');
const path = require('path');

// 配置
const CONFIG = {
  interval: 30 * 60 * 1000 // 30分钟（单位：毫秒）
  // interval: 10 * 60 * 1000, // 10分钟
  // interval: 60 * 60 * 1000, // 1小时
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString('zh-CN');
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

// 运行备份脚本
function runBackup() {
  log('🔄 开始自动备份...', 'cyan');

  const backup = spawn('node', ['auto-backup.js'], {
    cwd: __dirname,
    stdio: 'inherit'
  });

  backup.on('close', code => {
    if (code === 0) {
      log('✅ 备份完成', 'green');
    } else {
      log('❌ 备份失败', 'yellow');
    }
  });

  backup.on('error', err => {
    log(`❌ 备份脚本错误: ${err.message}`, 'yellow');
  });
}

// 主函数
function main() {
  log('\n========================================', 'green');
  log('    Git 定时自动备份服务启动', 'green');
  log('========================================', 'green');
  log(`⏰ 备份间隔: ${CONFIG.interval / 60000} 分钟`, 'blue');
  log(`📁 工作目录: ${__dirname}`, 'blue');
  log('按 Ctrl+C 停止服务\n', 'yellow');

  // 立即执行一次
  runBackup();

  // 设置定时任务
  setInterval(() => {
    runBackup();
  }, CONFIG.interval);
}

// 优雅退出
process.on('SIGINT', () => {
  log('\n\n👋 正在停止备份服务...', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\n👋 正在停止备份服务...', 'yellow');
  process.exit(0);
});

// 错误处理
process.on('uncaughtException', error => {
  log(`❌ 发生错误: ${error.message}`, 'yellow');
});

main();
