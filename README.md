# ComfyUI 便携桌面版

模块化架构的 ComfyUI 便携桌面版， 参考复刻官方功能。

第一次安装完成需要手动设置环境变量和启动参数，
环境变量
PYTHONIOENCODING=utf-8
PYTHONUTF8=1


启动参数设置通过右键进入
--lowvram --use-sage-attention

## 架构设计

### 模块化结构

```
electron/
├── main.js                    # 主入口（精简版）
├── preload.js                 # 预加载脚本
├── package.json               # 包配置
├── src/
│   └── modules/               # 核心模块
│       ├── index.js           # 模块索引
│       ├── state.js           # 状态管理
│       ├── config.js          # 配置管理
│       ├── logger.js          # 日志管理
│       ├── environment.js     # 环境检查
│       ├── process.js         # 进程管理
│       ├── windows.js         # 窗口管理
│       ├── tray.js            # 托盘管理
│       └── ipc.js             # IPC 通信
├── assets/                    # 静态资源
│   ├── loading.html
│   ├── error.html
│   ├── select-env.html
│   ├── log.html
│   └── settings.html
├── config/                    # 配置目录
├── logs/                      # 日志目录
└── scripts/                   # 脚本
    └── quality-check.js
```

### 模块说明

| 模块 | 职责 | 单例导出 |
|------|------|----------|
| `state.js` | 应用状态管理，状态变更通知 | `stateManager` |
| `config.js` | 配置读写，默认值管理 | `configManager` |
| `logger.js` | 日志记录，轮转，清理 | `logger` |
| `environment.js` | 启动前环境检查 | `environmentChecker` |
| `process.js` | ComfyUI 进程生命周期 | `processManager` |
| `windows.js` | 所有窗口创建和管理 | `windowManager` |
| `tray.js` | 系统托盘管理 | `trayManager` |
| `ipc.js` | 主进程与渲染进程通信 | `ipcManager` |

### 模块依赖关系

```
main.js
    │
    ├── configManager (配置)
    │       └── Store (electron-store)
    │
    ├── logger (日志)
    │       └── configManager
    │
    ├── stateManager (状态)
    │       └── 无依赖
    │
    ├── processManager (进程)
    │       ├── configManager
    │       ├── stateManager
    │       ├── environmentChecker
    │       └── logger
    │
    ├── windowManager (窗口)
    │       ├── configManager
    │       ├── stateManager
    │       ├── processManager (延迟加载)
    │       └── logger
    │
    ├── trayManager (托盘)
    │       ├── configManager
    │       ├── stateManager
    │       ├── windowManager
    │       └── processManager
    │
    └── ipcManager (通信)
            ├── configManager
            ├── stateManager
            ├── logger
            ├── windowManager
            ├── processManager
            └── trayManager
```

## 设计优势

### 1. 单一职责
每个模块只负责一个功能领域，修改时只需关注对应模块。

### 2. 依赖注入
模块间通过 `setDependencies()` 注入依赖，避免循环引用。

### 3. 单例模式
所有管理器都是单例，确保全局唯一实例。

### 4. 事件驱动
状态变更通过监听器模式通知，解耦模块间通信。

### 5. 统一导出
`index.js` 统一导出所有模块，便于引用和管理。

## 快速开始

### 安装依赖

```bash
cd electron
npm install
```

### 运行开发模式

```bash
npm start
```

### 打包应用

```bash
npm run package
```

### 质量检查

```bash
npm run quality-check
```

## 扩展指南

### 添加新功能

1. 在 `src/modules/` 创建新模块
2. 在 `index.js` 中导出
3. 在 `main.js` 中初始化和设置依赖

### 添加新窗口

1. 在 `assets/` 创建 HTML 文件
2. 在 `windows.js` 添加创建方法
3. 在 `ipc.js` 添加通信接口（如需要）

### 添加新配置项

1. 在 `config.js` 的 `DEFAULT_CONFIG` 添加默认值
2. 在 `settings.html` 添加 UI 控件
3. 在需要的地方通过 `configManager.get()` 读取

## 图标文件

请自行准备以下图标文件并放入 `assets/` 目录：

- `icon.ico` - 应用主图标（建议 256x256）
- `tray.ico` - 系统托盘图标（建议 32x32）

## 许可证

MIT License
