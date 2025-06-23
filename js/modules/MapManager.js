class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.userLocationMarker = null;
        this.watchId = null;
        this.markerPlacementMode = false;
        this.tempMarkers = [];
        this.mapInitialized = false;
    }
    
    initialize() {
        console.log('🗺️ Начинаем инициализацию карты...');
        
        // ИСПРАВЛЕНО: Проверяем существование и размеры контейнера карты
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ Контейнер карты не найден!');
            this.app.notificationManager.showNotification('Ошибка: контейнер карты не найден', 'error');
            return null;
        }

        // ИСПРАВЛЕНО: Проверяем размеры контейнера перед инициализацией
        const containerRect = mapContainer.getBoundingClientRect();
        console.log('📐 Размеры контейнера карты:', {
            width: containerRect.width,
            height: containerRect.height,
            top: containerRect.top,
            left: containerRect.left
        });
        
        if (containerRect.height === 0 || containerRect.width === 0) {
            console.error('❌ Контейнер карты имеет нулевые размеры!');
            console.error('🔍 Стили контейнера:', window.getComputedStyle(mapContainer));
            
            // Принудительно задаем размеры
            mapContainer.style.width = '100%';
            mapContainer.style.height = '100%';
            mapContainer.style.minHeight = '400px';
            
            this.app.notificationManager.showNotification('Исправлены размеры контейнера карты', 'warning');
        }

        try {
            console.log('🗺️ Создание экземпляра карты Leaflet...');
            
            // ИСПРАВЛЕНО: Создаем карту с оптимальными настройками
            this.map = L.map('map', CONFIG.getMapOptions()).setView(
                CONFIG.MAP.DEFAULT_CENTER, 
                CONFIG.MAP.DEFAULT_ZOOM
            );

            console.log('✅ Экземпляр карты создан:', this.map);

            // ИСПРАВЛЕНО: Добавляем тайлы с улучшенной обработкой ошибок
            const tileLayer = L.tileLayer(CONFIG.MAP.TILE_LAYER, {
                attribution: CONFIG.MAP.ATTRIBUTION,
                maxZoom: CONFIG.MAP.MAX_ZOOM,
                minZoom: CONFIG.MAP.MIN_ZOOM,
                subdomains: ['a', 'b', 'c'],
                errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5UAVERSUZFPC90ZXh0Pjwvc3ZnPg==',
                crossOrigin: true
            });

            // Обработчики событий тайлов для диагностики
            tileLayer.on('loading', () => {
                console.log('📥 Загрузка тайлов карты...');
            });

            tileLayer.on('load', () => {
                console.log('✅ Тайлы карты загружены успешно');
            });

            tileLayer.on('tileerror', (e) => {
                console.error('❌ Ошибка загрузки тайла:', e.tile.src, e.error);
            });

            tileLayer.addTo(this.map);

            // ИСПРАВЛЕНО: Добавляем контролы после создания карты
            this.addCustomControls();
            
            // Запрашиваем геолокацию
            this.requestUserLocation();
            
            // Настраиваем обработчики событий карты
            this.setupMapEvents();
            
            // ИСПРАВЛЕНО: Принудительно обновляем размер карты с задержкой
            setTimeout(() => {
                if (this.map) {
                    console.log('🔄 Принудительное обновление размера карты...');
                    this.map.invalidateSize(true);
                    
                    // Дополнительная проверка видимости
                    const newRect = mapContainer.getBoundingClientRect();
                    console.log('📐 Размеры после invalidateSize:', newRect);
                    
                    if (newRect.height === 0) {
                        console.error('❌ Карта все еще имеет нулевую высоту после invalidateSize');
                        this.app.notificationManager.showNotification('Проблема с отображением карты', 'error');
                    } else {
                        console.log('✅ Карта отображается корректно');
                    }
                }
            }, CONFIG.UI.MAP_INVALIDATE_DELAY);
            
            this.mapInitialized = true;
            console.log('✅ Карта инициализирована успешно');
            
            // Уведомление об успешной инициализации
            this.app.notificationManager.showNotification('Карта загружена', 'success');
            
            return this.map;
            
        } catch (error) {
            console.error('❌ Критическая ошибка при инициализации карты:', error);
            this.app.notificationManager.showNotification(`Ошибка инициализации карты: ${error.message}`, 'error');
            return null;
        }
    }
    
    addCustomControls() {
        if (!this.map) {
            console.error('❌ Попытка добавить контролы к неинициализированной карте');
            return;
        }

        try {
            // Zoom контроль
            const zoomControl = L.control.zoom({
                position: 'topright'
            });
            zoomControl.addTo(this.map);
            
            // GPS контроль
            const gpsControl = L.control({position: 'topright'});
            gpsControl.onAdd = (map) => {
                const container = L.DomUtil.create('div', 'custom-control');
                container.innerHTML = `
                    <button id="gpsBtn" title="Определить местоположение" class="control-btn">
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
            
            // Контроль размещения маркеров
            const markerControl = L.control({position: 'topright'});
            markerControl.onAdd = (map) => {
                const container = L.DomUtil.create('div', 'custom-control');
                container.innerHTML = `
                    <button id="markerToggleBtn" title="Режим размещения маркеров" class="control-btn">
                        <i class="fas fa-map-pin"></i>
                    </button>
                    <button id="clearMarkersBtn" title="Очистить маркеры" class="control-btn">
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
            
            console.log('✅ Контролы карты добавлены');
            
        } catch (error) {
            console.error('❌ Ошибка при добавлении контролов карты:', error);
        }
    }
    
    setupMapEvents() {
        if (!this.map) {
            console.error('❌ Попытка настроить события для неинициализированной карты');
            return;
        }

        try {
            // Клик для размещения маркеров
            this.map.on('click', (e) => {
                if (this.markerPlacementMode) {
                    this.addTempMarker(e.latlng);
                }
            });
            
            // Обработчики геолокации
            this.map.on('locationfound', (e) => {
                this.onLocationFound(e);
            });
            
            this.map.on('locationerror', (e) => {
                this.onLocationError(e);
            });

            // ИСПРАВЛЕНО: Обработчики событий карты для диагностики
            this.map.on('resize', () => {
                console.log('🔄 Событие resize карты');
            });

            this.map.on('viewreset', () => {
                console.log('🔄 Событие viewreset карты');
            });

            this.map.on('zoomend', () => {
                console.log('🔍 Новый уровень зума:', this.map.getZoom());
            });

            this.map.on('moveend', () => {
                console.log('📍 Новый центр карты:', this.map.getCenter());
            });
            
            console.log('✅ Обработчики событий карты настроены');
            
        } catch (error) {
            console.error('❌ Ошибка при настройке событий карты:', error);
        }
    }
    
    requestUserLocation() {
        if (!('geolocation' in navigator)) {
            console.warn('⚠️ Геолокация не поддерживается в этом браузере');
            this.app.notificationManager.showNotification('Геолокация не поддерживается', 'warning');
            this.onLocationError({message: 'Геолокация не поддерживается'});
            return;
        }

        console.log('📍 Запрос геолокации пользователя...');
        
        if (this.map) {
            this.map.locate({
                setView: true,
                maxZoom: 16,
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            });
        } else {
            console.error('❌ Попытка запросить геолокацию для неинициализированной карты');
        }
    }
    
    onLocationFound(e) {
        const userPosition = [e.latlng.lat, e.latlng.lng];
        console.log('✅ Местоположение пользователя найдено:', userPosition);
        console.log('📏 Точность:', e.accuracy, 'метров');
        
        this.updateUserLocation(userPosition);
        this.startWatchingUserLocation();
        
        // Создаем маркер текущего пользователя
        if (!this.userLocationMarker) {
            this.userLocationMarker = L.marker(e.latlng, {
                icon: L.divIcon({
                    className: 'user-marker current-user',
                    html: '<i class="fas fa-user" style="color: white; font-size: 16px;"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                }),
                zIndexOffset: 1000
            }).addTo(this.map);
            
            this.userLocationMarker.bindPopup(`
                <div class="user-popup">
                    <h4>Ваше местоположение</h4>
                    <div class="status">Текущая позиция</div>
                    <div class="coordinates">
                        Широта: ${e.latlng.lat.toFixed(6)}<br>
                        Долгота: ${e.latlng.lng.toFixed(6)}<br>
                        Точность: ±${Math.round(e.accuracy)}м
                    </div>
                </div>
            `);
            
            // Добавляем круг точности
            L.circle(e.latlng, {
                radius: e.accuracy,
                fillColor: '#9C27B0',
                fillOpacity: 0.1,
                color: '#9C27B0',
                weight: 1
            }).addTo(this.map);
        }
        
        this.app.notificationManager.showNotification('Местоположение определено');
    }
    
    onLocationError(e) {
        console.error('❌ Ошибка определения местоположения:', e.message);
        
        let errorMessage = 'Не удалось определить местоположение';
        if (e.message && e.message.includes('denied')) {
            errorMessage = 'Доступ к геолокации запрещен';
        } else if (e.message && e.message.includes('timeout')) {
            errorMessage = 'Превышено время ожидания геолокации';
        }
        
        this.app.notificationManager.showNotification(`${errorMessage}. Используется позиция по умолчанию.`, 'warning');
        
        // Используем позицию по умолчанию
        const defaultPosition = CONFIG.MAP.DEFAULT_CENTER;
        this.updateUserLocation(defaultPosition);
        
        // Создаем маркер в позиции по умолчанию
        if (!this.userLocationMarker) {
            this.userLocationMarker = L.marker(defaultPosition, {
                icon: L.divIcon({
                    className: 'user-marker current-user',
                    html: '<i class="fas fa-user" style="color: white; font-size: 16px;"></i>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
                }),
                zIndexOffset: 1000
            }).addTo(this.map);
            
            this.userLocationMarker.bindPopup(`
                <div class="user-popup">
                    <h4>Ваше местоположение</h4>
                    <div class="status">Позиция по умолчанию (Москва)</div>
                    <div class="coordinates">
                        Широта: ${defaultPosition[0]}<br>
                        Долгота: ${defaultPosition[1]}
                    </div>
                </div>
            `);
        }
    }
    
    startWatchingUserLocation() {
        if ('geolocation' in navigator) {
            console.log('👁️ Начинаем отслеживание местоположения...');
            
            this.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const userPosition = [position.coords.latitude, position.coords.longitude];
                    console.log('📍 Обновление местоположения:', userPosition);
                    this.updateUserLocation(userPosition);
                },
                (error) => {
                    console.error('❌ Ошибка отслеживания местоположения:', error);
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
        // Обновляем позицию на сервере
        if (this.app.connectionManager) {
            this.app.connectionManager.updateUserPosition(position);
        }
        
        // Обновляем маркер на карте
        if (this.userLocationMarker) {
            this.userLocationMarker.setLatLng(position);
        }
        
        // Обновляем данные в AuthManager
        if (this.app.authManager && this.app.authManager.currentUser) {
            this.app.authManager.currentUser.position = position;
            localStorage.setItem(CONFIG.CACHE.USER_KEY, JSON.stringify(this.app.authManager.currentUser));
        }
    }
    
    centerOnUserLocation() {
        if (this.userLocationMarker) {
            this.map.setView(this.userLocationMarker.getLatLng(), 16);
            this.app.notificationManager.showNotification('Карта центрирована на вашем местоположении');
        } else {
            this.app.notificationManager.showNotification('Местоположение не определено, запрашиваем...', 'warning');
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
                html: '<i class="fas fa-map-pin" style="color: #ff6b6b; font-size: 16px;"></i>',
                iconSize: [25, 25],
                iconAnchor: [12, 25]
            })
        }).addTo(this.map);
        
        const markerId = L.Util.stamp(marker);
        
        marker.bindPopup(`
            <div class="user-popup">
                <h4>Временный маркер</h4>
                <div class="status">
                    Широта: ${latlng.lat.toFixed(6)}<br>
                    Долгота: ${latlng.lng.toFixed(6)}
                </div>
                <button onclick="window.adventureSync.mapManager.removeMarker('${markerId}')" 
                        style="margin: 3px; padding: 5px 10px; background: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    🗑️ Удалить
                </button>
                <button onclick="window.adventureSync.mapManager.createRouteToMarker('${markerId}')" 
                        style="margin: 3px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                    🗺️ Маршрут
                </button>
            </div>
        `);
        
        this.tempMarkers.push(marker);
        this.app.notificationManager.showNotification('Временный маркер добавлен');
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
        if (this.tempMarkers.length === 0) {
            this.app.notificationManager.showNotification('Нет маркеров для удаления');
            return;
        }
        
        this.tempMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        
        const count = this.tempMarkers.length;
        this.tempMarkers = [];
        this.app.notificationManager.showNotification(`Удалено ${count} временных маркеров`);
    }
    
    createRouteToMarker(markerId) {
        const marker = this.tempMarkers.find(m => L.Util.stamp(m) == markerId);
        if (!marker) {
            this.app.notificationManager.showNotification('Маркер не найден', 'error');
            return;
        }
        
        if (!this.userLocationMarker) {
            this.app.notificationManager.showNotification('Ваше местоположение не определено', 'error');
            return;
        }
        
        const from = this.userLocationMarker.getLatLng();
        const to = marker.getLatLng();
        this.app.routeManager.createRoute(from, to);
    }
    
    createRouteToUser(userId) {
        const user = this.app.markerManager.getUser(userId);
        if (!user) {
            this.app.notificationManager.showNotification('Пользователь не найден', 'error');
            return;
        }
        
        if (!this.userLocationMarker) {
            this.app.notificationManager.showNotification('Ваше местоположение не определено', 'error');
            return;
        }
        
        const from = this.userLocationMarker.getLatLng();
        const to = L.latLng(user.position[0], user.position[1]);
        
        this.app.routeManager.createRoute(from, to);
        this.app.notificationManager.showNotification(`Строим маршрут к ${user.name}`);
    }
    
    // ИСПРАВЛЕНО: Улучшенный метод обновления размера карты
    invalidateSize() {
        if (!this.map) {
            console.warn('⚠️ Попытка обновить размер неинициализированной карты');
            return;
        }
        
        console.log('🔄 Обновление размера карты...');
        
        setTimeout(() => {
            try {
                this.map.invalidateSize(true);
                
                // Дополнительная проверка после обновления
                const container = document.getElementById('map');
                const rect = container.getBoundingClientRect();
                
                console.log('📐 Размеры после invalidateSize:', {
                    width: rect.width,
                    height: rect.height
                });
                
                if (rect.height === 0) {
                    console.error('❌ Карта все еще имеет нулевую высоту');
                    // Принудительно задаем минимальную высоту
                    container.style.minHeight = '400px';
                    setTimeout(() => this.map.invalidateSize(true), 100);
                } else {
                    console.log('✅ Размер карты обновлен успешно');
                }
                
            } catch (error) {
                console.error('❌ Ошибка при обновлении размера карты:', error);
            }
        }, CONFIG.UI.MAP_INVALIDATE_DELAY);
    }
    
    // Диагностический метод для проверки состояния карты
    diagnoseMap() {
        if (!this.map) {
            console.error('❌ Карта не инициализирована');
            return false;
        }
        
        const container = this.map.getContainer();
        const rect = container.getBoundingClientRect();
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        
        console.log('🔍 Диагностика карты:', {
            initialized: this.mapInitialized,
            containerSize: { width: rect.width, height: rect.height },
            center: center,
            zoom: zoom,
            hasUserMarker: !!this.userLocationMarker,
            tempMarkersCount: this.tempMarkers.length
        });
        
        return rect.width > 0 && rect.height > 0;
    }
}
