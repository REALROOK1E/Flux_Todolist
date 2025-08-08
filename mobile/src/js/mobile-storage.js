import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

class MobileStorage {
    constructor() {
        this.data = {
            checklists: [],
            archivedChecklists: [],
            templates: [],
            settings: {
                theme: 'pixel',
                autoSave: true,
                enableNotifications: true,
                enableSounds: true,
                hapticFeedback: true
            }
        };
        this.onDataChange = null;
        this.autoSaveInterval = null;
    }

    async init() {
        console.log('初始化移动端存储...');
        
        try {
            // 加载数据
            await this.loadData();
            
            // 设置自动保存
            this.setupAutoSave();
            
            console.log('移动端存储初始化完成');
            
        } catch (error) {
            console.error('存储初始化失败:', error);
            throw error;
        }
    }

    async loadData() {
        try {
            let loadedData = null;
            
            if (Capacitor.isNativePlatform()) {
                // 在原生平台使用文件系统
                loadedData = await this.loadFromFile();
                if (!loadedData) {
                    // 如果文件加载失败，尝试从Preferences加载
                    loadedData = await this.loadFromPreferences();
                }
            } else {
                // 在Web平台使用localStorage
                loadedData = await this.loadFromLocalStorage();
            }
            
            if (loadedData) {
                this.data = { ...this.data, ...loadedData };
                console.log('数据加载成功:', this.data);
            } else {
                console.log('未找到保存的数据，使用默认数据');
                await this.saveData(); // 创建初始数据文件
            }
            
        } catch (error) {
            console.error('加载数据失败:', error);
            // 使用默认数据
            console.log('使用默认数据');
        }
    }

    async loadFromFile() {
        try {
            const result = await Filesystem.readFile({
                path: 'flux-data.json',
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
            return JSON.parse(result.data);
            
        } catch (error) {
            console.log('从文件加载数据失败:', error);
            return null;
        }
    }

    async loadFromPreferences() {
        try {
            const result = await Preferences.get({ key: 'flux-data' });
            if (result.value) {
                return JSON.parse(result.value);
            }
            return null;
            
        } catch (error) {
            console.log('从Preferences加载数据失败:', error);
            return null;
        }
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('flux-data');
            if (stored) {
                return JSON.parse(stored);
            }
            return null;
            
        } catch (error) {
            console.log('从localStorage加载数据失败:', error);
            return null;
        }
    }

    async saveData() {
        try {
            const dataString = JSON.stringify(this.data, null, 2);
            
            if (Capacitor.isNativePlatform()) {
                // 在原生平台同时保存到文件和Preferences
                await Promise.all([
                    this.saveToFile(dataString),
                    this.saveToPreferences(dataString)
                ]);
            } else {
                // 在Web平台保存到localStorage
                this.saveToLocalStorage(dataString);
            }
            
            console.log('数据保存成功');
            
            // 触发数据变化回调
            if (this.onDataChange) {
                this.onDataChange();
            }
            
        } catch (error) {
            console.error('保存数据失败:', error);
            throw error;
        }
    }

    async saveToFile(dataString) {
        try {
            await Filesystem.writeFile({
                path: 'flux-data.json',
                data: dataString,
                directory: Directory.Documents,
                encoding: Encoding.UTF8
            });
            
        } catch (error) {
            console.error('保存到文件失败:', error);
            throw error;
        }
    }

    async saveToPreferences(dataString) {
        try {
            await Preferences.set({
                key: 'flux-data',
                value: dataString
            });
            
        } catch (error) {
            console.error('保存到Preferences失败:', error);
            throw error;
        }
    }

    saveToLocalStorage(dataString) {
        try {
            localStorage.setItem('flux-data', dataString);
            
        } catch (error) {
            console.error('保存到localStorage失败:', error);
            throw error;
        }
    }

    setupAutoSave() {
        if (this.data.settings.autoSave) {
            // 每30秒自动保存一次
            this.autoSaveInterval = setInterval(() => {
                this.saveData().catch(error => {
                    console.error('自动保存失败:', error);
                });
            }, 30000);
        }
    }

    getData() {
        return this.data;
    }

    // 清单操作
    async createChecklist(checklist) {
        checklist.id = Date.now().toString();
        checklist.createdAt = new Date().toISOString();
        checklist.status = 'active';
        checklist.tasks = checklist.tasks || [];
        
        this.data.checklists.push(checklist);
        await this.saveData();
        
        return checklist;
    }

    async updateChecklist(checklistId, updates) {
        const index = this.data.checklists.findIndex(c => c.id === checklistId);
        if (index !== -1) {
            this.data.checklists[index] = { ...this.data.checklists[index], ...updates };
            await this.saveData();
            return this.data.checklists[index];
        }
        return null;
    }

    async deleteChecklist(checklistId) {
        const index = this.data.checklists.findIndex(c => c.id === checklistId);
        if (index !== -1) {
            this.data.checklists.splice(index, 1);
            await this.saveData();
            return true;
        }
        return false;
    }

    async archiveChecklist(checklistId) {
        const index = this.data.checklists.findIndex(c => c.id === checklistId);
        if (index !== -1) {
            const checklist = this.data.checklists.splice(index, 1)[0];
            checklist.status = 'archived';
            checklist.archivedAt = new Date().toISOString();
            this.data.archivedChecklists.push(checklist);
            await this.saveData();
            return checklist;
        }
        return null;
    }

    getChecklist(checklistId) {
        return this.data.checklists.find(c => c.id === checklistId) ||
               this.data.archivedChecklists.find(c => c.id === checklistId);
    }

    getActiveChecklists() {
        return this.data.checklists.filter(c => c.status === 'active');
    }

    // 任务操作
    async createTask(checklistId, task) {
        const checklist = this.getChecklist(checklistId);
        if (checklist) {
            task.id = Date.now().toString();
            task.createdAt = new Date().toISOString();
            task.status = 'pending';
            task.spentTime = 0;
            task.isRunning = false;
            
            if (!checklist.tasks) {
                checklist.tasks = [];
            }
            checklist.tasks.push(task);
            
            await this.saveData();
            return task;
        }
        return null;
    }

    async updateTask(taskId, updates) {
        for (let checklist of this.data.checklists) {
            if (checklist.tasks) {
                const task = checklist.tasks.find(t => t.id === taskId);
                if (task) {
                    Object.assign(task, updates);
                    await this.saveData();
                    return task;
                }
            }
        }
        return null;
    }

    async deleteTask(taskId) {
        for (let checklist of this.data.checklists) {
            if (checklist.tasks) {
                const index = checklist.tasks.findIndex(t => t.id === taskId);
                if (index !== -1) {
                    checklist.tasks.splice(index, 1);
                    await this.saveData();
                    return true;
                }
            }
        }
        return false;
    }

    getTask(taskId) {
        for (let checklist of this.data.checklists) {
            if (checklist.tasks) {
                const task = checklist.tasks.find(t => t.id === taskId);
                if (task) {
                    return task;
                }
            }
        }
        return null;
    }

    // 模板操作
    async createTemplate(template) {
        template.id = Date.now().toString();
        template.createdAt = new Date().toISOString();
        
        this.data.templates.push(template);
        await this.saveData();
        
        return template;
    }

    async updateTemplate(templateId, updates) {
        const index = this.data.templates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            this.data.templates[index] = { ...this.data.templates[index], ...updates };
            await this.saveData();
            return this.data.templates[index];
        }
        return null;
    }

    async deleteTemplate(templateId) {
        const index = this.data.templates.findIndex(t => t.id === templateId);
        if (index !== -1) {
            this.data.templates.splice(index, 1);
            await this.saveData();
            return true;
        }
        return false;
    }

    getTemplate(templateId) {
        return this.data.templates.find(t => t.id === templateId);
    }

    getTemplates() {
        return this.data.templates;
    }

    // 设置操作
    async updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        await this.saveData();
        
        // 重新设置自动保存
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.setupAutoSave();
        
        return this.data.settings;
    }

    getSettings() {
        return this.data.settings;
    }

    // 数据导出和导入
    async exportData() {
        try {
            const exportData = {
                ...this.data,
                exportedAt: new Date().toISOString(),
                version: '1.0.0'
            };
            
            return JSON.stringify(exportData, null, 2);
            
        } catch (error) {
            console.error('导出数据失败:', error);
            throw error;
        }
    }

    async importData(dataString) {
        try {
            const importedData = JSON.parse(dataString);
            
            // 验证数据格式
            if (!importedData.checklists || !Array.isArray(importedData.checklists)) {
                throw new Error('无效的数据格式');
            }
            
            // 备份当前数据
            const backup = { ...this.data };
            
            try {
                // 导入数据
                this.data = {
                    checklists: importedData.checklists || [],
                    archivedChecklists: importedData.archivedChecklists || [],
                    templates: importedData.templates || [],
                    settings: { ...this.data.settings, ...importedData.settings }
                };
                
                await this.saveData();
                return true;
                
            } catch (error) {
                // 恢复备份数据
                this.data = backup;
                throw error;
            }
            
        } catch (error) {
            console.error('导入数据失败:', error);
            throw error;
        }
    }

    // 清理过期数据
    async cleanupData() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // 清理30天前的归档清单
            this.data.archivedChecklists = this.data.archivedChecklists.filter(checklist => {
                if (checklist.archivedAt) {
                    return new Date(checklist.archivedAt) > thirtyDaysAgo;
                }
                return true;
            });
            
            await this.saveData();
            
            console.log('数据清理完成');
            
        } catch (error) {
            console.error('数据清理失败:', error);
            throw error;
        }
    }

    // 销毁
    destroy() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
    }
}

export { MobileStorage };
