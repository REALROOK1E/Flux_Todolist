// 模板管理相关功能扩展
Object.assign(TodoApp.prototype, {
    renderTemplatesView() {
        const container = document.getElementById('templatesList');
        
        if (this.data.templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>还没有模板</h3>
                    <p>创建您的第一个清单模板</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.templates.map(template => `
            <div class="template-card">
                <div class="template-header">
                    <h3 class="template-name">${template.name}</h3>
                    <div class="template-actions">
                        <button class="pixel-btn btn-secondary" onclick="app.editTemplate('${template.id}')" title="编辑">✏</button>
                        <button class="pixel-btn btn-primary" onclick="app.useTemplate('${template.id}')" title="使用">📋</button>
                        ${template.id !== 'default' && template.id !== 'work' && template.id !== 'study' ? 
                            `<button class="pixel-btn btn-danger" onclick="app.deleteTemplate('${template.id}')" title="删除">🗑</button>` : 
                            ''
                        }
                    </div>
                </div>
                ${template.description ? `<p style="color: #9ca3af; margin: 8px 0; font-size: 14px;">${template.description}</p>` : ''}
                <ul class="template-tasks">
                    ${template.tasks.map(task => {
                        if (typeof task === 'object' && task !== null) {
                            // 新格式：显示任务标题和时长
                            return `<li>${task.title} (${task.duration}分钟, ${task.type === 'timer' ? '正计时' : '倒计时'})</li>`;
                        } else {
                            // 旧格式：直接显示字符串
                            return `<li>${task}</li>`;
                        }
                    }).join('')}
                </ul>
                <div class="template-meta" style="margin-top: 15px; font-size: 12px; color: #666;">
                    ${template.tasks.length} 个任务
                </div>
            </div>
        `).join('');

        // 设置新建模板按钮事件
        const newTemplateBtn = document.getElementById('newTemplateBtn');
        newTemplateBtn.onclick = () => this.showCreateTemplateModal();
    },

    showCreateTemplateModal() {
        const modalBody = `
            <div class="form-group">
                <label for="templateName">模板名称:</label>
                <input type="text" id="templateName" class="pixel-input" 
                       style="width: 100%; margin-top: 10px;">
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="templateDescription">模板简述:</label>
                <textarea id="templateDescription" class="pixel-input" 
                         style="width: 100%; margin-top: 10px; height: 80px; resize: vertical;"></textarea>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label>任务列表:</label>
                <div id="templateTasksList" style="margin-top: 10px;">
                    <!-- 任务列表将在这里动态生成 -->
                </div>
                <button type="button" id="addTemplateTaskBtn" class="btn btn-primary" style="margin-top: 10px; width: auto; padding: 8px 16px;">
                    ✚ 添加任务
                </button>
            </div>
            <div class="form-group" style="margin-top: 15px;">
                <small style="color: #aaa;">
                    提示: 可以为每个任务设置标题、时长和计时类型
                </small>
            </div>
        `;

        this.showModal('新建模板', modalBody);

        // 初始化任务列表
        this.templateTasks = [];
        this.renderTemplateTasksList();

        // 设置添加任务按钮事件
        document.getElementById('addTemplateTaskBtn').addEventListener('click', () => {
            this.addTemplateTask();
        });

        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.createTemplate();

        // 自动聚焦到名称输入框
        setTimeout(() => {
            document.getElementById('templateName').focus();
        }, 100);
    },

    renderTemplateTasksList() {
        const container = document.getElementById('templateTasksList');
        if (!container) return;

        container.innerHTML = this.templateTasks.map((task, index) => `
            <div class="template-task-item" style="
                display: flex; 
                align-items: center; 
                gap: 10px; 
                padding: 10px; 
                background: #f8fafc; 
                border: 1px solid #e2e8f0; 
                border-radius: 8px; 
                margin-bottom: 8px;
            ">
                <input type="text" value="${task.title}" 
                       onchange="app.updateTemplateTask(${index}, 'title', this.value)"
                       class="pixel-input" style="flex: 1; margin: 0; min-height: 36px;">
                <input type="number" value="${task.duration}" min="1"
                       onchange="app.updateTemplateTask(${index}, 'duration', this.value)"
                       class="pixel-input" style="width: 80px; margin: 0; min-height: 36px;">
                <select onchange="app.updateTemplateTask(${index}, 'type', this.value)"
                        class="pixel-select" style="width: 100px; margin: 0; min-height: 36px;">
                    <option value="timer" ${task.type === 'timer' ? 'selected' : ''}>正计时</option>
                    <option value="countdown" ${task.type === 'countdown' ? 'selected' : ''}>倒计时</option>
                </select>
                <button type="button" onclick="app.removeTemplateTask(${index})" 
                        class="pixel-btn btn-danger btn-sm" title="删除任务">🗑</button>
            </div>
        `).join('');
    },

    addTemplateTask() {
        this.templateTasks.push({
            title: '新任务',
            duration: 30,
            type: 'timer'
        });
        this.renderTemplateTasksList();
    },

    updateTemplateTask(index, field, value) {
        if (this.templateTasks[index]) {
            if (field === 'duration') {
                this.templateTasks[index][field] = parseInt(value) || 30;
            } else {
                this.templateTasks[index][field] = value;
            }
        }
    },

    removeTemplateTask(index) {
        this.templateTasks.splice(index, 1);
        this.renderTemplateTasksList();
    },

    async createTemplate() {
        const nameInput = document.getElementById('templateName');
        const descriptionInput = document.getElementById('templateDescription');
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();

        if (!name) {
            this.showNotification('请输入模板名称', 'warning');
            nameInput.focus();
            return;
        }

        if (!this.templateTasks || this.templateTasks.length === 0) {
            this.showNotification('请至少添加一个任务', 'warning');
            return;
        }

        // 验证任务数据
        const validTasks = this.templateTasks.filter(task => task.title.trim());
        if (validTasks.length === 0) {
            this.showNotification('请确保所有任务都有标题', 'warning');
            return;
        }

        const newTemplate = {
            id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name,
            description: description,
            tasks: validTasks.map(task => ({
                title: task.title.trim(),
                duration: parseInt(task.duration) || 30,
                type: task.type || 'timer'
            })),
            createdAt: new Date().toISOString()
        };

        try {
            this.data.templates.push(newTemplate);
            await this.saveData();
            this.hideModal();
            this.renderTemplatesView();
            this.showNotification(`模板"${name}"创建成功`);
        } catch (error) {
            console.error('创建模板失败:', error);
            this.showNotification('创建模板失败', 'error');
        }
    },

    editTemplate(templateId) {
        const template = this.data.templates.find(t => t.id === templateId);
        if (!template) return;

        // 检查是否为系统默认模板
        if (['default', 'work', 'study'].includes(templateId)) {
            this.showNotification('系统默认模板不能编辑', 'warning');
            return;
        }

        const modalBody = `
            <div class="form-group">
                <label for="editTemplateName">模板名称:</label>
                <input type="text" id="editTemplateName" class="pixel-input" value="${template.name}" 
                       style="width: 100%; margin-top: 10px;">
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="editTemplateDescription">模板简述:</label>
                <textarea id="editTemplateDescription" class="pixel-input" 
                         style="width: 100%; margin-top: 10px; height: 80px; resize: vertical;">${template.description || ''}</textarea>
            </div>
            <div class="form-group" style="margin-top: 20px;">
                <label for="editTemplateTasks">任务列表 (每行一个任务):</label>
                <textarea id="editTemplateTasks" class="pixel-input" 
                          style="width: 100%; margin-top: 10px; height: 150px; resize: vertical; font-family: 'Courier New', monospace;">${template.tasks.join('\n')}</textarea>
            </div>
        `;

        this.showModal('编辑模板', modalBody);

        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.saveTemplateEdit(templateId);

        // 自动聚焦到名称输入框
        setTimeout(() => {
            document.getElementById('editTemplateName').focus();
        }, 100);
    },

    async saveTemplateEdit(templateId) {
        const nameInput = document.getElementById('editTemplateName');
        const descriptionInput = document.getElementById('editTemplateDescription');
        const tasksInput = document.getElementById('editTemplateTasks');
        
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();
        const tasksText = tasksInput.value.trim();

        if (!name) {
            this.showNotification('请输入模板名称', 'warning');
            nameInput.focus();
            return;
        }

        if (!tasksText) {
            this.showNotification('请输入至少一个任务', 'warning');
            tasksInput.focus();
            return;
        }

        // 解析任务列表
        const tasks = tasksText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (tasks.length === 0) {
            this.showNotification('请输入至少一个任务', 'warning');
            tasksInput.focus();
            return;
        }

        try {
            const template = this.data.templates.find(t => t.id === templateId);
            template.name = name;
            template.description = description;
            template.tasks = tasks;
            template.updatedAt = new Date().toISOString();

            // 保存到数据库
            await window.electronAPI.saveTemplate(template);
            
            this.hideModal();
            this.showNotification('模板更新成功', 'success');
            this.renderTemplatesView();

        } catch (error) {
            console.error('更新模板失败:', error);
            this.showNotification('更新模板失败', 'error');
        }
    },

    async deleteTemplate(templateId) {
        const template = this.data.templates.find(t => t.id === templateId);
        if (!template) return;

        const result = await this.showConfirmModal(
            '删除模板',
            `确定要删除模板"${template.name}"吗？此操作无法撤销。`
        );

        if (result) {
            try {
                // 从数据库删除
                await window.electronAPI.deleteTemplate(templateId);
                
                // 从本地数据删除
                const index = this.data.templates.findIndex(t => t.id === templateId);
                if (index !== -1) {
                    this.data.templates.splice(index, 1);
                }

                this.showNotification('模板已删除', 'success');
                this.renderTemplatesView();

            } catch (error) {
                console.error('删除模板失败:', error);
                this.showNotification('删除模板失败', 'error');
            }
        }
    },

    useTemplate(templateId) {
        const template = this.data.templates.find(t => t.id === templateId);
        if (!template) return;

        // 显示使用模板的确认对话框
        const modalBody = `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #00ff00; margin-bottom: 10px;">模板: ${template.name}</h4>
                <div style="background: #1a1a1a; border: 2px solid #444; border-radius: 4px; padding: 15px;">
                    <strong>包含任务:</strong><br>
                    ${template.tasks.map(task => {
                        if (typeof task === 'object' && task !== null) {
                            return `• ${task.title} (${task.duration}分钟, ${task.type === 'timer' ? '正计时' : '倒计时'})`;
                        } else {
                            return `• ${task}`;
                        }
                    }).join('<br>')}
                </div>
            </div>
            <div class="form-group">
                <label for="newChecklistFromTemplate">清单名称:</label>
                <input type="text" id="newChecklistFromTemplate" class="pixel-input" 
                       value="${template.name} - ${new Date().toLocaleDateString()}" 
                       style="width: 100%; margin-top: 10px;">
            </div>
        `;

        this.showModal('使用模板创建清单', modalBody);

        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.createChecklistFromTemplate(templateId);

        // 自动聚焦到名称输入框
        setTimeout(() => {
            const input = document.getElementById('newChecklistFromTemplate');
            input.focus();
            input.select();
        }, 100);
    },

    async createChecklistFromTemplate(templateId) {
        const template = this.data.templates.find(t => t.id === templateId);
        const nameInput = document.getElementById('newChecklistFromTemplate');
        
        const name = nameInput.value.trim();
        if (!name) {
            this.showNotification('请输入清单名称', 'warning');
            nameInput.focus();
            return;
        }

        try {
            // 构建新清单对象
            const newChecklist = {
                name: name,
                tasks: template.tasks.map((task, index) => {
                    // 现在模板任务是对象，包含 title, duration, type 等属性
                    let title, duration, type;
                    
                    if (typeof task === 'object' && task !== null) {
                        // 新的模板格式（对象）
                        title = task.title || '新任务';
                        duration = (task.duration || 30) * 60; // 转换为秒
                        type = task.type || 'timer';
                    } else {
                        // 旧的模板格式（字符串），向后兼容
                        const taskName = String(task);
                        const timeMatch = taskName.match(/^(.+?)\s*\((\d+(?:\.\d+)?)\s*分钟\)$/);
                        title = taskName;
                        duration = 1800; // 默认30分钟
                        type = 'timer';

                        if (timeMatch) {
                            title = timeMatch[1].trim();
                            duration = parseFloat(timeMatch[2]) * 60; // 转换为秒
                        }
                    }

                    return {
                        id: `task_${Date.now()}_${index}`,
                        title: title,
                        completed: false,
                        duration: duration,
                        type: type,
                        spentTime: 0,
                        isRunning: false,
                        createdAt: new Date().toISOString()
                    };
                }),
                templateId: templateId,
                createdAt: new Date().toISOString(),
                status: 'active'
            };

            // 保存到数据库
            const savedChecklist = await window.electronAPI.createChecklist(newChecklist);
            
            // 添加到本地数据
            this.data.checklists.push(savedChecklist);
            
            this.hideModal();
            this.showNotification('清单创建成功', 'success');
            this.showView('checklists');

        } catch (error) {
            console.error('从模板创建清单失败:', error);
            this.showNotification('创建清单失败', 'error');
        }
    },

    // 导出模板
    exportTemplate(templateId) {
        const template = this.data.templates.find(t => t.id === templateId);
        if (!template) return;

        const exportData = {
            ...template,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        // 创建并下载 JSON 文件
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${template.name}_模板.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.showNotification('模板已导出', 'success');
    },

    // 导入模板
    showImportTemplateModal() {
        const modalBody = `
            <div class="form-group">
                <label for="templateFile">选择模板文件:</label>
                <input type="file" id="templateFile" accept=".json" 
                       style="width: 100%; margin-top: 10px; padding: 8px; background: #1a1a1a; border: 2px solid #444; color: #fff;">
            </div>
            <div style="margin-top: 15px; color: #aaa; font-size: 12px;">
                支持导入 .json 格式的模板文件
            </div>
        `;

        this.showModal('导入模板', modalBody);

        // 设置确认按钮事件
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.importTemplate();
    },

    async importTemplate() {
        const fileInput = document.getElementById('templateFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('请选择模板文件', 'warning');
            return;
        }

        try {
            const text = await file.text();
            const templateData = JSON.parse(text);

            // 验证模板格式
            if (!templateData.name || !Array.isArray(templateData.tasks)) {
                throw new Error('无效的模板格式');
            }

            // 生成新的ID避免冲突
            const newTemplate = {
                name: templateData.name,
                tasks: templateData.tasks,
                createdAt: new Date().toISOString(),
                imported: true
            };

            // 保存模板
            const savedTemplate = await window.electronAPI.saveTemplate(newTemplate);
            this.data.templates.push(savedTemplate);

            this.hideModal();
            this.showNotification('模板导入成功', 'success');
            this.renderTemplatesView();

        } catch (error) {
            console.error('导入模板失败:', error);
            this.showNotification('导入模板失败: ' + error.message, 'error');
        }
    },

    renderArchiveView() {
        const container = document.getElementById('archivedList');
        
        if (this.data.archivedChecklists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📦</div>
                    <h3>还没有归档的清单</h3>
                    <p>完成的清单将出现在这里</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.data.archivedChecklists
            .sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt))
            .map(checklist => {
                const completedTasks = checklist.tasks.filter(task => task.completed).length;
                const totalTasks = checklist.tasks.length;
                const totalTime = this.calculateTotalTime(checklist.tasks);
                const spentTime = this.calculateSpentTime(checklist.tasks);

                return `
                    <div class="archived-item">
                        <div class="archived-header">
                            <h3 class="archived-title">${checklist.name}</h3>
                            <span class="archived-date">
                                归档于: ${new Date(checklist.archivedAt).toLocaleDateString()}
                            </span>
                        </div>
                        <div class="archived-stats">
                            <span>完成度: ${completedTasks}/${totalTasks} (${Math.round((completedTasks/totalTasks)*100)}%)</span>
                            <span>预计时长: ${this.formatTime(totalTime)}</span>
                            <span>实际用时: ${this.formatTime(spentTime)}</span>
                            <span>效率: ${totalTime > 0 ? Math.round((totalTime/spentTime)*100) : 0}%</span>
                        </div>
                    </div>
                `;
            }).join('');
    }
});
