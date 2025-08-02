const { contextBridge, ipcRenderer } = require('electron');

// 向渲染进程暴露安全的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 数据相关
  getData: () => ipcRenderer.invoke('get-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  
  // 清单相关
  createChecklist: (checklist) => ipcRenderer.invoke('create-checklist', checklist),
  updateChecklist: (id, updates) => ipcRenderer.invoke('update-checklist', id, updates),
  archiveChecklist: (id) => ipcRenderer.invoke('archive-checklist', id),
  deleteChecklist: (id) => ipcRenderer.invoke('delete-checklist', id),
  
  // 模板相关
  getTemplates: () => ipcRenderer.invoke('get-templates'),
  saveTemplate: (template) => ipcRenderer.invoke('save-template', template),
  deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id),

  // 悬浮窗相关
  getFloatingData: () => ipcRenderer.invoke('get-floating-data'),
  getCurrentWorkTime: () => ipcRenderer.invoke('get-current-work-time'),
  updateTaskStatus: (taskId, updates) => ipcRenderer.invoke('update-task-status', taskId, updates),
  toggleTaskTimer: (taskId) => ipcRenderer.invoke('toggle-task-timer', taskId),
  focusMainWindow: () => ipcRenderer.invoke('focus-main-window'),
  minimizeFloat: () => ipcRenderer.invoke('minimize-float'),
  resizeFloatingWindow: (expanded) => ipcRenderer.invoke('resize-floating-window', expanded),
  toggleFloatingWindow: () => ipcRenderer.invoke('toggle-floating-window'),
  
  // 监听主进程消息
  onTaskTimerUpdated: (callback) => ipcRenderer.on('task-timer-updated', callback),
  removeTaskTimerListener: () => ipcRenderer.removeAllListeners('task-timer-updated')
});
