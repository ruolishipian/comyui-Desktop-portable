/**
 * node-pty postinstall 补丁
 * 
 * 禁用 SpectreMitigation 编译选项，因为 VS 18 的 v14.51 工具集
 * 缺少对应的 Spectre 缓解库，导致 node-pty 编译失败。
 * 
 * 安全影响：禁用 Spectre 缓解意味着编译产物不包含对抗
 * Spectre 类侧信道攻击的防护。对于桌面应用场景，风险可接受。
 */

const fs = require('fs');
const path = require('path');

const bindingGyp = path.join(__dirname, '..', 'node_modules', 'node-pty', 'binding.gyp');
const winptyGyp = path.join(__dirname, '..', 'node_modules', 'node-pty', 'deps', 'winpty', 'src', 'winpty.gyp');

function patchFile(filePath, description) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`[patch-node-pty] 跳过: ${filePath} 不存在`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes("'SpectreMitigation': 'Spectre'")) {
      console.log(`[patch-node-pty] 跳过: ${description} 已修补或无需修补`);
      return;
    }

    const patched = content.replace(
      /'SpectreMitigation': 'Spectre'/g,
      "'SpectreMitigation': 'false'"
    );
    fs.writeFileSync(filePath, patched, 'utf8');
    console.log(`[patch-node-pty] 已修补: ${description}`);
  } catch (err) {
    console.warn(`[patch-node-pty] 修补 ${description} 失败: ${err.message}`);
  }
}

patchFile(bindingGyp, 'binding.gyp');
patchFile(winptyGyp, 'winpty.gyp');
