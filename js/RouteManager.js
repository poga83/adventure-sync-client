class RouteManager {
    constructor(app) {
        this.app = app;
        this.routeControl = null;
    }
    
    initialize(map) {
        // Здесь можно добавить инициализацию для маршрутизации
        // Например, подключение дополнительных библиотек или настройку параметров
    }
    
    createRoute(start, end) {
        // Удаляем предыдущий маршрут, если он есть
        this.clearRoute();
        
        // Создаем простую линию между точками
        const routeLine = L.polyline([start, end], {
            color: '#3388ff',
            weight: 4,
            opacity: 0.7
        }).addTo(this.app.mapManager.map);
        
        // Сохраняем ссылку на маршрут
        this.routeControl = routeLine;
        
        // Подгоняем карту под маршрут
        this.app.mapManager.map.fitBounds(routeLine.getBounds(), {
            padding: [50, 50]
        });
        
        // Показываем уведомление
        this.app.notificationManager.showNotification('Маршрут построен');
        
        // В реальном приложении здесь можно использовать сервисы маршрутизации
        // Например, Leaflet Routing Machine или OSRM
    }
    
    clearRoute() {
        if (this.routeControl) {
            this.app.mapManager.map.removeLayer(this.routeControl);
            this.routeControl = null;
        }
    }
}
