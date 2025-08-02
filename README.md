# MyTodo - 像素风格 Electron 清单应用

[![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)](https://github.com/REALROOK1E/Mytodo/releases/tag/v1.2.1)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

一个具有像素游戏风格的本地待办事项管理应用，支持正/倒计时、模板管理和数据归档功能。

## 📥 下载安装

### 最新版本 v1.2.1 (2025-01-29)

- **便携版**: [MyTodo 1.2.1.exe](https://github.com/REALROOK1E/Mytodo/releases/download/v1.2.1/MyTodo%201.2.1.exe) - 无需安装，直接运行
- **安装版**: [MyTodo Setup 1.2.1.exe](https://github.com/REALROOK1E/Mytodo/releases/download/v1.2.1/MyTodo%20Setup%201.2.1.exe) - 完整安装包

### 版本更新 🆕
- ✨ 优化时间计算精度，统计时间精确到秒
- 🔧 使用 Math.round() 处理所有时间显示
- 📊 提升平均清单工作时间计算精度
- 🐛 修复小数点精度问题

[查看完整更新日志](CHANGELOG_v1.2.1.md)

## 功能特性

### 🎮 像素游戏风格
- 复古像素艺术风格界面
- 8位游戏风格的按钮和图标
- 暗色主题配色方案

### 📋 清单管理
- 创建和管理多个清单
- 使用预设模板快速创建清单
- 清单完成后自动归档
- 实时显示完成进度和时间统计

### ⏰ 智能计时
- **正计时模式**: 记录任务实际用时
- **倒计时模式**: 设定时限，到时提醒
- 可暂停/继续计时
- 超时自动提醒和音效

### 📝 任务功能
- 添加、编辑、删除任务
- 自定义任务时长
- 任务状态管理（未开始/进行中/已完成）
- 批量操作支持

### 🎯 模板系统
- 内置工作、学习等预设模板
- 创建自定义清单模板
- 模板导入导出功能
- 一键从模板创建清单

### 💾 数据管理
- 单文件 JSON 数据存储
- 自动保存功能
- 数据备份和恢复
- 应用退出时自动保存

### ⚙️ 高级功能
- 全局搜索 (Ctrl+F)
- 键盘快捷键支持
- 桌面通知
- 工作休息提醒（番茄钟）
- 计时统计和数据导出

## 安装运行

### 开发环境需求
- Node.js (建议 16.x 或更高版本)
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 运行应用
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 构建应用
```bash
# 构建 Windows 版本
npm run build-win

# 通用构建
npm run build
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl + N` | 新建清单/模板 |
| `Ctrl + S` | 手动保存数据 |
| `Ctrl + B` | 备份数据 |
| `Ctrl + F` | 全局搜索 |
| `Escape` | 返回上级页面 |
| `F1` | 显示帮助 |

## 文件结构

```
mytodo/
├── main.js           # Electron 主进程
├── preload.js        # 预加载脚本
├── index.html        # 主界面
├── package.json      # 项目配置
├── data.json         # 数据存储文件（自动创建）
├── styles/           # 样式文件
│   ├── main.css      # 主样式
│   └── pixel.css     # 像素风格样式
├── js/               # JavaScript 模块
│   ├── app.js        # 主应用逻辑
│   ├── checklist.js  # 清单管理
│   ├── task.js       # 任务管理
│   ├── timer.js      # 计时器功能
│   ├── template.js   # 模板管理
│   └── utils.js      # 工具函数
└── assets/           # 资源文件
    └── icon.png      # 应用图标
```

## 使用说明

### 1. 创建清单
- 点击顶部"新建清单"按钮
- 输入清单名称
- 可选择使用现有模板
- 点击确认创建

### 2. 管理任务
- 在清单详情页面添加任务
- 设置任务预计时长和计时类型
- 点击播放按钮开始计时
- 完成后勾选任务复选框

### 3. 使用模板
- 进入"模板管理"页面
- 创建自定义模板或使用预设模板
- 从模板快速创建新清单

### 4. 数据管理
- 应用会自动保存数据到 `data.json` 文件
- 可在设置中手动备份和恢复数据
- 支持清理已归档的数据

## 技术栈

- **框架**: Electron 28.3.3
- **前端**: HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- **数据存储**: JSON 文件本地存储
- **构建工具**: electron-builder 24.13.3
- **版本**: v1.2.1

## 开发计划

- [ ] 添加更多主题选项
- [ ] 支持插件系统
- [ ] 添加统计图表
- [ ] 支持多语言
- [ ] 云同步功能

## 许可证

MIT License

## 作者

您的名字

---

💡 **提示**: 这是一个轻量级的本地应用，所有数据都存储在您的设备上，保证隐私安全。
