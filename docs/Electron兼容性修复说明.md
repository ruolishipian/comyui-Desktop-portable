# Electron 兼容性修复说明

## 问题描述

在 Electron 启动器中使用 WeiLin-Comfyui-Tools 插件时，出现以下问题：

1. **点击 Lora 卡片显示预览而非添加** - 在浏览器中点击卡片会添加 Lora，但在 Electron 中会打开预览
2. **Lora 管理界面添加时一闪而逝** - 通过加号打开的 Lora 管理界面添加 Lora 时，Lora 会一闪而逝，需要多次点击才能成功
3. **预览图字体太小** - Lora 信息预览卡片的字体非常小（0.55em），难以阅读

## 问题根源分析

### 1. 消息传递问题

WeiLin 插件使用 `window.postMessage` 和 `window.parent.postMessage` 进行组件间通信：

```javascript
// 发送消息
window.postMessage({ type: 'weilin_prompt_ui_openLoraManager_addLora_stack', seed }, '*')

// 接收消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'weilin_prompt_ui_selectLora_stack_${seed}') {
    addLora(event.data.lora)
  }
})
```

在 Electron 中，由于 `contextIsolation` 和安全策略的影响，`window.parent.postMessage` 的消息可能无法正确传递到当前窗口的消息监听器。

### 2. 点击行为差异

插件的 Lora 卡片点击行为由 `openLoraDetail` 函数决定：

```javascript
const openLoraDetail = (loraData) => {
  if (props.loraManager === 'addLora') {
    selectLora(loraData)  // 添加模式
  } else if (props.loraManager === 'prompt_inner' && clickAddTag.value) {
    addLoraTag(loraData)  // 内嵌模式 + 点击添加Tag
  } else {
    loraDetailRef.value.open(loraData)  // 预览模式
  }
}
```

内嵌的 Lora 管理器使用 `loraManager='prompt_inner'`，点击行为取决于 `clickAddTag` 的值：
- `clickAddTag === true` → 点击添加
- `clickAddTag === false` → 点击查看预览

### 3. 字体大小问题

预览卡片组件使用了 `style="font-size: 0.55em"`，导致字体非常小。

## 修复方案

### 1. 修改 Electron 窗口配置

**文件**: `src/modules/windows.ts`

```typescript
webPreferences: {
  preload: PATHS.PRELOAD_JS,
  nodeIntegration: false,      // 禁用 Node 集成
  contextIsolation: true,      // 开启上下文隔离（preload 需要）
  sandbox: false,              // 关闭沙箱，让 Vue/React 事件正常传递
  webSecurity: false,          // 关闭 Web 安全策略，让跨域资源正常加载
  allowRunningInsecureContent: false,
  webviewTag: true,
  devTools: true
}
```

### 2. 注入 JavaScript 修复代码

**文件**: `src/modules/windows.ts` - `did-finish-load` 事件处理

```javascript
// 1. 覆盖 Electron 环境检测
window.electron = undefined;
window.process = undefined;
window.isElectron = () => false;

// 2. 强制使用 Chrome 用户代理
Object.defineProperty(navigator, 'userAgent', {
  get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
});

// 3. 重写 window.postMessage 进行监控
const originalPostMessage = window.postMessage;
window.postMessage = function(message, targetOrigin, transfer) {
  if (message && message.type && message.type.startsWith('weilin_prompt_ui_')) {
    console.log('[Electron Debug] window.postMessage called:', message.type, message);
  }
  return originalPostMessage.call(this, message, targetOrigin, transfer);
};

// 4. 重写 window.parent.postMessage，确保消息能被当前窗口接收
const parentPostMessage = window.parent.postMessage;
window.parent.postMessage = function(message, targetOrigin, transfer) {
  if (message && message.type && message.type.startsWith('weilin_prompt_ui_')) {
    console.log('[Electron Debug] window.parent.postMessage called:', message.type, message);
    // 直接在当前窗口触发消息事件
    const event = new MessageEvent('message', {
      data: message,
      origin: targetOrigin,
      source: window
    });
    window.dispatchEvent(event);
    return;
  }
  return parentPostMessage.call(this, message, targetOrigin, transfer);
};

// 5. 确保 window.parent 和 window.top 指向 window
Object.defineProperty(window, 'parent', { get: () => window, set: () => {} });
Object.defineProperty(window, 'top', { get: () => window, set: () => {} });
```

### 3. 注入 CSS 修复样式

```css
/* 修复 Lora/模型管理面板的字体与布局 */
.lora-manager, .lora-card, .lora-info-panel, .model-card, .model-info-panel,
[class*="lora-card"], [class*="model-card"], [class*="info-panel"] {
  font-size: 14px !important;
  box-sizing: border-box !important;
}

/* 修复预览卡片字体太小的问题 - 覆盖 0.55em */
.lora_catd_content, .lora-detail__content, .lora-detail__body,
.lora-detail__title, .lora-detail__table, .lora-detail__tags {
  font-size: 14px !important;
}

/* 确保预览图容器充满，避免文字溢出 */
.lora-preview-container, .preview-image-wrapper, .model-preview-container,
[class*="preview-container"], [class*="preview-wrapper"] {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 修复弹窗遮罩层 */
.modal-backdrop, .el-dialog__wrapper, [class*="modal"], [class*="dialog"] {
  background: rgba(0,0,0,0.7) !important;
  z-index: 99999 !important;
}
```

### 4. 修改新窗口处理策略

**文件**: `src/modules/windows.ts`

```typescript
win.webContents.setWindowOpenHandler(({ url }) => {
  // 如果是外部链接（http/https），用系统浏览器打开
  if (url.startsWith('http://') || url.startsWith('https://')) {
    import('electron').then(({ shell }) => {
      shell.openExternal(url).catch(() => {});
    });
    return { action: 'deny' };
  }
  // 其他情况，让页面自己处理
  return { action: 'allow' };
});
```

### 5. 修改主进程配置

**文件**: `src/main.ts`

```typescript
// 禁用 Electron 所有非 Chrome 原生行为
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
app.commandLine.appendSwitch('enable-experimental-web-platform-features', 'false');
app.commandLine.appendSwitch('disable-electron-zoom-controls');
```

## 使用说明

### 点击添加 Lora

内嵌的 Lora 管理器默认点击卡片会打开预览。要启用点击添加功能：

1. 打开 Lora 管理器
2. 找到并勾选"点击添加Tag"复选框
3. 之后点击卡片就会直接添加 Lora 而不是打开预览

### 调试信息

打开开发者工具（F12）可以在 Console 中看到以下调试信息：

- `[Electron Fix] WeiLin plugin fixes loaded` - 修复代码已加载
- `[Electron Debug] window.postMessage called:` - postMessage 调用监控
- `[Electron Debug] window.parent.postMessage called:` - parent.postMessage 调用监控
- `[Electron Debug] clickAddTag value from localStorage:` - clickAddTag 设置值

## 技术要点

1. **contextIsolation: true** - 必须开启，因为 preload 脚本使用 `contextBridge.exposeInMainWorld`
2. **sandbox: false** - 关闭沙箱让 Vue/React 事件能正常传递
3. **webSecurity: false** - 关闭 Web 安全策略让跨域资源正常加载
4. **重写 postMessage** - 确保 `window.parent.postMessage` 的消息能被当前窗口接收
5. **CSS 注入** - 覆盖插件的默认样式，修复字体大小问题

## 修改的文件

1. `src/main.ts` - 主进程配置
2. `src/modules/windows.ts` - 窗口管理和 JavaScript/CSS 注入
3. `assets/comfyui-ui-fix.css` - 外部 CSS 修复文件（可选）

## 版本信息

- 修复日期: 2026-03-19
- Electron 版本: ^31.3.1
- 插件: WeiLin-Comfyui-Tools
