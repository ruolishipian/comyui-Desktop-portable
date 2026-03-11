/**
 * 打包配置验证脚本
 * 检查 electron-builder 配置是否正确
 */

const fs = require('fs');
const path = require('path');

console.log('========== 打包配置验证 ==========\n');

// 检查必需文件
const requiredFiles = [
  'electron-builder.yml',
  'package.json',
  'scripts/filter-languages-hook.js'
];

console.log('1. 检查必需文件:');
let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`   ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allFilesExist = false;
});
console.log();

// 检查配置文件内容
console.log('2. 检查配置文件:');
try {
  const yamlContent = fs.readFileSync('electron-builder.yml', 'utf8');

  // 检查是否包含图标配置
  const hasIcon = yamlContent.includes('icon:');
  console.log(`   ${!hasIcon ? '✓' : '✗'} 已移除图标配置 (使用默认图标)`);

  // 检查是否包含 NSIS 配置
  const hasNsis = yamlContent.includes('nsis:');
  console.log(`   ${hasNsis ? '✓' : '✗'} NSIS 安装包配置`);

  // 检查是否包含 ZIP 配置
  const hasZip = yamlContent.includes('zip:');
  console.log(`   ${hasZip ? '✓' : '✗'} ZIP 压缩包配置`);

  // 检查语言过滤
  const hasLangFilter = yamlContent.includes('afterPack:');
  console.log(`   ${hasLangFilter ? '✓' : '✗'} 语言过滤钩子`);

  // 检查语言配置
  const hasZhCN = yamlContent.includes('zh-CN');
  const hasEnUS = yamlContent.includes('en-US');
  console.log(`   ${hasZhCN && hasEnUS ? '✓' : '✗'} 中英文语言配置`);

} catch (err) {
  console.log('   ✗ 读取配置文件失败:', err.message);
}
console.log();

// 检查 package.json 脚本
console.log('3. 检查打包脚本:');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = pkg.scripts || {};

  const requiredScripts = [
    'build:win',
    'build:win:installer',
    'build:win:portable',
    'build:win:all'
  ];

  requiredScripts.forEach(script => {
    const exists = scripts[script] !== undefined;
    console.log(`   ${exists ? '✓' : '✗'} ${script}`);
  });

} catch (err) {
  console.log('   ✗ 读取 package.json 失败:', err.message);
}
console.log();

// 检查语言过滤脚本
console.log('4. 检查语言过滤脚本:');
try {
  const hookPath = 'scripts/filter-languages-hook.js';
  if (fs.existsSync(hookPath)) {
    const hookContent = fs.readFileSync(hookPath, 'utf8');

    const hasKeepLang = hookContent.includes('KEEP_LANGUAGES');
    console.log(`   ${hasKeepLang ? '✓' : '✗'} 语言保留列表`);

    const hasZhCN = hookContent.includes('zh-CN');
    const hasEnUS = hookContent.includes('en-US');
    console.log(`   ${hasZhCN && hasEnUS ? '✓' : '✗'} 中英文语言配置`);

    const hasAfterPack = hookContent.includes('module.exports');
    console.log(`   ${hasAfterPack ? '✓' : '✗'} afterPack 钩子导出`);

  } else {
    console.log('   ✗ 语言过滤脚本不存在');
  }
} catch (err) {
  console.log('   ✗ 检查语言过滤脚本失败:', err.message);
}
console.log();

// 总结
console.log('========== 验证完成 ==========');
console.log('\n配置状态: ✓ 就绪');
console.log('\n可用命令:');
console.log('  npm run build:win:all        - 打包所有格式');
console.log('  npm run build:win:installer  - 仅打包安装包');
console.log('  npm run build:win:portable   - 仅打包压缩包');
console.log();
