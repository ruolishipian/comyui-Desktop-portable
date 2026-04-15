#!/usr/bin/env node

/**
 * 图标嵌入验证脚本
 * 用于验证打包后的应用程序是否正确包含图标资源
 * 
 * 使用方法：
 * node scripts/verify-icon-embedding.js
 * 
 * 或在 package.json 中添加：
 * "scripts": {
 *   "verify:icon": "node scripts/verify-icon-embedding.js"
 * }
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 验证项目
const checks = [];

// 1. 检查源图标文件
checks.push({
  name: '源图标文件 (assets/icon.ico)',
  check: () => {
    const iconPath = path.join(__dirname, '../assets/icon.ico');
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      return { success: true, message: `存在 (${(stats.size / 1024).toFixed(2)} KB)` };
    }
    return { success: false, message: '不存在' };
  }
});

checks.push({
  name: 'PNG 图标文件 (assets/icon-512.png)',
  check: () => {
    const iconPath = path.join(__dirname, '../assets/icon-512.png');
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      return { success: true, message: `存在 (${(stats.size / 1024).toFixed(2)} KB)` };
    }
    return { success: false, message: '不存在' };
  }
});

checks.push({
  name: '托盘图标文件 (assets/icon-tray.png)',
  check: () => {
    const iconPath = path.join(__dirname, '../assets/icon-tray.png');
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      return { success: true, message: `存在 (${(stats.size / 1024).toFixed(2)} KB)` };
    }
    return { success: false, message: '不存在' };
  }
});

// 2. 检查打包后的文件
checks.push({
  name: '打包目录 (dist/win-unpacked)',
  check: () => {
    const distPath = path.join(__dirname, '../dist/win-unpacked');
    if (fs.existsSync(distPath)) {
      return { success: true, message: '存在' };
    }
    return { success: false, message: '不存在（请先运行打包命令）' };
  }
});

checks.push({
  name: '主程序文件 (ComfyUI-Desktop-portable.exe)',
  check: () => {
    const exePath = path.join(__dirname, '../dist/win-unpacked/ComfyUI-Desktop-portable.exe');
    if (fs.existsSync(exePath)) {
      const stats = fs.statSync(exePath);
      return { success: true, message: `存在 (${(stats.size / 1024 / 1024).toFixed(2)} MB)` };
    }
    return { success: false, message: '不存在' };
  }
});

checks.push({
  name: '打包后的图标文件 (resources/assets/icon.ico)',
  check: () => {
    const iconPath = path.join(__dirname, '../dist/win-unpacked/resources/assets/icon.ico');
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      return { success: true, message: `存在 (${(stats.size / 1024).toFixed(2)} KB)` };
    }
    return { success: false, message: '不存在' };
  }
});

checks.push({
  name: '打包后的 PNG 图标 (resources/assets/icon-512.png)',
  check: () => {
    const iconPath = path.join(__dirname, '../dist/win-unpacked/resources/assets/icon-512.png');
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      return { success: true, message: `存在 (${(stats.size / 1024).toFixed(2)} KB)` };
    }
    return { success: false, message: '不存在' };
  }
});

// 3. 检查配置文件
checks.push({
  name: 'electron-builder.yml 配置',
  check: () => {
    const configPath = path.join(__dirname, '../electron-builder.yml');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      
      // 检查关键配置
      const hasIcon = content.includes('icon: assets/icon.ico');
      const hasInstallerIcon = content.includes('installerIcon: assets/icon.ico');
      const hasShortcut = content.includes('createDesktopShortcut');
      
      if (hasIcon && hasInstallerIcon && hasShortcut) {
        return { success: true, message: '配置正确' };
      }
      return { success: false, message: '配置缺失或不完整' };
    }
    return { success: false, message: '配置文件不存在' };
  }
});

checks.push({
  name: 'NSIS 安装脚本 (scripts/installer.nsh)',
  check: () => {
    const scriptPath = path.join(__dirname, 'installer.nsh');
    if (fs.existsSync(scriptPath)) {
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // 检查是否包含图标验证和缓存刷新
      const hasIconCheck = content.includes('icon.ico');
      const hasCacheRefresh = content.includes('ie4uinit.exe') || content.includes('IconCache.db');
      
      if (hasIconCheck && hasCacheRefresh) {
        return { success: true, message: '包含图标验证和缓存刷新逻辑' };
      }
      return { success: false, message: '缺少图标验证或缓存刷新逻辑' };
    }
    return { success: false, message: '脚本文件不存在' };
  }
});

// 执行所有检查
log('\n🔍 图标嵌入验证开始...\n', 'cyan');

let passCount = 0;
let failCount = 0;

checks.forEach((item, index) => {
  const result = item.check();
  const status = result.success ? '✅' : '❌';
  const color = result.success ? 'green' : 'red';
  
  log(`${status} ${item.name}: ${result.message}`, color);
  
  if (result.success) {
    passCount++;
  } else {
    failCount++;
  }
});

// 输出总结
log('\n' + '='.repeat(50), 'blue');
log(`验证完成: ${passCount} 项通过, ${failCount} 项失败`, failCount > 0 ? 'yellow' : 'green');

if (failCount === 0) {
  log('\n✨ 所有检查通过！图标配置正确。', 'green');
  process.exit(0);
} else {
  log('\n⚠️  部分检查失败，请根据上述提示修复问题。', 'yellow');
  log('\n常见解决方案：', 'cyan');
  log('1. 运行打包命令: npm run build:win', 'cyan');
  log('2. 检查图标文件是否存在于 assets 目录', 'cyan');
  log('3. 验证 electron-builder.yml 配置是否正确', 'cyan');
  process.exit(1);
}
