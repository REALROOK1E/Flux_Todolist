@echo off
echo =================================
echo Flux 移动端安卓版安装脚本
echo =================================
echo.

echo 正在检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 16.x 或更高版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [✓] Node.js 已安装
echo.

echo 正在检查 Ionic CLI...
ionic --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [信息] 正在安装 Ionic CLI...
    npm install -g @ionic/cli
    if %errorlevel% neq 0 (
        echo [错误] Ionic CLI 安装失败
        pause
        exit /b 1
    )
)

echo [✓] Ionic CLI 已安装
echo.

echo 正在进入移动端目录...
cd mobile
if %errorlevel% neq 0 (
    echo [错误] 移动端目录不存在
    pause
    exit /b 1
)

echo 正在安装项目依赖...
npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo [✓] 依赖安装完成
echo.

echo 正在构建项目...
ionic build
if %errorlevel% neq 0 (
    echo [错误] 项目构建失败
    pause
    exit /b 1
)

echo [✓] 项目构建完成
echo.

echo 正在添加安卓平台...
ionic cap add android
if %errorlevel% neq 0 (
    echo [警告] 安卓平台添加失败，可能已经存在
)

echo 正在同步项目...
ionic cap sync
if %errorlevel% neq 0 (
    echo [错误] 项目同步失败
    pause
    exit /b 1
)

echo [✓] 项目同步完成
echo.

echo =================================
echo 安装完成！
echo =================================
echo.
echo 接下来的步骤：
echo 1. 安装 Android Studio
echo 2. 运行: ionic cap open android
echo 3. 在 Android Studio 中构建和运行
echo.
echo 或者直接运行: ionic cap run android
echo.
pause
