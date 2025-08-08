class MobileTemplate {
    constructor(storage) {
        this.storage = storage;
    }

    async renderTemplatesPage() {
        const templates = this.storage.getTemplates();
        const builtinTemplates = this.getBuiltinTemplates();

        return `
            <div class="templates-page">
                <!-- 内置模板 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">内置模板</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <div class="template-grid">
                            ${builtinTemplates.map(template => this.renderBuiltinTemplate(template)).join('')}
                        </div>
                    </ion-card-content>
                </ion-card>

                <!-- 自定义模板 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">我的模板 (${templates.length})</ion-card-title>
                        <button class="pixel-button primary" onclick="mobileApp.showCreateTemplateModal()">
                            创建模板
                        </button>
                    </ion-card-header>
                    <ion-card-content>
                        ${templates.length > 0 ? `
                            <ion-list>
                                ${templates.map(template => this.renderTemplateItem(template)).join('')}
                            </ion-list>
                        ` : `
                            <div class="empty-state">
                                <ion-icon name="library-outline" size="large"></ion-icon>
                                <h3>暂无自定义模板</h3>
                                <p>创建模板可以快速生成清单</p>
                                <button class="pixel-button primary" onclick="mobileApp.showCreateTemplateModal()">
                                    创建第一个模板
                                </button>
                            </div>
                        `}
                    </ion-card-content>
                </ion-card>

                <!-- 模板使用说明 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">使用说明</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <ul class="help-list">
                            <li>模板可以预设任务列表和时间配置</li>
                            <li>创建清单时可以选择模板快速填充</li>
                            <li>支持正计时和倒计时两种模式</li>
                            <li>可以设置预期工作时间和任务描述</li>
                        </ul>
                    </ion-card-content>
                </ion-card>
            </div>
        `;
    }

    renderBuiltinTemplate(template) {
        return `
            <div class="builtin-template-card" onclick="mobileApp.useBuiltinTemplate('${template.id}')">
                <div class="template-icon">${template.icon}</div>
                <h4>${template.name}</h4>
                <p>${template.description}</p>
                <div class="template-meta">
                    <span>${template.tasks.length} 任务</span>
                    <span>${template.estimatedTime ? this.formatTime(template.estimatedTime) : '灵活时间'}</span>
                </div>
            </div>
        `;
    }

    renderTemplateItem(template) {
        const taskCount = template.tasks ? template.tasks.length : 0;
        const createdDate = new Date(template.createdAt).toLocaleDateString();

        return `
            <ion-item class="template-item" onclick="mobileApp.showTemplateDetail('${template.id}')">
                <div slot="start" class="template-indicator">📄</div>
                <ion-label>
                    <h3>${template.name}</h3>
                    <p>${taskCount} 任务 · 创建于 ${createdDate}</p>
                    ${template.description ? `<p class="template-desc">${template.description}</p>` : ''}
                </ion-label>
                <div slot="end">
                    <button class="pixel-button small" onclick="event.stopPropagation(); mobileApp.useTemplate('${template.id}')">
                        使用
                    </button>
                    <button class="pixel-button small" onclick="event.stopPropagation(); mobileApp.showTemplateActions('${template.id}')">
                        ⋯
                    </button>
                </div>
            </ion-item>
        `;
    }

    async showCreateModal() {
        const modal = document.createElement('ion-modal');
        modal.innerHTML = `
            <ion-header>
                <ion-toolbar>
                    <ion-title>创建模板</ion-title>
                    <ion-buttons slot="end">
                        <ion-button onclick="this.closest('ion-modal').dismiss()">取消</ion-button>
                    </ion-buttons>
                </ion-toolbar>
            </ion-header>
            <ion-content class="pixel-content">
                <form id="create-template-form" class="pixel-form">
                    <div class="form-group">
                        <label>模板名称</label>
                        <ion-input 
                            type="text" 
                            id="template-name" 
                            placeholder="输入模板名称..." 
                            class="pixel-input"
                            required>
                        </ion-input>
                    </div>
                    
                    <div class="form-group">
                        <label>描述</label>
                        <ion-textarea 
                            id="template-description" 
                            placeholder="输入模板描述..." 
                            class="pixel-input"
                            rows="2">
                        </ion-textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>预期总时间 (小时)</label>
                        <ion-input 
                            type="number" 
                            id="template-estimated-time" 
                            placeholder="可选" 
                            class="pixel-input">
                        </ion-input>
                    </div>
                    
                    <div class="form-group">
                        <label>任务列表</label>
                        <div id="template-tasks">
                            <div class="task-input-group">
                                <ion-input 
                                    type="text" 
                                    placeholder="任务名称" 
                                    class="pixel-input task-title-input">
                                </ion-input>
                                <ion-select class="task-type-select" value="stopwatch">
                                    <ion-select-option value="stopwatch">正计时</ion-select-option>
                                    <ion-select-option value="countdown">倒计时</ion-select-option>
                                </ion-select>
                                <ion-input 
                                    type="number" 
                                    placeholder="预计时间(分钟)" 
                                    class="pixel-input task-time-input">
                                </ion-input>
                                <button type="button" class="pixel-button small" onclick="this.closest('.task-input-group').remove()">
                                    删除
                                </button>
                            </div>
                        </div>
                        <button type="button" class="pixel-button" onclick="mobileApp.addTemplateTaskInput()">
                            添加任务
                        </button>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="pixel-button primary">创建模板</button>
                        <button type="button" class="pixel-button" onclick="this.closest('ion-modal').dismiss()">
                            取消
                        </button>
                    </div>
                </form>
            </ion-content>
        `;

        document.body.appendChild(modal);
        await modal.present();

        // 绑定表单提交事件
        const form = modal.querySelector('#create-template-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateSubmit(modal);
        });
    }

    addTaskInput() {
        const tasksContainer = document.getElementById('template-tasks');
        const taskGroup = document.createElement('div');
        taskGroup.className = 'task-input-group';
        taskGroup.innerHTML = `
            <ion-input 
                type="text" 
                placeholder="任务名称" 
                class="pixel-input task-title-input">
            </ion-input>
            <ion-select class="task-type-select" value="stopwatch">
                <ion-select-option value="stopwatch">正计时</ion-select-option>
                <ion-select-option value="countdown">倒计时</ion-select-option>
            </ion-select>
            <ion-input 
                type="number" 
                placeholder="预计时间(分钟)" 
                class="pixel-input task-time-input">
            </ion-input>
            <button type="button" class="pixel-button small" onclick="this.closest('.task-input-group').remove()">
                删除
            </button>
        `;
        tasksContainer.appendChild(taskGroup);
    }

    async handleCreateSubmit(modal) {
        try {
            const nameInput = modal.querySelector('#template-name');
            const descriptionInput = modal.querySelector('#template-description');
            const estimatedTimeInput = modal.querySelector('#template-estimated-time');

            const name = nameInput.value.trim();
            if (!name) {
                mobileApp.utils.showNotification('请输入模板名称', 'warning');
                return;
            }

            // 收集任务
            const taskGroups = modal.querySelectorAll('.task-input-group');
            const tasks = [];

            taskGroups.forEach(group => {
                const titleInput = group.querySelector('.task-title-input');
                const typeSelect = group.querySelector('.task-type-select');
                const timeInput = group.querySelector('.task-time-input');

                const title = titleInput.value.trim();
                if (title) {
                    const task = {
                        title,
                        type: typeSelect.value,
                        estimatedTime: timeInput.value ? parseInt(timeInput.value) * 60 : null
                    };
                    tasks.push(task);
                }
            });

            if (tasks.length === 0) {
                mobileApp.utils.showNotification('请至少添加一个任务', 'warning');
                return;
            }

            const template = {
                name,
                description: descriptionInput.value.trim(),
                estimatedTime: estimatedTimeInput.value ? parseInt(estimatedTimeInput.value) * 3600 : null,
                tasks
            };

            await this.storage.createTemplate(template);
            
            modal.dismiss();
            mobileApp.utils.showNotification('模板创建成功', 'success');
            mobileApp.refreshCurrentPage();

        } catch (error) {
            console.error('创建模板失败:', error);
            mobileApp.utils.showNotification('创建模板失败', 'error');
        }
    }

    async showDetail(templateId) {
        const template = this.storage.getTemplate(templateId);
        if (!template) {
            mobileApp.utils.showNotification('模板不存在', 'error');
            return;
        }

        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="template-detail">
                <ion-card class="pixel-card template-header">
                    <ion-card-header>
                        <ion-card-title>${template.name}</ion-card-title>
                        <ion-card-subtitle>
                            创建于 ${new Date(template.createdAt).toLocaleDateString()}
                        </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                        ${template.description ? `<p>${template.description}</p>` : ''}
                        <div class="template-meta">
                            <span class="meta-item">
                                <strong>任务数量:</strong> ${template.tasks.length}
                            </span>
                            ${template.estimatedTime ? `
                                <span class="meta-item">
                                    <strong>预计时间:</strong> ${this.formatTime(template.estimatedTime)}
                                </span>
                            ` : ''}
                        </div>
                    </ion-card-content>
                </ion-card>

                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">任务列表</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <ion-list>
                            ${template.tasks.map((task, index) => this.renderTemplateTaskItem(task, index)).join('')}
                        </ion-list>
                    </ion-card-content>
                </ion-card>

                <div class="action-buttons">
                    <button class="pixel-button primary" onclick="mobileApp.useTemplate('${templateId}')">
                        使用此模板
                    </button>
                    <button class="pixel-button" onclick="mobileApp.editTemplate('${templateId}')">
                        编辑模板
                    </button>
                    <button class="pixel-button secondary" onclick="mobileApp.shareTemplate('${templateId}')">
                        分享模板
                    </button>
                    <button class="pixel-button danger" onclick="mobileApp.deleteTemplate('${templateId}')">
                        删除模板
                    </button>
                </div>
            </div>
        `;

        // 更新页面标题和返回按钮
        mobileApp.updatePageTitle(template.name);
        mobileApp.updateBackButton(true);
    }

    renderTemplateTaskItem(task, index) {
        return `
            <ion-item class="template-task-item">
                <div slot="start" class="task-number">${index + 1}</div>
                <ion-label>
                    <h3>${task.title}</h3>
                    <p>
                        ${task.type === 'countdown' ? '倒计时' : '正计时'}
                        ${task.estimatedTime ? ` · ${this.formatTime(task.estimatedTime)}` : ''}
                    </p>
                </ion-label>
                <div slot="end" class="task-type-badge ${task.type}">
                    ${task.type === 'countdown' ? '⏰' : '⏱️'}
                </div>
            </ion-item>
        `;
    }

    async useTemplate(templateId) {
        try {
            const template = this.storage.getTemplate(templateId);
            if (!template) {
                mobileApp.utils.showNotification('模板不存在', 'error');
                return;
            }

            // 创建基于模板的清单
            const checklist = {
                title: `${template.name} - ${new Date().toLocaleDateString()}`,
                description: template.description,
                expectedTime: template.estimatedTime,
                tasks: template.tasks.map(taskTemplate => ({
                    title: taskTemplate.title,
                    type: taskTemplate.type || 'stopwatch',
                    estimatedTime: taskTemplate.estimatedTime,
                    description: taskTemplate.description,
                    status: 'pending',
                    spentTime: 0,
                    isRunning: false
                }))
            };

            const createdChecklist = await this.storage.createChecklist(checklist);
            
            mobileApp.utils.showNotification('基于模板创建清单成功', 'success');
            
            // 跳转到新创建的清单
            mobileApp.checklist.showDetail(createdChecklist.id);

        } catch (error) {
            console.error('使用模板失败:', error);
            mobileApp.utils.showNotification('使用模板失败', 'error');
        }
    }

    async useBuiltinTemplate(templateId) {
        const template = this.getBuiltinTemplates().find(t => t.id === templateId);
        if (!template) {
            mobileApp.utils.showNotification('内置模板不存在', 'error');
            return;
        }

        // 先保存为自定义模板
        await this.storage.createTemplate({
            name: template.name,
            description: template.description,
            estimatedTime: template.estimatedTime,
            tasks: template.tasks
        });

        // 然后使用模板创建清单
        this.useTemplate(templateId);
    }

    getBuiltinTemplates() {
        return [
            {
                id: 'work-day',
                name: '工作日计划',
                description: '标准8小时工作日安排',
                icon: '💼',
                estimatedTime: 8 * 3600, // 8小时
                tasks: [
                    { title: '查看邮件和消息', type: 'stopwatch', estimatedTime: 30 * 60 },
                    { title: '上午工作时段', type: 'stopwatch', estimatedTime: 3 * 3600 },
                    { title: '午休时间', type: 'countdown', estimatedTime: 60 * 60 },
                    { title: '下午工作时段', type: 'stopwatch', estimatedTime: 3.5 * 3600 },
                    { title: '日总结和计划', type: 'stopwatch', estimatedTime: 30 * 60 }
                ]
            },
            {
                id: 'study-session',
                name: '学习时光',
                description: '专注学习时间安排',
                icon: '📚',
                estimatedTime: 4 * 3600, // 4小时
                tasks: [
                    { title: '预习新知识', type: 'stopwatch', estimatedTime: 45 * 60 },
                    { title: '深度学习', type: 'stopwatch', estimatedTime: 90 * 60 },
                    { title: '休息时间', type: 'countdown', estimatedTime: 15 * 60 },
                    { title: '练习和巩固', type: 'stopwatch', estimatedTime: 60 * 60 },
                    { title: '复习和总结', type: 'stopwatch', estimatedTime: 30 * 60 }
                ]
            },
            {
                id: 'pomodoro',
                name: '番茄工作法',
                description: '经典25分钟专注时间',
                icon: '🍅',
                estimatedTime: 2 * 3600, // 2小时
                tasks: [
                    { title: '番茄时段1', type: 'countdown', estimatedTime: 25 * 60 },
                    { title: '短休息1', type: 'countdown', estimatedTime: 5 * 60 },
                    { title: '番茄时段2', type: 'countdown', estimatedTime: 25 * 60 },
                    { title: '短休息2', type: 'countdown', estimatedTime: 5 * 60 },
                    { title: '番茄时段3', type: 'countdown', estimatedTime: 25 * 60 },
                    { title: '长休息', type: 'countdown', estimatedTime: 15 * 60 }
                ]
            },
            {
                id: 'fitness',
                name: '健身训练',
                description: '全身训练计划',
                icon: '💪',
                estimatedTime: 90 * 60, // 1.5小时
                tasks: [
                    { title: '热身运动', type: 'countdown', estimatedTime: 10 * 60 },
                    { title: '力量训练', type: 'stopwatch', estimatedTime: 45 * 60 },
                    { title: '有氧运动', type: 'countdown', estimatedTime: 20 * 60 },
                    { title: '拉伸放松', type: 'countdown', estimatedTime: 15 * 60 }
                ]
            },
            {
                id: 'creative',
                name: '创意工作',
                description: '创意和设计时间',
                icon: '🎨',
                estimatedTime: 3 * 3600, // 3小时
                tasks: [
                    { title: '灵感收集', type: 'stopwatch', estimatedTime: 30 * 60 },
                    { title: '头脑风暴', type: 'stopwatch', estimatedTime: 45 * 60 },
                    { title: '创作时间', type: 'stopwatch', estimatedTime: 90 * 60 },
                    { title: '优化完善', type: 'stopwatch', estimatedTime: 45 * 60 }
                ]
            }
        ];
    }

    bindEvents() {
        console.log('绑定模板页面事件');
    }

    formatTime(seconds) {
        if (!seconds || seconds < 0) return '00:00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟`;
        } else {
            return `${secs}秒`;
        }
    }
}

// 将方法绑定到全局以便模板中调用
window.mobileAppAddTemplateTaskInput = function() {
    if (window.mobileApp && window.mobileApp.template) {
        window.mobileApp.template.addTaskInput();
    }
};

export { MobileTemplate };
