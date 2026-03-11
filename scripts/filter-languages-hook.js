/**
 * Electron Builder afterPack 钩子
 * 在打包完成后过滤语言文件,只保留中文和英文
 */

const fs = require('fs');
const path = require('path');

// 需要保留的语言
const KEEP_LANGUAGES = ['zh-CN', 'zh-TW', 'en-US'];

module.exports = async function(context) {
  console.log('\n========== 语言过滤钩子 ==========');

  const appOutDir = context.appOutDir;
  console.log('应用输出目录:', appOutDir);

  // 查找 locales 目录
  const localesPath = path.join(appOutDir, 'locales');

  if (!fs.existsSync(localesPath)) {
    console.log('未找到 locales 目录,跳过语言过滤');
    return;
  }

  const files = fs.readdirSync(localesPath);
  let deletedCount = 0;
  let keptCount = 0;

  console.log('\n处理语言文件:');

  files.forEach(file => {
    // 检查文件是否应该保留
    const shouldKeep = KEEP_LANGUAGES.some(lang => {
      // 匹配 zh-CN.pak, zh-CN.lproj 等
      return file === `${lang}.pak` ||
             file.startsWith(`${lang}.`) ||
             file === lang;
    });

    if (!shouldKeep) {
      const filePath = path.join(localesPath, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`  ✗ 删除: ${file}`);
        deletedCount++;
      } catch (err) {
        console.error(`  ✗ 删除失败: ${file}`, err.message);
      }
    } else {
      console.log(`  ✓ 保留: ${file}`);
      keptCount++;
    }
  });

  console.log('\n语言过滤统计:');
  console.log(`  保留文件: ${keptCount} 个`);
  console.log(`  删除文件: ${deletedCount} 个`);
  console.log('========== 语言过滤完成 ==========\n');
};
