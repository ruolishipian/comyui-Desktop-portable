"use strict";
/**
 * 质量检查脚本
 * 检查模块化项目的完整性 - TypeScript 版本
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// 检查结果
const results = {
    pass: [],
    fail: [],
    warn: []
};
// 获取项目根目录（编译后 __dirname 是 dist/scripts，需要向上两级）
const projectRoot = path.join(__dirname, '..', '..');
// 1. 检查模块文件
const checkModules = () => {
    const modules = [
        'state.ts',
        'config.ts',
        'logger.ts',
        'environment.ts',
        'process.ts',
        'windows.ts',
        'tray.ts',
        'ipc.ts',
        'index.ts'
    ];
    modules.forEach((module) => {
        const modulePath = path.join(projectRoot, 'src', 'modules', module);
        if (fs.existsSync(modulePath)) {
            results.pass.push(`模块 ${module} 存在`);
        }
        else {
            results.fail.push(`模块 ${module} 不存在`);
        }
    });
};
// 2. 检查核心文件
const checkCoreFiles = () => {
    const coreFiles = [
        { path: 'src/main.ts', name: '主入口文件' },
        { path: 'src/preload.ts', name: '预加载脚本' },
        { path: 'package.json', name: '包配置文件' },
        { path: 'tsconfig.json', name: 'TypeScript 配置文件' }
    ];
    coreFiles.forEach((item) => {
        const filePath = path.join(projectRoot, item.path);
        if (fs.existsSync(filePath)) {
            results.pass.push(`${item.name} 存在`);
        }
        else {
            results.fail.push(`${item.name} 不存在`);
        }
    });
};
// 3. 检查静态资源
const checkAssets = () => {
    const assets = ['loading.html', 'error.html', 'select-env.html', 'log.html', 'settings.html'];
    assets.forEach((asset) => {
        const assetPath = path.join(projectRoot, 'assets', asset);
        if (fs.existsSync(assetPath)) {
            results.pass.push(`静态资源 ${asset} 存在`);
        }
        else {
            results.fail.push(`静态资源 ${asset} 不存在`);
        }
    });
};
// 4. 检查模块导出一致性
const checkModuleExports = () => {
    const modulePath = path.join(projectRoot, 'src', 'modules', 'index.ts');
    if (!fs.existsSync(modulePath)) {
        results.fail.push('模块索引文件不存在');
        return;
    }
    const content = fs.readFileSync(modulePath, 'utf8');
    // 检查是否导出所有核心模块
    const requiredExports = [
        'configManager',
        'logger',
        'stateManager',
        'processManager',
        'windowManager',
        'trayManager',
        'ipcManager'
    ];
    requiredExports.forEach((exp) => {
        if (content.includes(exp)) {
            results.pass.push(`模块导出 ${exp}`);
        }
        else {
            results.fail.push(`模块未导出 ${exp}`);
        }
    });
};
// 5. 检查依赖关系
const checkDependencies = () => {
    const packagePath = path.join(projectRoot, 'package.json');
    if (!fs.existsSync(packagePath)) {
        results.fail.push('package.json 不存在');
        return;
    }
    try {
        const content = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        const requiredDeps = ['electron', 'electron-store', 'tree-kill', 'typescript'];
        requiredDeps.forEach((dep) => {
            if ((content.dependencies?.[dep] ?? null) !== null || (content.devDependencies?.[dep] ?? null) !== null) {
                results.pass.push(`依赖 ${dep} 已配置`);
            }
            else {
                results.fail.push(`依赖 ${dep} 未配置`);
            }
        });
    }
    catch (err) {
        const error = err;
        results.fail.push(`package.json 解析失败：${error.message}`);
    }
};
// 6. 检查模块引用
const checkModuleImports = () => {
    const mainPath = path.join(projectRoot, 'src', 'main.ts');
    if (!fs.existsSync(mainPath)) {
        results.fail.push('main.ts 不存在');
        return;
    }
    const content = fs.readFileSync(mainPath, 'utf8');
    // 检查是否正确引用模块
    if (content.includes("from './modules'")) {
        results.pass.push('main.ts 正确引用模块');
    }
    else {
        results.fail.push('main.ts 未正确引用模块');
    }
};
// 7. 检查类型定义文件
const checkTypeDefinitions = () => {
    const typeFiles = ['src/types/index.d.ts', 'src/types/electron.d.ts'];
    typeFiles.forEach((typeFile) => {
        const typePath = path.join(projectRoot, typeFile);
        if (fs.existsSync(typePath)) {
            results.pass.push(`类型定义 ${typeFile} 存在`);
        }
        else {
            results.warn.push(`类型定义 ${typeFile} 不存在`);
        }
    });
};
// 8. 检查编译输出目录
const checkDistDirectory = () => {
    const distPath = path.join(projectRoot, 'dist');
    if (fs.existsSync(distPath)) {
        results.pass.push('编译输出目录 dist 存在');
    }
    else {
        results.warn.push('编译输出目录 dist 不存在，请先运行 npm run build');
    }
};
// 9. 检查 IPC 通道一致性
const checkIpcChannelsConsistency = () => {
    const ipcChannelsPath = path.join(projectRoot, 'src', 'constants', 'ipc-channels.ts');
    const preloadPath = path.join(projectRoot, 'src', 'preload.ts');
    if (!fs.existsSync(ipcChannelsPath)) {
        results.fail.push('constants/ipc-channels.ts 不存在');
        return;
    }
    if (!fs.existsSync(preloadPath)) {
        results.fail.push('preload.ts 不存在');
        return;
    }
    const ipcChannelsFileContent = fs.readFileSync(ipcChannelsPath, 'utf8');
    const preloadFileContent = fs.readFileSync(preloadPath, 'utf8');
    // 从 ipc-channels.ts 提取 IPC_CHANNELS
    const ipcMatch = ipcChannelsFileContent.match(/export\s+const\s+IPC_CHANNELS\s*=\s*\{([\s\S]*?)\}\s+as\s+const/);
    if (!ipcMatch) {
        results.fail.push('无法从 constants/ipc-channels.ts 提取 IPC_CHANNELS');
        return;
    }
    // 从 preload.ts 提取内联的 IPC_CHANNELS
    const preloadMatch = preloadFileContent.match(/const\s+IPC_CHANNELS\s*=\s*\{([\s\S]*?)\}\s+as\s+const/);
    if (!preloadMatch) {
        results.fail.push('无法从 preload.ts 提取 IPC_CHANNELS（可能未内联）');
        return;
    }
    // 提取键值对
    const extractChannels = (content) => {
        const channels = {};
        const lines = content.split('\n');
        for (const line of lines) {
            const match = line.match(/^\s*(?:\/\/.*)?\*?\s*([A-Z_]+)\s*:\s*['"]([^'"]+)['"]/);
            if (match && match[1] && match[2]) {
                channels[match[1]] = match[2];
            }
        }
        return channels;
    };
    const ipcChannelsContent = ipcMatch[1] ?? '';
    const preloadChannelsContent = preloadMatch[1] ?? '';
    const ipcChannels = extractChannels(ipcChannelsContent);
    const preloadChannels = extractChannels(preloadChannelsContent);
    // 比较
    const ipcKeys = Object.keys(ipcChannels).sort();
    const preloadKeys = Object.keys(preloadChannels).sort();
    const missingInPreload = ipcKeys.filter(k => !preloadKeys.includes(k));
    const missingInConstants = preloadKeys.filter(k => !ipcKeys.includes(k));
    let hasError = false;
    if (missingInPreload.length > 0) {
        results.fail.push(`preload.ts 缺少 IPC 通道: ${missingInPreload.join(', ')}`);
        hasError = true;
    }
    if (missingInConstants.length > 0) {
        results.fail.push(`constants/ipc-channels.ts 缺少 IPC 通道: ${missingInConstants.join(', ')}`);
        hasError = true;
    }
    // 检查值是否一致
    for (const key of ipcKeys) {
        if (preloadKeys.includes(key) && ipcChannels[key] !== preloadChannels[key]) {
            results.fail.push(`IPC 通道 ${key} 值不一致`);
            hasError = true;
        }
    }
    if (!hasError) {
        results.pass.push('IPC 通道定义一致 (preload.ts 与 constants/ipc-channels.ts)');
    }
};
// 10. 检查依赖类型定义
const checkDependencyTypes = () => {
    // 检查 tree-kill 自带类型
    const treeKillTypesPath = path.join(projectRoot, 'node_modules', 'tree-kill', 'index.d.ts');
    if (fs.existsSync(treeKillTypesPath)) {
        results.pass.push('tree-kill 自带类型定义存在');
    }
    else {
        results.warn.push('tree-kill 类型定义不存在（可能需要安装或重新 npm install）');
    }
    // 检查 @types/node
    const typesNodePath = path.join(projectRoot, 'node_modules', '@types', 'node');
    if (fs.existsSync(typesNodePath)) {
        results.pass.push('@types/node 类型定义存在');
    }
    else {
        results.fail.push('@types/node 类型定义不存在');
    }
};
// 执行所有检查
const runAllChecks = () => {
    console.log('\n=== ComfyUI 便携桌面版 - TypeScript 模块化质量检查 ===\n');
    checkModules();
    checkCoreFiles();
    checkAssets();
    checkModuleExports();
    checkDependencies();
    checkModuleImports();
    checkTypeDefinitions();
    checkDistDirectory();
    checkIpcChannelsConsistency();
    checkDependencyTypes();
    // 输出结果
    console.log('✅ 通过项：');
    results.pass.forEach((item) => console.log(`  - ${item}`));
    console.log('\n⚠️  警告项：');
    if (results.warn.length === 0) {
        console.log('  无');
    }
    else {
        results.warn.forEach((item) => console.log(`  - ${item}`));
    }
    console.log('\n❌ 失败项：');
    if (results.fail.length === 0) {
        console.log('  无');
    }
    else {
        results.fail.forEach((item) => console.log(`  - ${item}`));
    }
    // 统计
    console.log('\n📊 统计：');
    console.log(`  通过：${results.pass.length} 项`);
    console.log(`  警告：${results.warn.length} 项`);
    console.log(`  失败：${results.fail.length} 项`);
    // 失败项阻断流程
    if (results.fail.length > 0) {
        console.log('\n❌ 质量检查未通过，存在致命问题！');
        process.exit(1);
    }
    else {
        console.log('\n✅ 质量检查通过！');
        process.exit(0);
    }
};
// 启动检查
runAllChecks();
//# sourceMappingURL=quality-check.js.map