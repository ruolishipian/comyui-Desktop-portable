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
import path from 'path';
import { Duplex } from 'stream';


import { logger } from './logger';
import { getAssetsPath } from './paths';

const SHELL_ROUTES: Record<string, string> = {
  '/shell/loading': 'loading.html',
  '/shell/error': 'error.html',
  '/shell/settings': 'settings.html',
  '/shell/logs': 'log.html',
  '/shell/env-select': 'select-env.html'
};

const HTML_CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
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
          const error = err as Error;
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
      const error = err as Error;
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
      const relativePath = urlPath.slice('/shell/assets/'.length);
      this._serveStaticFile(relativePath, res);
      return;
    }

    // 3. 壳子根路径资源（CSS、图标等，兼容直接引用）
    if (urlPath.startsWith('/shell/')) {
      const relativePath = urlPath.slice('/shell/'.length);
      if (relativePath && !relativePath.includes('..')) {
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
      const error = err as Error;
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
    if (relativePath.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    try {
      const filePath = getAssetsPath(relativePath);
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
      const error = err as Error;
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

    const proxyReq = http.request(
      {
        hostname: targetHost,
        port: targetPort,
        path: targetPath,
        method: req.method,
        headers: proxyHeaders
      },
      (proxyRes) => {
        // 对 HTML 响应注入垫片脚本
        const contentType = proxyRes.headers['content-type'] ?? '';
        if (contentType.includes('text/html') && this._shimScript) {
          this._proxyHtmlWithShim(proxyRes, res);
        } else {
          res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      }
    );

    proxyReq.on('error', (err: Error) => {
      logger.warn(`代理请求失败: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('ComfyUI 后端不可用');
    });

    req.pipe(proxyReq, { end: true });
  }

  private _proxyHtmlWithShim(proxyRes: http.IncomingMessage, res: http.ServerResponse): void {
    const chunks: Buffer[] = [];
    proxyRes.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    proxyRes.on('end', () => {
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
      logger.error(`代理 HTML 响应失败: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end('Bad Gateway');
    });
  }

  private _handleUpgrade(req: http.IncomingMessage, socket: Duplex, _head: Buffer): void {
    if (this._comfyuiPort <= 0) {
      socket.destroy();
      return;
    }

    const targetHost = '127.0.0.1';
    const targetPort = this._comfyuiPort;

    const proxyReq = http.request(
      {
        hostname: targetHost,
        port: targetPort,
        path: req.url ?? '/ws',
        method: 'GET',
        headers: {
          ...req.headers,
          host: `${targetHost}:${targetPort}`,
          origin: `http://${targetHost}:${targetPort}`,
          upgrade: 'websocket',
          connection: 'Upgrade'
        }
      }
    );

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Accept: ' + (proxyRes.headers['sec-websocket-accept'] ?? '') + '\r\n' +
        '\r\n'
      );

      if (proxyHead.length > 0) {
        socket.write(proxyHead);
      }

      proxySocket.pipe(socket, { end: true });
      socket.pipe(proxySocket, { end: true });

      proxySocket.on('error', () => {
        socket.destroy();
      });
      socket.on('error', () => {
        proxySocket.destroy();
      });
    });

    proxyReq.on('error', (err: Error) => {
      logger.warn(`WebSocket 代理失败: ${err.message}`);
      socket.destroy();
    });

    proxyReq.end();
  }
}


export const httpProxyServer = new HttpProxyServer();
