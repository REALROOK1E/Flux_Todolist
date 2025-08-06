// 实用工具函数扩展
Object.assign(TodoApp.prototype, {
    // 输入验证工具
    validateInput: {
        // 验证字符串不为空
        notEmpty(value, fieldName = '字段') {
            if (!value || typeof value !== 'string' || value.trim().length === 0) {
                throw new Error(`${fieldName}不能为空`);
            }
            return value.trim();
        },

        // 验证数字范围
        numberRange(value, min = 0, max = Number.MAX_SAFE_INTEGER, fieldName = '数值') {
            const num = parseFloat(value);
            if (isNaN(num)) {
                throw new Error(`${fieldName}必须是有效数字`);
            }
            if (num < min || num > max) {
                throw new Error(`${fieldName}必须在 ${min} 到 ${max} 之间`);
            }
            return num;
        },

        // 验证时长格式
        duration(value, fieldName = '时长') {
            const duration = this.numberRange(value, 1, 480, fieldName); // 1分钟到8小时
            return Math.floor(duration);
        },

        // 验证清单名称
        checklistName(value) {
            const name = this.notEmpty(value, '清单名称');
            if (name.length > 100) {
                throw new Error('清单名称不能超过100个字符');
            }
            return name;
        },

        // 验证任务标题
        taskTitle(value) {
            const title = this.notEmpty(value, '任务标题');
            if (title.length > 200) {
                throw new Error('任务标题不能超过200个字符');
            }
            return title;
        }
    },

    // 显示加载指示器
    showLoading(message = '正在处理...') {
        const indicator = document.getElementById('loadingIndicator');
        const messageEl = indicator.querySelector('span');
        messageEl.textContent = message;
        indicator.classList.remove('hidden');
    },

    // 隐藏加载指示器
    hideLoading() {
        const indicator = document.getElementById('loadingIndicator');
        indicator.classList.add('hidden');
    },

    // 数据备份和恢复
    async backupData() {
        try {
            const backupData = {
                ...this.data,
                backupDate: new Date().toISOString(),
                version: '1.0'
            };

            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `flux_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showNotification('数据备份成功', 'success');
        } catch (error) {
            console.error('备份数据失败:', error);
            this.showNotification('备份数据失败', 'error');
        }
    },

    showRestoreDataModal() {
        const modalBody = `
            <div class="form-group">
                <label for="backupFile">选择备份文件:</label>
                <input type="file" id="backupFile" accept=".json" 
                       style="width: 100%; margin-top: 10px; padding: 8px; background: #1a1a1a; border: 2px solid #444; color: #fff;">
            </div>
            <div style="margin-top: 15px; color: #ff6600; font-size: 12px;">
                ⚠️ 警告: 恢复数据将覆盖当前所有数据，此操作无法撤销！
            </div>
        `;

        this.showModal('恢复数据', modalBody);

        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.restoreData();
    },

    async restoreData() {
        const fileInput = document.getElementById('backupFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showNotification('请选择备份文件', 'warning');
            return;
        }

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);

            // 验证备份数据格式
            if (!backupData.checklists || !Array.isArray(backupData.checklists)) {
                throw new Error('无效的备份文件格式');
            }

            // 停止所有计时器
            this.stopAllTimers();

            // 恢复数据
            this.data = {
                checklists: backupData.checklists || [],
                archivedChecklists: backupData.archivedChecklists || [],
                templates: backupData.templates || [],
                settings: backupData.settings || {}
            };

            // 保存到本地
            await this.saveData();

            this.hideModal();
            this.showNotification('数据恢复成功', 'success');
            this.showView('checklists');

        } catch (error) {
            console.error('恢复数据失败:', error);
            this.showNotification('恢复数据失败: ' + error.message, 'error');
        }
    },

    // 清理数据
    async cleanupData() {
        const result = await this.showConfirmModal(
            '清理数据',
            '这将删除所有已归档的清单，是否继续？'
        );

        if (result) {
            this.data.archivedChecklists = [];
            await this.saveData();
            this.showNotification('数据清理完成', 'success');
            this.renderArchiveView();
        }
    },

    // 应用设置
    showSettingsModal() {
        const modalBody = `
            <div class="settings-section">
                <h4 style="color: #00ff00; margin-bottom: 15px;">通知设置</h4>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="enableNotifications" ${this.data.settings.enableNotifications !== false ? 'checked' : ''}>
                        启用桌面通知
                    </label>
                </div>
                <div class="form-group" style="margin-top: 10px;">
                    <label>
                        <input type="checkbox" id="enableSounds" ${this.data.settings.enableSounds !== false ? 'checked' : ''}>
                        启用提示音
                    </label>
                </div>
            </div>
            
            <div class="settings-section" style="margin-top: 25px;">
                <h4 style="color: #00ff00; margin-bottom: 15px;">自动保存</h4>
                <div class="form-group">
                    <label for="autoSaveInterval">自动保存间隔 (秒):</label>
                    <input type="number" id="autoSaveInterval" class="pixel-input" 
                           value="${this.data.settings.autoSaveInterval || 30}" min="10" max="300"
                           style="width: 100%; margin-top: 10px;">
                </div>
            </div>
            
            <div class="settings-section" style="margin-top: 25px;">
                <h4 style="color: #00ff00; margin-bottom: 15px;">主题设置</h4>
                <div class="form-group">
                    <label for="themeSelect">选择主题:</label>
                    <select id="themeSelect" class="pixel-select" style="width: 100%; margin-top: 10px;">
                        <option value="pixel" ${this.data.settings.theme === 'pixel' ? 'selected' : ''}>像素风格</option>
                        <option value="dark" ${this.data.settings.theme === 'dark' ? 'selected' : ''}>暗黑主题</option>
                        <option value="classic" ${this.data.settings.theme === 'classic' ? 'selected' : ''}>经典主题</option>
                    </select>
                </div>
            </div>

            <div class="settings-section" style="margin-top: 25px;">
                <h4 style="color: #00ff00; margin-bottom: 15px;">数据管理</h4>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button class="pixel-btn btn-secondary" onclick="app.backupData(); app.hideModal();" title="备份数据">
                        💾
                    </button>
                    <button class="pixel-btn btn-secondary" onclick="app.hideModal(); app.showRestoreDataModal();" title="恢复数据">
                        📁
                    </button>
                    <button class="pixel-btn btn-warning" onclick="app.cleanupData();" title="清理归档">
                        🗑
                    </button>
                </div>
            </div>
        `;

        this.showModal('应用设置', modalBody);

        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.onclick = () => this.saveSettings();
    },

    async saveSettings() {
        const settings = {
            enableNotifications: document.getElementById('enableNotifications').checked,
            enableSounds: document.getElementById('enableSounds').checked,
            autoSaveInterval: parseInt(document.getElementById('autoSaveInterval').value) || 30,
            theme: document.getElementById('themeSelect').value
        };

        this.data.settings = { ...this.data.settings, ...settings };
        await this.saveData();

        // 应用新设置
        this.applySettings();

        this.hideModal();
        this.showNotification('设置已保存', 'success');
    },

    applySettings() {
        // 应用主题
        document.body.className = `theme-${this.data.settings.theme || 'pixel'}`;

        // 重新设置自动保存间隔
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => {
            this.saveData();
        }, (this.data.settings.autoSaveInterval || 30) * 1000);
    },

    // 键盘快捷键
    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 跳过在输入框中的快捷键
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 根据当前视图和按键执行对应操作
            switch (e.key) {
                case 'n':
                case 'N':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        if (this.currentView === 'checklists') {
                            this.showCreateChecklistModal();
                        } else if (this.currentView === 'templates') {
                            this.showCreateTemplateModal();
                        }
                    }
                    break;
                    
                case 's':
                case 'S':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.saveData();
                        this.showNotification('数据已保存', 'info');
                    }
                    break;
                    
                case 'b':
                case 'B':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.backupData();
                    }
                    break;
                    
                case 'Escape':
                    if (this.currentView === 'checklistDetail') {
                        this.showView('checklists');
                    }
                    break;
                    
                case 'F1':
                    e.preventDefault();
                    this.showHelpModal();
                    break;
            }
        });
    },

    // 帮助信息
    showHelpModal() {
        const modalBody = `
            <div class="help-content">
                <h4 style="color: #00ff00; margin-bottom: 15px;">快捷键</h4>
                <div style="margin-bottom: 20px; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6;">
                    <div><strong>Ctrl + N:</strong> 新建清单/模板</div>
                    <div><strong>Ctrl + S:</strong> 保存数据</div>
                    <div><strong>Ctrl + B:</strong> 备份数据</div>
                    <div><strong>Escape:</strong> 返回上级页面</div>
                    <div><strong>F1:</strong> 显示帮助</div>
                </div>
                
                <h4 style="color: #00ff00; margin-bottom: 15px;">使用说明</h4>
                <div style="font-size: 14px; line-height: 1.6; color: #ccc;">
                    <p><strong>1. 创建清单:</strong> 点击"新建清单"按钮，可以选择使用模板快速创建。</p>
                    <p><strong>2. 管理任务:</strong> 在清单详情页面可以添加、编辑、删除任务。</p>
                    <p><strong>3. 计时功能:</strong> 每个任务支持正计时和倒计时两种模式。</p>
                    <p><strong>4. 结束清单:</strong> 点击"结束清单"按钮将清单归档。</p>
                    <p><strong>5. 模板管理:</strong> 可以创建自定义模板，提高工作效率。</p>
                </div>
                
                <h4 style="color: #00ff00; margin: 20px 0 15px 0;">时间格式</h4>
                <div style="font-size: 12px; color: #aaa;">
                    支持多种时间输入格式：30分钟、1小时、1:30:00、90 等
                </div>
            </div>
        `;

        this.showModal('使用帮助', modalBody, false);
    },

    // 搜索功能
    initSearch() {
        // 创建搜索框
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999;
            display: none;
        `;
        
        searchContainer.innerHTML = `
            <input type="text" id="globalSearch" class="pixel-input" 
                   style="width: 200px; font-size: 12px;">
            <div id="searchResults" class="search-results" style="
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: #2d2d2d;
                border: 3px solid #444;
                border-top: none;
                max-height: 300px;
                overflow-y: auto;
                display: none;
            "></div>
        `;
        
        document.body.appendChild(searchContainer);

        // 搜索快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                this.toggleSearch();
            }
        });

        // 搜索输入处理
        const searchInput = document.getElementById('globalSearch');
        searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => {
                document.getElementById('searchResults').style.display = 'none';
            }, 200);
        });
    },

    toggleSearch() {
        const container = document.querySelector('.search-container');
        const input = document.getElementById('globalSearch');
        
        if (container.style.display === 'none') {
            container.style.display = 'block';
            input.focus();
        } else {
            container.style.display = 'none';
            input.value = '';
            document.getElementById('searchResults').style.display = 'none';
        }
    },

    performSearch(query) {
        if (!query.trim()) {
            document.getElementById('searchResults').style.display = 'none';
            return;
        }

        const results = [];
        
        // 搜索清单
        this.data.checklists.forEach(checklist => {
            if (checklist.name.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    type: 'checklist',
                    title: checklist.name,
                    subtitle: '清单',
                    data: checklist
                });
            }
            
            // 搜索任务
            checklist.tasks.forEach(task => {
                if (task.title.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        type: 'task',
                        title: task.title,
                        subtitle: `任务 - ${checklist.name}`,
                        data: { task, checklist }
                    });
                }
            });
        });

        // 搜索模板
        this.data.templates.forEach(template => {
            if (template.name.toLowerCase().includes(query.toLowerCase())) {
                results.push({
                    type: 'template',
                    title: template.name,
                    subtitle: '模板',
                    data: template
                });
            }
        });

        this.displaySearchResults(results);
    },

    displaySearchResults(results) {
        const container = document.getElementById('searchResults');
        
        if (results.length === 0) {
            container.innerHTML = '<div style="padding: 10px; color: #666;">没有找到结果</div>';
        } else {
            container.innerHTML = results.map(result => `
                <div class="search-result-item" style="
                    padding: 10px;
                    border-bottom: 1px solid #444;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " onmouseover="this.style.backgroundColor='#3d3d3d'" 
                  onmouseout="this.style.backgroundColor=''" 
                  onclick="app.selectSearchResult('${result.type}', '${result.data.id || result.data.checklist?.id}', '${result.data.task?.id || ''}')">
                    <div style="font-weight: bold; color: #fff;">${result.title}</div>
                    <div style="font-size: 11px; color: #aaa;">${result.subtitle}</div>
                </div>
            `).join('');
        }
        
        container.style.display = 'block';
    },

    selectSearchResult(type, id, taskId = '') {
        this.toggleSearch();
        
        switch (type) {
            case 'checklist':
                this.openChecklist(id);
                break;
            case 'task':
                this.openChecklist(id);
                // 可以添加高亮特定任务的功能
                break;
            case 'template':
                this.showView('templates');
                break;
        }
    }
});

// 在应用初始化时启动工具功能
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.app) {
            app.initKeyboardShortcuts();
            app.initSearch();
            app.applySettings();
        }
    }, 1000);
});
