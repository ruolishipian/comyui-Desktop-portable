@echo off
chcp 65001 >nul
echo ========================================
echo   Windows 图标缓存刷新工具
echo   用于修复应用程序图标显示异常
echo ========================================
echo.

echo [1/4] 关闭资源管理器...
taskkill /f /im explorer.exe >nul 2>&1

echo [2/4] 删除图标缓存文件...
del /a /f "%localappdata%\IconCache.db" >nul 2>&1
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1

echo [3/4] 等待缓存清理完成...
timeout /t 2 /nobreak >nul

echo [4/4] 重启资源管理器...
start explorer.exe

echo.
echo ========================================
echo   图标缓存已刷新！
echo   如果图标仍未正常显示，请重启电脑。
echo ========================================
echo.
pause
