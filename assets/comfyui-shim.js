/**
 * ComfyUI Desktop 垫片脚本
 * 注入到所有通过代理服务器提供的 HTML 页面
 *
 * 功能：
 * 1. 拦截 fetch() 调用，将硬编码的 8188 地址重写为同源代理地址
 * 2. 拦截 WebSocket 构造，将硬编码的 ws://127.0.0.1:8188 重写为同源
 * 3. 拦截 XMLHttpRequest，同上
 * 4. 覆盖 window.electron / window.process / window.isElectron
 * 5. 确保 window.parent / window.top 指向 window（iframe 兼容）
 */
(function () {
  'use strict';

  // 获取当前页面的代理端口（从 location 推导）
  var proxyOrigin = location.origin;

  // ========== 1. fetch 拦截 ==========
  var originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

    // 重写硬编码的 ComfyUI 后端地址
    if (url.indexOf('http://127.0.0.1:') === 0 || url.indexOf('http://localhost:') === 0) {
      try {
        var parsed = new URL(url);
        // 如果目标端口不是代理端口，重写为同源
        if (parsed.port !== String(location.port)) {
          var newUrl = proxyOrigin + parsed.pathname + parsed.search + parsed.hash;
          if (typeof input === 'string') {
            input = newUrl;
          } else if (input instanceof Request) {
            input = new Request(newUrl, input);
          }
        }
      } catch (e) {
        // URL 解析失败，保持原样
      }
    }

    // 重写 file:// 协议请求（某些老旧插件可能使用）
    if (url.indexOf('file://') === 0) {
      // file:// 请求在浏览器中本身就不被支持，静默忽略
      return Promise.reject(new TypeError('file:// protocol is not supported in ComfyUI Desktop'));
    }

    return originalFetch.call(this, input, init);
  };

  // ========== 2. WebSocket 拦截 ==========
  var OriginalWebSocket = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    var wsUrl = String(url);

    // 重写硬编码的 WebSocket 地址
    if (wsUrl.indexOf('ws://127.0.0.1:') === 0 || wsUrl.indexOf('ws://localhost:') === 0) {
      try {
        var parsed = new URL(wsUrl);
        if (parsed.port !== String(location.port)) {
          wsUrl = 'ws://' + location.host + parsed.pathname + parsed.search;
        }
      } catch (e) {
        // URL 解析失败，保持原样
      }
    }

    if (protocols) {
      return new OriginalWebSocket(wsUrl, protocols);
    }
    return new OriginalWebSocket(wsUrl);
  };
  // 保留原型链
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  // ========== 3. XMLHttpRequest 拦截 ==========
  var OriginalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    var xhr = new OriginalXHR();
    var originalOpen = xhr.open;

    xhr.open = function (method, url, async, user, password) {
      var newUrl = String(url);

      if (newUrl.indexOf('http://127.0.0.1:') === 0 || newUrl.indexOf('http://localhost:') === 0) {
        try {
          var parsed = new URL(newUrl);
          if (parsed.port !== String(location.port)) {
            newUrl = proxyOrigin + parsed.pathname + parsed.search + parsed.hash;
          }
        } catch (e) {
          // URL 解析失败，保持原样
        }
      }

      return originalOpen.call(this, method, newUrl, async !== false, user, password);
    };

    return xhr;
  };
  window.XMLHttpRequest.prototype = OriginalXHR.prototype;

  // ========== 4. Electron 环境隐藏 ==========
  try {
    Object.defineProperty(window, 'electron', { get: function () { return undefined; }, set: function () {} });
  } catch (e) {}
  try {
    Object.defineProperty(window, 'process', { get: function () { return undefined; }, set: function () {} });
  } catch (e) {}
  try {
    delete window.isElectron;
  } catch (e) {}

  // ========== 5. window.parent / window.top 兼容 ==========
  try {
    if (window.parent !== window) {
      Object.defineProperty(window, 'parent', { get: function () { return window; }, set: function () {} });
    }
  } catch (e) {}
  try {
    if (window.top !== window) {
      Object.defineProperty(window, 'top', { get: function () { return window; }, set: function () {} });
    }
  } catch (e) {}

  // ========== 6. UA 覆盖（Chrome 标准浏览器 UA）==========
  try {
    var chromeVersion = navigator.userAgent.match(/Chrome\/([\d.]+)/);
    var version = (chromeVersion && chromeVersion[1]) || '130.0.0.0';
    Object.defineProperty(navigator, 'userAgent', {
      get: function () {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/' + version + ' Safari/537.36';
      }
    });
  } catch (e) {}
})();