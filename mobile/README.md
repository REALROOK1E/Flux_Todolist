# 🚀 Flux Todo Mobile - 快速开始

## 📱 项目简介

Flux Todo Mobile 是桌面版 Flux Todo 的移动端应用，使用 Capacitor 框架开发，保持了原有的像素风格设计和完整功能。

## ✨ 主要功能

- � **清单管理**: 创建、编辑、删除待办清单
- ⏱️ **计时器功能**: 正计时和倒计时模式
- 📝 **模板系统**: 内置 5 种模板，支持自定义
- 📊 **数据统计**: 实时显示任务进度
- 💾 **数据同步**: 与桌面版数据兼容
- 🎨 **像素风格**: 保持原有视觉设计

## 🛠️ 开发环境

### 前置要求
- Node.js 16+ 
- npm 或 yarn
- Android Studio (用于 Android 开发)
- Xcode (用于 iOS 开发，仅限 macOS)

### 快速启动

1. **安装依赖**
   ```bash
   cd mobile
   npm install
   ```

2. **构建应用**
   ```bash
   npm run build
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```
   
   访问 http://localhost:8101 预览应用

4. **添加原生平台**
   ```bash
   # Android
   npm run add:android
   
   # iOS (仅限 macOS)
   ionic cap add ios
   ```

5. **在设备上运行**
   ```bash
   # Android
   npm run run:android
   
   # iOS
   ionic cap run ios
   ```

## 📂 项目结构

```
mobile/
├── src/                    # 源代码
│   ├── index.html         # 主页面
│   ├── manifest.json      # PWA 配置
│   ├── js/               # JavaScript 模块
│   │   ├── mobile-app.js         # 主应用控制器
│   │   ├── mobile-storage.js     # 数据存储
│   │   ├── mobile-checklist.js  # 清单管理
│   │   ├── mobile-timer.js      # 计时器功能
│   │   ├── mobile-template.js   # 模板系统
│   │   └── mobile-utils.js      # 工具函数
│   └── styles/           # 样式文件
│       ├── mobile.css            # 主样式
│       └── pixel-mobile.css     # 像素风格样式
├── dist/                  # 构建输出
├── android/              # Android 原生项目
├── ios/                  # iOS 原生项目
├── capacitor.config.ts   # Capacitor 配置
├── ionic.config.json     # Ionic 配置
└── package.json          # 项目配置
```

## 🔧 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run build` | 构建 Web 应用 |
| `npm run dev` | 启动开发服务器 |
| `npm run sync` | 同步到原生平台 |
| `npm run add:android` | 添加 Android 平台 |
| `npm run open:android` | 在 Android Studio 中打开 |
| `npm run run:android` | 在 Android 设备上运行 |
| `npm run build:android` | 构建 Android APK |

## 🎯 核心模块

### MobileApp (mobile-app.js)
- 应用初始化和路由管理
- 页面切换和导航
- Capacitor 插件集成

### MobileStorage (mobile-storage.js)
- 跨平台数据存储
- 文件系统和偏好设置
- 数据备份和恢复

### MobileChecklist (mobile-checklist.js)
- 清单 CRUD 操作
- 任务管理
- 模板应用

### MobileTimer (mobile-timer.js)
- 计时器控制
- 通知和振动
- 任务计时统计

### MobileTemplate (mobile-template.js)
- 内置模板管理
- 自定义模板创建
- 模板应用和编辑

## 🎨 UI 组件

### 导航栏
- 底部选项卡导航
- 响应式设计
- 像素风格图标

### 清单页面
- 卡片式布局
- 滑动操作
- 拖拽排序

### 计时器页面
- 圆形进度指示器
- 快捷时间设置
- 声音和振动反馈

### 模板页面
- 网格布局
- 预览功能
- 快速应用

## 📱 原生功能

### Capacitor 插件
- **App**: 应用生命周期管理
- **Filesystem**: 文件系统访问
- **Preferences**: 键值对存储
- **Local Notifications**: 本地通知
- **Haptics**: 触觉反馈
- **Status Bar**: 状态栏控制

### 权限管理
- 通知权限
- 文件访问权限
- 设备唤醒权限

## 🔍 调试和测试

### Chrome DevTools
1. 在 Chrome 中打开 `chrome://inspect`
2. 连接设备
3. 选择 WebView 进行调试

### 设备测试
- 使用真实设备测试性能
- 测试不同屏幕尺寸
- 验证原生功能

## 📦 构建和发布

### Android APK
1. 运行 `npm run build:android`
2. 在 Android Studio 中构建
3. 生成签名 APK

### iOS App
1. 在 Xcode 中打开项目
2. 配置签名证书
3. 构建和分发

## 🔧 自定义和扩展

### 添加新功能
1. 在 `src/js/` 中创建新模块
2. 在 `mobile-app.js` 中注册
3. 更新 UI 和路由

### 修改样式
- 编辑 `src/styles/mobile.css`
- 使用 CSS 变量保持一致性
- 遵循像素风格设计

### 集成第三方插件
1. 安装 Capacitor 插件
2. 在模块中导入和使用
3. 更新原生项目配置

## 💡 最佳实践

- 使用模块化架构
- 保持代码简洁易读
- 遵循 ES6+ 标准
- 实现错误处理
- 优化性能和体验

## 🆘 常见问题

### 构建失败
- 检查 Node.js 版本
- 清理 npm 缓存
- 重新安装依赖

### 设备连接问题
- 启用开发者选项
- 检查 USB 驱动
- 使用 `adb devices` 验证

### 样式显示异常
- 检查 CSS 文件路径
- 验证媒体查询
- 清理浏览器缓存

## 📞 支持和反馈

如有问题或建议，请参考以下资源：
- [Capacitor 官方文档](https://capacitorjs.com/)
- [Ionic 官方文档](https://ionicframework.com/)
- [Android 开发文档](https://developer.android.com/)

## 📋 Android 构建指南

详细的 Android 构建说明请参考 [ANDROID_BUILD_GUIDE.md](./ANDROID_BUILD_GUIDE.md)。

## 📄 许可证

本项目采用 MIT 许可证。
