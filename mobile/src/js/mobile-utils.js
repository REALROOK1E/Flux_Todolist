import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';

class MobileUtils {
    constructor() {
        this.notificationQueue = [];
        this.isShowingNotification = false;
    }

    // 显示通知
    async showNotification(message, type = 'info', duration = 3000) {
        const notification = { message, type, duration };
        
        if (this.isShowingNotification) {
            this.notificationQueue.push(notification);
            return;
        }

        await this.displayNotification(notification);
    }

    async displayNotification({ message, type, duration }) {
        this.isShowingNotification = true;

        try {
            // 尝试使用 Capacitor Toast
            await Toast.show({
                text: message,
                duration: duration > 3000 ? 'long' : 'short',
                position: 'top'
            });
        } catch (error) {
            // 退回到自定义通知
            this.showCustomNotification(message, type, duration);
        }

        setTimeout(() => {
            this.isShowingNotification = false;
            if (this.notificationQueue.length > 0) {
                const next = this.notificationQueue.shift();
                this.displayNotification(next);
            }
        }, duration);
    }

    showCustomNotification(message, type, duration) {
        // 创建自定义通知元素
        const notification = document.createElement('div');
        notification.className = `pixel-notification ${type}`;
        notification.textContent = message;

        // 添加到DOM
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // 隐藏和移除
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    // 显示确认对话框
    async showConfirm(title, message, buttons = []) {
        return new Promise((resolve) => {
            const defaultButtons = [
                {
                    text: '取消',
                    role: 'cancel',
                    handler: () => resolve(false)
                },
                {
                    text: '确定',
                    handler: () => resolve(true)
                }
            ];

            const alertButtons = buttons.length > 0 ? buttons : defaultButtons;
            
            this.showAlert(title, message, alertButtons);
        });
    }

    // 显示警告框
    showAlert(title, message, buttons = []) {
        const modal = document.createElement('div');
        modal.className = 'pixel-modal';
        
        const buttonsHtml = buttons.map(button => 
            `<button class="pixel-button ${button.role === 'cancel' ? '' : 'primary'}" 
                     onclick="this.closest('.pixel-modal').remove(); ${button.handler ? `(${button.handler})()` : ''}">${button.text}</button>`
        ).join('');

        modal.innerHTML = `
            <div class="pixel-modal-content">
                <div class="pixel-modal-header">
                    <h3 class="pixel-modal-title">${title}</h3>
                </div>
                <div class="pixel-modal-body">
                    <p>${message}</p>
                </div>
                <div class="pixel-modal-actions">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 点击背景关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 显示输入框
    async showPrompt(title, message, placeholder = '', defaultValue = '') {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.className = 'pixel-modal';
            
            modal.innerHTML = `
                <div class="pixel-modal-content">
                    <div class="pixel-modal-header">
                        <h3 class="pixel-modal-title">${title}</h3>
                    </div>
                    <div class="pixel-modal-body">
                        <p>${message}</p>
                        <input type="text" class="pixel-input" placeholder="${placeholder}" value="${defaultValue}" id="prompt-input">
                    </div>
                    <div class="pixel-modal-actions">
                        <button class="pixel-button" onclick="this.closest('.pixel-modal').remove(); resolve(null)">取消</button>
                        <button class="pixel-button primary" onclick="
                            const value = document.getElementById('prompt-input').value;
                            this.closest('.pixel-modal').remove();
                            resolve(value);
                        ">确定</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // 聚焦输入框
            const input = modal.querySelector('#prompt-input');
            setTimeout(() => input.focus(), 100);

            // 绑定事件
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve(null);
                }
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const value = input.value;
                    modal.remove();
                    resolve(value);
                }
            });
        });
    }

    // 格式化时间
    formatTime(seconds) {
        if (!seconds || seconds < 0) return '00:00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 格式化日期
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        const seconds = d.getSeconds().toString().padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    // 格式化相对时间
    formatRelativeTime(date) {
        if (!date) return '';
        
        const now = new Date();
        const target = new Date(date);
        const diffMs = now - target;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) {
            return '刚刚';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return this.formatDate(date, 'MM-DD');
        }
    }

    // 分享功能
    async shareText(title, text, url = '') {
        try {
            await Share.share({
                title,
                text,
                url,
                dialogTitle: '分享到...'
            });
            return true;
        } catch (error) {
            console.warn('分享失败:', error);
            
            // 退回到剪贴板复制
            try {
                await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
                this.showNotification('内容已复制到剪贴板', 'success');
                return true;
            } catch (clipboardError) {
                console.error('复制到剪贴板失败:', clipboardError);
                this.showNotification('分享失败', 'error');
                return false;
            }
        }
    }

    // 复制到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('已复制到剪贴板', 'success');
            return true;
        } catch (error) {
            console.error('复制失败:', error);
            
            // 退回到选择文本的方式
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showNotification('已复制到剪贴板', 'success');
                return true;
            } catch (fallbackError) {
                this.showNotification('复制失败', 'error');
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 深度克隆对象
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // 验证输入
    validateInput(value, type, options = {}) {
        switch (type) {
            case 'required':
                return value && value.trim().length > 0;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            case 'number':
                const num = parseFloat(value);
                return !isNaN(num) && 
                       (options.min === undefined || num >= options.min) &&
                       (options.max === undefined || num <= options.max);
            case 'length':
                return value.length >= (options.min || 0) && 
                       value.length <= (options.max || Infinity);
            default:
                return true;
        }
    }

    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 计算进度百分比
    calculateProgress(current, total) {
        if (!total || total <= 0) return 0;
        return Math.round((current / total) * 100);
    }

    // 获取随机颜色
    getRandomColor() {
        const colors = [
            '#00ff00', '#ffff00', '#ff00ff', '#00ffff',
            '#ff8800', '#88ff00', '#8800ff', '#0088ff'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 本地存储助手
    storage = {
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('存储数据失败:', error);
                return false;
            }
        },
        
        get: (key, defaultValue = null) => {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (error) {
                console.error('读取数据失败:', error);
                return defaultValue;
            }
        },
        
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('删除数据失败:', error);
                return false;
            }
        },
        
        clear: () => {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('清空数据失败:', error);
                return false;
            }
        }
    };

    // 动画助手
    animate(element, animation, duration = 300) {
        return new Promise((resolve) => {
            element.style.animation = `${animation} ${duration}ms ease-in-out`;
            
            setTimeout(() => {
                element.style.animation = '';
                resolve();
            }, duration);
        });
    }

    // 设备信息
    getDeviceInfo() {
        const userAgent = navigator.userAgent;
        const isAndroid = /Android/i.test(userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
        const isMobile = isAndroid || isIOS;
        
        return {
            isAndroid,
            isIOS,
            isMobile,
            isDesktop: !isMobile,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            pixelRatio: window.devicePixelRatio || 1
        };
    }

    // 网络状态
    getNetworkStatus() {
        return {
            online: navigator.onLine,
            connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection
        };
    }

    // 错误处理
    handleError(error, context = '操作') {
        console.error(`${context}失败:`, error);
        
        let message = `${context}失败`;
        if (error.message) {
            message += `: ${error.message}`;
        }
        
        this.showNotification(message, 'error');
    }

    // 性能监控
    measurePerformance(name, fn) {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        
        console.log(`${name} 耗时: ${(end - start).toFixed(2)}ms`);
        return result;
    }

    // 异步性能监控
    async measureAsyncPerformance(name, fn) {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        
        console.log(`${name} 耗时: ${(end - start).toFixed(2)}ms`);
        return result;
    }
}

export { MobileUtils };
