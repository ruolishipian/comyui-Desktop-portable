# 打包配置说明

## 📦 打包类型

本项目支持两种打包格式:

1. **安装包 (NSIS)** - 标准的 Windows 安装程序
2. **压缩包 (ZIP)** - 便携版,解压即用

## 🚀 快速开始

### 打包所有格式

```bash
cd electron
npm run build:win:all
```

这将同时生成:
- `ComfyUI-Desktop-3.0.0 Setup.exe` - 安装包
- `ComfyUI-Desktop-3.0.0-portable.zip` - 便携版压缩包

### 单独打包

#### 仅生成安装包

```bash
npm run build:win:installer
```

输出: `dist/ComfyUI-Desktop-3.0.0 Setup.exe`

#### 仅生成压缩包

```bash
npm run build:win:portable
```

输出: `dist/ComfyUI-Desktop-3.0.0-portable.zip`

## 🌍 语言配置

### 已配置的语言

打包后的应用**仅包含中文和英文**语言文件:

- ✅ `zh-CN` - 简体中文
- ✅ `zh-TW` - 繁体中文
- ✅ `en-US` - 英语

其他语言文件会在打包时自动删除,减小安装包体积。

### 安装包语言选择

安装包支持以下语言:
- 简体中文 (默认)
- English

用户在安装时可以选择界面语言。

## 📁 输出目录

打包后的文件位于项目根目录的 `dist/` 文件夹:

```
dist/
├── ComfyUI-Desktop-3.0.0 Setup.exe    # 安装包 (~80MB)
├── ComfyUI-Desktop-3.0.0-portable.zip # 便携版 (~80MB)
└── win-unpacked/                       # 未打包的应用目录
```

## ⚙️ 配置文件

### electron-builder.yml

主要配置文件,包含:
- 应用 ID 和名称
- 打包目标格式
- NSIS 安装选项
- 语言过滤设置
- 文件包含/排除规则

### build/installer.nsh

NSIS 自定义脚本 (可选),用于:
- 自定义安装界面
- 添加安装选项
- 设置快捷方式

**注意**: 当前配置未使用自定义 NSIS 脚本。

## 🔧 高级配置

### 修改应用版本

编辑 `package.json`:

```json
{
  "version": "3.0.0"
}
```

### 修改应用图标

如需自定义图标,可以:

1. 准备图标文件 (推荐 256x256 像素的 .ico 格式)
2. 在 `electron-builder.yml` 中添加:
   ```yaml
   win:
     icon: assets/icon.ico
   nsis:
     installerIcon: assets/icon.ico
     uninstallerIcon: assets/icon.ico
   ```

**注意**: 当前配置使用 Electron 默认图标,避免因缺少图标文件导致打包错误。

### 修改输出目录

编辑 `electron-builder.yml`:

```yaml
directories:
  output: ../dist  # 修改为其他路径
```

### 添加额外文件

编辑 `electron-builder.yml`:

```yaml
extraResources:
  - from: README.md
    to: README.md
```

## 📊 打包流程

1. **编译 TypeScript**
   ```bash
   npm run build
   ```

2. **打包应用**
   - 复制文件到临时目录
   - 创建 ASAR 包
   - 过滤语言文件

3. **生成安装包**
   - 创建 NSIS 安装程序
   - 添加安装选项

4. **生成压缩包**
   - 压缩应用目录
   - 创建 ZIP 文件

## 🐛 常见问题

### Q: 打包失败,提示缺少依赖?

A: 确保已安装所有依赖:
```bash
npm install
```

### Q: 安装包体积太大?

A: 检查以下几点:
1. 是否包含了不必要的文件 (test/, docs/ 等)
2. 是否有大型依赖未正确排除
3. 查看 `files` 配置是否正确

### Q: 语言文件未过滤?

A: 检查:
1. `electron-builder.yml` 中的 `afterPack` 钩子是否配置
2. `scripts/filter-languages-hook.js` 文件是否存在

### Q: 安装包界面语言不对?

A: 检查 `nsis` 配置:
```yaml
nsis:
  language: "2052"  # 2052=简体中文, 1033=英语
```

## 📝 打包脚本说明

| 脚本 | 说明 | 输出 |
|------|------|------|
| `build:win` | 打包所有格式 | 安装包 + 压缩包 |
| `build:win:installer` | 仅打包安装包 | Setup.exe |
| `build:win:portable` | 仅打包压缩包 | portable.zip |
| `build:win:all` | 打包所有格式 | 安装包 + 压缩包 |

## 🎯 最佳实践

1. **打包前检查**
   - 运行测试: `npm test`
   - 类型检查: `npm run typecheck`
   - 代码检查: `npm run lint`

2. **版本管理**
   - 每次发布前更新版本号
   - 使用语义化版本 (SemVer)

3. **测试安装**
   - 在干净的虚拟机中测试安装包
   - 测试升级安装
   - 测试卸载

4. **发布准备**
   - 生成 SHA256 校验和
   - 编写更新日志
   - 准备发布说明

## 📚 相关文档

- [Electron Builder 文档](https://www.electron.build/)
- [NSIS 文档](https://nsis.sourceforge.io/Docs/)
- [项目 README](../README.md)
