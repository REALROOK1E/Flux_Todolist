@echo off
echo =================================
echo Flux 安卓版快速构建脚本
echo =================================
echo.

cd mobile
if %errorlevel% neq 0 (
    echo [错误] 移动端目录不存在，请先运行 install.bat
    pause
    exit /b 1
)

echo 正在构建项目...
ionic build
if %errorlevel% neq 0 (
    echo [错误] 项目构建失败
    pause
    exit /b 1
)

echo 正在同步到安卓项目...
ionic cap sync
if %errorlevel% neq 0 (
    echo [错误] 项目同步失败
    pause
    exit /b 1
)

echo 正在打开 Android Studio...
ionic cap open android

echo.
echo =================================
echo 构建完成！
echo =================================
echo.
echo Android Studio 已打开
echo 在 Android Studio 中点击 "Run" 按钮来运行应用
echo.
pause
