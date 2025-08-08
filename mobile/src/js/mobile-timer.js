import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

class MobileTimer {
    constructor(storage) {
        this.storage = storage;
        this.activeTimers = new Map();
        this.onTimerUpdate = null;
        this.onTimerComplete = null;
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        // 启动计时器更新循环
        this.startUpdateLoop();
        
        // 恢复之前运行的计时器
        this.restoreTimers();
    }

    startUpdateLoop() {
        // 每秒更新一次计时器
        this.updateInterval = setInterval(() => {
            this.updateActiveTimers();
        }, 1000);
    }

    updateActiveTimers() {
        for (let [taskId, timerData] of this.activeTimers) {
            const task = this.storage.getTask(taskId);
            if (!task || !task.isRunning) {
                this.activeTimers.delete(taskId);
                continue;
            }

            const currentTime = this.getCurrentTime(taskId);
            
            // 触发更新回调
            if (this.onTimerUpdate) {
                this.onTimerUpdate(taskId, {
                    currentTime,
                    task,
                    type: task.type
                });
            }

            // 检查倒计时是否结束
            if (task.type === 'countdown' && task.estimatedTime) {
                const remainingTime = task.estimatedTime - (task.spentTime || 0);
                if (remainingTime <= 0) {
                    this.completeTimer(taskId);
                }
            }
        }
    }

    async restoreTimers() {
        const data = this.storage.getData();
        for (let checklist of data.checklists) {
            if (checklist.tasks) {
                for (let task of checklist.tasks) {
                    if (task.isRunning && task.startTime) {
                        this.activeTimers.set(task.id, {
                            startTime: task.startTime,
                            type: task.type || 'stopwatch'
                        });
                    }
                }
            }
        }
    }

    async startTask(taskId) {
        try {
            const task = this.storage.getTask(taskId);
            if (!task) {
                throw new Error('任务不存在');
            }

            // 停止其他正在运行的任务
            await this.stopAllTasks();

            // 启动新任务
            const startTime = Date.now();
            
            await this.storage.updateTask(taskId, {
                isRunning: true,
                startTime: startTime,
                status: 'in-progress'
            });

            this.activeTimers.set(taskId, {
                startTime: startTime,
                type: task.type || 'stopwatch'
            });

            // 触觉反馈
            this.triggerHaptic();

            // 显示通知
            mobileApp.utils.showNotification(`开始计时: ${task.title}`, 'success');

            return true;

        } catch (error) {
            console.error('启动计时失败:', error);
            mobileApp.utils.showNotification('启动计时失败', 'error');
            return false;
        }
    }

    async stopTask(taskId) {
        try {
            const task = this.storage.getTask(taskId);
            if (!task) {
                throw new Error('任务不存在');
            }

            if (!task.isRunning) {
                return true;
            }

            // 计算本次会话时间
            const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
            const newSpentTime = (task.spentTime || 0) + sessionTime;

            await this.storage.updateTask(taskId, {
                isRunning: false,
                startTime: null,
                spentTime: newSpentTime
            });

            // 移除活动计时器
            this.activeTimers.delete(taskId);

            // 触觉反馈
            this.triggerHaptic();

            // 显示通知
            mobileApp.utils.showNotification(
                `停止计时: ${task.title} (本次 ${this.formatTime(sessionTime)})`, 
                'success'
            );

            return true;

        } catch (error) {
            console.error('停止计时失败:', error);
            mobileApp.utils.showNotification('停止计时失败', 'error');
            return false;
        }
    }

    async toggleTask(taskId) {
        const task = this.storage.getTask(taskId);
        if (!task) return false;

        if (task.isRunning) {
            return await this.stopTask(taskId);
        } else {
            return await this.startTask(taskId);
        }
    }

    async stopAllTasks() {
        const runningTasks = this.getRunningTasks();
        for (let task of runningTasks) {
            await this.stopTask(task.id);
        }
    }

    async completeTimer(taskId) {
        try {
            const task = this.storage.getTask(taskId);
            if (!task) return;

            await this.stopTask(taskId);

            // 显示完成通知
            await this.showCompletionNotification(task);

            // 触发完成回调
            if (this.onTimerComplete) {
                this.onTimerComplete(taskId);
            }

            // 强烈触觉反馈
            this.triggerHaptic(ImpactStyle.Heavy);

        } catch (error) {
            console.error('完成计时失败:', error);
        }
    }

    async showCompletionNotification(task) {
        try {
            // 尝试显示本地通知
            await LocalNotifications.schedule({
                notifications: [{
                    title: '计时完成！',
                    body: `任务 "${task.title}" 已完成`,
                    id: Date.now(),
                    schedule: { at: new Date(Date.now() + 1000) },
                    sound: 'default',
                    attachments: [],
                    actionTypeId: '',
                    extra: null
                }]
            });
        } catch (error) {
            console.warn('本地通知不可用:', error);
            // 退回到应用内通知
            mobileApp.utils.showNotification(`计时完成: ${task.title}`, 'success');
        }
    }

    getCurrentTime(taskId) {
        const task = this.storage.getTask(taskId);
        if (!task) return 0;

        let currentTime = task.spentTime || 0;

        if (task.isRunning && task.startTime) {
            const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
            currentTime += sessionTime;
        }

        return currentTime;
    }

    getRemainingTime(taskId) {
        const task = this.storage.getTask(taskId);
        if (!task || !task.estimatedTime || task.type !== 'countdown') {
            return 0;
        }

        const currentTime = this.getCurrentTime(taskId);
        return Math.max(0, task.estimatedTime - currentTime);
    }

    getRunningTasks() {
        const data = this.storage.getData();
        const runningTasks = [];

        for (let checklist of data.checklists) {
            if (checklist.tasks) {
                for (let task of checklist.tasks) {
                    if (task.isRunning) {
                        runningTasks.push(task);
                    }
                }
            }
        }

        return runningTasks;
    }

    async renderTimerPage() {
        const data = this.storage.getData();
        const runningTasks = this.getRunningTasks();
        const recentTasks = this.getRecentTasks();

        return `
            <div class="timer-page">
                <!-- 当前计时器 -->
                ${runningTasks.length > 0 ? `
                    <ion-card class="pixel-card current-timer">
                        <ion-card-header>
                            <ion-card-title class="pixel-font">正在进行</ion-card-title>
                        </ion-card-header>
                        <ion-card-content>
                            ${runningTasks.map(task => this.renderActiveTimer(task)).join('')}
                        </ion-card-content>
                    </ion-card>
                ` : `
                    <ion-card class="pixel-card">
                        <ion-card-content>
                            <div class="no-timer-state">
                                <ion-icon name="timer-outline" size="large"></ion-icon>
                                <h3>暂无计时器运行</h3>
                                <p>选择一个任务开始计时</p>
                            </div>
                        </ion-card-content>
                    </ion-card>
                `}

                <!-- 快速计时器 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">快速计时</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <div class="quick-timers">
                            <button class="pixel-button" onclick="mobileApp.startQuickTimer(900)">
                                15分钟
                            </button>
                            <button class="pixel-button" onclick="mobileApp.startQuickTimer(1800)">
                                30分钟
                            </button>
                            <button class="pixel-button" onclick="mobileApp.startQuickTimer(3600)">
                                1小时
                            </button>
                            <button class="pixel-button" onclick="mobileApp.showCustomTimerModal()">
                                自定义
                            </button>
                        </div>
                    </ion-card-content>
                </ion-card>

                <!-- 最近任务 -->
                ${recentTasks.length > 0 ? `
                    <ion-card class="pixel-card">
                        <ion-card-header>
                            <ion-card-title class="pixel-font">最近任务</ion-card-title>
                        </ion-card-header>
                        <ion-card-content>
                            <ion-list>
                                ${recentTasks.map(task => this.renderRecentTask(task)).join('')}
                            </ion-list>
                        </ion-card-content>
                    </ion-card>
                ` : ''}

                <!-- 今日统计 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">今日统计</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        ${this.renderTodayStats()}
                    </ion-card-content>
                </ion-card>
            </div>
        `;
    }

    renderActiveTimer(task) {
        const currentTime = this.getCurrentTime(task.id);
        const isCountdown = task.type === 'countdown';
        const displayTime = isCountdown ? this.getRemainingTime(task.id) : currentTime;
        const progress = isCountdown && task.estimatedTime ? 
            ((task.estimatedTime - displayTime) / task.estimatedTime) * 100 : 0;

        return `
            <div class="active-timer" data-task-id="${task.id}">
                <div class="timer-header">
                    <h3>${task.title}</h3>
                    <span class="timer-type ${task.type || 'stopwatch'}">${isCountdown ? '倒计时' : '正计时'}</span>
                </div>
                
                <div class="time-display pixel-timer" id="timer-${task.id}">
                    ${this.formatTime(displayTime)}
                </div>
                
                ${isCountdown && task.estimatedTime ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                ` : ''}
                
                <div class="timer-controls">
                    <button class="pixel-button danger" onclick="mobileApp.timer.stopTask('${task.id}')">
                        停止
                    </button>
                    <button class="pixel-button" onclick="mobileApp.pauseTask('${task.id}')">
                        暂停
                    </button>
                    <button class="pixel-button" onclick="mobileApp.editTaskTime('${task.id}')">
                        调整
                    </button>
                </div>
            </div>
        `;
    }

    renderRecentTask(task) {
        const isRunning = task.isRunning;
        const timeDisplay = this.formatTime(task.spentTime || 0);

        return `
            <ion-item class="recent-task ${isRunning ? 'running' : ''}">
                <div slot="start" class="task-status">
                    ${isRunning ? '▶' : '⏸'}
                </div>
                <ion-label>
                    <h3>${task.title}</h3>
                    <p>${task.type === 'countdown' ? '倒计时' : '正计时'} · ${timeDisplay}</p>
                </ion-label>
                <div slot="end">
                    <button class="pixel-button ${isRunning ? 'danger' : 'primary'} small" 
                            onclick="mobileApp.timer.toggleTask('${task.id}')">
                        ${isRunning ? '停止' : '开始'}
                    </button>
                </div>
            </ion-item>
        `;
    }

    renderTodayStats() {
        const stats = this.getTodayStats();
        
        return `
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value">${this.formatTime(stats.totalTime)}</span>
                    <span class="stat-label">总计时</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.sessionCount}</span>
                    <span class="stat-label">计时次数</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${this.formatTime(stats.averageSession)}</span>
                    <span class="stat-label">平均时长</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.completedTasks}</span>
                    <span class="stat-label">完成任务</span>
                </div>
            </div>
        `;
    }

    getRecentTasks() {
        const data = this.storage.getData();
        const allTasks = [];

        for (let checklist of data.checklists) {
            if (checklist.tasks) {
                allTasks.push(...checklist.tasks);
            }
        }

        // 按最近活动时间排序
        return allTasks
            .filter(task => task.spentTime > 0 || task.isRunning)
            .sort((a, b) => {
                const aTime = a.lastActive || a.startTime || 0;
                const bTime = b.lastActive || b.startTime || 0;
                return bTime - aTime;
            })
            .slice(0, 5);
    }

    getTodayStats() {
        // 实现今日统计逻辑
        const today = new Date().toDateString();
        const data = this.storage.getData();
        
        let totalTime = 0;
        let sessionCount = 0;
        let completedTasks = 0;

        for (let checklist of data.checklists) {
            if (checklist.tasks) {
                for (let task of checklist.tasks) {
                    // 简化实现，实际应该基于日期过滤
                    if (task.spentTime > 0) {
                        totalTime += task.spentTime;
                        sessionCount++;
                    }
                    if (task.status === 'completed') {
                        completedTasks++;
                    }
                }
            }
        }

        return {
            totalTime,
            sessionCount,
            averageSession: sessionCount > 0 ? Math.floor(totalTime / sessionCount) : 0,
            completedTasks
        };
    }

    bindEvents() {
        // 绑定计时器页面特定事件
        console.log('绑定计时器页面事件');
    }

    formatTime(seconds) {
        if (!seconds || seconds < 0) return '00:00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    async triggerHaptic(style = ImpactStyle.Light) {
        try {
            await Haptics.impact({ style });
        } catch (error) {
            console.warn('触觉反馈不可用:', error);
        }
    }

    resumeTimers() {
        // 恢复计时器（应用恢复时调用）
        this.restoreTimers();
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.activeTimers.clear();
    }
}

export { MobileTimer };
