class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.userLocationMarker = null;
        this.watchId = null;
    }
    
    initialize() {
        // Инициализация карты
        this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
        
        // Добавление слоя тайлов
        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            maxZoom: 19
        }).addTo(this.map);
        
        // Запрашиваем геолокацию пользователя
        this.requestUserLocation();
        
        // Добавляем обработчик клика по карте
        this.map.on('click', (e) => {
            // Можно добавить функционал по клику на карту
        });
        
        return this.map;
    }
    
    requestUserLocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPosition = [position.coords.latitude, position.coords.longitude];
                    this.updateUserLocation(userPosition);
                    this.startWatchingUserLocation();
                },
                (error) => {
                    console.error('Ошибка получения геолокации:', error);
                    this.app.notificationManager.showNotification('Не удалось получить ваше местоположение', 'error');
                }
            );
        } else {
            this.app.notificationManager.showNotification('Геолокация не поддерживается вашим браузером', 'error');
        }
    }
    
    startWatchingUserLocation() {
        if ('geolocation' in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const userPosition = [position.coords.latitude, position.coords.longitude];
                    this.updateUserLocation(userPosition);
                },
                (error) => {
                    console.error('Ошибка отслеживания геолокации:', error);
                },
                { enableHighAccuracy: true }
            );
        }
    }
    
    stopWatchingUserLocation() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
    }
    
    updateUserLocation(position) {
        // Обновляем позицию пользователя на сервере
        this.app.connectionManager.updateUserPosition(position);
        
        // Обновляем маркер пользователя на карте
        if (!this.userLocationMarker) {
            // Создаем маркер, если его еще нет
            this.userLocationMarker = L.marker(position, {
                icon: L.divIcon({
                    className: 'user-marker user-' + this.app.connectionManager.getUserData().status,
                    html: '👤',
                    iconSize: [30, 30]
                })
            }).addTo(this.map);
        } else {
            // Обновляем позицию существующего маркера
            this.userLocationMarker.setLatLng(position);
        }
        
        // Центрируем карту на позиции пользователя
        this.map.setView(position, this.map.getZoom());
    }
    
    createRouteToUser(userId) {
        const user = this.app.markerManager.getUser(userId);
        if (!user) return;
        
        const userPosition = this.app.connectionManager.getUserData().position;
        
        // Передаем задачу построения маршрута в RouteManager
        this.app.routeManager.createRoute(userPosition, user.position);
    }
}
