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

  ; 刷新 Windows 图标缓存，防止重启后图标丢失
  DetailPrint "正在刷新图标缓存..."
  ExecWait 'ie4uinit.exe -show'
  ExecWait 'ie4uinit.exe -ClearLocalIconCache'
  ; 强制刷新系统图标缓存
  SetShellVarContext current
  Delete "$APPDATA\Microsoft\Windows\IconCache.db"
  Delete "$LOCALAPPDATA\Microsoft\Windows\IconCache.db"
  Delete "$LOCALAPPDATA\IconCache.db"
  DetailPrint "图标缓存已刷新"

  ; 清理备份目录
  RMDir /r "${BACKUP_DIR}"
!macroend
