class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.userLocationMarker = null;
        this.watchId = null;
        this.markerPlacementMode = false;
        this.tempMarkers = [];
    }
    
    initialize() {
        // Инициализация карты с правильными настройками контролов[11]
        this.map = L.map('map', {
            zoomControl: false, // Отключаем стандартные контролы
            attributionControl: false
        }).setView([55.7558, 37.6173], 10);
        
        // Добавляем темную тему тайлов
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(this.map);
        
        // Добавляем кастомные контролы в правильных позициях[12]
        this.addCustomControls();
        
        // Запрашиваем геолокацию
        this.requestUserLocation();
        
        // Обработчики событий
        this.setupMapEvents();
        
        return this.map;
    }
    
    addCustomControls() {
        // Zoom контроль в правой верхней позиции[11]
        const zoomControl = L.control.zoom({
            position: 'topright'
        });
        zoomControl.addTo(this.map);
        
        // GPS контроль[4]
        const gpsControl = L.control({position: 'topright'});
        gpsControl.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'custom-control');
            container.innerHTML = `
                <button id="gpsBtn" title="Определить местоположение">
                    <i class="fas fa-crosshairs"></i>
                </button>
            `;
            
            L.DomEvent.disableClickPropagation(container);
            
            container.querySelector('#gpsBtn').onclick = () => {
                this.centerOnUserLocation();
            };
            
            return container;
        };
        gpsControl.addTo(this.map);
        
        // Контроль размещения маркеров[16]
        const markerControl = L.control({position: 'topright'});
        markerControl.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'custom-control');
            container.innerHTML = `
                <button id="markerToggleBtn" title="Режим размещения маркеров">
                    <i class="fas fa-map-pin"></i>
                </button>
                <button id="clearMarkersBtn" title="Очистить маркеры">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            L.DomEvent.disableClickPropagation(container);
            
            const toggleBtn = container.querySelector('#markerToggleBtn');
            const clearBtn = container.querySelector('#clearMarkersBtn');
            
            toggleBtn.onclick = () => {
                this.toggleMarkerPlacementMode();
                toggleBtn.classList.toggle('active', this.markerPlacementMode);
            };
            
            clearBtn.onclick = () => {
                this.clearTempMarkers();
            };
            
            return container;
        };
        markerControl.addTo(this.map);
    }
    
    setupMapEvents() {
        // Обработчик клика для размещения маркеров[18]
        this.map.on('click', (e) => {
            if (this.markerPlacementMode) {
                this.addTempMarker(e.latlng);
            }
        });
        
        // Обработчики геолокации[6]
        this.map.on('locationfound', (e) => {
            this.onLocationFound(e);
        });
        
        this.map.on('locationerror', (e) => {
            this.onLocationError(e);
        });
    }
    
    requestUserLocation() {
        if ('geolocation' in navigator) {
            // Используем встроенный метод Leaflet для геолокации[6]
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
        
        // Добавляем маркер с радиусом точности[6]
        if (!this.userLocationMarker) {
            this.userLocationMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'user-marker current-user',
                    html: '<i class="fas fa-user"></i>',
                    iconSize: [35, 35]
                }),
                zIndexOffset: 1000
            }).addTo(this.map);
            
            L.circle(e.latlng, e.accuracy).addTo(this.map);
        }
        
        this.app.notificationManager.showNotification('Местоположение определено');
    }
    
    onLocationError(e) {
        console.error('Ошибка геолокации:', e.message);
        this.app.notificationManager.showNotification('Не удалось определить местоположение', 'error');
    }
    
    startWatchingUserLocation() {
        if ('geolocation' in navigator) {
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const userPosition = [position.coords.latitude, position.coords.longitude];
                    this.updateUserLocation(userPosition);
                },
                (error) => {
                    console.error('Ошибка отслеживания:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 30000
                }
            );
        }
    }
    
    updateUserLocation(position) {
        this.app.connectionManager.updateUserPosition(position);
        
        if (this.userLocationMarker) {
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
    
    toggleMarkerPlacementMode() {
        this.markerPlacementMode = !this.markerPlacementMode;
        
        if (this.markerPlacementMode) {
            this.app.notificationManager.showNotification('Режим размещения маркеров включен. Кликните по карте для добавления маркера.');
            this.map.getContainer().style.cursor = 'crosshair';
        } else {
            this.app.notificationManager.showNotification('Режим размещения маркеров выключен');
            this.map.getContainer().style.cursor = '';
        }
    }
    
    addTempMarker(latlng) {
        const marker = L.marker(latlng, {
            icon: L.divIcon({
                className: 'temp-marker',
                html: '<i class="fas fa-map-pin" style="color: #ff6b6b;"></i>',
                iconSize: [25, 25]
            })
        }).addTo(this.map);
        
        marker.bindPopup(`
            <div style="text-align: center;">
                <strong>Временный маркер</strong><br>
                Координаты: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}<br>
                <button onclick="window.adventureSync.mapManager.removeMarker('${L.Util.stamp(marker)}')" 
                        style="margin-top: 5px; padding: 3px 8px; background: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Удалить
                </button>
            </div>
        `);
        
        this.tempMarkers.push(marker);
        this.app.notificationManager.showNotification('Маркер добавлен');
    }
    
    removeMarker(markerId) {
        const markerIndex = this.tempMarkers.findIndex(marker => L.Util.stamp(marker) == markerId);
        if (markerIndex !== -1) {
            this.map.removeLayer(this.tempMarkers[markerIndex]);
            this.tempMarkers.splice(markerIndex, 1);
            this.app.notificationManager.showNotification('Маркер удален');
        }
    }
    
    clearTempMarkers() {
        this.tempMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.tempMarkers = [];
        this.app.notificationManager.showNotification('Все временные маркеры удалены');
    }
    
    createRouteToUser(userId) {
        const user = this.app.markerManager.getUser(userId);
        if (!user) return;
        
        const userPosition = this.app.connectionManager.getUserData().position;
        this.app.routeManager.createRoute(userPosition, user.position);
    }
    
    invalidateSize() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }
}
