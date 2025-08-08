# Android 构建指南

## 环境要求

### 1. 安装 Android Studio
- 下载并安装 [Android Studio](https://developer.android.com/studio)
- 安装 Android SDK 和构建工具
- 配置 Android 环境变量

### 2. 安装 Java Development Kit (JDK)
```bash
# 检查 JDK 版本 (需要 JDK 8 或更高版本)
java -version
javac -version
```

### 3. 安装 Capacitor CLI
```bash
npm install -g @capacitor/cli
```

## 构建步骤

### 1. 初始化项目
```bash
cd mobile
npm install
```

### 2. 添加 Android 平台
```bash
npm run add:android
```

### 3. 构建 Web 应用
```bash
npm run build
```

### 4. 同步到原生平台
```bash
npm run sync
```

### 5. 在 Android Studio 中打开项目
```bash
npm run open:android
```

### 6. 在 Android Studio 中构建 APK
1. 在 Android Studio 中打开项目
2. 选择 Build > Build Bundle(s) / APK(s) > Build APK(s)
3. 等待构建完成

## 开发模式

### 启动开发服务器
```bash
npm run dev
```
应用将在 http://localhost:8100 运行

### 在设备上运行
```bash
npm run run:android
```

## 调试

### Chrome DevTools 调试
1. 在 Chrome 中打开 `chrome://inspect`
2. 连接设备并启用 USB 调试
3. 选择要调试的 WebView

### Android Studio 调试
1. 在 Android Studio 中设置断点
2. 使用 Debug 模式运行应用

## 常见问题

### 1. Gradle 构建失败
- 检查 Android SDK 路径配置
- 更新 Gradle 版本
- 清理项目缓存

### 2. 设备连接问题
- 启用开发者选项和 USB 调试
- 检查 USB 驱动程序
- 使用 `adb devices` 确认设备连接

### 3. 权限问题
- 在 `android/app/src/main/AndroidManifest.xml` 中添加必要权限
- 运行时请求敏感权限

## 发布

### 生成签名密钥
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
```

### 配置签名
在 `android/app/build.gradle` 中配置签名信息

### 构建发布版本
在 Android Studio 中选择 Build > Generate Signed Bundle/APK

## 性能优化

### 1. 启用代码压缩
在 `android/app/build.gradle` 中启用 ProGuard

### 2. 优化图片资源
- 使用 WebP 格式
- 提供不同分辨率的图片

### 3. 减少包大小
- 移除未使用的依赖
- 启用 Tree Shaking
