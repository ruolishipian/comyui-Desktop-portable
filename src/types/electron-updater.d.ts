declare module 'electron-updater' {
  import { EventEmitter } from 'events';

  interface UpdateInfo {
    version: string;
    releaseDate?: string;
    releaseName?: string;
    releaseNotes?: string | Array<{ version?: string; note?: string }>;
    files?: Array<{ url?: string; sha512?: string; size?: number }>;
    path?: string;
    sha512?: string;
    downloadedFile?: string;
  }

  interface ProgressInfo {
    total: number;
    delta: number;
    transferred: number;
    percent: number;
    bytesPerSecond: number;
  }

  interface AppUpdater extends EventEmitter {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    setFeedURL(url: { provider: string; owner: string; repo: string }): void;
    checkForUpdates(): Promise<null | { updateInfo: UpdateInfo; downloadPromise: Promise<Array<string>> }>;
    downloadUpdate(): Promise<Array<string>>;
    quitAndInstall(): void;
    on(event: 'checking-for-update', listener: () => void): this;
    on(event: 'update-available', listener: (info: UpdateInfo) => void): this;
    on(event: 'update-not-available', listener: (info: UpdateInfo) => void): this;
    on(event: 'download-progress', listener: (info: ProgressInfo) => void): this;
    on(event: 'update-downloaded', listener: (info: UpdateInfo) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
  }

  export const autoUpdater: AppUpdater;
  export type { UpdateInfo, ProgressInfo, AppUpdater };
}