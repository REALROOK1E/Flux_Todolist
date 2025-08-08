# 🚀 Flux 安卓版 - 快速启动

## 一分钟快速开始

### 1️⃣ 确保环境就绪
✅ Node.js 16+ 已安装  
✅ Android Studio 已安装  
✅ 安卓设备或模拟器已连接  

### 2️⃣ 运行安装脚本
```bash
# Windows 用户
mobile\install.bat

# Linux/Mac 用户  
chmod +x mobile/install.sh && ./mobile/install.sh
```

### 3️⃣ 启动应用
```bash
cd mobile
ionic cap run android
```

## 🎯 核心功能预览

| 功能 | 描述 | 状态 |
|------|------|------|
| 📋 清单管理 | 创建、编辑时间管理清单 | ✅ |
| ⏰ 智能计时 | 正计时/倒计时双模式 | ✅ |
| 📝 任务追踪 | 任务状态和时间记录 | ✅ |
| 📚 模板系统 | 5种内置 + 自定义模板 | ✅ |
| 🔔 原生通知 | 计时完成本地提醒 | ✅ |
| 💾 离线存储 | 无需网络，本地数据 | ✅ |
| 🎮 像素风格 | 复古游戏界面设计 | ✅ |

## 📸 界面预览
```
┌─────────────────────────┐
│  📱 Flux - 时间管理      │
├─────────────────────────┤
│ 🏠 首页  📋 清单  ⏰ 计时 │
│ 📚 模板  📊 统计         │
├─────────────────────────┤
│                         │
│   ⏰ 25:30:15           │
│   正在进行: 学习英语     │
│                         │
│   📊 今日概览            │
│   ▓▓▓▓▓░░ 75% 完成     │
│                         │
│   📋 最近清单            │
│   • 工作日计划           │
│   • 学习时光             │
│                         │
└─────────────────────────┘
```

## ⚡ 开发者模式

### 实时调试
```bash
ionic serve                    # Web 预览
ionic cap run android --live  # 设备实时调试
ionic cap open android        # Android Studio
```

### 项目结构
```
mobile/
├── 📄 package.json           # 项目配置
├── ⚙️ capacitor.config.json  # 原生配置
├── 🎨 src/styles/            # 像素风格样式
├── 💻 src/js/                # 核心功能模块
└── 📱 android/               # 安卓原生项目
```

## 🔧 故障排除

### 常见问题
❌ **Node.js 版本过低**  
➡️ 升级到 Node.js 16+

❌ **Android SDK 未找到**  
➡️ 设置 ANDROID_HOME 环境变量

❌ **设备未连接**  
➡️ 启用开发者选项和 USB 调试

❌ **构建失败**  
➡️ 运行 `ionic cap clean android` 清理缓存

## 🎊 立即体验

1. **克隆项目**: `git clone https://github.com/REALROOK1E/Mytodo.git`
2. **运行脚本**: `mobile/install.bat` (Windows) 或 `mobile/install.sh` (Linux/Mac)
3. **享受使用**: 开始你的高效时间管理之旅！

---

**🚀 现在就开始使用 Flux 安卓版，让时间管理变得更加高效和有趣！**

📧 反馈: developer@flux.app  
🌐 官网: ernestli.site  
📱 版本: v2.16.0
