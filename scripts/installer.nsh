; NSIS 安装脚本 - 备份和恢复配置文件
; 此脚本在安装前备份配置文件，安装后恢复

!macro customHeader
  ; 定义配置文件目录
  !define CONFIG_DIR "config"
  !define LOGS_DIR "logs"
  !define DATA_DIR "data"
  !define BACKUP_DIR "$TEMP\ComfyUI-Desktop-Backup"
!macroend

; 安装前备份配置文件
!macro customInit
  ; 创建备份目录
  CreateDirectory "${BACKUP_DIR}"
  
  ; 备份 config 目录
  ${If} ${FileExists} "$INSTDIR\${CONFIG_DIR}"
    CopyFiles "$INSTDIR\${CONFIG_DIR}" "${BACKUP_DIR}\${CONFIG_DIR}"
    DetailPrint "已备份配置文件到: ${BACKUP_DIR}\${CONFIG_DIR}"
  ${EndIf}
  
  ; 备份 logs 目录
  ${If} ${FileExists} "$INSTDIR\${LOGS_DIR}"
    CopyFiles "$INSTDIR\${LOGS_DIR}" "${BACKUP_DIR}\${LOGS_DIR}"
    DetailPrint "已备份日志文件到: ${BACKUP_DIR}\${LOGS_DIR}"
  ${EndIf}
  
  ; 备份 data 目录
  ${If} ${FileExists} "$INSTDIR\${DATA_DIR}"
    CopyFiles "$INSTDIR\${DATA_DIR}" "${BACKUP_DIR}\${DATA_DIR}"
    DetailPrint "已备份数据文件到: ${BACKUP_DIR}\${DATA_DIR}"
  ${EndIf}
!macroend

; 安装后恢复配置文件
!macro customInstall
  ; 恢复 config 目录
  ${If} ${FileExists} "${BACKUP_DIR}\${CONFIG_DIR}"
    CopyFiles "${BACKUP_DIR}\${CONFIG_DIR}" "$INSTDIR\${CONFIG_DIR}"
    DetailPrint "已恢复配置文件"
  ${EndIf}
  
  ; 恢复 logs 目录
  ${If} ${FileExists} "${BACKUP_DIR}\${LOGS_DIR}"
    CopyFiles "${BACKUP_DIR}\${LOGS_DIR}" "$INSTDIR\${LOGS_DIR}"
    DetailPrint "已恢复日志文件"
  ${EndIf}
  
  ; 恢复 data 目录
  ${If} ${FileExists} "${BACKUP_DIR}\${DATA_DIR}"
    CopyFiles "${BACKUP_DIR}\${DATA_DIR}" "$INSTDIR\${DATA_DIR}"
    DetailPrint "已恢复数据文件"
  ${EndIf}
  
  ; 清理备份目录
  RMDir /r "${BACKUP_DIR}"
!macroend
