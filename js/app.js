class AdventureSync {
    constructor() {
        console.log('=== Инициализация Adventure Sync ===');
        
        // Инициализация всех менеджеров в правильном порядке
        this.notificationManager = new NotificationManager();
        this.authManager = new AuthManager(this);
        this.uiManager = new UIManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.mapManager = new MapManager(this);
        this.markerManager = new MarkerManager(this);
        this.chatManager = new ChatManager(this);
        this.routeManager = new RouteManager(this);
        
        this.initialized = false;
        
        this.init();
    }
    
    init() {
        console.log('Инициализация Adventure Sync...');
        
        try {
            // 1. Инициализируем систему уведомлений
            console.log('1. Инициализация системы уведомлений');
            // NotificationManager не требует отдельной инициализации
            
            // 2. Инициализируем систему авторизации
            console.log('2. Инициализация системы авторизации');
            this.authManager.initialize();
            
            // 3. Инициализируем UI (но карту пока не показываем)
            console.log('3. Инициализация пользовательского интерфейса');
            // UIManager инициализируется при создании
            
            // 4. Ждем авторизации пользователя перед инициализацией остального
            this.waitForAuthAndInitialize();
            
            // Делаем экземпляр доступным глобально
            window.adventureSync = this;
            
            console.log('Базовая инициализация Adventure Sync завершена');
            
        } catch (error) {
            console.error('Ошибка при инициализации Adventure Sync:', error);
            this.notificationManager.showNotification('Ошибка инициализации приложения', 'error');
        }
    }
    
    waitForAuthAndInitialize() {
        const checkAuth = () => {
            if (this.authManager.isAuthenticated && !this.initialized) {
                console.log('=== Пользователь авторизован, инициализируем приложение ===');
                this.initializeAfterAuth();
            } else if (!this.authManager.isAuthenticated) {
                // Проверяем каждые 100мс, пока пользователь не авторизуется
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    }
    
    initializeAfterAuth() {
        try {
            console.log('4. Инициализация карты');
            const map = this.mapManager.initialize();
            
            console.log('5. Инициализация менеджера маркеров');
            this.markerManager.initialize(map);
            
            console.log('6. Инициализация менеджера маршрутов');
            this.routeManager.initialize(map);
            
            console.log('7. Инициализация чата');
            this.chatManager.initialize();
            
            // ИСПРАВЛЕНО: Не подключаемся автоматически, это делает AuthManager
            console.log('8. Подключение обработано в AuthManager');
            
            this.initialized = true;
            console.log('=== Полная инициализация Adventure Sync завершена ===');
            
            // Показываем уведомление о готовности
            setTimeout(() => {
                this.notificationManager.showNotification('Приложение готово к работе!', 'success');
            }, 500);
            
        } catch (error) {
            console.error('Ошибка при инициализации после авторизации:', error);
            this.notificationManager.showNotification('Ошибка загрузки приложения', 'error');
        }
    }
    
    // Методы для вызова из HTML
    openPrivateChat(userId, userName) {
        console.log('Открытие приватного чата:', userId, userName);
        if (this.uiManager) {
            this.uiManager.openPrivateChat(userId, userName);
        }
    }
    
    createRouteToUser(userId) {
        console.log('Создание маршрута к пользователю:', userId);
        if (this.mapManager) {
            this.mapManager.createRouteToUser(userId);
        }
    }
    
    // Методы для управления приложением
    restart() {
        console.log('Перезапуск приложения');
        location.reload();
    }
    
    getAppInfo() {
        return {
            version: '2.0.1',
            authenticated: this.authManager.isAuthenticated,
            currentUser: this.authManager.getCurrentUser(),
            connectedUsers: this.markerManager ? this.markerManager.users.size : 0,
            mapInitialized: this.mapManager ? this.mapManager.mapInitialized : false,
            serverConnected: this.connectionManager ? (this.connectionManager.socket && this.connectionManager.socket.connected) : false
        };
    }
    
    // Диагностический метод
    diagnose() {
        const info = this.getAppInfo();
        console.log('=== Диагностика Adventure Sync ===');
        console.log('Версия:', info.version);
        console.log('Авторизован:', info.authenticated);
        console.log('Текущий пользователь:', info.currentUser);
        console.log('Подключенных пользователей:', info.connectedUsers);
        console.log('Карта инициализирована:', info.mapInitialized);
        console.log('Сервер подключен:', info.serverConnected);
        console.log('================================');
        return info;
    }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, запуск Adventure Sync...');
    
    try {
        new AdventureSync();
    } catch (error) {
        console.error('Критическая ошибка при запуске:', error);
        alert('Ошибка запуска приложения. Проверьте консоль браузера для подробностей.');
    }
});

// Обработка ошибок
window.addEventListener('error', (e) => {
    console.error('Глобальная ошибка:', e.error);
    console.error('Файл:', e.filename, 'Строка:', e.lineno, 'Колонка:', e.colno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Необработанное отклонение промиса:', e.reason);
    e.preventDefault(); // Предотвращаем вывод в консоль по умолчанию
});

// Глобальная функция для диагностики
window.diagnoseAdventureSync = () => {
    if (window.adventureSync) {
        return window.adventureSync.diagnose();
    } else {
        console.error('Adventure Sync не инициализирован');
        return null;
    }
};
