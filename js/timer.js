// 计时器相关功能扩展
Object.assign(TodoApp.prototype, {
    // 初始化计时器系统
    initTimerSystem() {
        // 页面可见性变化处理
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.handlePageHidden();
            } else {
                this.handlePageVisible();
            }
        });

        // 窗口焦点变化处理
        window.addEventListener('focus', () => {
            this.syncTimers();
        });

        window.addEventListener('blur', () => {
            this.saveTimerStates();
        });

        // 定期同步计时器（防止时间漂移）
        setInterval(() => {
            this.syncTimers();
        }, 10000); // 每10秒同步一次
    },

    handlePageHidden() {
        // 页面隐藏时保存所有计时器状态
        this.saveTimerStates();
    },

    handlePageVisible() {
        // 页面重新可见时同步计时器
        this.syncTimers();
    },

    saveTimerStates() {
        if (!this.currentChecklist) return;

        // 保存所有正在运行的任务的时间状态
        this.currentChecklist.tasks.forEach(task => {
            if (task.isRunning && task.startTime) {
                const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
                task.spentTime += sessionTime;
                task.startTime = Date.now(); // 重置开始时间
            }
        });

        this.saveChecklistChanges();
    },

    syncTimers() {
        if (!this.currentChecklist) return;

        let hasChanges = false;

        this.currentChecklist.tasks.forEach(task => {
            if (task.isRunning && task.startTime) {
                // 同步时间，防止因为页面暂停导致的时间不准确
                const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
                
                // 如果时间差异较大，说明可能页面被暂停了
                if (sessionTime > 2) {
                    task.spentTime += sessionTime;
                    task.startTime = Date.now();
                    hasChanges = true;
                }

                // 检查倒计时是否超时
                if (task.type === 'countdown' && task.spentTime >= task.duration) {
                    this.stopTaskTimer(task.id);
                    this.showNotification(`倒计时完成: ${task.title}`, 'success');
                    this.playNotificationSound();
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            this.renderTasksList();
            this.updateChecklistStats();
        }
    },

    // 批量计时器操作
    stopAllTimers() {
        if (!this.currentChecklist) return;

        let stoppedCount = 0;
        this.currentChecklist.tasks.forEach(task => {
            if (task.isRunning) {
                this.stopTaskTimer(task.id);
                stoppedCount++;
            }
        });

        if (stoppedCount > 0) {
            this.showNotification(`已停止 ${stoppedCount} 个计时器`, 'info');
        }
    },

    // 计时器统计
    getTimerStats() {
        if (!this.currentChecklist) return null;

        const stats = {
            total: this.currentChecklist.tasks.length,
            running: 0,
            completed: 0,
            overdue: 0,
            totalTime: 0,
            spentTime: 0,
            avgProgress: 0
        };

        this.currentChecklist.tasks.forEach(task => {
            if (task.isRunning) stats.running++;
            if (task.completed) stats.completed++;
            if (task.type === 'countdown' && task.spentTime > task.duration) stats.overdue++;
            
            stats.totalTime += task.duration;
            stats.spentTime += task.spentTime;
        });

        stats.avgProgress = stats.totalTime > 0 ? (stats.spentTime / stats.totalTime) * 100 : 0;

        return stats;
    },

    // 显示计时器统计信息
    showTimerStats() {
        const stats = this.getTimerStats();
        if (!stats) return;

        const modalBody = `
            <div class="stats-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div class="stat-item" style="text-align: center; padding: 15px; background: #1a1a1a; border: 2px solid #444; border-radius: 4px;">
                    <div style="font-size: 24px; font-weight: bold; color: #00ff00;">${stats.total}</div>
                    <div style="color: #aaa;">总任务数</div>
                </div>
                <div class="stat-item" style="text-align: center; padding: 15px; background: #1a1a1a; border: 2px solid #444; border-radius: 4px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ffff00;">${stats.running}</div>
                    <div style="color: #aaa;">运行中</div>
                </div>
                <div class="stat-item" style="text-align: center; padding: 15px; background: #1a1a1a; border: 2px solid #444; border-radius: 4px;">
                    <div style="font-size: 24px; font-weight: bold; color: #00aa00;">${stats.completed}</div>
                    <div style="color: #aaa;">已完成</div>
                </div>
                <div class="stat-item" style="text-align: center; padding: 15px; background: #1a1a1a; border: 2px solid #444; border-radius: 4px;">
                    <div style="font-size: 24px; font-weight: bold; color: #ff6600;">${stats.overdue}</div>
                    <div style="color: #aaa;">超时</div>
                </div>
            </div>
            <div class="time-stats" style="margin-bottom: 20px;">
                <div style="margin-bottom: 10px;">
                    <strong>总预计时长:</strong> ${this.formatTime(stats.totalTime)}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>已用时长:</strong> ${this.formatTime(stats.spentTime)}
                </div>
                <div style="margin-bottom: 10px;">
                    <strong>剩余时长:</strong> ${this.formatTime(Math.max(0, stats.totalTime - stats.spentTime))}
                </div>
                <div>
                    <strong>平均进度:</strong> ${Math.round(stats.avgProgress)}%
                </div>
            </div>
            <div class="progress-bar" style="background: #444; height: 20px; border-radius: 4px; overflow: hidden;">
                <div style="height: 100%; background: linear-gradient(90deg, #00ff00, #88ff88); width: ${stats.avgProgress}%; transition: width 0.3s ease;"></div>
            </div>
        `;

        this.showModal('计时器统计', modalBody, false);
    },

    // 导出计时记录
    exportTimingData() {
        if (!this.currentChecklist) return;

        const exportData = {
            checklistName: this.currentChecklist.name,
            exportDate: new Date().toISOString(),
            tasks: this.currentChecklist.tasks.map(task => ({
                title: task.title,
                type: task.type,
                duration: task.duration,
                spentTime: task.spentTime,
                completed: task.completed,
                efficiency: task.duration > 0 ? (task.spentTime / task.duration) * 100 : 0,
                status: task.completed ? '已完成' : 
                       task.isRunning ? '运行中' : 
                       task.type === 'countdown' && task.spentTime >= task.duration ? '超时' : '未开始'
            })),
            summary: this.getTimerStats()
        };

        // 创建并下载 JSON 文件
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.currentChecklist.name}_计时记录_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('计时记录已导出', 'success');
    },

    // 时间格式化增强
    formatTimeDetailed(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        const parts = [];
        if (hours > 0) parts.push(`${hours}小时`);
        if (minutes > 0) parts.push(`${minutes}分钟`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
        
        return parts.join('');
    },

    // 时间输入解析
    parseTimeInput(input) {
        // 支持多种时间格式: "1:30:00", "90分钟", "1.5小时" 等
        const str = input.toLowerCase().trim();
        
        // HH:MM:SS 格式
        const timeMatch = str.match(/^(\d+):(\d+):(\d+)$/);
        if (timeMatch) {
            const [, hours, minutes, seconds] = timeMatch;
            return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        }
        
        // HH:MM 格式
        const shortTimeMatch = str.match(/^(\d+):(\d+)$/);
        if (shortTimeMatch) {
            const [, hours, minutes] = shortTimeMatch;
            return parseInt(hours) * 3600 + parseInt(minutes) * 60;
        }
        
        // 中文格式
        let totalSeconds = 0;
        
        const hoursMatch = str.match(/(\d+(?:\.\d+)?)小时/);
        if (hoursMatch) {
            totalSeconds += parseFloat(hoursMatch[1]) * 3600;
        }
        
        const minutesMatch = str.match(/(\d+(?:\.\d+)?)分钟/);
        if (minutesMatch) {
            totalSeconds += parseFloat(minutesMatch[1]) * 60;
        }
        
        const secondsMatch = str.match(/(\d+(?:\.\d+)?)秒/);
        if (secondsMatch) {
            totalSeconds += parseFloat(secondsMatch[1]);
        }
        
        // 纯数字（默认为分钟）
        if (totalSeconds === 0) {
            const numMatch = str.match(/^(\d+(?:\.\d+)?)$/);
            if (numMatch) {
                totalSeconds = parseFloat(numMatch[1]) * 60;
            }
        }
        
        return Math.round(totalSeconds);
    },

    // 智能休息提醒
    setupBreakReminder() {
        const WORK_DURATION = 25 * 60; // 25分钟工作
        const BREAK_DURATION = 5 * 60;  // 5分钟休息
        
        let workTime = 0;
        
        const breakReminderInterval = setInterval(() => {
            if (this.currentChecklist) {
                const runningTasks = this.currentChecklist.tasks.filter(task => task.isRunning);
                if (runningTasks.length > 0) {
                    workTime += 60; // 每分钟增加
                    
                    if (workTime >= WORK_DURATION) {
                        this.showBreakReminder();
                        workTime = 0;
                    }
                }
            }
        }, 60000); // 每分钟检查一次
        
        return breakReminderInterval;
    },

    showBreakReminder() {
        const modalBody = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">☕</div>
                <h3 style="color: #00ff00; margin-bottom: 15px;">是时候休息一下了！</h3>
                <p style="color: #aaa; margin-bottom: 20px;">
                    您已经连续工作了25分钟，建议休息5分钟来保持效率。
                </p>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    <button class="pixel-btn btn-primary" onclick="app.startBreakTimer()" title="开始休息">⏸</button>
                    <button class="pixel-btn btn-secondary" onclick="app.hideModal()" title="继续工作">▶</button>
                </div>
            </div>
        `;
        
        this.showModal('休息提醒', modalBody, false);
        this.playNotificationSound();
    },

    startBreakTimer() {
        this.hideModal();
        
        // 停止所有任务计时器
        this.stopAllTimers();
        
        // 显示休息计时器
        this.showBreakCountdown();
    },

    showBreakCountdown() {
        const BREAK_DURATION = 5 * 60; // 5分钟
        let remainingTime = BREAK_DURATION;
        
        const modalBody = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🌱</div>
                <h3 style="color: #00ff00; margin-bottom: 15px;">休息时间</h3>
                <div id="breakTimer" style="font-size: 36px; font-family: 'Courier New', monospace; color: #ffff00; margin-bottom: 20px;">
                    ${this.formatTime(remainingTime)}
                </div>
                <p style="color: #aaa;">放松一下，马上就可以继续工作了</p>
            </div>
        `;
        
        this.showModal('休息时间', modalBody, false);
        
        const breakInterval = setInterval(() => {
            remainingTime--;
            const timerElement = document.getElementById('breakTimer');
            if (timerElement) {
                timerElement.textContent = this.formatTime(remainingTime);
            }
            
            if (remainingTime <= 0) {
                clearInterval(breakInterval);
                this.hideModal();
                this.showNotification('休息结束，继续加油！', 'success');
                this.playNotificationSound();
            }
        }, 1000);
    }
});

// 在应用初始化时启动计时器系统
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.app) {
            app.initTimerSystem();
        }
    }, 1000);
});
