/**
 * 嵌入式终端模块
 * 基于 node-pty + xterm.js，在 Electron 内提供完整终端体验
 *
 * 用途：
 * - 查看 ComfyUI 实时输出
 * - 直接执行 pip install 等命令
 * - 调试插件问题
 */

import { BrowserWindow } from 'electron';
import { IPty, spawn } from 'node-pty';

import { configManager } from './config';
import { httpProxyServer } from './http-proxy';
import { logger } from './logger';
import { PATHS } from './paths';

interface TerminalSession {
  pty: IPty;
  windowId: number;
}

export class TerminalManager {
  private _sessions: Map<number, TerminalSession> = new Map();


  public createTerminalWindow(): BrowserWindow | null {
    const mainWindow = BrowserWindow.getFocusedWindow();

    const win = new BrowserWindow({
      width: 900,
      height: 600,
      parent: mainWindow ?? undefined,
      modal: false,
      show: false,
      autoHideMenuBar: true,
      title: 'ComfyUI 终端',
      webPreferences: {
        preload: PATHS.PRELOAD_JS,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        partition: 'persist:comfyui-shell'
      }
    });

    void win.loadURL(`${httpProxyServer.url}/shell/terminal`);
    win.on('ready-to-show', () => win.show());

    win.on('closed', () => {
      this._cleanupSession(win.id);
    });

    return win;
  }

  public createPtySession(windowId: number, cols: number, rows: number): number | null {
    try {
      const comfyuiPath = configManager.get('comfyuiPath') ?? '';
      const pythonPath = configManager.get('pythonPath') ?? 'python';

      const cwd = comfyuiPath || process.cwd();

      const pty = spawn(pythonPath, [], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd,
        env: { ...process.env } as Record<string, string>
      });

      const sessionId = pty.pid;
      this._sessions.set(sessionId, { pty: pty as unknown as IPty, windowId });

      logger.info(`终端会话已创建: pid=${sessionId}, cwd=${cwd}`);

      pty.on('data', (data: string) => {
        const win = BrowserWindow.fromId(windowId);
        if (win && !win.isDestroyed()) {
          win.webContents.send('terminal:data', sessionId, data);
        }
      });

      pty.on('exit', ({ exitCode }: { exitCode: number }) => {
        logger.info(`终端会话退出: pid=${sessionId}, code=${exitCode}`);
        const win = BrowserWindow.fromId(windowId);
        if (win && !win.isDestroyed()) {
          win.webContents.send('terminal:exit', sessionId, exitCode);
        }
        this._sessions.delete(sessionId);
      });

      return sessionId;
    } catch (err) {
      const error = err as Error;
      logger.error(`创建终端会话失败: ${error.message}`);
      return null;
    }
  }

  public writeData(sessionId: number, data: string): void {
    const session = this._sessions.get(sessionId);
    if (session) {
      session.pty.write(data);
    }
  }

  public resizeSession(sessionId: number, cols: number, rows: number): void {
    const session = this._sessions.get(sessionId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  public killSession(sessionId: number): void {
    const session = this._sessions.get(sessionId);
    if (session) {
      session.pty.kill();
      this._sessions.delete(sessionId);
      logger.info(`终端会话已终止: pid=${sessionId}`);
    }
  }

  private _cleanupSession(windowId: number): void {
    for (const [pid, session] of this._sessions) {
      if (session.windowId === windowId) {
        session.pty.kill();
        this._sessions.delete(pid);
      }
    }
  }

  public destroy(): void {
    for (const [, session] of this._sessions) {
      session.pty.kill();
    }
    this._sessions.clear();
    logger.info('终端管理器已销毁');
  }
}

export const terminalManager = new TerminalManager();
