/**
 * HTTP 反向代理服务器模块
 * 在 Electron 内部搭建微型 HTTP 服务，统一代理所有资源访问
 *
 * 路由结构：
 *   /                    → ComfyUI 后端（8188）反向代理
 *   /api/*               → 转发到 ComfyUI /api/*
 *   /ws                  → WebSocket 代理到 ws://127.0.0.1:8188/ws
 *   /shell/loading       → 壳子 loading 页面
 *   /shell/error         → 壳子 error 页面
 *   /shell/settings      → 壳子 settings 页面
 *   /shell/logs          → 壳子 log 页面
 *   /shell/env-select    → 壳子 env-select 页面
 *   /shell/assets/*      → 壳子静态资源（CSS、图标等）
 */

import * as fs from 'fs';
import http from 'http';
import net from 'net';
import path from 'path';
import { Duplex } from 'stream';


import { logger } from './logger';
import { getAssetsPath } from './paths';
import { isPathTraversal, safeDecodeUri, toError } from './utils';

const SHELL_ROUTES: Record<string, string> = {
  '/shell/loading': 'loading.html',
  '/shell/error': 'error.html',
  '/shell/settings': 'settings.html',
  '/shell/logs': 'log.html',
  '/shell/env-select': 'select-env.html',

  '/shell/terminal': 'terminal.html'
};

const HTML_CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return HTML_CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export class HttpProxyServer {
  private _server: http.Server | null = null;
  private _port: number = 0;
  private _comfyuiPort: number = 0;
  private _shimScript: string = '';

  public get port(): number {
    return this._port;
  }

  public get url(): string {
    return `http://127.0.0.1:${this._port}`;
  }

  public async start(comfyuiPort: number): Promise<number> {
    this._comfyuiPort = comfyuiPort;

    this._loadShimScript();

    return new Promise((resolve, reject) => {
      this._server = http.createServer((req, res) => {
        try {
          this._handleRequest(req, res);
        } catch (err) {
          const error = toError(err);
          logger.error(`HTTP 代理请求处理失败: ${error.message}`);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
          }
          res.end('Bad Gateway');
        }
      });

      this._server.on('upgrade', (req, socket, head) => {
        this._handleUpgrade(req, socket, head);
      });

      this._server.on('error', (err: Error) => {
        logger.error(`HTTP 代理服务器错误: ${err.message}`);
        reject(err);
      });

      this._server.listen(0, '127.0.0.1', () => {
        const addr = this._server?.address();
        if (addr && typeof addr === 'object') {
          this._port = addr.port;
          logger.info(`HTTP 代理服务器启动: http://127.0.0.1:${this._port}`);
          resolve(this._port);
        } else {
          reject(new Error('无法获取代理服务器端口'));
        }
      });
    });
  }

  public stop(): void {
    if (this._server) {
      this._server.close();
      this._server = null;
      logger.info('HTTP 代理服务器已关闭');
    }
  }

  public updateComfyuiPort(port: number): void {
    this._comfyuiPort = port;
    logger.info(`HTTP 代理更新 ComfyUI 端口: ${port}`);
  }

  private _loadShimScript(): void {
    try {
      const shimPath = getAssetsPath('comfyui-shim.js');
      if (fs.existsSync(shimPath)) {
        this._shimScript = fs.readFileSync(shimPath, 'utf-8');
        logger.info(`垫片脚本已加载: ${shimPath}`);
      } else {
        logger.warn(`垫片脚本不存在: ${shimPath}`);
        this._shimScript = '';
      }
    } catch (err) {
      const error = toError(err);
      logger.warn(`加载垫片脚本失败: ${error.message}`);
      this._shimScript = '';
    }
  }

  private _handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const urlPath = req.url?.split('?')[0] ?? '/';

    // 1. 壳子页面路由
    const shellFile = SHELL_ROUTES[urlPath];
    if (shellFile) {
      this._serveShellPage(shellFile, res);
      return;
    }

    // 2. 壳子静态资源
    if (urlPath.startsWith('/shell/assets/')) {
      const relativePath = safeDecodeUri(urlPath.slice('/shell/assets/'.length));
      if (isPathTraversal(relativePath)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
      this._serveStaticFile(relativePath, res);
      return;
    }

    // 3. 壳子根路径资源（CSS、图标等，兼容直接引用）
    if (urlPath.startsWith('/shell/')) {
      const relativePath = safeDecodeUri(urlPath.slice('/shell/'.length));
      if (relativePath && !isPathTraversal(relativePath)) {
        this._serveStaticFile(relativePath, res);
        return;
      }
    }

    // 4. ComfyUI 后端反向代理
    if (this._comfyuiPort > 0) {
      this._proxyToComfyUI(req, res);
      return;
    }

    // 5. ComfyUI 未启动时，返回 loading 页面
    this._serveShellPage('loading.html', res);
  }

  private _serveShellPage(filename: string, res: http.ServerResponse): void {
    try {
      const filePath = getAssetsPath(filename);
      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`File not found: ${filename}`);
        return;
      }

      let content = fs.readFileSync(filePath, 'utf-8');

      // 注入垫片脚本到 HTML 页面
      if (this._shimScript && filename.endsWith('.html')) {
        content = this._injectShim(content);
      }

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    } catch (err) {
      const error = toError(err);
      logger.error(`提供壳子页面失败 ${filename}: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  private _injectShim(html: string): string {
    const shimTag = `<script data-comfyui-shim="true">${this._shimScript}</script>`;
    const headClose = html.indexOf('</head>');
    if (headClose !== -1) {
      return html.slice(0, headClose) + shimTag + html.slice(headClose);
    }
    return shimTag + html;
  }

  private _serveStaticFile(relativePath: string, res: http.ServerResponse): void {
    if (isPathTraversal(relativePath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    try {
      const filePath = path.resolve(getAssetsPath(relativePath));
      const assetsDir = path.resolve(getAssetsPath());
      if (!filePath.startsWith(assetsDir + path.sep) && filePath !== assetsDir) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`File not found: ${relativePath}`);
        return;
      }

      const content = fs.readFileSync(filePath);
      const contentType = getContentType(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
    } catch (err) {
      const error = toError(err);
      logger.error(`提供静态文件失败 ${relativePath}: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }

  private _proxyToComfyUI(req: http.IncomingMessage, res: http.ServerResponse): void {
    const targetHost = '127.0.0.1';
    const targetPort = this._comfyuiPort;
    const targetPath = req.url ?? '/';

    const proxyHeaders: http.OutgoingHttpHeaders = { ...req.headers };
    proxyHeaders.host = `${targetHost}:${targetPort}`;
    proxyHeaders.origin = `http://${targetHost}:${targetPort}`;
    proxyHeaders.referer = `http://${targetHost}:${targetPort}/`;
    delete proxyHeaders['accept-encoding'];
    delete proxyHeaders['sec-fetch-site'];
    delete proxyHeaders['sec-fetch-mode'];
    delete proxyHeaders['sec-fetch-dest'];

    const isWebSocketUpgrade = req.headers.upgrade?.toLowerCase() === 'websocket';
    const isApiRequest = targetPath.startsWith('/api/') || targetPath.startsWith('/queue') || targetPath.startsWith('/system_stats');
    const isFileRequest = targetPath.startsWith('/view') || targetPath.startsWith('/upload/');

    // 检测插件 API 请求（路径中包含 /api/ 或以插件名开头的 API）
    const isPluginApiRequest = !isApiRequest && (
      targetPath.includes('/api/') ||  // 如：/weilin/prompt_ui/api/...
      targetPath.match(/^\/[^/]+\/[^/]+\/api\//) !== null  // 插件 API 路径模式
    );

    // 检测插件静态资源请求（可能需要加载大文件）
    const isPluginAssetRequest = !isFileRequest && (
      targetPath.includes('/extensions/') ||  // ComfyUI-Manager 扩展
      targetPath.includes('/custom_nodes/')  // 自定义节点资源
    );

    // 根据请求类型设置超时时间
    const proxyTimeout = isWebSocketUpgrade ? 120000 :      // WebSocket: 120秒
                         isFileRequest ? 300000 :           // 文件请求: 300秒（支持大文件）
                         isApiRequest ? 120000 :            // 核心 API: 120秒
                         isPluginApiRequest ? 180000 :      // 插件 API: 180秒（插件初始化慢）
                         isPluginAssetRequest ? 120000 :    // 插件资源: 120秒
                         60000;                              // 其他: 60秒（从 30秒提升）

    let aborted = false;


    const safeEndRes = (data?: string): void => {
      if (res.writableEnded) return;
      if (data && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end(data);
    };

    const cleanup = () => {
      if (aborted) return;
      aborted = true;
      proxyReq.destroy();
      safeEndRes('ComfyUI 后端不可用');
    };

    const proxyReq = http.request(
      {
        hostname: targetHost,
        port: targetPort,
        path: targetPath,
        method: req.method,
        headers: proxyHeaders,
        timeout: proxyTimeout
      },
      (proxyRes) => {

        if (aborted) {
          proxyRes.resume();
          return;
        }
        const contentType = proxyRes.headers['content-type'] ?? '';
        const contentLength = proxyRes.headers['content-length'];
        if (isFileRequest) {
          logger.info(`代理文件响应: ${targetPath} status=${proxyRes.statusCode} content-type=${contentType} content-length=${contentLength ?? 'chunked'}`);
        }
        if (contentType.includes('text/html') && this._shimScript) {
          this._proxyHtmlWithShim(proxyRes, res, () => aborted);
        } else {
          proxyRes.on('error', (err: Error) => {
            if (!aborted) {
              logger.warn(`代理响应流错误: ${err.message} path=${targetPath}`);
            }
            safeEndRes();
          });
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      }
    );

    proxyReq.on('timeout', () => {
      logger.warn(`代理请求超时(${proxyTimeout}ms): ${req.method} ${targetPath}`);
      cleanup();
    });

    proxyReq.on('error', (err: Error) => {
      if (aborted) return;
      if (err.message.includes('socket hang up') && res.headersSent) {
        safeEndRes();
        return;
      }
      logger.warn(`代理请求失败: ${err.message}`);
      cleanup();
    });

    res.on('close', () => {
      if (aborted || res.writableEnded) return;
      aborted = true;
      proxyReq.destroy();
    });

    req.pipe(proxyReq, { end: true });
  }

  private _proxyHtmlWithShim(proxyRes: http.IncomingMessage, res: http.ServerResponse, isAborted: () => boolean): void {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    let htmlEnded = false;
    const maxHtmlSize = 10 * 1024 * 1024;

    const safeEnd = (data: string, statusCode: number = 502): void => {
      if (htmlEnded || res.writableEnded) return;
      htmlEnded = true;
      if (!res.headersSent) {
        res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
      }
      res.end(data);
    };

    proxyRes.on('data', (chunk: Buffer) => {
      if (htmlEnded) return;
      totalSize += chunk.length;
      if (totalSize > maxHtmlSize) {
        logger.warn(`代理HTML响应过大(${totalSize}字节)，终止传输`);
        proxyRes.destroy();
        safeEnd('Response too large');
        return;
      }
      chunks.push(chunk);
    });
    proxyRes.on('end', () => {
      if (htmlEnded || isAborted()) return;
      htmlEnded = true;
      let html = Buffer.concat(chunks).toString('utf-8');
      html = this._injectShim(html);

      const headers = { ...proxyRes.headers };
      headers['content-length'] = String(Buffer.byteLength(html, 'utf-8'));
      delete headers['content-encoding'];
      delete headers['transfer-encoding'];

      res.writeHead(proxyRes.statusCode ?? 200, headers);
      res.end(html);
    });
    proxyRes.on('error', (err: Error) => {
      if (htmlEnded) return;
      logger.error(`代理 HTML 响应失败: ${err.message}`);
      safeEnd('Bad Gateway');
    });
  }

  private _handleUpgrade(req: http.IncomingMessage, socket: Duplex, head: Buffer): void {
    if (this._comfyuiPort <= 0) {
      socket.destroy();
      return;
    }

    const targetHost = '127.0.0.1';
    const targetPort = this._comfyuiPort;
    const targetPath = req.url ?? '/ws';

    const headers: string[] = [
      `GET ${targetPath} HTTP/1.1`,
      `Host: ${targetHost}:${targetPort}`,
      'Upgrade: websocket',
      'Connection: Upgrade'
    ];

    for (const [key, value] of Object.entries(req.headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'host' || lowerKey === 'connection' || lowerKey === 'upgrade' || lowerKey === 'origin') {
        continue;
      }
      if (Array.isArray(value)) {
        for (const v of value) {
          headers.push(`${key}: ${v}`);
        }
      } else if (value) {
        headers.push(`${key}: ${value}`);
      }
    }

    headers.push(`Origin: http://${targetHost}:${targetPort}`);
    headers.push('', '');

    const targetSocket = net.createConnection(targetPort, targetHost, () => {
      targetSocket.write(headers.join('\r\n'));

      if (head.length > 0) {
        targetSocket.write(head);
      }
    });

    targetSocket.on('data', (chunk: Buffer) => {
      socket.write(chunk);
    });

    socket.on('data', (chunk: Buffer) => {
      targetSocket.write(chunk);
    });

    targetSocket.on('error', (err: Error) => {
      if (err.message.includes('ECONNRESET') || err.message.includes('EPIPE') || err.message.includes('ETIMEDOUT')) {
        return;
      }
      logger.warn(`WebSocket 代理目标连接错误: ${err.message}`);
      socket.destroy();
    });

    socket.on('error', (err: Error) => {
      if (err.message.includes('ECONNRESET') || err.message.includes('EPIPE')) {
        return;
      }
      logger.warn(`WebSocket 代理客户端连接错误: ${err.message}`);
      targetSocket.destroy();
    });

    targetSocket.on('close', () => {
      socket.destroy();
    });

    socket.on('close', () => {
      targetSocket.destroy();
    });
  }
}


export const httpProxyServer = new HttpProxyServer();
