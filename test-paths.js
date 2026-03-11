/**
 * 路径测试脚本
 * 用于验证打包后的路径是否正确
 */

const path = require('path');
const fs = require('fs');

console.log('========== 路径测试 ==========\n');

// 1. 测试 process.cwd()
console.log('1. process.cwd():');
console.log('   ', process.cwd());
console.log();

// 2. 测试 __dirname
console.log('2. __dirname:');
console.log('   ', __dirname);
console.log();

// 3. 测试可执行文件路径
console.log('3. 可执行文件路径:');
console.log('   ', process.execPath);
console.log('   目录:', path.dirname(process.execPath));
console.log();

// 4. 测试 app.getPath (仅在 Electron 中可用)
if (process.versions.electron) {
  const { app } = require('electron');
  console.log('4. Electron app 路径:');
  console.log('   app.getPath("exe"):', app.getPath('exe'));
  console.log('   app.getPath("appData"):', app.getPath('appData'));
  console.log('   app.getPath("userData"):', app.getPath('userData'));
  console.log();
}

// 5. 测试相对路径计算
console.log('5. 相对路径测试:');
const appPath = process.cwd();
console.log('   ComfyUI 路径:', path.join(appPath, 'ComfyUI'));
console.log('   Python 路径:', path.join(appPath, 'python_embeded', 'python.exe'));
console.log('   Config 路径:', path.join(appPath, 'config'));
console.log('   Logs 路径:', path.join(appPath, 'logs'));
console.log();

// 6. 测试路径是否存在
console.log('6. 路径存在性检查:');
const testPaths = [
  path.join(appPath, 'ComfyUI'),
  path.join(appPath, 'python_embeded'),
  path.join(appPath, 'config'),
  path.join(appPath, 'logs'),
  path.join(appPath, '..', 'ComfyUI'),
  path.join(appPath, '..', 'python_embeded')
];

testPaths.forEach(testPath => {
  const exists = fs.existsSync(testPath);
  console.log(`   ${exists ? '✓' : '✗'} ${testPath}`);
});
console.log();

// 7. 测试 ASAR 路径 (如果在 ASAR 包中)
if (__dirname.includes('app.asar')) {
  console.log('7. ASAR 包检测:');
  console.log('   运行在 ASAR 包中');
  console.log('   ASAR 路径:', __dirname);

  // 测试 ASAR 内的文件访问
  const assetsPath = path.join(__dirname, '../../assets');
  console.log('   Assets 路径:', assetsPath);
  console.log('   Assets 存在:', fs.existsSync(assetsPath));
  console.log();
} else {
  console.log('7. ASAR 包检测:');
  console.log('   不在 ASAR 包中 (开发模式)');
  console.log();
}

console.log('========== 测试完成 ==========');
