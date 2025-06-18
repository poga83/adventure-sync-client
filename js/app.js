class AdventureSync {
    constructor() {
        // Инициализация всех менеджеров
        this.notificationManager = new NotificationManager();
        this.authManager = new AuthManager(this);
        this.uiManager = new UIManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.mapManager = new MapManager(this);
        this.markerManager = new MarkerManager(this);
        this.chatManager = new ChatManager(this);
        this.routeManager = new RouteManager(this);
        
        this.init();
    }
    
    init() {
        console.log('Инициализация Adventure Sync...');
        
        // Инициализируем авторизацию первой
        this.authManager.initialize();
        
        // Инициализируем UI
        this.uiManager.initialize();
        
        // Инициализируем карту только после авторизации
        this.initializeMapAfterAuth();
        
        // Делаем экземпляр доступным глобально
        window.adventureSync = this;
        
        console.log('Adventure Sync инициализирован');
    }
    
    initializeMapAfterAuth() {
        // Ждем авторизации пользователя
        const checkAuth = () => {
            if (this.authManager.isAuthenticated) {
                this.initializeMap();
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    }
    
    initializeMap() {
        console.log('Инициализация карты...');
        
        // Инициализируем карту
        const map = this.mapManager.initialize();
        
        // Инициализируем менеджер маркеров
        this.markerManager.initialize(map);
        
        // Инициализируем менеджер маршрутов
        this.routeManager.initialize(map);
        
        // Инициализируем чат
        this.chatManager.initialize();
        
        console.log('Карта инициализирована');
    }
    
    // Методы для вызова из HTML
    openPrivateChat(userId, userName) {
        this.uiManager.openPrivateChat(userId, userName);
    }
    
    createRouteToUser(userId) {
        this.mapManager.createRouteToUser(userId);
    }
    
    // Методы для управления приложением
    restart() {
        // Перезапуск приложения
        location.reload();
    }
    
    getAppInfo() {
        return {
            version: '2.0.0',
            authenticated: this.authManager.isAuthenticated,
            currentUser: this.authManager.getCurrentUser(),
            connectedUsers: this.markerManager.users.size,
            mapInitialized: this.mapManager.mapInitialized
        };
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запуск Adventure Sync...');
    new AdventureSync();
});

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Глобальная ошибка:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Необработанное отклонение промиса:', e.reason);
});
