@echo off
chcp 65001 >nul
echo ========================================
echo   修复 Windows 图标缓存问题
echo ========================================
echo.
echo 此脚本将：
echo 1. 停止 Windows 资源管理器
echo 2. 删除图标缓存文件
echo 3. 重启资源管理器
echo.
echo 请保存所有工作后按任意键继续...
pause >nul

echo.
echo [1/4] 停止资源管理器进程...
taskkill /IM explorer.exe /F >nul 2>&1

echo [2/4] 删除图标缓存数据库...
del /A /Q "%localappdata%\IconCache.db" >nul 2>&1

echo [3/4] 删除图标缓存目录...
del /A /F /Q "%localappdata%\Microsoft\Windows\Explorer\iconcache*" >nul 2>&1
del /A /F /Q "%localappdata%\Microsoft\Windows\Explorer\thumbcache*" >nul 2>&1

echo [4/4] 重启资源管理器...
start explorer.exe

echo.
echo ========================================
echo   修复完成！
echo ========================================
echo.
echo 请检查 exe 文件图标是否恢复正常。
echo 如果仍然显示白板，请尝试：
echo 1. 重启电脑
echo 2. 重新打包程序 (npm run build:win)
echo.
pause
