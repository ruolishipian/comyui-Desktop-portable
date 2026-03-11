/**
 * 语言过滤脚本
 * 在打包后删除不需要的语言文件,只保留中文和英文
 */

const fs = require('fs');
const path = require('path');

// 需要保留的语言
const KEEP_LANGUAGES = ['zh-CN', 'zh-TW', 'en-US', 'zh-CN.pak', 'zh-TW.pak', 'en-US.pak'];

// 需要清理的目录
const LOCALES_DIR = 'locales';

function filterLanguages(appPath) {
  console.log('开始过滤语言文件...');
  console.log('应用路径:', appPath);

  const localesPath = path.join(appPath, LOCALES_DIR);

  if (!fs.existsSync(localesPath)) {
    console.log('未找到 locales 目录,跳过语言过滤');
    return;
  }

  const files = fs.readdirSync(localesPath);
  let deletedCount = 0;
  let keptCount = 0;

  files.forEach(file => {
    const shouldKeep = KEEP_LANGUAGES.some(lang =>
      file === lang || file.startsWith(lang + '.')
    );

    if (!shouldKeep) {
      const filePath = path.join(localesPath, file);
      try {
        fs.unlinkSync(filePath);
        console.log(`  删除: ${file}`);
        deletedCount++;
      } catch (err) {
        console.error(`  删除失败: ${file}`, err.message);
      }
    } else {
      console.log(`  保留: ${file}`);
      keptCount++;
    }
  });

  console.log(`\n语言过滤完成:`);
  console.log(`  保留文件: ${keptCount} 个`);
  console.log(`  删除文件: ${deletedCount} 个`);
}

// 如果直接运行此脚本
if (require.main === module) {
  const appPath = process.argv[2] || process.cwd();
  filterLanguages(appPath);
}

module.exports = { filterLanguages };
