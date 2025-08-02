// 悬浮窗应用逻辑
class FloatingApp {
    constructor() {
        this.currentChecklist = null;
        this.tasksVisible = false;
        this.timerInterval = null;
        this.workTimeInterval = null;
        this.highFreqInterval = null; // 高频更新定时器
        this.currentTaskTimer = null;
        this.taskEventHandler = null;
        this.timerEventHandler = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadCurrentData();
        this.startWorkTimeUpdate();
        
        // 定期同步数据
        setInterval(() => {
            this.loadCurrentData();
        }, 5000); // 每5秒同步一次数据
    }

    setupEventListeners() {
        // 切换任务列表显示
        document.getElementById('toggleTasks').addEventListener('click', () => {
            this.toggleTasksList();
        });

        // 刷新任务
        document.getElementById('refreshTasks').addEventListener('click', () => {
            this.loadCurrentData();
        });

        // 打开主应用
        document.getElementById('openMainApp').addEventListener('click', () => {
            window.electronAPI.focusMainWindow();
        });

        // 最小化悬浮窗
        document.getElementById('minimizeFloat').addEventListener('click', () => {
            window.electronAPI.minimizeFloat();
        });
    }

    async loadCurrentData() {
        try {
            const data = await window.electronAPI.getFloatingData();
            this.updateCurrentChecklist(data.currentChecklist);
            this.updateTasksList(data.currentChecklist);
            
            // 更新进度条显示
            const workTime = await window.electronAPI.getCurrentWorkTime();
            this.updateFloatingProgress(workTime);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    }

    updateCurrentChecklist(checklist) {
        const nameElement = document.getElementById('currentChecklistName');
        
        if (!checklist) {
            nameElement.textContent = '无活动清单';
            this.currentChecklist = null;
            return;
        }

        this.currentChecklist = checklist;
        nameElement.textContent = checklist.name || '未命名清单';
    }

    updateTasksList(checklist) {
        const contentElement = document.getElementById('tasksContent');
        
        if (!checklist || !checklist.tasks || checklist.tasks.length === 0) {
            contentElement.innerHTML = `
                <div class="empty-tasks">
                    <div class="empty-icon">📝</div>
                    <div>暂无任务</div>
                </div>
            `;
            return;
        }

        const tasksHtml = checklist.tasks.map(task => this.createTaskItemHtml(task)).join('');
        contentElement.innerHTML = tasksHtml;

        // 使用事件委托来处理所有任务事件
        this.attachTaskEventListeners();
    }

    createTaskItemHtml(task) {
        const isRunning = task.isRunning;
        const timerIcon = isRunning ? '⏸️' : '▶️';
        const timerClass = isRunning ? 'running' : '';
        const workTime = this.formatTime(task.spentTime || 0);
        
        return `
            <div class="task-item" data-task-id="${task.id}">
                <input type="checkbox" 
                       class="task-checkbox" 
                       ${task.completed ? 'checked' : ''}
                       data-task-id="${task.id}">
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span class="work-time">已工作: ${workTime}</span>
                        ${task.type === 'countdown' ? `<span class="duration">目标: ${this.formatTime(task.duration)}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-timer-btn ${timerClass}" 
                            data-task-id="${task.id}"
                            title="${isRunning ? '暂停' : '开始'}计时">
                        ${timerIcon}
                    </button>
                </div>
            </div>
        `;
    }

    attachTaskEventListeners() {
        const contentElement = document.getElementById('tasksContent');
        
        // 移除之前的事件监听器（如果存在）
        if (this.taskEventHandler) {
            contentElement.removeEventListener('change', this.taskEventHandler);
            contentElement.removeEventListener('click', this.timerEventHandler);
        }
        
        // 创建事件处理器并保存引用
        this.taskEventHandler = async (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                const taskId = e.target.getAttribute('data-task-id');
                if (taskId) {
                    await this.toggleTaskComplete(taskId, e.target.checked);
                }
            }
        };

        this.timerEventHandler = async (e) => {
            if (e.target.classList.contains('task-timer-btn')) {
                const taskId = e.target.getAttribute('data-task-id');
                if (taskId) {
                    await this.toggleTaskTimer(taskId);
                }
            }
        };

        // 使用事件委托处理复选框和按钮点击
        contentElement.addEventListener('change', this.taskEventHandler);
        contentElement.addEventListener('click', this.timerEventHandler);
    }

    async toggleTaskComplete(taskId, completed) {
        try {
            await window.electronAPI.updateTaskStatus(taskId, { completed });
            // 延迟刷新，让主应用有时间处理
            setTimeout(() => this.loadCurrentData(), 200);
        } catch (error) {
            console.error('更新任务状态失败:', error);
        }
    }

    async toggleTaskTimer(taskId) {
        try {
            const result = await window.electronAPI.toggleTaskTimer(taskId);
            if (result.success) {
                // 立即刷新任务列表
                this.loadCurrentData();
            }
        } catch (error) {
            console.error('切换计时器失败:', error);
        }
    }

    toggleTasksList() {
        const tasksList = document.getElementById('tasksList');
        const toggleBtn = document.getElementById('toggleTasks');
        
        this.tasksVisible = !this.tasksVisible;
        
        if (this.tasksVisible) {
            tasksList.classList.remove('hidden');
            toggleBtn.textContent = '📋';
            toggleBtn.style.background = 'rgba(255, 255, 255, 0.3)';
            this.loadCurrentData(); // 展开时刷新数据
        } else {
            tasksList.classList.add('hidden');
            toggleBtn.textContent = '📋';
            toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
        }

        // 通知主进程调整窗口大小
        window.electronAPI.resizeFloatingWindow(this.tasksVisible);
    }

    startWorkTimeUpdate() {
        this.updateWorkTime();
        
        // 每秒更新工作时间
        this.workTimeInterval = setInterval(() => {
            this.updateWorkTime();
        }, 1000);
    }

    async updateWorkTime() {
        try {
            const workTime = await window.electronAPI.getCurrentWorkTime();
            const timeDisplay = document.getElementById('totalWorkTime');
            timeDisplay.textContent = this.formatTime(workTime || 0);
            
            // 更新进度条
            this.updateFloatingProgress(workTime);
            
            // 检查是否有正在运行的任务
            const runningTask = this.currentChecklist?.tasks?.find(t => t.isRunning);
            if (runningTask) {
                timeDisplay.parentElement.classList.add('running');
                
                // 如果有运行的任务但没有高频更新定时器，创建一个
                if (!this.highFreqInterval) {
                    this.highFreqInterval = setInterval(async () => {
                        const currentWorkTime = await window.electronAPI.getCurrentWorkTime();
                        timeDisplay.textContent = this.formatTime(currentWorkTime || 0);
                        this.updateFloatingProgress(currentWorkTime);
                    }, 100); // 每100ms更新一次，让数字更流畅
                }
            } else {
                timeDisplay.parentElement.classList.remove('running');
                
                // 如果没有运行的任务，清除高频更新定时器
                if (this.highFreqInterval) {
                    clearInterval(this.highFreqInterval);
                    this.highFreqInterval = null;
                }
            }
        } catch (error) {
            console.error('更新工作时间失败:', error);
        }
    }

    updateFloatingProgress(workTime) {
        const progressContainer = document.getElementById('floatingProgress');
        const progressFill = document.getElementById('floatingProgressFill');
        const progressText = document.getElementById('floatingProgressText');
        
        if (!progressContainer || !progressFill || !progressText) {
            return;
        }
        
        // 始终显示进度条
        progressContainer.style.display = 'flex';
        
        if (!this.currentChecklist || !this.currentChecklist.expectedWorkTime) {
            // 如果没有设置预期工作时间，显示已工作时间
            progressFill.style.width = '0%';
            progressFill.classList.remove('over-100', 'complete');
            progressText.textContent = this.formatTime(workTime || 0);
            return;
        }
        
        const expectedSeconds = this.currentChecklist.expectedWorkTime;
        const actualSeconds = workTime || 0;
        const percentage = Math.min((actualSeconds / expectedSeconds) * 100, 200); // 最多显示200%
        
        // 更新进度条宽度
        progressFill.style.width = `${Math.min(percentage, 100)}%`;
        
        // 更新进度条颜色状态
        progressFill.classList.remove('over-100', 'complete');
        
        if (percentage >= 100) {
            if (this.isChecklistComplete()) {
                progressFill.classList.add('complete');
            } else {
                progressFill.classList.add('over-100');
            }
        }
        
        // 更新百分比文本
        progressText.textContent = `${Math.round(percentage)}%`;
    }

    isChecklistComplete() {
        if (!this.currentChecklist || !this.currentChecklist.tasks) {
            return false;
        }
        
        const completedTasks = this.currentChecklist.tasks.filter(task => task.completed).length;
        const totalTasks = this.currentChecklist.tasks.length;
        
        return totalTasks > 0 && completedTasks === totalTasks;
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    destroy() {
        if (this.workTimeInterval) {
            clearInterval(this.workTimeInterval);
        }
        if (this.highFreqInterval) {
            clearInterval(this.highFreqInterval);
        }
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        if (this.currentTaskTimer) {
            clearInterval(this.currentTaskTimer);
        }
    }
}

// 初始化悬浮窗应用
let floatingApp;

document.addEventListener('DOMContentLoaded', () => {
    console.log('悬浮窗DOM加载完成，开始初始化应用...');
    try {
        floatingApp = new FloatingApp();
        console.log('悬浮窗应用初始化成功');
    } catch (error) {
        console.error('悬浮窗应用初始化失败:', error);
    }
});

// 窗口关闭时清理资源
window.addEventListener('beforeunload', () => {
    if (floatingApp) {
        floatingApp.destroy();
    }
});
