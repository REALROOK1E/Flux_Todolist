import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

import { MobileStorage } from './mobile-storage.js';
import { MobileChecklist } from './mobile-checklist.js';
import { MobileTimer } from './mobile-timer.js';
import { MobileTemplate } from './mobile-template.js';
import { MobileUtils } from './mobile-utils.js';

class MobileApp {
    constructor() {
        this.currentPage = 'home';
        this.storage = new MobileStorage();
        this.checklist = new MobileChecklist(this.storage);
        this.timer = new MobileTimer(this.storage);
        this.template = new MobileTemplate(this.storage);
        this.utils = new MobileUtils();
        
        this.currentChecklist = null;
        this.activeTask = null;
        
        this.init();
    }

    async init() {
        try {
            // 等待DOM加载完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.initApp());
            } else {
                this.initApp();
            }
        } catch (error) {
            console.error('应用初始化失败:', error);
            this.utils.showNotification('应用初始化失败', 'error');
        }
    }

    async initApp() {
        console.log('正在初始化移动端应用...');
        
        try {
            // 初始化Capacitor插件
            await this.initCapacitorPlugins();
            
            // 初始化数据存储
            await this.storage.init();
            
            // 初始化UI
            this.initUI();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 加载首页
            this.showPage('home');
            
            // 隐藏加载屏幕
            this.hideLoadingScreen();
            
            console.log('移动端应用初始化完成');
            
        } catch (error) {
            console.error('应用初始化过程中出错:', error);
            this.utils.showNotification('应用加载失败，请重试', 'error');
            this.hideLoadingScreen();
        }
    }

    async initCapacitorPlugins() {
        if (Capacitor.isNativePlatform()) {
            try {
                // 设置状态栏样式
                await StatusBar.setStyle({ style: Style.Dark });
                await StatusBar.setBackgroundColor({ color: '#1a1a1a' });
                
                // 隐藏启动屏幕
                await SplashScreen.hide();
                
                // 监听应用状态变化
                CapApp.addListener('appStateChange', ({ isActive }) => {
                    if (isActive) {
                        this.onAppResume();
                    } else {
                        this.onAppPause();
                    }
                });
                
                // 监听返回按钮
                CapApp.addListener('backButton', ({ canGoBack }) => {
                    if (this.currentPage !== 'home') {
                        this.showPage('home');
                    } else if (canGoBack) {
                        CapApp.exitApp();
                    }
                });
                
                console.log('Capacitor插件初始化完成');
                
            } catch (error) {
                console.warn('Capacitor插件初始化失败:', error);
            }
        }
    }

    initUI() {
        // 初始化底部导航
        this.initTabBar();
        
        // 初始化悬浮按钮
        this.initFAB();
        
        // 初始化页面标题
        this.updatePageTitle('Flux');
    }

    initTabBar() {
        const tabButtons = document.querySelectorAll('ion-tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = button.getAttribute('tab');
                this.showPage(tab);
                this.triggerHaptic();
            });
        });
    }

    initFAB() {
        const addChecklistBtn = document.getElementById('add-checklist');
        const addTemplateBtn = document.getElementById('add-template');
        
        if (addChecklistBtn) {
            addChecklistBtn.addEventListener('click', () => {
                this.showCreateChecklistModal();
                this.triggerHaptic();
            });
        }
        
        if (addTemplateBtn) {
            addTemplateBtn.addEventListener('click', () => {
                this.showCreateTemplateModal();
                this.triggerHaptic();
            });
        }
    }

    setupEventListeners() {
        // 返回按钮
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.goBack();
                this.triggerHaptic();
            });
        }
        
        // 菜单按钮
        const menuBtn = document.getElementById('menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.showMenu();
                this.triggerHaptic();
            });
        }
        
        // 监听数据变化
        this.storage.onDataChange = () => {
            this.refreshCurrentPage();
        };
        
        // 监听计时器更新
        this.timer.onTimerUpdate = (taskId, timeData) => {
            this.updateTimerDisplay(taskId, timeData);
        };
        
        // 监听计时器结束
        this.timer.onTimerComplete = (taskId) => {
            this.onTimerComplete(taskId);
        };
    }

    async showPage(pageName) {
        console.log(`切换到页面: ${pageName}`);
        
        // 更新当前页面
        const previousPage = this.currentPage;
        this.currentPage = pageName;
        
        // 更新标签栏状态
        this.updateTabBarState(pageName);
        
        // 更新返回按钮状态
        this.updateBackButton(pageName !== 'home');
        
        // 获取内容容器
        const content = document.getElementById('main-content');
        if (!content) return;
        
        try {
            // 显示加载状态
            content.innerHTML = '<div class="loading-content"><div class="pixel-spinner"></div></div>';
            
            // 根据页面名称渲染内容
            let pageContent = '';
            
            switch (pageName) {
                case 'home':
                    pageContent = await this.renderHomePage();
                    this.updatePageTitle('Flux');
                    break;
                case 'checklists':
                    pageContent = await this.renderChecklistsPage();
                    this.updatePageTitle('清单管理');
                    break;
                case 'timer':
                    pageContent = await this.renderTimerPage();
                    this.updatePageTitle('专注计时');
                    break;
                case 'templates':
                    pageContent = await this.renderTemplatesPage();
                    this.updatePageTitle('模板管理');
                    break;
                case 'stats':
                    pageContent = await this.renderStatsPage();
                    this.updatePageTitle('统计数据');
                    break;
                default:
                    pageContent = '<div class="pixel-card"><h2>页面不存在</h2></div>';
            }
            
            // 渲染页面内容
            content.innerHTML = pageContent;
            
            // 绑定页面特定的事件
            this.bindPageEvents(pageName);
            
        } catch (error) {
            console.error(`加载页面 ${pageName} 失败:`, error);
            content.innerHTML = `
                <div class="pixel-card">
                    <h2>加载失败</h2>
                    <p>无法加载页面内容，请重试</p>
                    <button class="pixel-button" onclick="location.reload()">刷新应用</button>
                </div>
            `;
        }
    }

    async renderHomePage() {
        const data = await this.storage.getData();
        const activeChecklists = data.checklists.filter(c => c.status === 'active');
        const runningTasks = this.timer.getRunningTasks();
        const todayStats = this.getTodayStats();
        
        return `
            <div class="home-page">
                <!-- 今日统计卡片 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">今日概览</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <span class="stat-value">${this.utils.formatTime(todayStats.totalTime)}</span>
                                <span class="stat-label">总工作时间</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">${todayStats.completedTasks}</span>
                                <span class="stat-label">完成任务</span>
                            </div>
                            <div class="stat-card">
                                <span class="stat-value">${activeChecklists.length}</span>
                                <span class="stat-label">活跃清单</span>
                            </div>
                        </div>
                    </ion-card-content>
                </ion-card>

                <!-- 正在进行的任务 -->
                ${runningTasks.length > 0 ? `
                    <ion-card class="pixel-card">
                        <ion-card-header>
                            <ion-card-title class="pixel-font">正在进行</ion-card-title>
                        </ion-card-header>
                        <ion-card-content>
                            ${runningTasks.map(task => `
                                <div class="running-task">
                                    <div class="task-info">
                                        <h4>${task.title}</h4>
                                        <div class="time-display" id="timer-${task.id}">
                                            ${this.utils.formatTime(this.timer.getCurrentTime(task.id))}
                                        </div>
                                    </div>
                                    <button class="pixel-button danger" onclick="mobileApp.timer.stopTask('${task.id}')">
                                        停止
                                    </button>
                                </div>
                            `).join('')}
                        </ion-card-content>
                    </ion-card>
                ` : ''}

                <!-- 快速操作 -->
                <ion-card class="pixel-card">
                    <ion-card-header>
                        <ion-card-title class="pixel-font">快速操作</ion-card-title>
                    </ion-card-header>
                    <ion-card-content>
                        <div class="quick-actions">
                            <button class="pixel-button primary" onclick="mobileApp.showPage('checklists')">
                                管理清单
                            </button>
                            <button class="pixel-button secondary" onclick="mobileApp.showPage('timer')">
                                开始计时
                            </button>
                            <button class="pixel-button" onclick="mobileApp.showCreateChecklistModal()">
                                新建清单
                            </button>
                        </div>
                    </ion-card-content>
                </ion-card>

                <!-- 最近清单 -->
                ${activeChecklists.length > 0 ? `
                    <ion-card class="pixel-card">
                        <ion-card-header>
                            <ion-card-title class="pixel-font">最近清单</ion-card-title>
                        </ion-card-header>
                        <ion-card-content>
                            ${activeChecklists.slice(0, 3).map(checklist => `
                                <ion-item class="checklist-item" onclick="mobileApp.showChecklistDetail('${checklist.id}')">
                                    <ion-label>
                                        <h3>${checklist.title}</h3>
                                        <p>${checklist.tasks?.length || 0} 个任务</p>
                                    </ion-label>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${this.checklist.getProgress(checklist)}%"></div>
                                    </div>
                                </ion-item>
                            `).join('')}
                        </ion-card-content>
                    </ion-card>
                ` : `
                    <ion-card class="pixel-card">
                        <ion-card-content>
                            <div style="text-align: center; padding: 40px 20px;">
                                <h3>欢迎使用 Flux</h3>
                                <p>开始创建您的第一个清单吧！</p>
                                <button class="pixel-button primary" onclick="mobileApp.showCreateChecklistModal()">
                                    创建清单
                                </button>
                            </div>
                        </ion-card-content>
                    </ion-card>
                `}
            </div>
        `;
    }

    updateTabBarState(activePage) {
        const tabButtons = document.querySelectorAll('ion-tab-button');
        tabButtons.forEach(button => {
            const tab = button.getAttribute('tab');
            if (tab === activePage) {
                button.setAttribute('tab', activePage);
                button.classList.add('tab-selected');
            } else {
                button.classList.remove('tab-selected');
            }
        });
    }

    updateBackButton(show) {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.style.display = show ? 'block' : 'none';
        }
    }

    updatePageTitle(title) {
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500);
            }, 1500); // 显示1.5秒的加载动画
        }
    }

    goBack() {
        if (this.currentPage !== 'home') {
            this.showPage('home');
        }
    }

    showMenu() {
        // 实现菜单功能
        this.utils.showAlert('菜单', '菜单功能正在开发中...', [{
            text: '确定',
            role: 'cancel'
        }]);
    }

    async triggerHaptic(style = ImpactStyle.Light) {
        if (Capacitor.isNativePlatform()) {
            try {
                await Haptics.impact({ style });
            } catch (error) {
                console.warn('触觉反馈不可用:', error);
            }
        }
    }

    onAppResume() {
        console.log('应用恢复');
        // 重新开始计时器
        this.timer.resumeTimers();
        // 刷新当前页面
        this.refreshCurrentPage();
    }

    onAppPause() {
        console.log('应用暂停');
        // 保存数据
        this.storage.saveData();
    }

    refreshCurrentPage() {
        if (this.currentPage) {
            this.showPage(this.currentPage);
        }
    }

    getTodayStats() {
        // 实现今日统计逻辑
        return {
            totalTime: 0,
            completedTasks: 0,
            activeChecklists: 0
        };
    }

    updateTimerDisplay(taskId, timeData) {
        const timerElement = document.getElementById(`timer-${taskId}`);
        if (timerElement) {
            timerElement.textContent = this.utils.formatTime(timeData.currentTime);
        }
    }

    onTimerComplete(taskId) {
        this.utils.showNotification('计时结束！', 'success');
        this.triggerHaptic(ImpactStyle.Heavy);
        this.refreshCurrentPage();
    }

    // 页面渲染方法（这些方法需要在其他文件中实现）
    async renderChecklistsPage() {
        return this.checklist.renderChecklistsPage();
    }

    async renderTimerPage() {
        return this.timer.renderTimerPage();
    }

    async renderTemplatesPage() {
        return this.template.renderTemplatesPage();
    }

    async renderStatsPage() {
        // 实现统计页面
        return '<div class="pixel-card"><h2>统计功能正在开发中...</h2></div>';
    }

    bindPageEvents(pageName) {
        // 根据页面绑定特定事件
        switch (pageName) {
            case 'checklists':
                this.checklist.bindEvents();
                break;
            case 'timer':
                this.timer.bindEvents();
                break;
            case 'templates':
                this.template.bindEvents();
                break;
        }
    }

    // 模态框方法
    showCreateChecklistModal() {
        this.checklist.showCreateModal();
    }

    showCreateTemplateModal() {
        this.template.showCreateModal();
    }

    showChecklistDetail(checklistId) {
        this.checklist.showDetail(checklistId);
    }
}

// 初始化应用
window.mobileApp = new MobileApp();

export { MobileApp };
