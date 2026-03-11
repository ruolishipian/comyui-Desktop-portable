#!/usr/bin/env node
/**
 * IPC 通道一致性检查脚本
 *
 * 检查 preload.ts 中内联的 IPC_CHANNELS 常量是否与
 * constants/ipc-channels.ts 中的定义保持一致。
 *
 * 这是因为 Electron 的 preload 脚本运行在 sandbox_bundle 环境中，
 * 无法使用相对路径的 require，所以需要将常量内联到 preload.ts 中。
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const IPC_CHANNELS_FILE = path.join(ROOT_DIR, 'src/constants/ipc-channels.ts');
const PRELOAD_FILE = path.join(ROOT_DIR, 'src/preload.ts');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 从 ipc-channels.ts 提取 IPC_CHANNELS 对象
 */
function extractIpcChannels(content) {
  // 匹配 IPC_CHANNELS = { ... } as const 对象
  const match = content.match(/export\s+const\s+IPC_CHANNELS\s*=\s*\{([\s\S]*?)\}\s+as\s+const/);
  if (!match) {
    return null;
  }

  const objContent = match[1];
  const channels = {};

  // 提取每个键值对
  const lines = objContent.split('\n');
  for (const line of lines) {
    // 匹配 KEY: 'value' 或 KEY: "value"
    const lineMatch = line.match(/^\s*(?:\/\/.*)?\*?\s*([A-Z_]+)\s*:\s*['"]([^'"]+)['"]/);
    if (lineMatch) {
      channels[lineMatch[1]] = lineMatch[2];
    }
  }

  return channels;
}

/**
 * 从 preload.ts 提取内联的 IPC_CHANNELS 对象
 */
function extractPreloadIpcChannels(content) {
  // 匹配 const IPC_CHANNELS = { ... } 对象
  const match = content.match(/const\s+IPC_CHANNELS\s*=\s*\{([\s\S]*?)\}\s+as\s+const/);
  if (!match) {
    return null;
  }

  const objContent = match[1];
  const channels = {};

  // 提取每个键值对
  const lines = objContent.split('\n');
  for (const line of lines) {
    // 匹配 KEY: 'value' 或 KEY: "value"
    const lineMatch = line.match(/^\s*(?:\/\/.*)?\s*([A-Z_]+)\s*:\s*['"]([^'"]+)['"]/);
    if (lineMatch) {
      channels[lineMatch[1]] = lineMatch[2];
    }
  }

  return channels;
}

/**
 * 比较两个对象是否相等
 */
function compareChannels(channels1, channels2) {
  const keys1 = Object.keys(channels1).sort();
  const keys2 = Object.keys(channels2).sort();

  const errors = [];

  // 检查缺失的键
  const missingInPreload = keys1.filter(k => !keys2.includes(k));
  const missingInConstants = keys2.filter(k => !keys1.includes(k));

  if (missingInPreload.length > 0) {
    errors.push(`preload.ts 缺少以下通道: ${missingInPreload.join(', ')}`);
  }

  if (missingInConstants.length > 0) {
    errors.push(`constants/ipc-channels.ts 缺少以下通道: ${missingInConstants.join(', ')}`);
  }

  // 检查值是否一致
  for (const key of keys1) {
    if (keys2.includes(key) && channels1[key] !== channels2[key]) {
      errors.push(`通道 ${key} 值不一致: constants="${channels1[key]}" vs preload="${channels2[key]}"`);
    }
  }

  return errors;
}

function main() {
  console.log('='.repeat(60));
  console.log('IPC 通道一致性检查');
  console.log('='.repeat(60));
  console.log();

  // 读取文件
  let ipcChannelsContent, preloadContent;
  try {
    ipcChannelsContent = fs.readFileSync(IPC_CHANNELS_FILE, 'utf-8');
    preloadContent = fs.readFileSync(PRELOAD_FILE, 'utf-8');
  } catch (err) {
    log('red', `错误: 无法读取文件 - ${err.message}`);
    process.exit(1);
  }

  // 提取通道定义
  const ipcChannels = extractIpcChannels(ipcChannelsContent);
  const preloadChannels = extractPreloadIpcChannels(preloadContent);

  if (!ipcChannels) {
    log('red', '错误: 无法从 constants/ipc-channels.ts 提取 IPC_CHANNELS');
    process.exit(1);
  }

  if (!preloadChannels) {
    log('red', '错误: 无法从 preload.ts 提取 IPC_CHANNELS');
    process.exit(1);
  }

  console.log(`constants/ipc-channels.ts 中找到 ${Object.keys(ipcChannels).length} 个通道`);
  console.log(`preload.ts 中找到 ${Object.keys(preloadChannels).length} 个通道`);
  console.log();

  // 比较通道
  const errors = compareChannels(ipcChannels, preloadChannels);

  if (errors.length === 0) {
    log('green', '✓ IPC 通道定义一致');
    console.log();
    console.log('='.repeat(60));
    process.exit(0);
  } else {
    log('red', '✗ IPC 通道定义不一致');
    console.log();
    for (const error of errors) {
      log('yellow', `  - ${error}`);
    }
    console.log();
    log('yellow', '提示: 请确保以下两个文件的 IPC_CHANNELS 定义保持一致:');
    log('yellow', '  1. src/constants/ipc-channels.ts (主进程使用)');
    log('yellow', '  2. src/preload.ts (渲染进程使用)');
    console.log();
    console.log('='.repeat(60));
    process.exit(1);
  }
}

main();
