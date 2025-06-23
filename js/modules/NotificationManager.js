class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }
    
    init() {
        // Создаем контейнер для уведомлений если его нет
        this.container = document.getElementById('notifications');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notifications';
            this.container.className = 'notifications-container';
            document.body.appendChild(this.container);
        }
    }
    
    showNotification(message, type = 'info', duration = CONFIG.UI.NOTIFICATION_TIMEOUT) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        this.notifications.push(notification);
        
        // Автоматическое удаление
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Ограничиваем количество уведомлений
        while (this.notifications.length > 5) {
            this.removeNotification(this.notifications[0]);
        }
        
        console.log(`📢 Уведомление [${type}]: ${message}`);
    }
    
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getIcon(type);
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="${icon}" style="font-size: 1.2rem;"></i>
                <span style="flex: 1;">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" 
                        style="background: none; border: none; color: inherit; cursor: pointer; font-size: 1.2rem; opacity: 0.7;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Добавляем обработчик клика для закрытия
        notification.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            this.removeNotification(notification);
        });
        
        return notification;
    }
    
    getIcon(type) {
        switch (type) {
            case 'success':
                return 'fas fa-check-circle';
            case 'error':
                return 'fas fa-exclamation-circle';
            case 'warning':
                return 'fas fa-exclamation-triangle';
            case 'info':
            default:
                return 'fas fa-info-circle';
        }
    }
    
    removeNotification(notification) {
        if (notification && notification.parentElement) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
                
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }
    
    clearAll() {
        this.notifications.forEach(notification => {
            this.removeNotification(notification);
        });
    }
}
