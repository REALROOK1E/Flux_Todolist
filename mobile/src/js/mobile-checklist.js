class MobileChecklist {
    constructor(storage) {
        this.storage = storage;
    }

    async renderChecklistsPage() {
        const data = this.storage.getData();
        const activeChecklists = data.checklists.filter(c => c.status === 'active');
        const archivedChecklists = data.archivedChecklists || [];

        return `
            <div class="checklists-page">
                <!-- 搜索栏 -->
                <div class="search-section">
                    <ion-searchbar 
                        placeholder="搜索清单..." 
                        id="checklist-search"
                        class="pixel-input">
                    </ion-searchbar>
                </div>

                <!-- 活跃清单 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">活跃清单 (${activeChecklists.length})</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        ${activeChecklists.length > 0 ? `
                            <ion-list>
                                ${activeChecklists.map(checklist => this.renderChecklistItem(checklist)).join('')}
                            </ion-list>
                        ` : `
                            <div class="empty-state">
                                <ion-icon name="list-outline" size="large"></ion-icon>
                                <h3>暂无活跃清单</h3>
                                <p>创建您的第一个清单开始使用</p>
                                <button class="pixel-button primary" onclick="mobileApp.showCreateChecklistModal()">
                                    创建清单
                                </button>
                            </div>
                        `}
                    </ion-card-content>
                </ion-card>

                <!-- 归档清单 -->
                ${archivedChecklists.length > 0 ? `
                    <ion-card class="pixel-card">
                        <ion-card-header>
                            <ion-card-title class="pixel-font">归档清单 (${archivedChecklists.length})</ion-card-title>
                        </ion-card-header>
                        <ion-card-content>
                            <ion-list>
                                ${archivedChecklists.slice(0, 5).map(checklist => this.renderArchivedChecklistItem(checklist)).join('')}
                            </ion-list>
                            ${archivedChecklists.length > 5 ? `
                                <button class="pixel-button" onclick="mobileApp.showAllArchivedChecklists()">
                                    查看更多归档清单
                                </button>
                            ` : ''}
                        </ion-card-content>
                    </ion-card>
                ` : ''}
            </div>
        `;
    }

    renderChecklistItem(checklist) {
        const progress = this.getProgress(checklist);
        const totalTasks = checklist.tasks?.length || 0;
        const completedTasks = checklist.tasks?.filter(t => t.status === 'completed').length || 0;
        const totalTime = this.getTotalTime(checklist);
        const isActive = this.hasRunningTasks(checklist);

        return `
            <ion-item class="checklist-item ${isActive ? 'active' : ''}" 
                     onclick="mobileApp.showChecklistDetail('${checklist.id}')">
                <div slot="start" class="checklist-indicator ${isActive ? 'running' : ''}">
                    ${isActive ? '▶' : '📝'}
                </div>
                <ion-label>
                    <h2>${checklist.title}</h2>
                    <h3>${completedTasks}/${totalTasks} 任务完成</h3>
                    <p>总时长: ${this.formatTime(totalTime)}</p>
                </ion-label>
                <div slot="end" class="checklist-meta">
                    <div class="progress-circle" style="--progress: ${progress}%">
                        <span>${Math.round(progress)}%</span>
                    </div>
                    <button class="pixel-button small" onclick="event.stopPropagation(); mobileApp.showChecklistActions('${checklist.id}')">
                        ⋯
                    </button>
                </div>
            </ion-item>
        `;
    }

    renderArchivedChecklistItem(checklist) {
        const totalTasks = checklist.tasks?.length || 0;
        const completedTasks = checklist.tasks?.filter(t => t.status === 'completed').length || 0;
        const archivedDate = new Date(checklist.archivedAt).toLocaleDateString();

        return `
            <ion-item class="archived-item" onclick="mobileApp.showArchivedChecklistDetail('${checklist.id}')">
                <div slot="start" class="archived-indicator">📦</div>
                <ion-label>
                    <h3>${checklist.title}</h3>
                    <p>${completedTasks}/${totalTasks} 任务 · ${archivedDate}</p>
                </ion-label>
                <ion-button slot="end" fill="clear" onclick="event.stopPropagation(); mobileApp.restoreChecklist('${checklist.id}')">
                    恢复
                </ion-button>
            </ion-item>
        `;
    }

    async showDetail(checklistId) {
        const checklist = this.storage.getChecklist(checklistId);
        if (!checklist) {
            mobileApp.utils.showNotification('清单不存在', 'error');
            return;
        }

        const content = document.getElementById('main-content');
        content.innerHTML = `
            <div class="checklist-detail">
                <!-- 清单头部 -->
                <ion-card class="pixel-card checklist-header">
                    <ion-card-header>
                        <ion-card-title>${checklist.title}</ion-card-title>
                        <ion-card-subtitle>
                            创建于 ${new Date(checklist.createdAt).toLocaleDateString()}
                        </ion-card-subtitle>
                    </ion-card-header>
                    <ion-card-content>
                        <div class="checklist-stats">
                            <div class="stat-item">
                                <span class="stat-value">${checklist.tasks?.length || 0}</span>
                                <span class="stat-label">总任务</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${checklist.tasks?.filter(t => t.status === 'completed').length || 0}</span>
                                <span class="stat-label">已完成</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${this.formatTime(this.getTotalTime(checklist))}</span>
                                <span class="stat-label">总时长</span>
                            </div>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${this.getProgress(checklist)}%"></div>
                        </div>
                    </ion-card-content>
                </ion-card>

                <!-- 任务列表 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">任务列表</ion-card-title>
                        <button class="pixel-button primary" onclick="mobileApp.showCreateTaskModal('${checklistId}')">
                            添加任务
                        </button>
                    </ion-card-header>
                    <ion-card-content>
                        ${checklist.tasks && checklist.tasks.length > 0 ? `
                            <ion-list>
                                ${checklist.tasks.map(task => this.renderTaskItem(task, checklistId)).join('')}
                            </ion-list>
                        ` : `
                            <div class="empty-state">
                                <ion-icon name="checkbox-outline" size="large"></ion-icon>
                                <h3>暂无任务</h3>
                                <p>添加第一个任务开始计时</p>
                            </div>
                        `}
                    </ion-card-content>
                </ion-card>

                <!-- 操作按钮 -->
                <div class="action-buttons">
                    <button class="pixel-button" onclick="mobileApp.editChecklist('${checklistId}')">
                        编辑清单
                    </button>
                    <button class="pixel-button secondary" onclick="mobileApp.shareChecklist('${checklistId}')">
                        分享清单
                    </button>
                    <button class="pixel-button danger" onclick="mobileApp.archiveChecklist('${checklistId}')">
                        归档清单
                    </button>
                </div>
            </div>
        `;

        // 更新页面标题和返回按钮
        mobileApp.updatePageTitle(checklist.title);
        mobileApp.updateBackButton(true);
    }

    renderTaskItem(task, checklistId) {
        const isRunning = task.isRunning;
        const timeDisplay = this.formatTime(task.spentTime || 0);
        const statusIcon = task.status === 'completed' ? '✅' : 
                          task.status === 'in-progress' ? '⏳' : '⭕';

        return `
            <ion-item class="task-item ${task.status} ${isRunning ? 'running' : ''}">
                <div slot="start" class="task-checkbox" onclick="mobileApp.toggleTaskStatus('${task.id}')">
                    ${statusIcon}
                </div>
                <ion-label class="${task.status === 'completed' ? 'completed' : ''}">
                    <h3>${task.title}</h3>
                    <p>
                        ${task.type === 'countdown' ? '倒计时' : '正计时'} · 
                        ${task.estimatedTime ? this.formatTime(task.estimatedTime) + ' 预计 · ' : ''}
                        ${timeDisplay} 已用
                    </p>
                </ion-label>
                <div slot="end" class="task-actions">
                    ${isRunning ? `
                        <button class="pixel-button danger small" onclick="mobileApp.stopTask('${task.id}')">
                            停止
                        </button>
                    ` : `
                        <button class="pixel-button primary small" onclick="mobileApp.startTask('${task.id}')">
                            开始
                        </button>
                    `}
                    <button class="pixel-button small" onclick="mobileApp.showTaskActions('${task.id}')">
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
                    <ion-title>创建清单</ion-title>
                    <ion-buttons slot="end">
                        <ion-button onclick="this.closest('ion-modal').dismiss()">取消</ion-button>
                    </ion-buttons>
                </ion-toolbar>
            </ion-header>
            <ion-content class="pixel-content">
                <form id="create-checklist-form" class="pixel-form">
                    <div class="form-group">
                        <label>清单名称</label>
                        <ion-input 
                            type="text" 
                            id="checklist-title" 
                            placeholder="输入清单名称..." 
                            class="pixel-input"
                            required>
                        </ion-input>
                    </div>
                    
                    <div class="form-group">
                        <label>描述 (可选)</label>
                        <ion-textarea 
                            id="checklist-description" 
                            placeholder="输入清单描述..." 
                            class="pixel-input"
                            rows="3">
                        </ion-textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>预期工作时间 (可选)</label>
                        <ion-input 
                            type="number" 
                            id="expected-time" 
                            placeholder="小时" 
                            class="pixel-input">
                        </ion-input>
                    </div>
                    
                    <div class="form-group">
                        <label>选择模板</label>
                        <ion-select id="template-select" placeholder="选择模板...">
                            <ion-select-option value="">不使用模板</ion-select-option>
                            ${this.renderTemplateOptions()}
                        </ion-select>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="pixel-button primary">创建清单</button>
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
        const form = modal.querySelector('#create-checklist-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleCreateSubmit(modal);
        });
    }

    renderTemplateOptions() {
        const templates = this.storage.getTemplates();
        return templates.map(template => 
            `<ion-select-option value="${template.id}">${template.name}</ion-select-option>`
        ).join('');
    }

    async handleCreateSubmit(modal) {
        try {
            const titleInput = modal.querySelector('#checklist-title');
            const descriptionInput = modal.querySelector('#checklist-description');
            const expectedTimeInput = modal.querySelector('#expected-time');
            const templateSelect = modal.querySelector('#template-select');

            const title = titleInput.value.trim();
            if (!title) {
                mobileApp.utils.showNotification('请输入清单名称', 'warning');
                return;
            }

            const checklist = {
                title,
                description: descriptionInput.value.trim(),
                expectedTime: expectedTimeInput.value ? parseInt(expectedTimeInput.value) * 3600 : null,
                tasks: []
            };

            // 如果选择了模板，应用模板
            const selectedTemplateId = templateSelect.value;
            if (selectedTemplateId) {
                const template = this.storage.getTemplate(selectedTemplateId);
                if (template && template.tasks) {
                    checklist.tasks = template.tasks.map(taskTemplate => ({
                        title: taskTemplate.title,
                        type: taskTemplate.type || 'stopwatch',
                        estimatedTime: taskTemplate.estimatedTime,
                        description: taskTemplate.description,
                        status: 'pending',
                        spentTime: 0,
                        isRunning: false
                    }));
                }
            }

            await this.storage.createChecklist(checklist);
            
            modal.dismiss();
            mobileApp.utils.showNotification('清单创建成功', 'success');
            mobileApp.refreshCurrentPage();

        } catch (error) {
            console.error('创建清单失败:', error);
            mobileApp.utils.showNotification('创建清单失败', 'error');
        }
    }

    bindEvents() {
        // 绑定搜索事件
        const searchBar = document.getElementById('checklist-search');
        if (searchBar) {
            searchBar.addEventListener('ionInput', (e) => {
                this.filterChecklists(e.detail.value);
            });
        }
    }

    filterChecklists(query) {
        const items = document.querySelectorAll('.checklist-item');
        items.forEach(item => {
            const title = item.querySelector('h2').textContent.toLowerCase();
            const visible = title.includes(query.toLowerCase());
            item.style.display = visible ? 'block' : 'none';
        });
    }

    getProgress(checklist) {
        if (!checklist.tasks || checklist.tasks.length === 0) return 0;
        
        const completedTasks = checklist.tasks.filter(t => t.status === 'completed').length;
        return (completedTasks / checklist.tasks.length) * 100;
    }

    getTotalTime(checklist) {
        if (!checklist.tasks) return 0;
        
        return checklist.tasks.reduce((total, task) => {
            return total + (task.spentTime || 0);
        }, 0);
    }

    hasRunningTasks(checklist) {
        if (!checklist.tasks) return false;
        
        return checklist.tasks.some(task => task.isRunning);
    }

    formatTime(seconds) {
        if (!seconds || seconds < 0) return '00:00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

export { MobileChecklist };
