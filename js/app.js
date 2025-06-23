class AdventureSync {
    constructor() {
        console.log('🚀 Запуск Adventure Sync...');
        
        // Инициализация менеджеров в правильном порядке
        this.initializeManagers();
        this.initializeApplication();
    }
    
    initializeManagers() {
        console.log('📦 Инициализация менеджеров...');
        
        // Базовые менеджеры
        this.notificationManager = new NotificationManager();
        this.authManager = new AuthManager(this);
        this.uiManager = new UIManager(this);
        this.connectionManager = new ConnectionManager(this);
        
        // Менеджеры карты и данных (инициализируются после авторизации)
        this.mapManager = new MapManager(this);
        this.markerManager = new MarkerManager(this);
        this.chatManager = new ChatManager(this);
        this.routeManager = new RouteManager(this);
        
        console.log('✅ Менеджеры инициализированы');
    }
    
    initializeApplication() {
        try {
            console.log('🔧 Настройка приложения...');
            
            // Инициализируем систему авторизации
            this.authManager.initialize();
            
            // Делаем экземпляр доступным глобально для отладки
            window.adventureSync = this;
            
            // Ждем авторизации пользователя
            this.waitForAuthentication();
            
            console.log('✅ Приложение настроено');
            
        } catch (error) {
            console.error('❌ Ошибка при инициализации приложения:', error);
            this.notificationManager.showNotification('Критическая ошибка инициализации приложения', 'error');
        }
    }
    
    waitForAuthentication() {
        const checkAuth = () => {
            if (this.authManager.isAuthenticated) {
                console.log('👤 Пользователь авторизован, инициализируем основные модули...');
                this.initializeAfterAuth();
            } else {
                // Проверяем каждые 100мс
                setTimeout(checkAuth, 100);
            }
        };
        
        checkAuth();
    }
    
    async initializeAfterAuth() {
        try {
            console.log('🗺️ Инициализация карты...');
            
            // ИСПРАВЛЕНО: Ждем полной загрузки DOM и CSS
            await this.waitForDOMReady();
            
            // Инициализируем карту
            const map = this.mapManager.initialize();
            if (!map) {
                throw new Error('Не удалось инициализировать карту');
            }
            
            console.log('👥 Инициализация менеджера маркеров...');
            this.markerManager.initialize(map);
            
            console.log('🛣️ Инициализация менеджера маршрутов...');
            this.routeManager.initialize(map);
            
            console.log('💬 Инициализация чата...');
            this.chatManager.initialize();
            
            console.log('🎛️ Инициализация UI...');
            this.uiManager.initialize();
            
            // ИСПРАВЛЕНО: Подключаемся к серверу после инициализации всех модулей
            console.log('🔌 Подключение к серверу...');
            await this.connectionManager.connect();
            
            console.log('✅ Все модули инициализированы');
            
            // Показываем уведомление о готовности
            setTimeout(() => {
                this.notificationManager.showNotification('Adventure Sync готов к работе!', 'success');
            }, 1000);
            
        } catch (error) {
            console.error('❌ Ошибка при инициализации после авторизации:', error);
            this.notificationManager.showNotification(`Ошибка инициализации: ${error.message}`, 'error');
        }
    }
    
    // ИСПРАВЛЕНО: Ждем полной загрузки DOM и CSS
    waitForDOMReady() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                // Дополнительная задержка для загрузки CSS
                setTimeout(resolve, 100);
            } else {
                window.addEventListener('load', () => {
                    setTimeout(resolve, 100);
                });
            }
        });
    }
    
    // Публичные методы для взаимодействия с приложением
    openPrivateChat(userId, userName) {
        console.log('💬 Открытие приватного чата:', userId, userName);
        if (this.uiManager) {
            this.uiManager.openPrivateChat(userId, userName);
        }
    }
    
    createRouteToUser(userId) {
        console.log('🗺️ Создание маршрута к пользователю:', userId);
        if (this.mapManager) {
            this.mapManager.createRouteToUser(userId);
        }
    }
    
    // Диагностические методы
    diagnose() {
        const info = {
            version: '2.1.0',
            timestamp: new Date().toISOString(),
            authenticated: this.authManager?.isAuthenticated || false,
            currentUser: this.authManager?.getCurrentUser() || null,
            connectedUsers: this.markerManager?.users?.size || 0,
            mapInitialized: this.mapManager?.mapInitialized || false,
            serverConnected: this.connectionManager?.socket?.connected || false,
            modules: {
                notificationManager: !!this.notificationManager,
                authManager: !!this.authManager,
                uiManager: !!this.uiManager,
                connectionManager: !!this.connectionManager,
                mapManager: !!this.mapManager,
                markerManager: !!this.markerManager,
                chatManager: !!this.chatManager,
                routeManager: !!this.routeManager
            }
        };
        
        console.table(info);
        return info;
    }
    
    restart() {
        console.log('🔄 Перезапуск приложения...');
        localStorage.clear();
        location.reload();
    }
    
    // Методы для отладки
    enableDebugMode() {
        CONFIG.MAP.DEBUG_MODE = true;
        localStorage.debug = 'socket.io:client*';
        console.log('🐛 Режим отладки включен');
    }
    
    disableDebugMode() {
        CONFIG.MAP.DEBUG_MODE = false;
        localStorage.removeItem('debug');
        console.log('🐛 Режим отладки выключен');
    }
    
    testMapVisibility() {
        if (this.mapManager) {
            return this.mapManager.diagnoseMap();
        }
        return false;
    }
    
    async testServerConnection() {
        if (this.connectionManager) {
            return await this.connectionManager.testConnection();
        }
        return false;
    }
}

// ИСПРАВЛЕНО: Инициализация только после полной загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализация Adventure Sync...');
    
    try {
        // Создаем экземпляр приложения
        new AdventureSync();
        
    } catch (error) {
        console.error('💥 Критическая ошибка при запуске приложения:', error);
        
        // Показываем сообщение об ошибке пользователю
        document.body.innerHTML = `
            <div style="
                position: fixed; 
                top: 50%; 
                left: 50%; 
                transform: translate(-50%, -50%);
                background: #1a1a1a; 
                color: #e0e0e0; 
                padding: 40px;
                border-radius: 12px;
                text-align: center;
                font-family: Arial, sans-serif;
                border: 1px solid #f44336;
            ">
                <h2 style="color: #f44336; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    Ошибка запуска Adventure Sync
                </h2>
                <p style="margin-bottom: 20px;">Произошла критическая ошибка при инициализации приложения.</p>
                <p style="font-size: 0.9rem; color: #b0b0b0; margin-bottom: 20px;">${error.message}</p>
                <button onclick="location.reload()" style="
                    background: #f44336; 
                    color: white; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 6px; 
                    cursor: pointer;
                    font-size: 1rem;
                ">
                    Перезагрузить страницу
                </button>
            </div>
        `;
    }
});

// Обработка глобальных ошибок
window.addEventListener('error', (e) => {
    console.error('🚨 Глобальная ошибка JavaScript:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        error: e.error
    });
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('🚨 Необработанное отклонение промиса:', e.reason);
    e.preventDefault();
});

// Глобальные функции для отладки
window.diagnoseAdventureSync = () => {
    if (window.adventureSync) {
        return window.adventureSync.diagnose();
    } else {
        console.error('❌ Adventure Sync не инициализирован');
        return null;
    }
};

window.testMapVisibility = () => {
    if (window.adventureSync) {
        return window.adventureSync.testMapVisibility();
    }
    return false;
};

window.testServerConnection = async () => {
    if (window.adventureSync) {
        return await window.adventureSync.testServerConnection();
    }
    return false;
};
