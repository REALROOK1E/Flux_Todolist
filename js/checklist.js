// 清单管理相关功能扩展
Object.assign(TodoApp.prototype, {
    showCreateChecklistModal() {
        const modalBody = `
            <div class="form-group">
                <label for="checklistName">清单名称:</label>
                <input type="text" id="checklistName" class="pixel-input" style="width: 100%; margin-top: 10px;">
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="checklistDescription">清单简述:</label>
                <textarea id="checklistDescription" class="pixel-input" style="width: 100%; margin-top: 10px; height: 80px; resize: vertical;"></textarea>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="templateSelect">选择模板 (可选):</label>
                <select id="templateSelect" class="pixel-select" style="width: 100%; margin-top: 10px;">
                    <option value="">不使用模板</option>
                    ${this.data.templates.map(template => 
                        `<option value="${template.id}">${template.name}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label>模板预览:</label>
                <div id="templatePreview" style="margin-top: 10px; padding: 10px; background: #1a1a1a; border: 2px solid #444; border-radius: 4px; min-height: 60px; color: #aaa;">
                    选择模板后将显示预览内容
                </div>
            </div>
        `;

        this.showModal('新建清单', modalBody);

        // 设置模板预览
        const templateSelect = document.getElementById('templateSelect');
        const templatePreview = document.getElementById('templatePreview');
        const descriptionInput = document.getElementById('checklistDescription');

        templateSelect.addEventListener('change', (e) => {
            const templateId = e.target.value;
            if (templateId) {
                const template = this.data.templates.find(t => t.id === templateId);
                if (template) {
                    templatePreview.innerHTML = `
                        <strong>${template.name}</strong><br>
                        ${template.description ? `简述: ${template.description}<br>` : ''}
                        任务: ${template.tasks.map(task => `• ${task}`).join('<br>')}
                    `;
                    // 如果模板有简述，自动填入
                    if (template.description && !descriptionInput.value) {
                        descriptionInput.value = template.description;
                    }
                }
            } else {
                templatePreview.innerHTML = '选择模板后将显示预览内容';
            }
        });

        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.createChecklist();

        // 为清单名称输入框添加回车键监听
        const nameInput = document.getElementById('checklistName');
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createChecklist();
            }
        });

        // 自动聚焦到名称输入框
        setTimeout(() => {
            nameInput.focus();
        }, 100);
    },

    async createChecklist() {
        const nameInput = document.getElementById('checklistName');
        const descriptionInput = document.getElementById('checklistDescription');
        const templateSelect = document.getElementById('templateSelect');
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        
        if (!name) {
            this.showNotification('请输入清单名称', 'warning');
            nameInput.focus();
            return;
        }

        try {
            // 构建新清单对象
            const newChecklist = {
                name: name,
                description: description,
                tasks: [],
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            // 如果选择了模板，添加模板任务
            const templateId = templateSelect.value;
            if (templateId) {
                const template = this.data.templates.find(t => t.id === templateId);
                if (template) {
                    // 继承模板的简述（如果用户没有自定义）
                    if (!description && template.description) {
                        newChecklist.description = template.description;
                    }
                    
                    newChecklist.tasks = template.tasks.map((taskName, index) => ({
                        id: `task_${Date.now()}_${index}`,
                        title: taskName,
                        completed: false,
                        duration: 1800, // 默认30分钟
                        type: 'timer', // 默认正计时
                        spentTime: 0,
                        isRunning: false,
                        createdAt: new Date().toISOString(),
                        subtasks: [] // 添加子任务数组
                    }));
                }
            }

            // 保存到数据库
            const savedChecklist = await window.electronAPI.createChecklist(newChecklist);
            
            // 添加到本地数据
            this.data.checklists.push(savedChecklist);
            
            this.hideModal();
            this.showNotification('清单创建成功', 'success');
            this.renderChecklistsView();

        } catch (error) {
            console.error('创建清单失败:', error);
            this.showNotification('创建清单失败', 'error');
        }
    },

    renderChecklistDetailView() {
        if (!this.currentChecklist) return;

        // 更新页面标题和统计信息
        document.getElementById('checklistTitle').textContent = this.currentChecklist.name;
        this.updateChecklistStats();

        // 渲染任务列表
        this.renderTasksList();

        // 设置添加任务按钮事件
        const addTaskBtn = document.getElementById('addTaskBtn');
        addTaskBtn.onclick = () => this.addTask();

        // 设置输入框回车事件
        const newTaskInput = document.getElementById('newTaskInput');
        newTaskInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        };
    },

    updateChecklistStats() {
        if (!this.currentChecklist) return;

        const completedTasks = this.currentChecklist.tasks.filter(task => task.completed).length;
        const totalTasks = this.currentChecklist.tasks.length;
        const totalTime = this.calculateTotalTime(this.currentChecklist.tasks);
        const spentTime = this.calculateSpentTime(this.currentChecklist.tasks);
        const remainingTime = Math.max(0, totalTime - spentTime);

        document.getElementById('completedTasks').textContent = `已完成: ${completedTasks}/${totalTasks}`;
        document.getElementById('totalTime').textContent = `总时长: ${this.formatTime(totalTime)}`;
        document.getElementById('remainingTime').textContent = `剩余: ${this.formatTime(remainingTime)}`;
    },

    renderTasksList() {
        if (!this.currentChecklist) return;

        const container = document.getElementById('tasksList');
        
        if (this.currentChecklist.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>还没有任务</h3>
                    <p>在上方添加您的第一个任务</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.currentChecklist.tasks.map(task => {
            const remainingTime = task.type === 'countdown' ? 
                Math.max(0, task.duration - task.spentTime) : task.spentTime;

            // 确保任务有子任务数组
            if (!task.subtasks) {
                task.subtasks = [];
            }

            const completedSubtasks = task.subtasks.filter(st => st.completed).length;
            const totalSubtasks = task.subtasks.length;

            return `
                <div class="task-item ${task.completed ? 'completed' : ''} ${task.isRunning ? 'running' : ''}" data-id="${task.id}">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-task-id="${task.id}"></div>
                    <div class="task-content">
                        <div class="task-title ${task.completed ? 'completed' : ''}">${task.title}</div>
                        <div class="task-meta">
                            <span>类型: ${task.type === 'timer' ? '正计时' : '倒计时'}</span>
                            <span>预计: ${this.formatTime(task.duration)}</span>
                            <span>已用: ${this.formatTime(task.spentTime)}</span>
                            ${totalSubtasks > 0 ? `<span>子任务: ${completedSubtasks}/${totalSubtasks}</span>` : ''}
                        </div>
                        ${totalSubtasks > 0 ? `
                            <div class="subtasks-list" style="margin-top: 8px;">
                                ${task.subtasks.map(subtask => `
                                    <div class="subtask-item-display ${subtask.completed ? 'completed' : ''}" 
                                         style="display: flex; align-items: center; margin-bottom: 4px; padding: 4px 8px; background: rgba(0,0,0,0.1); border-radius: 4px; font-size: 12px;">
                                        <span class="subtask-checkbox ${subtask.completed ? 'checked' : ''}" 
                                              data-task-id="${task.id}" data-subtask-id="${subtask.id}"
                                              style="margin-right: 6px; cursor: pointer; width: 12px; height: 12px; border: 2px solid #666; border-radius: 2px; display: inline-block; ${subtask.completed ? 'background: #60a5fa; border-color: #60a5fa;' : ''}"></span>
                                        <span style="${subtask.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${subtask.text}</span>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-timer">
                        <div class="timer-display ${task.type} ${task.type === 'countdown' && remainingTime <= 0 ? 'expired' : ''}" 
                             data-task-id="${task.id}">
                            ${this.formatTime(remainingTime)}
                        </div>
                        <div class="task-actions">
                            <button class="pixel-btn btn-${task.isRunning ? 'warning' : 'primary'}" 
                                    onclick="app.toggleTaskTimer('${task.id}')" 
                                    ${task.completed ? 'disabled' : ''}>
                                ${task.isRunning ? '⏸' : '▶'}
                            </button>
                            <button class="pixel-btn btn-secondary" onclick="app.editTask('${task.id}')">✏</button>
                            <button class="pixel-btn btn-danger" onclick="app.deleteTask('${task.id}')">🗑</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 添加复选框点击事件
        container.querySelectorAll('.task-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                this.toggleTaskCompletion(taskId);
            });
        });

        // 添加子任务复选框点击事件
        container.querySelectorAll('.subtask-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', (e) => {
                const taskId = e.target.dataset.taskId;
                const subtaskId = e.target.dataset.subtaskId;
                this.toggleSubtaskCompletion(taskId, subtaskId);
            });
        });
    },

    toggleSubtaskCompletion(taskId, subtaskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task || !task.subtasks) return;

        const subtask = task.subtasks.find(st => st.id === subtaskId);
        if (!subtask) return;

        subtask.completed = !subtask.completed;
        this.saveData();
        this.renderTasksList();
        
        const status = subtask.completed ? '完成' : '取消完成';
        this.showNotification(`子任务"${subtask.text}"已${status}`);
    },

    addTask() {
        const titleInput = document.getElementById('newTaskInput');
        const durationInput = document.getElementById('taskDurationInput');
        const typeSelect = document.getElementById('taskTypeSelect');

        const title = titleInput.value.trim();
        const duration = parseInt(durationInput.value) || 30; // 默认30分钟
        const type = typeSelect.value;

        if (!title) {
            this.showNotification('请输入任务标题', 'warning');
            titleInput.focus();
            return;
        }

        const newTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            completed: false,
            duration: duration * 60, // 转换为秒
            type: type,
            spentTime: 0,
            isRunning: false,
            createdAt: new Date().toISOString(),
            subtasks: [] // 添加子任务数组
        };

        this.currentChecklist.tasks.push(newTask);
        
        // 清空输入框
        titleInput.value = '';
        durationInput.value = '';
        typeSelect.value = 'timer';

        // 保存并重新渲染
        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();

        titleInput.focus();
        this.showNotification('任务添加成功', 'success');
    },

    toggleTaskCompletion(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 如果任务正在运行，先停止计时器
        if (task.isRunning) {
            this.stopTaskTimer(taskId);
        }

        task.completed = !task.completed;
        
        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();

        this.showNotification(
            task.completed ? '任务已完成' : '任务标记为未完成', 
            'success'
        );
    },

    async deleteTask(taskId) {
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        const result = await this.showConfirmModal(
            '删除任务',
            `确定要删除任务"${task.title}"吗？此操作无法撤销。`
        );

        if (result) {
            // 如果任务正在运行，先停止计时器
            if (task.isRunning) {
                this.stopTaskTimer(taskId);
            }

            const index = this.currentChecklist.tasks.findIndex(t => t.id === taskId);
            if (index !== -1) {
                this.currentChecklist.tasks.splice(index, 1);
                this.saveChecklistChanges();
                this.renderTasksList();
                this.updateChecklistStats();
                this.showNotification('任务已删除', 'success');
            }
        }
    },

    async saveChecklistChanges() {
        try {
            await window.electronAPI.updateChecklist(this.currentChecklist.id, this.currentChecklist);
            
            // 更新本地数据
            const index = this.data.checklists.findIndex(c => c.id === this.currentChecklist.id);
            if (index !== -1) {
                this.data.checklists[index] = { ...this.currentChecklist };
            }
        } catch (error) {
            console.error('保存清单更改失败:', error);
            this.showNotification('保存失败', 'error');
        }
    }
});
