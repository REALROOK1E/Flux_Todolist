// 主应用控制器
class TodoApp {
    constructor() {
        this.data = {
            checklists: [],
            archivedChecklists: [],
            templates: [],
            settings: {},
            weeklyPlan: ''
        };
        this.currentView = 'checklists';
        this.currentChecklist = null;
        this.timers = new Map(); // 存储活跃的计时器
        
        this.init();
    }

    async init() {
        // 加载数据
        await this.loadData();
        
        // 初始化事件监听器
        this.initEventListeners();
        
        // 渲染初始视图
        this.renderChecklistsView();
        
        // 开始自动保存
        this.startAutoSave();
        
        // 启动实时更新系统
        this.startRealtimeUpdates();
        
        console.log('应用初始化完成');
    }

    async loadData() {
        try {
            const loadingNotification = this.showNotification('正在加载数据...', 'info');
            this.data = await window.electronAPI.getData();
            console.log('数据加载成功:', this.data);
            
            // 数据验证和修复
            this.validateAndFixData();
            
            // 移除加载通知
            if (loadingNotification && loadingNotification.remove) {
                loadingNotification.remove();
            }
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showNotification('加载数据失败，使用默认数据', 'error');
            // 使用默认数据结构
            this.data = {
                checklists: [],
                archivedChecklists: [],
                templates: [],
                settings: {}
            };
        }
    }

    // 数据验证和修复
    validateAndFixData() {
        console.log('[DATA_VALIDATION] Starting data validation and repair process');
        
        // 防止无限修复循环
        if (this._isValidating) {
            console.log('[DATA_VALIDATION] Already validating, skipping...');
            return;
        }
        this._isValidating = true;
        
        let hasChanges = false;
        
        // 确保必要的数据结构存在
        if (!this.data.checklists) this.data.checklists = [];
        if (!this.data.archivedChecklists) this.data.archivedChecklists = [];
        if (!this.data.templates) this.data.templates = [];
        if (!this.data.settings) this.data.settings = {};
        if (!this.data.weeklyPlan) this.data.weeklyPlan = '';
        
        console.log('[DATA_VALIDATION] Current data structure:', {
            checklists: this.data.checklists.length,
            archivedChecklists: this.data.archivedChecklists.length,
            templates: this.data.templates.length
        });

        // 验证清单数据
        this.data.checklists = this.data.checklists.filter(checklist => {
            if (!checklist || !checklist.id || !checklist.name) return false;
            if (!Array.isArray(checklist.tasks)) checklist.tasks = [];
            
            // 添加预期工作时间字段（如果不存在）
            if (typeof checklist.expectedWorkTime !== 'number') {
                console.log('[DATA_VALIDATION] Adding expectedWorkTime field to checklist:', checklist.name);
                checklist.expectedWorkTime = 0; // 默认为0，表示未设置
                hasChanges = true;
            }
            
            // 修复从模板创建但没有继承expectedWorkTime的清单（仅在首次加载时）
            if (checklist.expectedWorkTime === 0 && checklist.templateId && !checklist._expectedTimeFixed) {
                const template = this.data.templates.find(t => t.id === checklist.templateId);
                if (template && template.expectedWorkTime && template.expectedWorkTime > 0) {
                    checklist.expectedWorkTime = template.expectedWorkTime * 3600; // 模板是小时，转换为秒
                    checklist._expectedTimeFixed = true; // 标记已修复，避免重复修复
                    console.log('[DATA_VALIDATION] Fixed checklist expected work time inheritance:', {
                        checklistName: checklist.name,
                        templateName: template.name,
                        inheritedHours: template.expectedWorkTime,
                        inheritedSeconds: checklist.expectedWorkTime
                    });
                    hasChanges = true;
                }
            }
            
            // 验证任务数据
            checklist.tasks = checklist.tasks.filter(task => {
                if (!task || !task.id || !task.title) return false;
                if (typeof task.duration !== 'number') task.duration = 0;
                if (typeof task.spentTime !== 'number') task.spentTime = 0;
                if (typeof task.completed !== 'boolean') task.completed = false;
                if (typeof task.isRunning !== 'boolean') task.isRunning = false;
                if (!Array.isArray(task.subtasks)) task.subtasks = [];
                return true;
            });
            
            return true;
        });

        // 验证模板数据并添加预期工作时间
        let templatesModified = false;
        console.log('[DATA_VALIDATION] Validating templates...');
        
        this.data.templates = this.data.templates.map(template => {
            if (!template || !template.id || !template.name) return template;
            
            // 添加预期工作时间字段（如果不存在）
            if (typeof template.expectedWorkTime !== 'number') {
                templatesModified = true;
                template.expectedWorkTime = 0; // 默认0小时
            }
            
            // 确保任务数组存在
            if (!Array.isArray(template.tasks)) template.tasks = [];
            
            return template;
        });

        // 标记验证完成
        this._isValidating = false;
        
        console.log('[DATA_VALIDATION] Validation completed:', {
            hasChanges,
            templatesModified,
            willSave: hasChanges || templatesModified
        });
        
        // 只有在有修改时才保存，并且不在验证中
        if ((hasChanges || templatesModified) && !this._isSaving) {
            console.log('[DATA_VALIDATION] Changes detected, saving data...');
            this.saveDataDelayed();
        }

        console.log('[DATA_VALIDATION] Data validation process completed');
    }

    async saveData() {
        // 防止重复保存
        if (this._isSaving) return true;
        this._isSaving = true;
        
        try {
            await window.electronAPI.saveData(this.data);
            console.log('数据保存成功');
            return true;
        } catch (error) {
            console.error('保存数据失败:', error);
            this.showNotification('保存数据失败', 'error');
            return false;
        } finally {
            this._isSaving = false;
        }
    }

    // 防抖保存 - 避免频繁保存
    saveDataDelayed() {
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this.saveData();
        }, 1000);
    }

    // 防抖工具函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    startAutoSave() {
        // 每30秒自动保存一次
        this.autoSaveInterval = setInterval(() => {
            this.saveData();
        }, 30000);
    }

    // 启动实时更新系统
    startRealtimeUpdates() {
        // 每秒更新计时器显示和进度条
        this.realtimeUpdateInterval = setInterval(() => {
            this.updateRealtimeDisplays();
        }, 1000);
    }

    // 实时更新显示
    updateRealtimeDisplays() {
        if (!this.currentChecklist) return;

        let hasRunningTasks = false;
        let needsUpdate = false;

        // 更新正在运行的任务时间
        this.currentChecklist.tasks.forEach(task => {
            if (task.isRunning && task.startTime) {
                hasRunningTasks = true;
                const currentTime = Math.floor((Date.now() - task.startTime) / 1000);
                const newSpentTime = (task.spentTime || 0) + currentTime;
                
                // 更新计时器显示
                const timerDisplay = document.querySelector(`[data-task-id="${task.id}"].timer-display`);
                if (timerDisplay) {
                    if (task.type === 'countdown') {
                        const remaining = Math.max(0, task.duration - newSpentTime);
                        timerDisplay.textContent = this.formatTime(remaining);
                        if (remaining <= 0) {
                            timerDisplay.classList.add('expired');
                        }
                    } else {
                        timerDisplay.textContent = this.formatTime(newSpentTime);
                    }
                }
                
                // 更新任务元数据中的"已用"时间显示
                const taskElement = document.querySelector(`[data-id="${task.id}"]`);
                if (taskElement) {
                    const taskMetaSpans = taskElement.querySelectorAll('.task-meta span');
                    // 找到包含"已用:"的span元素
                    for (let span of taskMetaSpans) {
                        if (span.textContent.startsWith('已用:')) {
                            span.textContent = `已用: ${this.formatTime(newSpentTime)}`;
                            break;
                        }
                    }
                }
                
                needsUpdate = true;
            }
        });

        // 如果有正在运行的任务，更新统计信息和进度条
        if (hasRunningTasks && needsUpdate) {
            // 计算当前总花费时间（包括正在运行的任务）
            const totalSpentTime = this.calculateSpentTime(this.currentChecklist.tasks);
            
            // 更新统计显示
            const totalTimeElement = document.getElementById('totalTime');
            if (totalTimeElement) {
                totalTimeElement.textContent = `已工作: ${this.formatTime(totalSpentTime)}`;
            }
            
            // 更新进度条
            this.updateProgressBarDisplay(totalSpentTime, this.currentChecklist.expectedWorkTime);
        }
    }

    // 更新进度条显示
    updateProgressBarDisplay(spentTime, expectedWorkTime) {
        const progressSection = document.getElementById('progressSection');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressFill = document.getElementById('progressFill');
        
        if (!progressSection || !progressText || !progressPercentage || !progressFill) {
            return; // 如果元素不存在，直接返回
        }
        
        // 始终显示进度条
        progressSection.style.display = 'block';

        if (!expectedWorkTime || expectedWorkTime <= 0) {
            // 如果没有设置预期工作时间，显示空的进度条
            progressText.textContent = `工作进度 (未设置预期时间)`;
            progressPercentage.textContent = `已工作: ${this.formatTime(spentTime)}`;
            progressFill.style.width = '0%';
            progressFill.className = 'progress-fill';
            return;
        }

        // 计算进度百分比
        const progressPercent = Math.min((spentTime / expectedWorkTime) * 100, 100);
        const actualPercent = (spentTime / expectedWorkTime) * 100;

        // 更新文本
        progressText.textContent = `工作进度 (预期: ${this.formatTime(expectedWorkTime)})`;
        progressPercentage.textContent = `${Math.round(actualPercent)}%`;

        // 更新进度条
        progressFill.style.width = `${Math.min(progressPercent, 100)}%`;

        // 根据进度设置不同的样式
        progressFill.className = 'progress-fill';
        
        if (actualPercent >= 100) {
            // 检查是否所有任务都完成
            const completedTasks = this.currentChecklist.tasks.filter(task => task.completed).length;
            const totalTasks = this.currentChecklist.tasks.length;
            const allTasksCompleted = totalTasks > 0 && completedTasks === totalTasks;
            
            if (allTasksCompleted) {
                progressFill.classList.add('complete');
            } else {
                progressFill.classList.add('over-100');
            }
        }
    }

    // 清理资源
    cleanup() {
        // 清理自动保存定时器
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // 清理实时更新定时器
        if (this.realtimeUpdateInterval) {
            clearInterval(this.realtimeUpdateInterval);
        }
        
        // 清理所有任务计时器
        this.timers.forEach((timer, taskId) => {
            clearInterval(timer);
        });
        this.timers.clear();
        
        // 移除悬浮窗消息监听器
        window.electronAPI.removeTaskTimerListener();
        
        console.log('应用资源清理完成');
    }

    // 根据ID查找任务
    findTaskById(taskId) {
        for (let checklist of this.data.checklists) {
            if (checklist.tasks) {
                const task = checklist.tasks.find(t => t.id === taskId);
                if (task) return task;
            }
        }
        return null;
    }

    // 重新渲染当前视图
    renderCurrentView() {
        if (this.currentView === 'checklists') {
            this.renderChecklistsView();
        } else if (this.currentView === 'templates') {
            this.renderTemplatesView();
        } else if (this.currentView === 'checklist' && this.currentChecklist) {
            this.renderChecklistView(this.currentChecklist);
        }
    }

    initEventListeners() {
        // 监听悬浮窗计时器操作
        window.electronAPI.onTaskTimerUpdated((event, taskId, isRunning) => {
            console.log('收到悬浮窗计时器更新:', taskId, isRunning);
            // 同步主应用的计时器状态
            const task = this.findTaskById(taskId);
            if (task) {
                if (isRunning) {
                    this.startTaskTimer(taskId);
                } else {
                    this.stopTaskTimer(taskId);
                }
                // 更新UI显示
                this.renderCurrentView();
            }
        });

        // 顶部导航按钮
        document.getElementById('newChecklistBtn').addEventListener('click', () => {
            this.showCreateChecklistModal();
        });

        document.getElementById('templatesBtn').addEventListener('click', () => {
            this.showView('templates');
        });

        document.getElementById('statsBtn').addEventListener('click', () => {
            this.showView('stats');
        });

        document.getElementById('archiveBtn').addEventListener('click', () => {
            this.showView('archive');
        });

        document.getElementById('floatingBtn').addEventListener('click', async () => {
            try {
                await window.electronAPI.toggleFloatingWindow();
                this.showNotification('悬浮窗已切换', 'info');
            } catch (error) {
                console.error('切换悬浮窗失败:', error);
                this.showNotification('切换悬浮窗失败', 'error');
            }
        });

        // 本周计划相关
        document.getElementById('editWeeklyPlanBtn').addEventListener('click', () => {
            this.editWeeklyPlan();
        });

        document.getElementById('saveWeeklyPlanBtn').addEventListener('click', () => {
            this.saveWeeklyPlan();
        });

        document.getElementById('cancelWeeklyPlanBtn').addEventListener('click', () => {
            this.cancelWeeklyPlanEdit();
        });

        // 返回按钮
        document.getElementById('backBtn').addEventListener('click', () => {
            this.showView('checklists');
        });

        // 结束清单按钮
        document.getElementById('finishChecklistBtn').addEventListener('click', () => {
            this.finishCurrentChecklist();
        });

        // 模态框相关
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modalCancelBtn').addEventListener('click', () => {
            this.hideModal();
        });

        // 点击模态框外部不会关闭，只有特定操作才能关闭
        document.getElementById('modal').addEventListener('click', (e) => {
            // 移除自动关闭功能，用户必须明确点击关闭按钮
            e.stopPropagation();
        });

        // 阻止模态框内容区域的点击事件冒泡
        document.querySelector('.modal-content').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // 移除 Escape 键关闭模态框功能，防止误操作
            // 用户必须明确点击关闭按钮
            
            // Ctrl+S 保存数据
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                // 如果正在编辑本周计划，保存本周计划
                const weeklyPlanEdit = document.getElementById('weeklyPlanEdit');
                if (weeklyPlanEdit && !weeklyPlanEdit.classList.contains('hidden')) {
                    this.saveWeeklyPlan();
                } else {
                    this.saveData();
                    this.showNotification('数据已保存', 'success');
                }
                return;
            }
            
            // Ctrl+N 新建清单
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                if (this.currentView === 'checklists') {
                    this.showCreateChecklistModal();
                } else if (this.currentView === 'templates') {
                    this.showCreateTemplateModal();
                }
                return;
            }
            
            // Ctrl+E 编辑本周计划 (仅在清单视图下)
            if (e.ctrlKey && e.key === 'e' && this.currentView === 'checklists') {
                e.preventDefault();
                this.editWeeklyPlan();
                return;
            }
            
            // F1 显示帮助
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelpModal();
                return;
            }
            
            // 数字键快速导航
            if (e.altKey && !isNaN(parseInt(e.key))) {
                e.preventDefault();
                const views = ['checklists', 'templates', 'stats', 'archive'];
                const index = parseInt(e.key) - 1;
                if (index >= 0 && index < views.length) {
                    this.showView(views[index]);
                }
                return;
            }
            
            // Enter 键在模态框中确认
            if (e.key === 'Enter' && !document.getElementById('modal').classList.contains('hidden')) {
                const confirmBtn = document.getElementById('modalConfirmBtn');
                if (confirmBtn && confirmBtn.style.display !== 'none') {
                    confirmBtn.click();
                }
                return;
            }
        });

        // 添加页面卸载时的清理
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }

    showView(viewName) {
        // 隐藏所有视图
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // 显示指定视图
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;

            // 根据视图类型渲染内容
            switch (viewName) {
                case 'checklists':
                    this.renderChecklistsView();
                    break;
                case 'templates':
                    this.renderTemplatesView();
                    break;
                case 'stats':
                    this.renderStatsView();
                    break;
                case 'archive':
                    this.renderArchiveView();
                    break;
                case 'checklistDetail':
                    this.renderChecklistDetailView();
                    break;
            }
        }
    }

    renderChecklistsView() {
        // 渲染本周计划
        this.renderWeeklyPlan();
        
        const container = document.getElementById('checklistsList');
        const emptyState = document.getElementById('emptyState');

        if (this.data.checklists.length === 0) {
            container.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        
        container.innerHTML = this.data.checklists.map(checklist => {
            const completedTasks = checklist.tasks.filter(task => task.completed).length;
            const totalTasks = checklist.tasks.length;
            const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            
            // 只显示实际工作时间
            const spentTime = this.calculateSpentTime(checklist.tasks);

            return `
                <div class="checklist-card" data-id="${checklist.id}">
                    <div class="checklist-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 class="checklist-title" style="margin: 0;">${checklist.name}</h3>
                        <button class="pixel-btn btn-danger btn-sm" onclick="app.deleteChecklist('${checklist.id}')" title="删除清单" style="margin-left: 10px;">🗑</button>
                    </div>
                    ${checklist.description ? `<p class="checklist-description">${checklist.description}</p>` : ''}
                    <div class="checklist-meta">
                        <span>创建于: ${new Date(checklist.createdAt).toLocaleDateString()}</span>
                        <span>任务: ${completedTasks}/${totalTasks}</span>
                    </div>
                    <div class="checklist-progress">
                        <div class="progress-bar" style="width: ${progressPercent}%">
                            <span class="progress-text">${Math.round(progressPercent)}%</span>
                        </div>
                    </div>
                    <div class="checklist-stats">
                        <span class="stat highlight">已工作: ${this.formatTime(spentTime)}</span>
                    </div>
                </div>
            `;
        }).join('');

        // 添加点击事件
        container.querySelectorAll('.checklist-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果点击的是删除按钮，不要打开清单
                if (e.target.closest('.pixel-btn')) {
                    return;
                }
                const checklistId = e.currentTarget.dataset.id;
                this.openChecklist(checklistId);
            });
        });
    }

    openChecklist(checklistId) {
        this.currentChecklist = this.data.checklists.find(c => c.id === checklistId);
        if (this.currentChecklist) {
            this.showView('checklistDetail');
        }
    }

    async finishCurrentChecklist() {
        if (!this.currentChecklist) return;

        const result = await this.showConfirmModal(
            '结束清单',
            `确定要结束清单"${this.currentChecklist.name}"吗？清单将被归档，无法继续编辑。`
        );

        if (result) {
            try {
                // 停止所有正在运行的计时器
                this.currentChecklist.tasks.forEach(task => {
                    if (task.isRunning) {
                        this.stopTaskTimer(task.id);
                    }
                });

                // 归档清单
                await window.electronAPI.archiveChecklist(this.currentChecklist.id);
                
                // 从本地数据中移除
                const index = this.data.checklists.findIndex(c => c.id === this.currentChecklist.id);
                if (index !== -1) {
                    const archivedChecklist = this.data.checklists.splice(index, 1)[0];
                    archivedChecklist.status = 'archived';
                    archivedChecklist.archivedAt = new Date().toISOString();
                    this.data.archivedChecklists.push(archivedChecklist);
                }

                this.showNotification('清单已归档', 'success');
                this.showView('checklists');
            } catch (error) {
                console.error('归档清单失败:', error);
                this.showNotification('归档清单失败', 'error');
            }
        }
    }

    calculateTotalTime(tasks) {
        return tasks.reduce((total, task) => total + (task.duration || 0), 0);
    }

    calculateSpentTime(tasks) {
        return tasks.reduce((total, task) => {
            let taskTime = task.spentTime || 0;
            
            // 如果任务正在运行，加上当前运行时间
            if (task.isRunning && task.startTime) {
                const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
                taskTime += sessionTime;
            }
            
            return total + taskTime;
        }, 0);
    }

    formatTime(seconds) {
        // 确保 seconds 是整数
        const totalSeconds = Math.round(seconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showModal(title, body, showFooter = true) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = modal.querySelector('.modal-footer');

        modalTitle.textContent = title;
        modalBody.innerHTML = body;
        modalFooter.style.display = showFooter ? 'flex' : 'none';
        modal.classList.remove('hidden');

        // 防止模态框标题区域的事件干扰
        const modalHeader = modal.querySelector('.modal-header');
        modalHeader.addEventListener('mousedown', (e) => {
            e.stopPropagation();
        });
        
        modalHeader.addEventListener('mousemove', (e) => {
            e.stopPropagation();
        });
    }

    hideModal() {
        document.getElementById('modal').classList.add('hidden');
    }

    async showConfirmModal(title, message) {
        return new Promise((resolve) => {
            this.showModal(title, `<p>${message}</p>`);
            
            const confirmBtn = document.getElementById('modalConfirmBtn');
            const cancelBtn = document.getElementById('modalCancelBtn');
            
            const handleConfirm = () => {
                cleanup();
                resolve(true);
            };
            
            const handleCancel = () => {
                cleanup();
                resolve(false);
            };
            
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                this.hideModal();
            };
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }

    showNotification(message, type = 'info', duration = 3000) {
        const container = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // 添加图标
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        
        notification.innerHTML = `
            <span class="notification-icon">${icons[type] || icons.info}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(notification);
        
        // 添加进入动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // 自动移除
        const removeTimer = setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, duration);
        
        // 返回通知元素，允许手动控制
        notification.removeTimer = removeTimer;
        return notification;
    }

    // 创建清单相关方法将在 checklist.js 中实现
    showCreateChecklistModal() {
        // 这个方法将在 checklist.js 中实现
        console.log('显示创建清单模态框');
    }

    // 模板和归档视图渲染方法将在对应的文件中实现
    renderTemplatesView() {
        console.log('渲染模板视图');
    }

    renderStatsView() {
        // 计算统计数据
        const allChecklists = [...this.data.checklists, ...(this.data.archivedChecklists || [])];
        const completedChecklists = this.data.archivedChecklists || [];
        
        // 计算任务统计
        let totalTasks = 0;
        let completedTasks = 0;
        let totalWorkTime = 0;
        
        allChecklists.forEach(checklist => {
            totalTasks += checklist.tasks.length;
            completedTasks += checklist.tasks.filter(task => task.completed).length;
            totalWorkTime += this.calculateSpentTime(checklist.tasks);
        });

        // 计算平均清单工作时间（取整到秒）
        const averageWorkTime = allChecklists.length > 0 ? Math.round(totalWorkTime / allChecklists.length) : 0;

        // 更新统计数值
        document.getElementById('totalChecklists').textContent = allChecklists.length;
        document.getElementById('completedChecklists').textContent = completedChecklists.length;
        document.getElementById('totalTasks').textContent = totalTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('totalWorkTime').textContent = this.formatTime(totalWorkTime);
        document.getElementById('averageWorkTime').textContent = this.formatTime(averageWorkTime);

        // 计算完成率
        const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const checklistCompletionRate = allChecklists.length > 0 ? Math.round((completedChecklists.length / allChecklists.length) * 100) : 0;
        
        document.getElementById('taskCompletionRate').textContent = `${taskCompletionRate}%`;
        document.getElementById('checklistCompletionRate').textContent = `${checklistCompletionRate}%`;

        // 渲染最近完成的清单
        this.renderRecentCompletedChecklists();
    }

    renderRecentCompletedChecklists() {
        const container = document.getElementById('recentCompletedChecklists');
        const completedChecklists = (this.data.archivedChecklists || []).slice(-5); // 最近5个

        if (completedChecklists.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 40px 20px;">
                    <div class="empty-icon">📋</div>
                    <h3>暂无已完成的清单</h3>
                    <p>完成一些清单后，它们将在这里显示</p>
                </div>
            `;
            return;
        }

        container.innerHTML = completedChecklists.map(checklist => {
            const completedTasks = checklist.tasks.filter(task => task.completed).length;
            const totalTasks = checklist.tasks.length;
            const spentTime = this.calculateSpentTime(checklist.tasks);
            const finishedDate = new Date(checklist.finishedAt || checklist.createdAt);

            return `
                <div class="archived-item" style="opacity: 1;">
                    <div class="archived-header">
                        <h4 class="archived-title">${checklist.name}</h4>
                        <span class="archived-date">${finishedDate.toLocaleDateString()}</span>
                    </div>
                    ${checklist.description ? `<p style="color: var(--gray-600); margin: 8px 0; font-size: 14px;">${checklist.description}</p>` : ''}
                    <div class="archived-stats">
                        <span>✅ 任务: ${completedTasks}/${totalTasks}</span>
                        <span>⏱️ 用时: ${this.formatTime(spentTime)}</span>
                        <span>📅 完成率: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderArchiveView() {
        console.log('渲染归档视图');
    }

    renderChecklistDetailView() {
        console.log('渲染清单详情视图');
    }

    async deleteChecklist(checklistId) {
        const checklist = this.data.checklists.find(c => c.id === checklistId);
        if (!checklist) return;

        // 确认删除
        if (!confirm(`确定要删除清单"${checklist.name}"吗？此操作无法撤销。`)) {
            return;
        }

        try {
            // 从数据中移除
            this.data.checklists = this.data.checklists.filter(c => c.id !== checklistId);
            
            // 保存数据
            await this.saveData();
            
            // 重新渲染清单列表
            this.renderChecklistsView();
            
            this.showNotification(`清单"${checklist.name}"已删除`);
        } catch (error) {
            console.error('删除清单失败:', error);
            this.showNotification('删除清单失败', 'error');
        }
    }

    // 本周计划相关方法
    renderWeeklyPlan() {
        const displayElement = document.getElementById('weeklyPlanDisplay');
        const plan = this.data.weeklyPlan || '';
        
        if (plan.trim()) {
            displayElement.textContent = plan;
            displayElement.classList.remove('empty');
        } else {
            displayElement.textContent = '点击编辑按钮添加本周计划...';
            displayElement.classList.add('empty');
        }
    }

    editWeeklyPlan() {
        const displayElement = document.getElementById('weeklyPlanDisplay');
        const editElement = document.getElementById('weeklyPlanEdit');
        const textarea = document.getElementById('weeklyPlanTextarea');
        
        // 显示编辑界面
        displayElement.classList.add('hidden');
        editElement.classList.remove('hidden');
        
        // 设置当前内容
        textarea.value = this.data.weeklyPlan || '';
        
        // 聚焦到文本区域
        setTimeout(() => {
            textarea.focus();
        }, 100);
    }

    async saveWeeklyPlan() {
        const textarea = document.getElementById('weeklyPlanTextarea');
        const newPlan = textarea.value.trim();
        
        try {
            // 保存到数据
            this.data.weeklyPlan = newPlan;
            await this.saveData();
            
            // 隐藏编辑界面，显示内容
            this.cancelWeeklyPlanEdit();
            
            // 重新渲染
            this.renderWeeklyPlan();
            
            this.showNotification('本周计划已保存', 'success');
        } catch (error) {
            console.error('保存本周计划失败:', error);
            this.showNotification('保存失败', 'error');
        }
    }

    cancelWeeklyPlanEdit() {
        const displayElement = document.getElementById('weeklyPlanDisplay');
        const editElement = document.getElementById('weeklyPlanEdit');
        
        // 隐藏编辑界面，显示内容
        editElement.classList.add('hidden');
        displayElement.classList.remove('hidden');
    }
}

// 应用实例
let app;

// 当DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app = new TodoApp();
});
