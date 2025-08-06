const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

// 启用实时重载（开发环境）
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (e) {
    console.log('Development mode: electron-reload not available');
  }
}

// 数据文件路径 - 使用用户数据目录
const getUserDataPath = () => {
  try {
    const userDataPath = app.getPath('userData');
    const dataFile = path.join(userDataPath, 'mytodo-data.json');
    console.log('用户数据目录:', userDataPath);
    console.log('数据文件路径:', dataFile);
    return dataFile;
  } catch (error) {
    console.error('获取用户数据路径失败:', error);
    // 备用路径
    const fallbackPath = path.join(process.cwd(), 'user-data.json');
    console.log('使用备用路径:', fallbackPath);
    return fallbackPath;
  }
};

const DATA_FILE = getUserDataPath();

let mainWindow;
let floatingWindow;
let appData = {
  checklists: [],
  archivedChecklists: [],
  templates: [],
  settings: {
    theme: 'pixel',
    autoSave: true,
    enableNotifications: true,
    enableSounds: true
  }
};

async function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false,
    titleBarStyle: 'default'
  });

  // 加载应用的 index.html
  mainWindow.loadFile('index.html');

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 处理外部链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭前保存数据
  mainWindow.on('close', async (e) => {
    e.preventDefault();
    await saveData();
    mainWindow.destroy();
  });

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

// 创建悬浮窗
async function createFloatingWindow() {
  if (floatingWindow) {
    floatingWindow.focus();
    return;
  }

  floatingWindow = new BrowserWindow({
    width: 200,
    height: 180, // 再次增加高度确保控制按钮可见
    minWidth: 200,
    minHeight: 180, // 增加最小高度
    maxWidth: 200,
    maxHeight: 450,
    resizable: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // 加载悬浮窗页面
  floatingWindow.loadFile('floating-window.html');

  // 窗口准备好后显示
  floatingWindow.once('ready-to-show', () => {
    floatingWindow.show();
    // 设置初始位置（右下角）
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    floatingWindow.setPosition(width - 220, height - 140);
  });

  // 窗口关闭时清理引用
  floatingWindow.on('closed', () => {
    floatingWindow = null;
  });

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    floatingWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// 应用准备就绪时创建窗口
app.whenReady().then(async () => {
  await loadData();
  createWindow();
  createFloatingWindow(); // 同时创建悬浮窗

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createFloatingWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', async () => {
  await saveData();
  // 确保悬浮窗也关闭
  if (floatingWindow) {
    floatingWindow.destroy();
  }
  if (process.platform !== 'darwin') app.quit();
});

// 应用退出前保存数据
app.on('before-quit', async () => {
  await saveData();
  // 确保悬浮窗也关闭
  if (floatingWindow) {
    floatingWindow.destroy();
  }
});

// 加载数据
async function loadData() {
  console.log('尝试从以下路径加载数据:', DATA_FILE);
  try {
    // 检查文件是否存在
    await fs.access(DATA_FILE);
    const data = await fs.readFile(DATA_FILE, 'utf8');
    console.log('成功读取数据文件，大小:', data.length, '字符');
    
    if (data.trim() === '') {
      console.log('数据文件为空，使用默认数据');
      await saveData();
      return;
    }
    
    const loadedData = JSON.parse(data);
    console.log('解析的数据:', loadedData);
    appData = { ...appData, ...loadedData };
    console.log('数据加载成功');
  } catch (error) {
    console.log('加载数据失败:', error.message);
    if (error.code === 'ENOENT') {
      console.log('数据文件不存在，创建新文件');
    } else if (error.name === 'SyntaxError') {
      console.log('数据文件格式错误，使用默认数据');
    } else {
      console.log('其他错误，使用默认数据');
    }
    await saveData(); // 创建初始数据文件
  }
}

// 保存数据
async function saveData() {
  try {
    console.log('正在保存数据到:', DATA_FILE);
    console.log('保存的数据:', appData);
    
    // 确保目录存在
    const dirPath = path.dirname(DATA_FILE);
    await fs.mkdir(dirPath, { recursive: true });
    
    // 保存数据
    const dataString = JSON.stringify(appData, null, 2);
    await fs.writeFile(DATA_FILE, dataString, 'utf8');
    console.log('数据保存成功');
  } catch (error) {
    console.error('保存数据失败:', error);
    // 尝试保存到备用位置
    try {
      const backupFile = path.join(process.cwd(), 'mytodo-backup.json');
      await fs.writeFile(backupFile, JSON.stringify(appData, null, 2), 'utf8');
      console.log('数据已保存到备用位置:', backupFile);
    } catch (backupError) {
      console.error('备用保存也失败:', backupError);
    }
  }
}

// IPC 通信处理
ipcMain.handle('get-data', () => {
  return appData;
});

ipcMain.handle('save-data', async (event, data) => {
  appData = data;
  await saveData();
  return { success: true };
});

ipcMain.handle('create-checklist', async (event, checklist) => {
  checklist.id = Date.now().toString();
  checklist.createdAt = new Date().toISOString();
  checklist.status = 'active';
  appData.checklists.push(checklist);
  await saveData();
  return checklist;
});

ipcMain.handle('update-checklist', async (event, checklistId, updates) => {
  const index = appData.checklists.findIndex(c => c.id === checklistId);
  if (index !== -1) {
    appData.checklists[index] = { ...appData.checklists[index], ...updates };
    await saveData();
    return appData.checklists[index];
  }
  return null;
});

ipcMain.handle('archive-checklist', async (event, checklistId) => {
  const index = appData.checklists.findIndex(c => c.id === checklistId);
  if (index !== -1) {
    const checklist = appData.checklists.splice(index, 1)[0];
    checklist.status = 'archived';
    checklist.archivedAt = new Date().toISOString();
    appData.archivedChecklists.push(checklist);
    await saveData();
    return checklist;
  }
  return null;
});

ipcMain.handle('delete-checklist', async (event, checklistId) => {
  const index = appData.checklists.findIndex(c => c.id === checklistId);
  if (index !== -1) {
    appData.checklists.splice(index, 1);
    await saveData();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('get-templates', () => {
  return appData.templates;
});

ipcMain.handle('save-template', async (event, template) => {
  template.id = template.id || Date.now().toString();
  const index = appData.templates.findIndex(t => t.id === template.id);
  if (index !== -1) {
    appData.templates[index] = template;
  } else {
    appData.templates.push(template);
  }
  await saveData();
  return template;
});

ipcMain.handle('delete-template', async (event, templateId) => {
  const index = appData.templates.findIndex(t => t.id === templateId);
  if (index !== -1) {
    appData.templates.splice(index, 1);
    await saveData();
    return { success: true };
  }
  return { success: false };
});

// 悬浮窗相关 IPC 处理
ipcMain.handle('get-floating-data', () => {
  // 获取最近的活动清单（非归档状态的清单，按创建时间排序）
  const activeChecklists = appData.checklists.filter(c => c.status !== 'archived');
  const currentChecklist = activeChecklists.length > 0 ? 
    activeChecklists.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] : null;
    
  return {
    currentChecklist,
    checklists: appData.checklists,
    archivedChecklists: appData.archivedChecklists
  };
});

ipcMain.handle('get-current-work-time', () => {
  // 计算当前清单的总工作时间（包括正在运行的任务）
  const currentChecklist = appData.checklists.find(c => c.status !== 'archived');
  if (!currentChecklist || !currentChecklist.tasks) return 0;
  
  return currentChecklist.tasks.reduce((total, task) => {
    let taskTime = task.spentTime || 0;
    
    // 如果任务正在运行，添加当前会话时间
    if (task.isRunning && task.startTime) {
      const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
      taskTime += sessionTime;
    }
    
    return total + taskTime;
  }, 0);
});

ipcMain.handle('update-task-status', async (event, taskId, updates) => {
  // 在所有清单中查找并更新任务
  for (let checklist of appData.checklists) {
    if (checklist.tasks) {
      const task = checklist.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        await saveData();
        return { success: true, task };
      }
    }
  }
  return { success: false };
});

ipcMain.handle('toggle-task-timer', async (event, taskId) => {
  // 在所有清单中查找任务
  for (let checklist of appData.checklists) {
    if (checklist.tasks) {
      const task = checklist.tasks.find(t => t.id === taskId);
      if (task) {
        // 停止所有其他正在运行的任务
        appData.checklists.forEach(cl => {
          if (cl.tasks) {
            cl.tasks.forEach(t => {
              if (t.id !== taskId && t.isRunning) {
                t.isRunning = false;
                t.startTime = null;
              }
            });
          }
        });

        // 切换当前任务状态
        if (task.isRunning) {
          // 停止计时
          const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
          task.spentTime = (task.spentTime || 0) + sessionTime;
          task.isRunning = false;
          task.startTime = null;
        } else {
          // 开始计时
          task.isRunning = true;
          task.startTime = Date.now();
        }

        await saveData();
        
        // 通知主窗口更新
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('task-timer-updated', taskId, task.isRunning);
        }
        
        return { success: true, task };
      }
    }
  }
  return { success: false };
});

ipcMain.handle('focus-main-window', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
    mainWindow.show();
  }
});

ipcMain.handle('minimize-float', () => {
  if (floatingWindow) {
    floatingWindow.minimize();
  }
});

ipcMain.handle('resize-floating-window', (event, expanded) => {
  if (floatingWindow) {
    if (expanded) {
      floatingWindow.setSize(200, 450); // 设置为最大高度，确保所有内容可见
    } else {
      floatingWindow.setSize(200, 180); // 与基础窗口高度保持一致
    }
  }
});

ipcMain.handle('toggle-floating-window', () => {
  if (floatingWindow) {
    if (floatingWindow.isVisible()) {
      floatingWindow.hide();
    } else {
      floatingWindow.show();
    }
  } else {
    createFloatingWindow();
  }
});
