; NSIS 安装脚本 - 备份和恢复配置文件
; 此脚本在安装前备份配置文件，安装后恢复
; 修复：避免目录嵌套问题，只备份关键配置文件

!macro customHeader
  ; 定义配置文件目录
  !define CONFIG_DIR "config"
  !define CONFIG_FILE "portable-config.json"
  !define BACKUP_DIR "$TEMP\ComfyUI-Desktop-Backup"
  !define MAIN_EXE "ComfyUI-Desktop-portable.exe"
!macroend

; 安装前备份配置文件
!macro customInit
  ; 创建备份目录
  CreateDirectory "${BACKUP_DIR}"
  CreateDirectory "${BACKUP_DIR}\${CONFIG_DIR}"

  ; 只备份配置文件，不备份整个目录（避免嵌套）
  ${If} ${FileExists} "$INSTDIR\${CONFIG_DIR}\${CONFIG_FILE}"
    CopyFiles "$INSTDIR\${CONFIG_DIR}\${CONFIG_FILE}" "${BACKUP_DIR}\${CONFIG_DIR}\${CONFIG_FILE}"
    DetailPrint "已备份配置文件: ${CONFIG_FILE}"
  ${EndIf}

  ; 不再备份 logs 和 data 目录
  ; 原因：
  ; 1. logs 可以重新生成
  ; 2. data 包含大量缓存，备份会浪费空间和时间
  ; 3. 避免目录嵌套问题
!macroend

; 安装后恢复配置文件
!macro customInstall
  ; 检查主程序文件是否存在
  ${If} ${FileExists} "$INSTDIR\${MAIN_EXE}"
    DetailPrint "Main program installed: ${MAIN_EXE}"
  ${Else}
    MessageBox MB_ICONSTOP "Installation failed: Main program not found!"
    Abort
  ${EndIf}

  ; 验证图标文件是否存在
  ${If} ${FileExists} "$INSTDIR\resources\assets\icon.ico"
    DetailPrint "Icon file installed: icon.ico"
  ${Else}
    MessageBox MB_ICONEXCLAMATION "Warning: Icon file not found."
  ${EndIf}

  ; 恢复配置文件
  ${If} ${FileExists} "${BACKUP_DIR}\${CONFIG_DIR}\${CONFIG_FILE}"
    ; 确保 config 目录存在
    CreateDirectory "$INSTDIR\${CONFIG_DIR}"
    CopyFiles "${BACKUP_DIR}\${CONFIG_DIR}\${CONFIG_FILE}" "$INSTDIR\${CONFIG_DIR}\${CONFIG_FILE}"
    DetailPrint "已恢复配置文件: ${CONFIG_FILE}"
  ${EndIf}

  ; 清理可能存在的嵌套目录（修复旧版本遗留问题）
  ${If} ${FileExists} "$INSTDIR\config\config"
    DetailPrint "检测到嵌套的 config 目录，正在清理..."
    RMDir /r "$INSTDIR\config\config"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\logs\logs"
    DetailPrint "检测到嵌套的 logs 目录，正在清理..."
    RMDir /r "$INSTDIR\logs\logs"
  ${EndIf}

  ${If} ${FileExists} "$INSTDIR\data\data"
    DetailPrint "检测到嵌套的 data 目录，正在清理..."
    RMDir /r "$INSTDIR\data\data"
  ${EndIf}

  ; 修正注册表 DisplayIcon 指向应用程序 EXE 而非卸载程序图标
  ; 原因: electron-builder 的 NSIS 模板在定义 UNINSTALLER_ICON 时，
  ; 会将 DisplayIcon 指向 uninstallerIcon.ico，导致控制面板显示卸载程序图标
  WriteRegStr SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" "DisplayIcon" "$INSTDIR\${MAIN_EXE},0"

  ; 刷新 Windows 图标缓存，防止重启后图标丢失
  ; 问题: Windows 10+ 使用新的图标缓存格式 (iconcache_*.db)，
  ; 旧的 ie4uinit.exe 和删除 IconCache.db 无法清除新格式缓存，
  ; 导致安装后资源管理器中 EXE 图标显示为白板
  DetailPrint "正在刷新图标缓存..."

  ; 1. 使用 ie4uinit.exe 刷新旧格式缓存 (Windows 7 兼容)
  ExecWait 'ie4uinit.exe -show'
  ExecWait 'ie4uinit.exe -ClearLocalIconCache'

  ; 2. 删除旧格式图标缓存文件
  SetShellVarContext current
  Delete "$APPDATA\Microsoft\Windows\IconCache.db"
  Delete "$LOCALAPPDATA\Microsoft\Windows\IconCache.db"
  Delete "$LOCALAPPDATA\IconCache.db"

  ; 3. 删除 Windows 10+ 新格式图标缓存文件 (iconcache_*.db)
  ; 这些文件是资源管理器实际使用的图标缓存，不删除它们会导致白板图标
  ; 资源管理器会在下次启动时自动重建这些文件
  Delete "$LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache_*.db"
  Delete "$LOCALAPPDATA\Microsoft\Windows\Explorer\IconCache.db"

  ; 4. 通知系统图标缓存已更改 (SHChangeNotify)
  ; SHCNE_ASSOCCHANGED = 0x08000000, SHCNF_IDLIST = 0
  System::Call 'Shell32::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'

  DetailPrint "图标缓存已刷新（含 Windows 10+ 新格式缓存）"

  ; 清理备份目录
  RMDir /r "${BACKUP_DIR}"
!macroend
