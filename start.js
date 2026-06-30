#!/usr/bin/env node
/**
 * 启动脚本 - 清除 ELECTRON_RUN_AS_NODE 环境变量后启动 Electron
 * 解决在 Electron IDE（如 CodeArts Agent）中运行时的问题
 */

const { spawn } = require('child_process');
const path = require('path');

// 清除 ELECTRON_RUN_AS_NODE 环境变量
// 此变量由 IDE（如 CodeArts）设置，会导致 Electron 以 Node.js 模式启动
// 必须在 require('electron') 之前清除，否则 electron 模块行为异常
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_DISABLE_SECURITY_WARNINGS;

// 获取 electron 可执行文件路径
const electronPath = require('electron');

// 启动 electron
const child = spawn(electronPath, ['.'], {
  cwd: __dirname,
  env: env,
  stdio: 'inherit',
  windowsHide: false
});

child.on('close', code => {
  if (code && code !== 0) {
    console.error(`Electron exited with code: ${code}`);
  }
  process.exit(code || 0);
});

child.on('error', err => {
  console.error('Failed to start electron:', err);
  process.exit(1);
});
