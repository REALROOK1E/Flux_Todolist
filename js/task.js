// 任务相关功能扩展
Object.assign(TodoApp.prototype, {
    editTask(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 确保任务有子任务数组
        if (!task.subtasks) {
            task.subtasks = [];
        }

        const modalBody = `
            <div class="form-group">
                <label for="editTaskTitle">任务标题:</label>
                <input type="text" id="editTaskTitle" class="pixel-input" value="${task.title}" 
                       style="width: 100%; margin-top: 10px;">
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="editTaskDuration">预计时长 (分钟):</label>
                <input type="number" id="editTaskDuration" class="pixel-input" 
                       value="${Math.round(task.duration / 60)}" min="1" 
                       style="width: 100%; margin-top: 10px;">
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="editTaskType">计时类型:</label>
                <select id="editTaskType" class="pixel-select" style="width: 100%; margin-top: 10px;">
                    <option value="timer" ${task.type === 'timer' ? 'selected' : ''}>正计时</option>
                    <option value="countdown" ${task.type === 'countdown' ? 'selected' : ''}>倒计时</option>
                </select>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="editTaskSpentTime">已用时长 (分钟):</label>
                <input type="number" id="editTaskSpentTime" class="pixel-input" 
                       value="${Math.round(task.spentTime / 60)}" min="0" 
                       style="width: 100%; margin-top: 10px;">
                <small style="color: #aaa; margin-top: 5px; display: block;">
                    当前已用时长: ${this.formatTime(task.spentTime)}
                </small>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label>子任务:</label>
                <div id="subtasksList" style="margin-top: 10px;">
                    ${task.subtasks.map((subtask, index) => `
                        <div class="subtask-item" data-index="${index}" style="display: flex; align-items: center; margin-bottom: 8px;">
                            <input type="checkbox" ${subtask.completed ? 'checked' : ''} 
                                   style="margin-right: 8px;">
                            <input type="text" value="${subtask.text}" class="pixel-input subtask-text" 
                                   style="flex: 1; margin-right: 8px; ${subtask.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                            <button type="button" class="pixel-btn btn-danger btn-sm remove-subtask" 
                                    style="padding: 4px 8px; font-size: 12px;">删除</button>
                        </div>
                    `).join('')}
                </div>
                <div style="margin-top: 10px;">
                    <input type="text" id="newSubtaskInput" class="pixel-input" 
                           style="width: 100%;">
                    <small style="color: #aaa; margin-top: 5px; display: block;">
                        输入内容后按空格键或回车键快速添加子任务
                    </small>
                </div>
            </div>
        `;

        this.showModal('编辑任务', modalBody);

        // 设置子任务相关事件
        this.setupSubtaskEvents();

        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.saveTaskEdit(taskId);

        // 自动聚焦到标题输入框
        setTimeout(() => {
            document.getElementById('editTaskTitle').focus();
        }, 100);
    },

    setupSubtaskEvents() {
        const subtasksList = document.getElementById('subtasksList');
        const newSubtaskInput = document.getElementById('newSubtaskInput');

        // 回车键和空格键都可以添加子任务
        newSubtaskInput.addEventListener('keydown', (e) => {
            if ((e.key === 'Enter' || e.code === 'Space') && e.target.value.trim()) {
                e.preventDefault();
                this.addSubtask(e.target.value.trim());
                e.target.value = '';
            }
        });

        // 子任务复选框事件
        subtasksList.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const subtaskItem = e.target.closest('.subtask-item');
                const textInput = subtaskItem.querySelector('.subtask-text');
                const isCompleted = e.target.checked;
                
                if (isCompleted) {
                    textInput.style.textDecoration = 'line-through';
                    textInput.style.opacity = '0.6';
                } else {
                    textInput.style.textDecoration = 'none';
                    textInput.style.opacity = '1';
                }
            }
        });

        // 删除子任务事件
        subtasksList.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-subtask')) {
                e.target.closest('.subtask-item').remove();
            }
        });
    },

    addSubtask(text) {
        const subtasksList = document.getElementById('subtasksList');
        const index = subtasksList.children.length;
        
        const subtaskItem = document.createElement('div');
        subtaskItem.className = 'subtask-item';
        subtaskItem.dataset.index = index;
        subtaskItem.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px;';
        
        subtaskItem.innerHTML = `
            <input type="checkbox" style="margin-right: 8px;">
            <input type="text" value="${text}" class="pixel-input subtask-text" 
                   style="flex: 1; margin-right: 8px;">
            <button type="button" class="pixel-btn btn-danger btn-sm remove-subtask" 
                    style="padding: 4px 8px; font-size: 12px;">删除</button>
        `;
        
        subtasksList.appendChild(subtaskItem);
    },

    saveTaskEdit(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        const titleInput = document.getElementById('editTaskTitle');
        const durationInput = document.getElementById('editTaskDuration');
        const typeSelect = document.getElementById('editTaskType');
        const spentTimeInput = document.getElementById('editTaskSpentTime');

        const title = titleInput.value.trim();
        const duration = parseInt(durationInput.value) || 30;
        const type = typeSelect.value;
        const spentTime = parseInt(spentTimeInput.value) || 0;

        if (!title) {
            this.showNotification('请输入任务标题', 'warning');
            titleInput.focus();
            return;
        }

        // 收集子任务数据
        const subtasks = [];
        document.querySelectorAll('.subtask-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const textInput = item.querySelector('.subtask-text');
            const text = textInput.value.trim();
            
            if (text) {
                subtasks.push({
                    id: `subtask_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    text: text,
                    completed: checkbox.checked
                });
            }
        });

        // 更新任务
        task.title = title;
        task.duration = duration * 60; // 转换为秒
        task.type = type;
        task.spentTime = spentTime * 60; // 转换为秒
        task.subtasks = subtasks;

        this.hideModal();
        this.renderChecklistDetailView();
        this.saveData();
        this.showNotification('任务更新成功');

        if (!title) {
            this.showNotification('请输入任务标题', 'warning');
            titleInput.focus();
            return;
        }

        // 如果任务正在运行，先停止计时器
        if (task.isRunning) {
            this.stopTaskTimer(taskId);
        }

        // 更新任务信息
        task.title = title;
        task.duration = duration * 60; // 转换为秒
        task.type = type;
        task.spentTime = spentTime * 60; // 转换为秒

        this.hideModal();
        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();
        this.showNotification('任务更新成功', 'success');
    },

    toggleTaskTimer(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task || task.completed) return;

        if (task.isRunning) {
            this.stopTaskTimer(taskId);
        } else {
            this.startTaskTimer(taskId);
        }
    },

    startTaskTimer(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task || task.completed || task.isRunning) return;

        // 停止其他正在运行的任务计时器
        this.currentChecklist.tasks.forEach(t => {
            if (t.isRunning && t.id !== taskId) {
                this.stopTaskTimer(t.id);
            }
        });

        task.isRunning = true;
        task.startTime = Date.now();

        // 创建计时器
        const timer = setInterval(() => {
            this.updateTaskTimer(taskId);
        }, 1000);

        this.timers.set(taskId, timer);
        
        this.renderTasksList(); // 重新渲染以显示运行状态
        this.showNotification(`开始计时: ${task.title}`, 'info');
    },

    stopTaskTimer(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task || !task.isRunning) return;

        // 计算这次运行的时间
        const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
        task.spentTime += sessionTime;
        task.isRunning = false;
        delete task.startTime;

        // 清除计时器
        const timer = this.timers.get(taskId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(taskId);
        }

        // 检查倒计时是否完成
        if (task.type === 'countdown' && task.spentTime >= task.duration) {
            this.showNotification(`倒计时完成: ${task.title}`, 'success');
            this.playNotificationSound();
        }

        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();
        this.showNotification(`停止计时: ${task.title}`, 'info');
    },

    updateTaskTimer(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task || !task.isRunning) return;

        // 计算当前已用时间
        const sessionTime = Math.floor((Date.now() - task.startTime) / 1000);
        const currentSpentTime = task.spentTime + sessionTime;
        
        // 更新计时器显示
        const timerDisplay = document.querySelector(`[data-task-id="${taskId}"].timer-display`);
        if (timerDisplay) {
            let displayTime;
            if (task.type === 'timer') {
                displayTime = currentSpentTime;
            } else { // countdown
                displayTime = Math.max(0, task.duration - currentSpentTime);
                
                // 检查是否超时
                if (displayTime <= 0) {
                    timerDisplay.classList.add('expired');
                    this.stopTaskTimer(taskId);
                    return;
                }
            }
            
            timerDisplay.textContent = this.formatTime(displayTime);
        }

        // 更新统计信息
        this.updateChecklistStats();
    },

    playNotificationSound() {
        // 创建一个简单的提示音
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('无法播放提示音:', error);
        }
    },

    // 重置任务时间
    resetTaskTime(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 如果任务正在运行，先停止
        if (task.isRunning) {
            this.stopTaskTimer(taskId);
        }

        task.spentTime = 0;
        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();
        this.showNotification('任务时间已重置', 'success');
    },

    // 批量操作
    completeAllTasks() {
        if (!this.currentChecklist) return;

        this.currentChecklist.tasks.forEach(task => {
            if (!task.completed && task.isRunning) {
                this.stopTaskTimer(task.id);
            }
            task.completed = true;
        });

        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();
        this.showNotification('所有任务已标记为完成', 'success');
    },

    resetAllTasks() {
        if (!this.currentChecklist) return;

        this.currentChecklist.tasks.forEach(task => {
            if (task.isRunning) {
                this.stopTaskTimer(task.id);
            }
            task.completed = false;
            task.spentTime = 0;
        });

        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();
        this.showNotification('所有任务已重置', 'success');
    },

    // 任务排序
    sortTasks(sortBy) {
        if (!this.currentChecklist) return;

        switch (sortBy) {
            case 'name':
                this.currentChecklist.tasks.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'duration':
                this.currentChecklist.tasks.sort((a, b) => b.duration - a.duration);
                break;
            case 'progress':
                this.currentChecklist.tasks.sort((a, b) => {
                    const progressA = a.duration > 0 ? a.spentTime / a.duration : 0;
                    const progressB = b.duration > 0 ? b.spentTime / b.duration : 0;
                    return progressB - progressA;
                });
                break;
            case 'status':
                this.currentChecklist.tasks.sort((a, b) => {
                    if (a.completed !== b.completed) {
                        return a.completed ? 1 : -1;
                    }
                    if (a.isRunning !== b.isRunning) {
                        return a.isRunning ? -1 : 1;
                    }
                    return 0;
                });
                break;
        }

        this.saveChecklistChanges();
        this.renderTasksList();
        this.showNotification(`任务已按${sortBy}排序`, 'info');
    }
});
