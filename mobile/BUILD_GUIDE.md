# Flux 安卓版构建发布指南

## 📋 构建环境准备

### 必要软件
1. **Node.js 16+**: https://nodejs.org/
2. **Android Studio**: https://developer.android.com/studio
3. **JDK 11+**: https://adoptium.net/
4. **Git**: https://git-scm.com/

### 环境变量设置
```bash
# Android SDK
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Java
export JAVA_HOME=/path/to/jdk11
export PATH=$PATH:$JAVA_HOME/bin
```

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/REALROOK1E/Mytodo.git
cd Mytodo/mobile
```

### 2. 自动化安装 (推荐)
```bash
# Windows
install.bat

# Linux/Mac
chmod +x install.sh && ./install.sh
```

### 3. 手动安装
```bash
# 安装 Ionic CLI
npm install -g @ionic/cli

# 安装项目依赖
npm install

# 构建 Web 资源
ionic build

# 添加安卓平台
ionic cap add android

# 同步项目
ionic cap sync
```

## 🔧 开发调试

### Web 端调试
```bash
# 启动开发服务器
ionic serve

# 指定端口
ionic serve --port 8100
```

### 安卓设备调试
```bash
# 连接设备并运行
ionic cap run android

# 指定设备
ionic cap run android --target=device_id

# 实时重载
ionic cap run android --livereload --external
```

### Android Studio 调试
```bash
# 打开 Android Studio
ionic cap open android

# 然后在 Android Studio 中:
# 1. 点击 "Run" 按钮
# 2. 选择目标设备
# 3. 等待构建完成
```

## 📱 构建发布版本

### 1. 准备发布构建
```bash
# 清理缓存
ionic cap clean android

# 重新构建
ionic build --prod

# 同步到安卓
ionic cap sync android
```

### 2. 在 Android Studio 中
1. 打开项目: `ionic cap open android`
2. 选择 **Build > Generate Signed Bundle / APK**
3. 选择 **APK** 或 **Android App Bundle**
4. 创建或选择密钥库文件
5. 填写密钥信息
6. 选择 **release** 构建类型
7. 点击 **Finish**

### 3. 密钥库管理
```bash
# 创建密钥库 (首次)
keytool -genkey -v -keystore flux-release-key.keystore -alias flux -keyalg RSA -keysize 2048 -validity 10000

# 验证签名
jarsigner -verify -verbose -certs app-release.apk
```

## 🎯 构建配置

### capacitor.config.json
```json
{
  "appId": "com.flux.mobile",
  "appName": "Flux",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "minWebViewVersion": 80,
    "allowMixedContent": true,
    "captureInput": true,
    "webContentsDebuggingEnabled": false
  }
}
```

### android/app/build.gradle
```gradle
android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.flux.mobile"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "2.16.0"
    }
    
    buildTypes {
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 📦 发布流程

### Google Play Console
1. **创建应用**
   - 登录 Google Play Console
   - 创建新应用
   - 填写基本信息

2. **上传 AAB/APK**
   - 选择 "发布" > "制作版本"
   - 上传 Android App Bundle (推荐) 或 APK
   - 填写版本说明

3. **应用信息**
   - 应用名称: "Flux - 像素时间管理"
   - 简短描述: "像素风格的专业时间管理应用"
   - 完整描述: 详细功能介绍
   - 截图: 至少2张手机截图

4. **分级和政策**
   - 内容分级问卷
   - 目标受众和内容
   - 隐私政策链接

### 应用商店优化 (ASO)
- **关键词**: 时间管理、待办事项、计时器、像素风格
- **图标**: 清晰的512x512像素图标
- **截图**: 展示主要功能的高质量截图
- **描述**: 突出独特功能和优势

## 🔍 测试清单

### 功能测试
- [ ] 清单创建、编辑、删除
- [ ] 任务管理和状态切换
- [ ] 计时器启动、停止、完成通知
- [ ] 模板应用和自定义
- [ ] 数据保存和恢复
- [ ] 应用生命周期处理

### 兼容性测试
- [ ] 不同 Android 版本 (API 22+)
- [ ] 不同屏幕尺寸和密度
- [ ] 横竖屏切换
- [ ] 内存不足情况
- [ ] 网络连接状态变化

### 性能测试
- [ ] 启动时间 < 3秒
- [ ] 内存使用 < 100MB
- [ ] 电池消耗正常
- [ ] CPU 使用率合理

## 🐛 常见问题

### 构建问题
```bash
# 清理并重新构建
ionic cap clean android
rm -rf node_modules
npm install
ionic build
ionic cap sync
```

### 签名问题
```bash
# 检查签名
keytool -list -v -keystore flux-release-key.keystore

# 重新签名
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore flux-release-key.keystore app-release-unsigned.apk flux
```

### 权限问题
在 `android/app/src/main/AndroidManifest.xml` 中添加必要权限:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

## 📊 版本管理

### 版本号规则
- **versionName**: "2.16.0" (对用户可见)
- **versionCode**: 1 (内部版本号，每次发布递增)

### 更新策略
```bash
# 更新版本号
npm version patch  # 2.16.0 -> 2.16.1
npm version minor  # 2.16.0 -> 2.17.0
npm version major  # 2.16.0 -> 3.0.0

# 同步到 Android
# 手动更新 android/app/build.gradle 中的版本信息
```

## 🎉 发布检查表

### 发布前检查
- [ ] 所有功能正常工作
- [ ] 性能测试通过
- [ ] 没有崩溃和内存泄漏
- [ ] 应用图标和截图准备就绪
- [ ] 版本号正确更新
- [ ] 签名密钥安全保存

### 发布后跟踪
- [ ] 监控下载量和评分
- [ ] 收集用户反馈
- [ ] 跟踪崩溃报告
- [ ] 准备下一版本更新

---

**构建指南版本**: v1.0  
**最后更新**: 2025年8月8日  
**适用版本**: Flux v2.16.0
