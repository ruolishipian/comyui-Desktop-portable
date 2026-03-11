/**
 * App Path Mock
 * 用于测试的路径获取函数
 */

import { app } from 'electron';
import path from 'path';

export function getAppPath(): string {
  if (app.isPackaged) {
    // 打包后:使用可执行文件所在目录
    return path.dirname(app.getPath('exe'));
  } else {
    // 开发环境:使用当前工作目录
    return process.cwd();
  }
}
