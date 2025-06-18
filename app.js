class AdventureSync {
    constructor() {
        // Инициализация менеджеров
        this.notificationManager = new NotificationManager();
        this.connectionManager = new ConnectionManager(this);
        this.mapManager = new MapManager(this);
        this.markerManager = new MarkerManager(this);
        this.chatManager = new ChatManager(this);
        this.routeManager = new RouteManager(this);
        
        // Инициализация приложения
        this.init();
    }
    
    init() {
        // Инициализация карты
        const map = this.mapManager.initialize();
        
        // Инициализация маркеров
        this.markerManager.initialize(map);
        
        // Инициализация маршрутизации
        this.routeManager.initialize(map);
        
        // Инициализация чата
        this.chatManager.initialize();
        
        // Подключение к серверу
        this.connectionManager.connect();
        
        // Настройка обработчиков событий UI
        this.setupEventListeners();
        
        // Делаем экземпляр доступным глобально для вызова из HTML
        window.adventureSync = this;
    }
    
    setupEventListeners() {
        // Обработчик изменения статуса пользователя
        document.getElementById('userStatus').addEventListener('change', (e) => {
            const status = e.target.value;
            this.connectionManager.updateUserStatus(status);
            
            // Обновляем иконку маркера пользователя
            if (this.mapManager.userLocationMarker) {
                this.mapManager.userLocationMarker.setIcon(L.divIcon({
                    className: `user-marker user-${status}`,
                    html: this.markerManager.getUserIcon(status),
                    iconSize: [30, 30]
                }));
            }
        });
        
        // Обработчик применения фильтра
        document.getElementById('applyFilterBtn').addEventListener('click', () => {
            const filterSelect = document.getElementById('activityFilter');
            const selectedOptions = Array.from(filterSelect.selectedOptions).map(option => option.value);
            
            this.markerManager.applyActivityFilter(selectedOptions);
        });
    }
    
    // Метод для открытия приватного чата (вызывается из HTML)
    openPrivateChat(userId, userName) {
        this.chatManager.openPrivateChat(userId, userName);
    }
    
    // Метод для создания маршрута к пользователю (вызывается из HTML)
    createRouteToUser(userId) {
        this.mapManager.createRouteToUser(userId);
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new AdventureSync();
});
