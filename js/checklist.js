// 清单管理相关功能扩展
Object.assign(TodoApp.prototype, {
    showCreateChecklistModal() {
        console.log('[MODAL] Opening create checklist modal');
        
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
                <label for="expectedWorkTime">预期工作时间 (小时):</label>
                <input type="number" id="expectedWorkTime" class="pixel-input" min="0.5" step="0.5" placeholder="如: 8" style="width: 100%; margin-top: 10px;">
                <small style="color: #aaa; margin-top: 5px; display: block;">
                    设置这个清单的预期完成时间，用于显示进度条
                </small>
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
        `;

        this.showModal('新建清单', modalBody);

        // 设置模板选择事件
        const templateSelect = document.getElementById('templateSelect');
        const descriptionInput = document.getElementById('checklistDescription');
        const expectedWorkTimeInput = document.getElementById('expectedWorkTime');

        templateSelect.addEventListener('change', (e) => {
            const templateId = e.target.value;
            console.log('[TEMPLATE_SELECTION] Template selected:', templateId);
            
            if (templateId) {
                const template = this.data.templates.find(t => t.id === templateId);
                console.log('[TEMPLATE_SELECTION] Found template:', template);
                
                if (template) {
                    // 如果模板有简述，自动填入
                    if (template.description && !descriptionInput.value) {
                        console.log('[TEMPLATE_SELECTION] Auto-filling description:', template.description);
                        descriptionInput.value = template.description;
                    }
                    
                    // 如果模板有预期工作时间且大于0，自动填入
                    if (template.expectedWorkTime && template.expectedWorkTime > 0 && !expectedWorkTimeInput.value) {
                        console.log('[TEMPLATE_SELECTION] Auto-filling expected work time:', template.expectedWorkTime, 'hours');
                        expectedWorkTimeInput.value = template.expectedWorkTime;
                    } else {
                        console.log('[TEMPLATE_SELECTION] Not auto-filling work time - template.expectedWorkTime:', template.expectedWorkTime, 'input value:', expectedWorkTimeInput.value);
                    }
                } else {
                    console.log('[TEMPLATE_SELECTION] Template not found for ID:', templateId);
                }
            } else {
                console.log('[TEMPLATE_SELECTION] No template selected, clearing auto-filled content');
                // 清空模板相关的自动填入内容
                if (!descriptionInput.value.trim()) {
                    descriptionInput.value = '';
                }
                if (!expectedWorkTimeInput.value) {
                    expectedWorkTimeInput.value = '';
                }
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
        console.log('[CREATE_CHECKLIST] Starting checklist creation process');
        
        const nameInput = document.getElementById('checklistName');
        const descriptionInput = document.getElementById('checklistDescription');
        const expectedWorkTimeInput = document.getElementById('expectedWorkTime');
        const templateSelect = document.getElementById('templateSelect');
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const expectedWorkTime = parseFloat(expectedWorkTimeInput.value) || 0;
        const templateId = templateSelect.value;
        
        console.log('[CREATE_CHECKLIST] Input values:', {
            name,
            description,
            expectedWorkTime: expectedWorkTime + ' hours',
            templateId
        });
        
        if (!name) {
            console.log('[CREATE_CHECKLIST] Validation failed: missing name');
            this.showNotification('请输入清单名称', 'warning');
            nameInput.focus();
            return;
        }

        try {
            // 构建新清单对象
            const newChecklist = {
                name: name,
                description: description,
                expectedWorkTime: expectedWorkTime * 3600, // 转换为秒
                tasks: [],
                createdAt: new Date().toISOString(),
                status: 'active'
            };
            
            console.log('[CREATE_CHECKLIST] Initial checklist object:', {
                name: newChecklist.name,
                expectedWorkTime: newChecklist.expectedWorkTime + ' seconds',
                description: newChecklist.description
            });

            // 如果选择了模板，添加模板任务和继承属性
            if (templateId) {
                console.log('[CREATE_CHECKLIST] Processing template inheritance for template ID:', templateId);
                const template = this.data.templates.find(t => t.id === templateId);
                
                if (template) {
                    console.log('[CREATE_CHECKLIST] Found template:', {
                        id: template.id,
                        name: template.name,
                        expectedWorkTime: template.expectedWorkTime + ' hours',
                        description: template.description,
                        tasksCount: template.tasks ? template.tasks.length : 0
                    });
                    
                    // 继承模板的简述（如果用户没有自定义）
                    if (!description && template.description) {
                        console.log('[CREATE_CHECKLIST] Inheriting description from template:', template.description);
                        newChecklist.description = template.description;
                    }
                    
                    // 关键修复：如果用户没有设置预期工作时间，但模板有设置，则继承模板的预期工作时间
                    if (expectedWorkTime === 0 && template.expectedWorkTime && template.expectedWorkTime > 0) {
                        const inheritedSeconds = template.expectedWorkTime * 3600;
                        console.log('[CREATE_CHECKLIST] Inheriting expected work time from template:', template.expectedWorkTime + ' hours =', inheritedSeconds + ' seconds');
                        newChecklist.expectedWorkTime = inheritedSeconds;
                    } else {
                        console.log('[CREATE_CHECKLIST] Not inheriting work time:', {
                            userInputHours: expectedWorkTime,
                            templateHours: template.expectedWorkTime,
                            reason: expectedWorkTime > 0 ? 'User provided custom time' : 'Template has no work time or is zero'
                        });
                    }
                    
                    // 添加模板引用ID
                    newChecklist.templateId = templateId;
                    console.log('[CREATE_CHECKLIST] Added template reference ID:', templateId);
                    
                    // 处理模板任务
                    if (template.tasks && template.tasks.length > 0) {
                        console.log('[CREATE_CHECKLIST] Processing template tasks, count:', template.tasks.length);
                        
                        newChecklist.tasks = template.tasks.map((task, index) => {
                            console.log('[CREATE_CHECKLIST] Processing task', index + 1, ':', task);
                            
                            // 处理新格式的任务对象
                            if (typeof task === 'object' && task !== null && task.title) {
                                const newTask = {
                                    id: `task_${Date.now()}_${index}`,
                                    title: task.title,
                                    completed: false,
                                    duration: task.type === 'timer' ? 0 : (task.duration * 60), // 转换为秒
                                    type: task.type || 'timer',
                                    spentTime: 0,
                                    isRunning: false,
                                    createdAt: new Date().toISOString(),
                                    subtasks: []
                                };
                                console.log('[CREATE_CHECKLIST] Created task object:', newTask);
                                return newTask;
                            } else {
                                // 处理旧格式的字符串任务
                                const newTask = {
                                    id: `task_${Date.now()}_${index}`,
                                    title: typeof task === 'string' ? task : task.toString(),
                                    completed: false,
                                    duration: 1800, // 默认30分钟
                                    type: 'timer', // 默认正计时
                                    spentTime: 0,
                                    isRunning: false,
                                    createdAt: new Date().toISOString(),
                                    subtasks: []
                                };
                                console.log('[CREATE_CHECKLIST] Created task from string:', newTask);
                                return newTask;
                            }
                        });
                    } else {
                        console.log('[CREATE_CHECKLIST] Template has no tasks');
                    }
                } else {
                    console.log('[CREATE_CHECKLIST] Template not found for ID:', templateId);
                }
            }

            console.log('[CREATE_CHECKLIST] Final checklist object before saving:', {
                name: newChecklist.name,
                expectedWorkTime: newChecklist.expectedWorkTime + ' seconds (' + (newChecklist.expectedWorkTime / 3600) + ' hours)',
                description: newChecklist.description,
                templateId: newChecklist.templateId,
                tasksCount: newChecklist.tasks.length
            });

            // 保存到数据库
            console.log('[CREATE_CHECKLIST] Saving checklist to database...');
            const savedChecklist = await window.electronAPI.createChecklist(newChecklist);
            console.log('[CREATE_CHECKLIST] Checklist saved successfully with ID:', savedChecklist.id);
            
            // 添加到本地数据
            this.data.checklists.push(savedChecklist);
            console.log('[CREATE_CHECKLIST] Added checklist to local data, total checklists:', this.data.checklists.length);
            
            this.hideModal();
            this.showNotification('清单创建成功', 'success');
            this.renderChecklistsView();

        } catch (error) {
            console.error('[CREATE_CHECKLIST] Error creating checklist:', error);
            this.showNotification('创建清单失败', 'error');
        }
    },

    renderChecklistDetailView() {
        console.log('[DETAIL_VIEW] Rendering checklist detail view for:', this.currentChecklist?.name);
        
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

        // 设置计时类型变化事件
        const taskTypeSelect = document.getElementById('taskTypeSelect');
        const durationField = document.getElementById('durationField');
        
        const toggleDurationField = () => {
            if (taskTypeSelect.value === 'timer') {
                durationField.style.display = 'none';
            } else {
                durationField.style.display = 'block';
            }
        };
        
        taskTypeSelect.addEventListener('change', toggleDurationField);
        toggleDurationField(); // 初始化显示状态

        // 设置编辑预期工作时间按钮事件
        this.setupEditExpectedTimeEvents();
    },

    setupEditExpectedTimeEvents() {
        console.log('[EDIT_TIME] Setting up edit expected time events');
        
        const editBtn = document.getElementById('editExpectedTimeBtn');
        const editSection = document.getElementById('editExpectedTimeSection');
        const editInput = document.getElementById('editExpectedTimeInput');
        const saveBtn = document.getElementById('saveExpectedTimeBtn');
        const cancelBtn = document.getElementById('cancelExpectedTimeBtn');

        if (!editBtn) {
            console.log('[EDIT_TIME] Edit button not found, skipping setup');
            return;
        }

        editBtn.onclick = () => {
            console.log('[EDIT_TIME] Edit button clicked');
            // 显示编辑界面
            editSection.style.display = 'block';
            
            // 设置当前值
            const currentHours = this.currentChecklist.expectedWorkTime 
                ? (this.currentChecklist.expectedWorkTime / 3600).toFixed(1) 
                : '0';
            console.log('[EDIT_TIME] Current expected work time:', currentHours, 'hours');
            editInput.value = currentHours;
            editInput.focus();
            editInput.select();
        };

        saveBtn.onclick = async () => {
            const hours = parseFloat(editInput.value) || 0;
            const seconds = Math.round(hours * 3600);
            
            console.log('[EDIT_TIME] Saving new expected work time:', hours, 'hours =', seconds, 'seconds');
            
            // 更新当前清单的预期工作时间
            this.currentChecklist.expectedWorkTime = seconds;
            
            // 保存到数据库
            try {
                await window.electronAPI.updateChecklist(this.currentChecklist.id, {
                    expectedWorkTime: seconds
                });
                
                // 更新本地数据
                const index = this.data.checklists.findIndex(c => c.id === this.currentChecklist.id);
                if (index !== -1) {
                    this.data.checklists[index].expectedWorkTime = seconds;
                }
                
                // 刷新统计显示
                this.updateChecklistStats();
                
                // 隐藏编辑界面
                editSection.style.display = 'none';
                
                console.log('[EDIT_TIME] Expected work time updated successfully');
                this.showNotification('预期工作时间已更新为 ' + hours + ' 小时', 'success');
            } catch (error) {
                console.error('[EDIT_TIME] Error updating expected work time:', error);
                this.showNotification('更新失败', 'error');
            }
        };

        cancelBtn.onclick = () => {
            console.log('[EDIT_TIME] Edit cancelled');
            editSection.style.display = 'none';
        };

        // 支持回车保存
        editInput.onkeypress = (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            } else if (e.key === 'Escape') {
                cancelBtn.click();
            }
        };
    },

    updateChecklistStats() {
        console.log('[STATS] Updating checklist statistics');
        
        if (!this.currentChecklist) return;

        const completedTasks = this.currentChecklist.tasks.filter(task => task.completed).length;
        const totalTasks = this.currentChecklist.tasks.length;
        const spentTime = this.calculateSpentTime(this.currentChecklist.tasks);

        console.log('[STATS] Current stats:', {
            completedTasks,
            totalTasks,
            spentTime: spentTime + ' seconds',
            expectedWorkTime: this.currentChecklist.expectedWorkTime + ' seconds'
        });

        document.getElementById('completedTasks').textContent = `已完成: ${completedTasks}/${totalTasks}`;
        document.getElementById('totalTime').textContent = `已工作: ${this.formatTime(spentTime)}`;
        document.getElementById('remainingTime').textContent = `任务进度: ${totalTasks > 0 ? Math.round((completedTasks/totalTasks)*100) : 0}%`;
        
        // 更新工作时间进度条
        this.updateWorkProgressBar(spentTime, this.currentChecklist.expectedWorkTime);
    },

    updateWorkProgressBar(spentTime, expectedWorkTime) {
        console.log('[PROGRESS_BAR] Updating progress bar - spent:', spentTime, 'expected:', expectedWorkTime);
        
        const progressSection = document.getElementById('progressSection');
        const progressText = document.getElementById('progressText');
        const progressPercentage = document.getElementById('progressPercentage');
        const progressFill = document.getElementById('progressFill');
        
        // 始终显示进度条
        progressSection.style.display = 'block';

        if (!expectedWorkTime || expectedWorkTime <= 0) {
            console.log('[PROGRESS_BAR] No expected work time set, showing empty progress bar');
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

        console.log('[PROGRESS_BAR] Progress calculation:', {
            progressPercent: progressPercent + '%',
            actualPercent: actualPercent + '%'
        });

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
                console.log('[PROGRESS_BAR] All tasks completed - applying complete style');
                progressFill.classList.add('complete');
            } else {
                console.log('[PROGRESS_BAR] Time exceeded but tasks not complete - applying over-100 style');
                progressFill.classList.add('over-100');
            }
        }
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
                            ${task.type === 'countdown' ? `<span>预计: ${this.formatTime(task.duration)}</span>` : ''}
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
        console.log('[ADD_TASK] Adding new task');
        
        const titleInput = document.getElementById('newTaskInput');
        const durationInput = document.getElementById('taskDurationInput');
        const typeSelect = document.getElementById('taskTypeSelect');

        const title = titleInput.value.trim();
        const type = typeSelect.value;
        const duration = type === 'timer' ? 0 : (parseInt(durationInput.value) || 30); // 正计时任务无预期时间

        if (!title) {
            this.showNotification('请输入任务标题', 'warning');
            titleInput.focus();
            return;
        }

        const newTask = {
            id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: title,
            completed: false,
            duration: type === 'timer' ? 0 : duration * 60, // 正计时任务duration为0
            type: type,
            spentTime: 0,
            isRunning: false,
            createdAt: new Date().toISOString(),
            subtasks: [] // 添加子任务数组
        };

        console.log('[ADD_TASK] Created new task:', newTask);

        this.currentChecklist.tasks.push(newTask);
        
        // 清空输入框
        titleInput.value = '';
        if (type === 'countdown') {
            durationInput.value = '';
        }
        typeSelect.value = 'timer';

        // 保存并重新渲染
        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();

        titleInput.focus();
        this.showNotification('任务添加成功', 'success');
    },

    toggleTaskCompletion(taskId) {
        console.log('[TASK_COMPLETION] Toggling completion for task:', taskId);
        
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        // 如果任务正在运行，先停止计时器
        if (task.isRunning) {
            this.stopTaskTimer(taskId);
        }

        task.completed = !task.completed;
        
        console.log('[TASK_COMPLETION] Task completion status changed to:', task.completed);
        
        this.saveChecklistChanges();
        this.renderTasksList();
        this.updateChecklistStats();

        this.showNotification(
            task.completed ? '任务已完成' : '任务标记为未完成', 
            'success'
        );
    },

    async deleteTask(taskId) {
        console.log('[DELETE_TASK] Attempting to delete task:', taskId);
        
        const task = this.currentChecklist.tasks.find(t => t.id === taskId);
        if (!task) return;

        const result = await this.showConfirmModal(
            '删除任务',
            `确定要删除任务"${task.title}"吗？此操作无法撤销。`
        );

        if (result) {
            console.log('[DELETE_TASK] User confirmed deletion');
            
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
                console.log('[DELETE_TASK] Task deleted successfully');
            }
        } else {
            console.log('[DELETE_TASK] User cancelled deletion');
        }
    },

    async saveChecklistChanges() {
        console.log('[SAVE_CHANGES] Saving checklist changes for:', this.currentChecklist.id);
        
        try {
            await window.electronAPI.updateChecklist(this.currentChecklist.id, this.currentChecklist);
            
            // 更新本地数据
            const index = this.data.checklists.findIndex(c => c.id === this.currentChecklist.id);
            if (index !== -1) {
                this.data.checklists[index] = { ...this.currentChecklist };
            }
            
            console.log('[SAVE_CHANGES] Checklist changes saved successfully');
        } catch (error) {
            console.error('[SAVE_CHANGES] Error saving checklist changes:', error);
            this.showNotification('保存失败', 'error');
        }
    }
});
