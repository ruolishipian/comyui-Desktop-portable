/**
 * IPC Channels Mock
 * 用于测试的 IPC 通道定义
 */

export const IPC_CHANNELS = {
  // 配置相关
  GET_CONFIG: 'getConfig',
  UPDATE_CONFIG: 'updateConfig',
  RESET_CONFIG: 'resetConfig',

  // 进程控制
  START_SERVER: 'startServer',
  STOP_SERVER: 'stopServer',
  RESTART_SERVER: 'restartServer',
  GET_STATUS: 'getStatus',

  // 日志相关
  GET_SESSION_LOG: 'getSessionLog',
  LOG_UPDATE: 'logUpdate',
  CLEAR_SESSION_LOG: 'clearSessionLog',

  // 状态更新
  STATUS_UPDATE: 'statusUpdate',
  APP_CLOSING: 'appClosing',

  // 窗口控制
  OPEN_LOG_WINDOW: 'openLogWindow',
  OPEN_CONFIG_WINDOW: 'openConfigWindow',
  CLOSE_WINDOW: 'closeWindow',
  MINIMIZE_WINDOW: 'minimizeWindow',
  MAXIMIZE_WINDOW: 'maximizeWindow',

  // 外部链接
  OPEN_EXTERNAL_LINK: 'openExternalLink',

  // 文件选择
  SELECT_DIRECTORY: 'selectDirectory',
  SELECT_FILE: 'selectFile',
  SELECT_COMFYUI_PATH: 'selectComfyuiPath',
  SELECT_PYTHON_PATH: 'selectPythonPath',

  // 渲染进程就绪
  RENDERER_READY: 'rendererReady',

  // 托盘相关
  SHOW_TRAY_MENU: 'showTrayMenu',
  UPDATE_TRAY_ICON: 'updateTrayIcon',

  // 环境配置
  CHECK_ENVIRONMENT: 'checkEnvironment',
  CONFIGURE_ENVIRONMENT: 'configureEnvironment',
  GET_ENVIRONMENT_STATUS: 'getEnvironmentStatus',

  // 更新相关
  CHECK_UPDATE: 'checkUpdate',
  DOWNLOAD_UPDATE: 'downloadUpdate',
  INSTALL_UPDATE: 'installUpdate',

  // 其他
  GET_APP_VERSION: 'getAppVersion',
  GET_SYSTEM_INFO: 'getSystemInfo',
  QUIT_APP: 'quitApp'
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
