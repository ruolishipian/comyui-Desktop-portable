const fs = require('fs');
const path = require('path');

const bindingGyp = path.join(__dirname, '..', 'node_modules', 'node-pty', 'binding.gyp');
const winptyGyp = path.join(__dirname, '..', 'node_modules', 'node-pty', 'deps', 'winpty', 'src', 'winpty.gyp');

function patchFile(filePath, description) {
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
}

patchFile(bindingGyp, 'binding.gyp');
patchFile(winptyGyp, 'winpty.gyp');