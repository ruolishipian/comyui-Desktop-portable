/**
 * 代理管理模块
 * 自动检测和同步系统代理设置
 */

import { exec } from 'child_process';
import { promisify } from 'util';

// 在测试环境中使用空函数
const execAsync = process.env.NODE_ENV === 'test' ? () => Promise.resolve({ stdout: '', stderr: '' }) : promisify(exec);

// 代理配置接口
export interface ProxyConfig {
  httpProxy?: string;
  httpsProxy?: string;
  noProxy?: string;
  enabled: boolean;
}

// 代理管理器
export class ProxyManager {
  private _proxyConfig: ProxyConfig = { enabled: false };

  /**
   * 获取当前代理配置
   */
  public getProxyConfig(): ProxyConfig {
    return this._proxyConfig;
  }

  /**
   * 检测系统代理设置
   */
  public async detectSystemProxy(): Promise<ProxyConfig> {
    try {
      if (process.platform === 'win32') {
        return await this._detectWindowsProxy();
      } else if (process.platform === 'darwin') {
        return await this._detectMacProxy();
      } else if (process.platform === 'linux') {
        return this._detectLinuxProxy();
      }

      logger.info('当前平台不支持自动代理检测');
      return { enabled: false };
    } catch (err) {
      const error = err as Error;
      logger.error(`检测系统代理失败: ${error.message}`);
      return { enabled: false };
    }
  }

  /**
   * 检测 Windows 系统代理
   */
  private async _detectWindowsProxy(): Promise<ProxyConfig> {
    try {
      // 使用 netsh 命令查询系统代理设置
      const { stdout } = await execAsync('netsh winhttp show proxy');

      // 解析输出
      const lines = stdout.split('\n');
      let proxyServer = '';
      let bypassList = '';
      let proxyEnabled = false;

      for (const line of lines) {
        const trimmedLine = line.trim();

        // 检查是否启用了代理
        if (trimmedLine.includes('代理服务器') || trimmedLine.includes('Proxy Server(s)')) {
          const match = trimmedLine.match(/[:：]\s*(.+)/);
          if (match?.[1]) {
            proxyServer = match[1].trim();
            proxyEnabled = proxyServer !== '无' && proxyServer !== 'none' && proxyServer !== '';
          }
        }

        // 检查绕过列表
        if (trimmedLine.includes('绕过列表') || trimmedLine.includes('Bypass List')) {
          const match = trimmedLine.match(/[:：]\s*(.+)/);
          if (match?.[1]) {
            bypassList = match[1].trim();
          }
        }
      }

      // 如果检测到代理服务器,设置环境变量
      if (proxyEnabled && proxyServer) {
        // 解析代理服务器地址
        // 格式可能是: "http=127.0.0.1:7890;https=127.0.0.1:7890" 或 "127.0.0.1:7890"
        let httpProxy = '';
        let httpsProxy = '';

        if (proxyServer.includes('=')) {
          // 格式: "http=xxx;https=xxx"
          const parts = proxyServer.split(';');
          for (const part of parts) {
            const [protocol, address] = part.split('=');
            if (protocol && address) {
              if (protocol.trim().toLowerCase() === 'http') {
                httpProxy = address.trim();
              } else if (protocol.trim().toLowerCase() === 'https') {
                httpsProxy = address.trim();
              }
            }
          }
        } else {
          // 统一代理地址
          httpProxy = proxyServer;
          httpsProxy = proxyServer;
        }

        // 添加协议前缀(如果没有)
        if (httpProxy && !httpProxy.startsWith('http://')) {
          httpProxy = `http://${httpProxy}`;
        }
        if (httpsProxy && !httpsProxy.startsWith('http://')) {
          httpsProxy = `http://${httpsProxy}`;
        }

        this._proxyConfig = {
          httpProxy,
          httpsProxy,
          noProxy: bypassList || undefined,
          enabled: true
        };

        logger.info(`检测到 Windows 系统代理: HTTP=${httpProxy}, HTTPS=${httpsProxy}`);
        return this._proxyConfig;
      }

      logger.info('未检测到 Windows 系统代理');
      return { enabled: false };
    } catch (err) {
      const error = err as Error;
      logger.error(`检测 Windows 代理失败: ${error.message}`);
      return { enabled: false };
    }
  }

  /**
   * 检测 macOS 系统代理
   */
  private async _detectMacProxy(): Promise<ProxyConfig> {
    try {
      // 使用 networksetup 命令查询系统代理设置
      const { stdout: httpProxy } = await execAsync('networksetup -getwebproxy Wi-Fi');
      const { stdout: httpsProxy } = await execAsync('networksetup -getsecurewebproxy Wi-Fi');

      const parseProxy = (output: string): { enabled: boolean; server: string; port: string } => {
        const lines = output.split('\n');
        let enabled = false;
        let server = '';
        let port = '';

        for (const line of lines) {
          if (line.includes('Enabled: Yes')) {
            enabled = true;
          }
          if (line.includes('Server:')) {
            const match = line.match(/Server:\s*(.+)/);
            if (match?.[1]) server = match[1].trim();
          }
          if (line.includes('Port:')) {
            const match = line.match(/Port:\s*(.+)/);
            if (match?.[1]) port = match[1].trim();
          }
        }

        return { enabled, server, port };
      };

      const http = parseProxy(httpProxy);
      const https = parseProxy(httpsProxy);

      if (http.enabled || https.enabled) {
        this._proxyConfig = {
          httpProxy: http.enabled && http.server && http.port ? `http://${http.server}:${http.port}` : undefined,
          httpsProxy: https.enabled && https.server && https.port ? `http://${https.server}:${https.port}` : undefined,
          enabled: true
        };

        logger.info(
          `检测到 macOS 系统代理: HTTP=${this._proxyConfig.httpProxy}, HTTPS=${this._proxyConfig.httpsProxy}`
        );
        return this._proxyConfig;
      }

      logger.info('未检测到 macOS 系统代理');
      return { enabled: false };
    } catch (err) {
      const error = err as Error;
      logger.error(`检测 macOS 代理失败: ${error.message}`);
      return { enabled: false };
    }
  }

  /**
   * 检测 Linux 系统代理
   */
  private _detectLinuxProxy(): ProxyConfig {
    try {
      // Linux 通常通过环境变量设置代理
      const httpProxy = process.env.HTTP_PROXY ?? process.env.http_proxy;
      const httpsProxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
      const noProxy = process.env.NO_PROXY ?? process.env.no_proxy;

      if (httpProxy ?? httpsProxy) {
        this._proxyConfig = {
          httpProxy,
          httpsProxy,
          noProxy,
          enabled: true
        };

        logger.info(`检测到 Linux 系统代理: HTTP=${httpProxy}, HTTPS=${httpsProxy}`);
        return this._proxyConfig;
      }

      logger.info('未检测到 Linux 系统代理');
      return { enabled: false };
    } catch (err) {
      const error = err as Error;
      logger.error(`检测 Linux 代理失败: ${error.message}`);
      return { enabled: false };
    }
  }

  /**
   * 应用代理设置到环境变量
   */
  public applyProxyToEnv(env: Record<string, string>): Record<string, string> {
    if (!this._proxyConfig.enabled) {
      return env;
    }

    if (this._proxyConfig.httpProxy) {
      env.HTTP_PROXY = this._proxyConfig.httpProxy;
      env.http_proxy = this._proxyConfig.httpProxy;
      logger.info(`应用 HTTP 代理: ${this._proxyConfig.httpProxy}`);
    }

    if (this._proxyConfig.httpsProxy) {
      env.HTTPS_PROXY = this._proxyConfig.httpsProxy;
      env.https_proxy = this._proxyConfig.httpsProxy;
      logger.info(`应用 HTTPS 代理: ${this._proxyConfig.httpsProxy}`);
    }

    if (this._proxyConfig.noProxy) {
      env.NO_PROXY = this._proxyConfig.noProxy;
      env.no_proxy = this._proxyConfig.noProxy;
      logger.info(`应用代理绕过列表: ${this._proxyConfig.noProxy}`);
    }

    return env;
  }

  /**
   * 初始化代理检测
   */
  public async init(): Promise<void> {
    logger.info('开始检测系统代理设置...');
    await this.detectSystemProxy();
  }
}

// 导出单例
export const proxyManager = new ProxyManager();

// 导入 logger(避免循环依赖)
import { logger } from './logger';
