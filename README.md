# ComfyUI 便携桌面版

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.9-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)

**一个基于 Electron 的 ComfyUI 桌面应用程序**

[功能特性](#功能特性) • [快速开始](#快速开始) • [使用指南](#使用指南) • [开发文档](#开发文档)

</div>

---

我没有设置默认的环境设置和启动参数，需要自己设置，第一次安装会让你选择便携包的路径，下面有环境设置。建议环境变量：
```
PYTHONIOENCODING=utf-8
PYTHONUTF8=1
```
防止日志乱码。

以下启动参数适合8G显存的启动参数：
```
--lowvram --force-upcast-attention --cuda-malloc --use-sage-attention --enable-manager --async-offload 2 --mmap-torch-files --disable-smart-memory
```

## 📖 项目简介

ComfyUI 便携桌面版是一个基于 Electron 和 TypeScript 构建的桌面应用程序，为 ComfyUI 提供了友好的图形化界面和便捷的便携式体验。采用模块化架构设计，支持 Windows 平台，提供安装版和便携版两种分发方式。

## ✨ 功能特性

### 核心功能
- 🖥️ **图形化界面** - 基于 Electron 的现代化桌面应用
- 📦 **便携式设计** - 解压即用，无需安装（便携版）
- 🔄 **进程管理** - 自动管理 ComfyUI 进程的生命周期
- 🎛️ **系统托盘** - 最小化到托盘，后台运行
- 📝 **日志管理** - 完整的日志记录和轮转机制
- ⚙️ **配置管理** - 灵活的配置系统，支持持久化存储
- 💻 **内置终端** - 集成 xterm 终端，实时查看 ComfyUI 输出
- 🔄 **自动更新** - 支持应用自动检测和安装更新
- 🌐 **HTTP 代理** - 内置代理服务器，支持请求转发
- 🔍 **路径检测** - 智能检测 ComfyUI 安装路径

### 技术特性
- 💪 **TypeScript** - 完整的类型安全支持，严格模式
- 🏗️ **模块化架构** - 清晰的模块划分，易于维护
- 🧪 **完善的测试** - 单元测试、集成测试、E2E 测试全覆盖
- 📊 **代码质量** - ESLint + Prettier + JSCPD 代码重复检测
- 🔒 **进程隔离** - 安全的进程间通信（IPC）
- 📈 **结构化日志** - 支持日志解析和结构化输出
- 🎯 **路径别名** - 支持 `@/` 和 `@modules/` 路径别名

## 🚀 快速开始

### 系统要求

- **操作系统**: Windows 10/11 (x64)
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0

### 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd comyui-Desktop-portable

# 安装依赖
npm install
```

### 开发模式

```bash
# 编译并启动
npm start

# 或者开发模式
npm run start:dev
```

### 构建应用

```bash
# 构建所有格式（安装包 + 便携版）
npm run build:win:all

# 仅构建安装包
npm run build:win:installer

# 仅构建便携版
npm run build:win:portable
```

详细构建说明请参考 [BUILD_GUIDE.md](./BUILD_GUIDE.md)

## 📚 使用指南

### 首次运行

1. 下载并解压便携版，或运行安装包进行安装
2. 双击运行 `ComfyUI-Desktop.exe`
3. 应用会自动检测并启动 ComfyUI 服务
4. 在浏览器中访问 `http://localhost:8188` 使用 ComfyUI

### 配置文件

配置文件位于应用目录下的 `config/` 文件夹：
- `app-config.json` - 应用主配置
- `user-config.json` - 用户自定义配置

### 日志文件

日志文件位于 `logs/` 目录：
- `main.log` - 主进程日志
- `renderer.log` - 渲染进程日志
- 自动日志轮转，保留最近 7 天

## 🛠️ 开发文档

### 项目结构

```
comyui-Desktop-portable/
├── src/                      # 源代码目录
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   ├── preload-main.ts      # 主进程预加载
│   ├── modules/             # 功能模块
│   │   ├── config.ts        # 配置管理
│   │   ├── process.ts       # 进程管理
│   │   ├── windows.ts       # 窗口管理
│   │   ├── tray.ts          # 托盘管理
│   │   ├── ipc.ts           # IPC 通信
│   │   ├── ipc-types.ts     # IPC 类型定义
│   │   ├── logger.ts        # 日志系统
│   │   ├── state.ts         # 状态管理
│   │   ├── proxy.ts         # 代理管理
│   │   ├── terminal.ts      # 终端管理
│   │   ├── auto-update.ts   # 自动更新
│   │   ├── http-proxy.ts    # HTTP 代理
│   │   ├── paths.ts         # 路径管理
│   │   ├── path-detector.ts # 路径检测
│   │   ├── path-utils.ts    # 路径工具
│   │   ├── app-path.ts      # 应用路径
│   │   ├── environment.ts   # 环境管理
│   │   ├── line-buffer.ts   # 行缓冲
│   │   ├── log-parser.ts    # 日志解析
│   │   ├── structuredLogging.ts # 结构化日志
│   │   ├── logRotation.ts   # 日志轮转
│   │   ├── errors.ts        # 错误处理
│   │   └── menu-utils.ts    # 菜单工具
│   ├── constants/           # 常量定义
│   │   └── ipc-channels.ts  # IPC 通道常量
│   └── types/               # 类型定义
│       ├── index.d.ts       # 主类型定义
│       ├── node-pty.d.ts    # node-pty 类型
│       ├── electron-updater.d.ts # 自动更新类型
│       ├── electron-log.d.ts # 日志类型
│       ├── electron-store.d.ts # 存储类型
│       └── electron.d.ts    # Electron 类型扩展
├── assets/                  # 静态资源
├── config/                  # 配置文件
├── test/                    # 测试文件
│   ├── unit/               # 单元测试
│   │   ├── common/         # 通用工具测试
│   │   ├── main/           # 主进程测试
│   │   └── renderer/       # 渲染进程测试
│   ├── integration/        # 集成测试
│   ├── e2e/                # E2E 测试
│   ├── types/              # 测试类型定义
│   ├── utils/              # 测试工具
│   ├── mocks/              # Mock 文件
│   └── setup.ts            # 测试配置
├── scripts/                # 构建脚本
├── docs/                   # 文档目录
└── dist/                   # 编译输出
```

### 核心模块

#### 1. 进程管理 (ProcessManager)
- 自动启动和管理 ComfyUI 进程
- 进程状态监控和自动重启
- 优雅的进程关闭机制
- 支持 node-pty 伪终端

#### 2. 窗口管理 (WindowManager)
- 主窗口和配置窗口管理
- 窗口状态持久化
- 最小化到托盘支持

#### 3. 配置管理 (ConfigManager)
- 多层级配置系统
- 配置热重载
- 配置验证和迁移
- 支持 electron-store 持久化

#### 4. 日志系统 (Logger)
- 多级别日志记录
- 日志文件轮转
- 结构化日志输出
- 日志解析和分析

#### 5. IPC 通信 (IPCManager)
- 主进程与渲染进程通信
- 类型安全的 IPC 消息
- 异步消息处理
- 完整的 IPC 类型定义

#### 6. 终端管理 (TerminalManager)
- 集成 xterm.js 终端
- 实时输出显示
- 支持 node-pty 伪终端
- 行缓冲处理

#### 7. 自动更新 (AutoUpdater)
- 自动检测新版本
- 后台下载更新
- 支持静默更新
- 更新通知和提示

#### 8. HTTP 代理 (HttpProxy)
- 内置代理服务器
- 请求转发和拦截
- 支持自定义规则

#### 9. 路径管理 (PathManager)
- 智能路径检测
- 多种路径格式支持
- 路径验证和规范化
- 嵌套路径处理

### 开发命令

```bash
# 编译 TypeScript
npm run build

# 监听模式编译
npm run build:watch

# 复制资源文件
npm run copy-assets

# 代码检查
npm run lint

# 自动修复代码问题
npm run lint:fix

# 类型检查
npm run typecheck

# 测试文件类型检查
npm run typecheck:test

# 全部类型检查
npm run typecheck:all

# 代码格式化
npm run format

# 检查代码重复
npm run check-duplicates

# 完整质量检查
npm run check-all

# 测试质量检查
npm run check:test-quality

# 全部检查（代码+测试）
npm run check:all
```

### 测试

```bash
# 运行所有测试
npm test

# 单元测试
npm run test:unit

# 主进程单元测试
npm run test:unit:main

# 渲染进程单元测试
npm run test:unit:renderer

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e

# E2E 测试 UI 模式
npm run test:e2e:ui

# E2E 测试调试模式
npm run test:e2e:debug

# 测试覆盖率
npm run test:unit:coverage

# 监听模式
npm run test:unit:watch

# 快速测试（仅运行更改的文件）
npm run test:quick

# 并行测试（最多4进程）
npm run test:parallel

# 完整测试套件
npm run test:all
```

### 技术栈

- **框架**: Electron 31.3.1
- **语言**: TypeScript 5.3.3
- **构建工具**: electron-builder 25.1.8
- **测试框架**: Jest 29.7.0, Playwright 1.40.0
- **代码质量**: ESLint 8.56.0, Prettier 3.2.4, JSCPD 4.0.8
- **日志**: electron-log 5.4.3
- **存储**: electron-store 8.1.0
- **终端**: @xterm/xterm 6.0.0, node-pty 1.1.0-beta39
- **自动更新**: electron-updater 6.8.9
- **进程管理**: tree-kill 1.2.2, wait-on 7.0.1

## 📦 打包发布

### 打包前检查

```bash
# 运行所有检查
npm run prepackage
```

这会自动执行：
- TypeScript 编译
- 类型检查
- 代码质量检查
- 测试运行

### 打包输出

打包后的文件位于 `dist/` 目录：

```
dist/
├── ComfyUI-Desktop-2.0.9 Setup.exe    # 安装包 (~80MB)
├── ComfyUI-Desktop-2.0.9-portable.zip # 便携版 (~80MB)
└── win-unpacked/                       # 未打包的应用目录
```

### 语言支持

打包后的应用仅包含以下语言：
- 简体中文 (zh-CN)
- 繁体中文 (zh-TW)
- 英语 (en-US)

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 使用 TypeScript 严格模式
- 编写单元测试覆盖新功能
- 更新相关文档
- 确保所有测试通过
- 测试覆盖率要求：
  - 分支覆盖率 ≥ 70%
  - 函数覆盖率 ≥ 80%
  - 行覆盖率 ≥ 80%
  - 语句覆盖率 ≥ 80%

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - 强大的 Stable Diffusion 图形化界面
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [xterm.js](https://xtermjs.org/) - 终端模拟器
- [node-pty](https://github.com/microsoft/node-pty) - 伪终端绑定

## 📞 联系方式

- 项目主页: [GitHub Repository]
- 问题反馈: [GitHub Issues]
- 作者: ComfyUI Community

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star!**

Made with ❤️ by ComfyUI Community

</div>
