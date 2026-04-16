@echo off
chcp 65001 >nul
echo ========================================
echo   修复 Windows 图标缓存问题
echo ========================================
echo.
echo 此脚本将：
echo 1. 停止 Windows 资源管理器
echo 2. 删除旧格式图标缓存 (IconCache.db)
echo 3. 删除 Windows 10+ 新格式图标缓存 (iconcache_*.db)
echo 4. 删除缩略图缓存
echo 5. 重启资源管理器
echo.
echo 注意：资源管理器会暂时关闭，请保存所有工作
echo.
echo 按任意键继续...
pause >nul

echo.
echo [1/5] 停止资源管理器进程...
taskkill /IM explorer.exe /F >nul 2>&1

echo [2/5] 删除旧格式图标缓存 (IconCache.db)...
del /A /Q "%localappdata%\IconCache.db" >nul 2>&1
del /A /Q "%appdata%\Microsoft\Windows\IconCache.db" >nul 2>&1
del /A /Q "%localappdata%\Microsoft\Windows\IconCache.db" >nul 2>&1

echo [3/5] 删除 Windows 10+ 新格式图标缓存 (iconcache_*.db)...
del /A /F /Q "%localappdata%\Microsoft\Windows\Explorer\iconcache_*.db" >nul 2>&1
del /A /F /Q "%localappdata%\Microsoft\Windows\Explorer\IconCache.db" >nul 2>&1

echo [4/5] 删除缩略图缓存 (thumbcache_*.db)...
del /A /F /Q "%localappdata%\Microsoft\Windows\Explorer\thumbcache_*.db" >nul 2>&1

echo [5/5] 重启资源管理器...
:: 短暂等待确保缓存文件已释放
timeout /t 2 /nobreak >nul
start explorer.exe

:: 通知系统图标缓存已更改
ie4uinit.exe -show >nul 2>&1

echo.
echo ========================================
echo   修复完成！
echo ========================================
echo.
echo 资源管理器已重启，图标缓存已重建。
echo 请检查 EXE 文件图标是否恢复正常。
echo.
echo 如果仍然显示白板图标，请尝试：
echo 1. 注销并重新登录 Windows
echo 2. 重启电脑
echo 3. 重新运行安装程序
echo.
pause
