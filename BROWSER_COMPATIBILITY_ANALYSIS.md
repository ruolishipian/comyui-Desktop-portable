# 浏览器兼容性分析报告

## 对比项目

- **当前项目**: ComfyUI 便携桌面版 (v3.0.0)
- **官方项目**: ComfyUI Electron Desktop (v0.8.14)

---

## 一、Electron 版本对比

| 项目 | Electron 版本 | Chromium 版本 | Node.js 版本 |
|------|--------------|--------------|-------------|
| 当前项目 | 28.3.3 | 120.0.6099.56 | 18.18.2 |
| 官方项目 | 31.3.1 | 126.0.6478.61 | 20.16.0 |

**差异**: 官方项目使用更新的 Electron 版本，Chromium 版本更新，支持更多现代 Web 特性。

---

## 二、webPreferences 配置对比

### 当前项目配置 (src/modules/windows.ts:135-140)

```typescript
webPreferences: {
  preload: PATHS.PRELOAD_JS,
  nodeIntegration: false,
  contextIsolation: true,
  webSecurity: false
}
```

### 官方项目配置 (src/main-process/appWindow.ts:104-111)

```typescript
webPreferences: {
  preload: path.join(__dirname, '../build/preload.cjs'),
  nodeIntegration: true,        // ⚠️ 注意：官方使用 true
  contextIsolation: true,
  webviewTag: true,             // ✅ 官方支持 webview 标签
  devTools: true                // ✅ 官方显式启用开发者工具
}
```

### 关键差异分析

| 配置项 | 当前项目 | 官方项目 | 影响 |
|--------|---------|---------|------|
| `nodeIntegration` | `false` | `true` | **重大差异** - 可能影响某些插件的 Node.js API 访问 |
| `webviewTag` | 未设置 (默认 false) | `true` | **重要** - 某些插件可能使用 webview 标签 |
| `devTools` | 未设置 (默认 true) | `true` | 开发者工具显式启用 |
| `webSecurity` | `false` | 未设置 (默认 true) | 当前项目禁用了安全策略 |

---

## 三、浏览器兼容性问题

### 1. **nodeIntegration 差异**

**问题描述**:
- 当前项目: `nodeIntegration: false` (更安全)
- 官方项目: `nodeIntegration: true` (兼容性更好)

**影响**:
某些 ComfyUI 插件可能依赖 `require()` 或其他 Node.js API，在当前项目中可能无法正常工作。

**解决方案**:
```typescript
// 方案 1: 保持 nodeIntegration: false，通过 preload 暴露必要 API
// 方案 2: 改为 nodeIntegration: true (降低安全性，但提高兼容性)
```

### 2. **webviewTag 支持**

**问题描述**:
- 当前项目: 不支持 webview 标签
- 官方项目: 支持 webview 标签

**影响**:
某些插件可能使用 `<webview>` 标签嵌入外部内容（如浏览器、预览等），在当前项目中会失败。

**解决方案**:
```typescript
webPreferences: {
  webviewTag: true  // 添加此配置
}
```

### 3. **Chromium 版本差异**

**问题描述**:
- 当前项目: Chromium 120 (2023年12月)
- 官方项目: Chromium 126 (2024年6月)

**影响**:
- 缺少 6 个月的 CSS/JS 新特性支持
- 某些现代 CSS 特性可能不支持（如 `@container`、`:has()` 选择器等）

**解决方案**:
升级 Electron 到 31.x 版本（需要测试兼容性）

### 4. **CSS 兼容性问题**

**已发现的问题**:
- WeiLin 提示词插件布局错乱
- 某些 CSS Grid/Flexbox 特性可能表现不一致

**已实施的解决方案**:
- 添加了 CSS 注入机制 (`_injectLayoutFixCSS`)
- 使用 `!important` 强制覆盖样式

---

## 四、安全性对比

### 当前项目

```typescript
webSecurity: false  // ⚠️ 禁用了同源策略
```

**风险**:
- 允许跨域请求
- 可能导致 XSS 攻击风险
- 不符合最佳安全实践

### 官方项目

```typescript
// 未设置 webSecurity，使用默认值 true
```

**优势**:
- 保持同源策略
- 更安全的沙箱环境

---

## 五、推荐的修复方案

### 方案 1: 最小改动（推荐）

```typescript
webPreferences: {
  preload: PATHS.PRELOAD_JS,
  nodeIntegration: false,      // 保持安全
  contextIsolation: true,
  webSecurity: true,           // ✅ 改为 true，提高安全性
  webviewTag: true,            // ✅ 添加 webview 支持
  devTools: true               // ✅ 显式启用开发者工具
}
```

**优点**:
- 提高安全性
- 支持 webview 标签
- 兼容性更好

**缺点**:
- 可能需要调整某些插件的跨域请求

### 方案 2: 完全对齐官方配置

```typescript
webPreferences: {
  preload: PATHS.PRELOAD_JS,
  nodeIntegration: true,       // ⚠️ 与官方一致
  contextIsolation: true,
  webviewTag: true,
  devTools: true
}
```

**优点**:
- 完全兼容官方项目
- 插件兼容性最好

**缺点**:
- 安全性降低
- 不符合 Electron 最佳实践

### 方案 3: 升级 Electron 版本

```bash
npm install electron@31.3.1
```

**优点**:
- 获得最新的 Chromium 特性
- 更好的 CSS/JS 兼容性

**缺点**:
- 需要全面测试
- 可能破坏现有功能

---

## 六、其他发现

### 1. **窗口管理差异**

**官方项目**:
- 使用自定义窗口装饰（titleBarOverlay）
- 支持深色/浅色主题切换
- 更完善的窗口状态管理

**当前项目**:
- 使用系统默认窗口装饰
- 简单的窗口状态保存

### 2. **前端架构差异**

**官方项目**:
- 使用 Vite 构建
- 有独立的前端 UI (`@comfyorg/desktop-ui`)
- 支持热重载开发

**当前项目**:
- 使用 TypeScript 编译
- 简单的 HTML 页面
- 无前端框架

### 3. **进程管理差异**

**官方项目**:
- 使用 `node-pty` 管理终端进程
- 更完善的 Python 环境管理
- 支持 uv 包管理器

**当前项目**:
- 使用 `child_process` 启动进程
- 简单的进程生命周期管理

---

## 七、优先级建议

### 高优先级（立即修复）

1. ✅ **添加 webviewTag 支持** - 影响插件兼容性
2. ✅ **启用 webSecurity** - 提高安全性
3. ✅ **显式启用 devTools** - 方便调试

### 中优先级（建议修复）

4. **考虑 nodeIntegration 设置** - 根据实际需求决定
5. **升级 Electron 版本** - 获得更好的兼容性

### 低优先级（可选）

6. **添加自定义窗口装饰** - 提升用户体验
7. **集成前端框架** - 更好的开发体验

---

## 八、测试建议

### 兼容性测试清单

- [ ] 测试所有已安装的 ComfyUI 插件
- [ ] 测试 WeiLin 提示词插件布局
- [ ] 测试跨域请求（如模型下载）
- [ ] 测试 webview 标签功能
- [ ] 测试开发者工具
- [ ] 测试窗口状态保存/恢复
- [ ] 测试进程启动/关闭

### 性能测试

- [ ] 内存占用对比
- [ ] 启动速度对比
- [ ] CPU 使用率对比

---

## 九、总结

当前项目与官方项目在浏览器兼容性方面存在以下主要差异：

1. **Electron 版本较旧** - Chromium 版本落后 6 个月
2. **缺少 webviewTag 支持** - 影响某些插件
3. **webSecurity 被禁用** - 安全风险
4. **nodeIntegration 设置不同** - 可能影响插件兼容性

**建议优先实施方案 1**，在保持安全性的同时提高兼容性。

---

生成时间: 2026-03-12
