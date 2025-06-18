class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.userLocationMarker = null;
        this.watchId = null;
    }
    
    initialize() {
        this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
        
        L.tileLayer(CONFIG.MAP.TILE_LAYER, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            maxZoom: 19
        }).addTo(this.map);
        
        this.requestUserLocation();
        
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
        this.app.connectionManager.updateUserPosition(position);
        
        if (!this.userLocationMarker) {
            this.userLocationMarker = L.marker(position, {
                icon: L.divIcon({
                    className: 'user-marker user-' + this.app.connectionManager.getUserData().status,
                    html: '👤',
                    iconSize: [30, 30]
                })
            }).addTo(this.map);
        } else {
            this.userLocationMarker.setLatLng(position);
        }
        
        this.map.setView(position, this.map.getZoom());
    }
    
    createRouteToUser(userId) {
        const user = this.app.markerManager.getUser(userId);
        if (!user) return;
        
        const userPosition = this.app.connectionManager.getUserData().position;
        this.app.routeManager.createRoute(userPosition, user.position);
    }
}
