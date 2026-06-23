/**
 * 多视图架构模块
 * 基于 WebContentsView，将标题栏、ComfyUI 页面、设置面板组合在一个 BrowserWindow 内
 *
 * 架构：
 *   BrowserWindow (titleBarStyle: 'hidden')
 *   ├── titleBarView   (固定高度 32px，自定义标题栏)
 *   ├── comfyView      (ComfyUI 前端页面 或 loading/error)
 *   └── panelView      (懒加载，Settings/Logs 等面板侧边栏)
 *
 * 注意：WebContentsView 在 Electron 31+ 可用
 * 此模块为渐进式迁移准备，当前作为可选增强
 */

import { BrowserWindow, WebContentsView } from 'electron';

import { httpProxyServer } from './http-proxy';
import { logger } from './logger';

const TITLEBAR_HEIGHT = 32;
const PANEL_WIDTH = 380;

export type PanelKind = 'settings' | 'logs' | 'none';

export interface HostWindowEntry {
  window: BrowserWindow;
  titleBarView: WebContentsView;
  comfyView: WebContentsView;
  panelView: WebContentsView | null;
  activePanel: PanelKind;
  comfyUrl: string;
}

export class MultiViewManager {
  private _entries: Map<number, HostWindowEntry> = new Map();

  public createHostWindow(): HostWindowEntry {
    const window = new BrowserWindow({
      width: 1280,
      height: 720,
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        height: TITLEBAR_HEIGHT,
        color: '#1a1a2e',
        symbolColor: '#e0e0e0'
      },
      show: false,
      autoHideMenuBar: true
    });

    const titleBarView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        partition: 'persist:comfyui-shell'
      }
    });
    void titleBarView.webContents.loadURL(`${httpProxyServer.url}/shell/titlebar`);

    const comfyView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: true,
        partition: 'persist:comfyui-main'
      }
    });
    void comfyView.webContents.loadURL(`${httpProxyServer.url}/shell/loading`);

    window.contentView.addChildView(titleBarView);
    window.contentView.addChildView(comfyView);

    const entry: HostWindowEntry = {
      window,
      titleBarView,
      comfyView,
      panelView: null,
      activePanel: 'none',
      comfyUrl: ''
    };

    this._entries.set(window.id, entry);
    this._layoutViews(entry);

    window.on('resize', () => {
      this._layoutViews(entry);
    });

    window.on('ready-to-show', () => {
      window.show();
    });

    logger.info(`多视图窗口已创建: id=${window.id}`);
    return entry;
  }

  public loadComfyView(entry: HostWindowEntry, url: string): void {
    entry.comfyUrl = url;
    void entry.comfyView.webContents.loadURL(url);
  }

  public showPanel(entry: HostWindowEntry, kind: PanelKind): void {
    if (entry.activePanel === kind && entry.panelView) return;

    this._removePanelView(entry);

    if (kind === 'none') {
      entry.activePanel = 'none';
      this._layoutViews(entry);
      return;
    }

    const panelView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        partition: 'persist:comfyui-shell'
      }
    });

    const route = kind === 'settings' ? '/shell/settings' : '/shell/logs';
    void panelView.webContents.loadURL(`${httpProxyServer.url}${route}`);

    entry.window.contentView.addChildView(panelView);
    entry.panelView = panelView;
    entry.activePanel = kind;
    this._layoutViews(entry);
  }

  public togglePanel(entry: HostWindowEntry, kind: PanelKind): void {
    if (entry.activePanel === kind) {
      this.showPanel(entry, 'none');
    } else {
      this.showPanel(entry, kind);
    }
  }

  private _removePanelView(entry: HostWindowEntry): void {
    if (entry.panelView) {
      entry.window.contentView.removeChildView(entry.panelView);
      entry.panelView.webContents.close();
      entry.panelView = null;
    }
  }

  private _layoutViews(entry: HostWindowEntry): void {
    const size = entry.window.getContentSize();
    const width = size[0] ?? 0;
    const height = size[1] ?? 0;
    const bodyHeight = Math.max(0, height - TITLEBAR_HEIGHT);

    entry.titleBarView.setBounds({ x: 0, y: 0, width, height: TITLEBAR_HEIGHT });

    if (entry.panelView && entry.activePanel !== 'none') {
      const comfyWidth = Math.max(0, width - PANEL_WIDTH);
      entry.comfyView.setBounds({ x: 0, y: TITLEBAR_HEIGHT, width: comfyWidth, height: bodyHeight });
      entry.panelView.setBounds({ x: comfyWidth, y: TITLEBAR_HEIGHT, width: PANEL_WIDTH, height: bodyHeight });
    } else {
      entry.comfyView.setBounds({ x: 0, y: TITLEBAR_HEIGHT, width, height: bodyHeight });
    }
  }

  public getEntry(windowId: number): HostWindowEntry | undefined {
    return this._entries.get(windowId);
  }

  public destroyEntry(windowId: number): void {
    const entry = this._entries.get(windowId);
    if (entry) {
      this._removePanelView(entry);
      entry.comfyView.webContents.close();
      entry.titleBarView.webContents.close();
      this._entries.delete(windowId);
    }
  }
}

export const multiViewManager = new MultiViewManager();
