@echo off
chcp 65001 >nul
echo ========================================
echo   Windows 图标缓存刷新工具
echo   用于修复应用程序图标显示异常
echo ========================================
echo.

echo [1/5] 关闭资源管理器...
taskkill /f /im explorer.exe >nul 2>&1

echo [2/5] 删除旧格式图标缓存 (IconCache.db)...
del /a /f "%localappdata%\IconCache.db" >nul 2>&1
del /a /f "%appdata%\Microsoft\Windows\IconCache.db" >nul 2>&1
del /a /f "%localappdata%\Microsoft\Windows\IconCache.db" >nul 2>&1

echo [3/5] 删除 Windows 10+ 新格式图标缓存 (iconcache_*.db)...
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\IconCache.db" >nul 2>&1

echo [4/5] 删除缩略图缓存 (thumbcache_*.db)...
del /a /f /q "%localappdata%\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1

echo [5/5] 重启资源管理器并刷新缓存...
timeout /t 2 /nobreak >nul
start explorer.exe
ie4uinit.exe -show >nul 2>&1

echo.
echo ========================================
echo   图标缓存已刷新！
echo   如果图标仍未正常显示，请注销并重新登录。
echo ========================================
echo.
pause
