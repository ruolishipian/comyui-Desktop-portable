/**
 * 日志轮转模块
 * 提供日志文件轮转和清理功能
 */

import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

import log from 'electron-log/main';

/**
 * 轮转日志文件
 * 将当前日志文件重命名为带时间戳的文件，并删除最旧的日志文件
 *
 * @param logDir 日志目录
 * @param baseName 日志文件基础名称（不含扩展名）
 * @param maxFiles 最大保留文件数量
 */
export async function rotateLogFiles(logDir: string, baseName: string, maxFiles = 50): Promise<void> {
  const currentLogPath = path.join(logDir, `${baseName}.log`);

  try {
    // 检查日志目录和当前日志文件是否存在
    await fsPromises.access(logDir, fs.constants.R_OK | fs.constants.W_OK);
    await fsPromises.access(currentLogPath);
  } catch {
    // 日志文件不存在，无需轮转
    log.error('日志轮转: 无法访问日志文件', currentLogPath);
    return;
  }

  // 删除最旧的日志文件
  if (maxFiles > 0) {
    const files = await fsPromises.readdir(logDir, { withFileTypes: true });
    const names: string[] = [];

    // 匹配日志文件名格式: baseName_YYYY-MM-DDTHH-MM-SS-MMMZ.log
    const logFileRegex = new RegExp(`^${baseName}_\\d{4}-\\d{2}-\\d{2}T\\d{2}-\\d{2}-\\d{2}-\\d{3}Z\\.log$`);

    for (const file of files) {
      if (file.isFile() && logFileRegex.test(file.name)) {
        names.push(file.name);
      }
    }

    // 如果文件数量超过限制，删除最旧的文件
    if (names.length >= maxFiles) {
      names.sort();
      const filesToDelete = names.slice(0, names.length - maxFiles + 1);
      for (const fileName of filesToDelete) {
        try {
          await fsPromises.unlink(path.join(logDir, fileName));
          log.info(`删除旧日志文件: ${fileName}`);
        } catch (err) {
          log.error(`删除日志文件失败: ${fileName}`, err);
        }
      }
    }
  }

  // 重命名当前日志文件
  const timestamp = new Date().toISOString().replaceAll(/[.:]/g, '-');
  const newLogPath = path.join(logDir, `${baseName}_${timestamp}.log`);

  try {
    await fsPromises.rename(currentLogPath, newLogPath);
    log.info(`日志轮转完成: ${baseName}.log -> ${path.basename(newLogPath)}`);
  } catch (err) {
    log.error('日志轮转失败:', err);
  }
}

/**
 * 清理过期日志文件
 * 删除超过指定天数的日志文件
 *
 * @param logDir 日志目录
 * @param keepDays 保留天数
 */
export async function cleanOldLogFiles(logDir: string, keepDays: number): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - keepDays);

  try {
    const files = await fsPromises.readdir(logDir, { withFileTypes: true });
    let deletedCount = 0;

    for (const file of files) {
      if (!file.isFile()) continue;

      const filePath = path.join(logDir, file.name);
      try {
        const stat = await fsPromises.stat(filePath);
        if (stat.mtime < cutoffDate) {
          await fsPromises.unlink(filePath);
          deletedCount++;
        }
      } catch (err) {
        // 忽略单个文件删除错误
      }
    }

    if (deletedCount > 0) {
      log.info(`清理过期日志完成，删除了 ${deletedCount} 个文件`);
    }
  } catch (err) {
    log.error('清理过期日志失败:', err);
  }
}
