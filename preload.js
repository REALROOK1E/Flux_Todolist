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
  deleteTemplate: (id) => ipcRenderer.invoke('delete-template', id)
});
