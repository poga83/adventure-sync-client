class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.userLocationMarker = null;
        this.watchId = null;
        this.mapInitialized = false;
    }
    
    initialize() {
        // Настройки для мобильных устройств
        const mapOptions = {
            zoomControl: false, // Отключаем стандартные контролы
            attributionControl: false,
            tap: true,
            dragging: true,
            touchZoom: true,
            doubleClickZoom: true,
            scrollWheelZoom: true,
            boxZoom: false,
            keyboard: false
        };
        
        this.map = L.map('map', mapOptions).setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
        
        // Добавляем темную тему для тайлов
        const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        });
        
        tileLayer.addTo(this.map);
        
        // Добавляем кастомные контролы для мобильных
        this.addMobileControls();
        
        // Запрашиваем геолокацию пользователя
        this.requestUserLocation();
        
        // Обработчики событий карты
        this.map.on('locationfound', (e) => {
            this.onLocationFound(e);
        });
        
        this.map.on('locationerror', (e) => {
            this.onLocationError(e);
        });
        
        // Улучшенная обработка для мобильных устройств
        this.map.on('zoomend', () => {
            this.optimizeMarkersForZoom();
        });
        
        this.mapInitialized = true;
        return this.map;
    }
    
    addMobileControls() {
        // Кастомный контрол зума
        const zoomControl = L.control.zoom({
            position: 'bottomright'
        });
        zoomControl.addTo(this.map);
        
        // Кнопка определения местоположения
        const locationButton = L.control({position: 'bottomright'});
        locationButton.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'var(--dark-graphite)';
            container.style.color = 'var(--text-primary)';
            container.style.width = '34px';
            container.style.height = '34px';
            container.style.lineHeight = '34px';
            container.style.textAlign = 'center';
            container.style.cursor = 'pointer';
            container.innerHTML = '<i class="fas fa-crosshairs"></i>';
            
            container.onclick = () => {
                this.centerOnUserLocation();
            };
            
            return container;
        };
        locationButton.addTo(this.map);
    }
    
    requestUserLocation() {
        if ('geolocation' in navigator) {
            this.map.locate({
                setView: true,
                maxZoom: 16,
                enableHighAccuracy: true,
                timeout: 10000
            });
        } else {
            this.app.notificationManager.showNotification('Геолокация не поддерживается', 'error');
        }
    }
    
    onLocationFound(e) {
        const userPosition = [e.latlng.lat, e.latlng.lng];
        this.updateUserLocation(userPosition);
        this.startWatchingUserLocation();
        
        // Уведомляем UI о подключении
        this.app.uiManager.updateConnectionStatus('connected');
    }
    
    onLocationError(e) {
        console.error('Ошибка геолокации:', e.message);
        this.app.notificationManager.showNotification('Не удалось определить местоположение', 'warning');
        
        // Используем местоположение по умолчанию
        this.updateUserLocation(CONFIG.MAP.DEFAULT_CENTER);
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
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 30000
                }
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
            const userData = this.app.connectionManager.getUserData();
            this.userLocationMarker = L.marker(position, {
                icon: L.divIcon({
                    className: `user-marker user-${userData.status} current-user`,
                    html: '<i class="fas fa-user"></i>',
                    iconSize: [35, 35]
                }),
                zIndexOffset: 1000 // Поверх других маркеров
            }).addTo(this.map);
            
            this.userLocationMarker.bindPopup(`
                <div class="user-popup">
                    <h4>Ваше местоположение</h4>
                    <div class="status">${this.app.markerManager.getStatusText(userData.status)}</div>
                </div>
            `);
        } else {
            this.userLocationMarker.setLatLng(position);
        }
    }
    
    centerOnUserLocation() {
        if (this.userLocationMarker) {
            this.map.setView(this.userLocationMarker.getLatLng(), 16);
            this.app.notificationManager.showNotification('Карта центрирована на вашем местоположении');
        } else {
            this.requestUserLocation();
        }
    }
    
    createRouteToUser(userId) {
        const user = this.app.markerManager.getUser(userId);
        if (!user) {
            this.app.notificationManager.showNotification('Пользователь не найден', 'error');
            return;
        }
        
        const userPosition = this.app.connectionManager.getUserData().position;
        this.app.routeManager.createRoute(userPosition, user.position);
        
        // Закрываем сайдбар для лучшего обзора маршрута
        this.app.uiManager.closeSidebar();
    }
    
    optimizeMarkersForZoom() {
        const zoom = this.map.getZoom();
        
        // Настраиваем размер маркеров в зависимости от зума
        const markerSize = Math.max(25, Math.min(40, zoom * 2));
        
        this.app.markerManager.userMarkers.forEach(marker => {
            const icon = marker.getIcon();
            if (icon && icon.options) {
                icon.options.iconSize = [markerSize, markerSize];
                marker.setIcon(icon);
            }
        });
    }
    
    fitBoundsToUsers() {
        const markers = Array.from(this.app.markerManager.userMarkers.values());
        
        if (markers.length > 0) {
            const group = new L.featureGroup(markers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
    
    invalidateSize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}
