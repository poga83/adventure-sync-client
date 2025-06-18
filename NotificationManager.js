class NotificationManager {
    constructor() {
        this.container = document.getElementById('notifications');
        this.notificationTimeout = 3000; // Время отображения уведомления в мс
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        this.container.appendChild(notification);
        
        // Удаляем уведомление через заданное время
        setTimeout(() => {
            notification.remove();
        }, this.notificationTimeout);
    }
}
