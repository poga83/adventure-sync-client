class RouteManager {
    constructor(app) {
        this.app = app;
        this.currentRoute = null;
        this.routeLayer = null;
        this.routeMarkers = [];
        this.openRouteServiceAvailable = true;
    }
    
    initialize(map) {
        console.log('🛣️ Инициализация RouteManager...');
        this.map = map;
        this.addRouteControls();
        
        // Проверяем доступность OpenRouteService
        this.checkOpenRouteServiceAvailability();
        
        console.log('✅ RouteManager инициализирован');
    }
    
    async checkOpenRouteServiceAvailability() {
        this.openRouteServiceAvailable = await CONFIG.testOpenRouteService();
        if (!this.openRouteServiceAvailable) {
            console.warn('⚠️ OpenRouteService недоступен, будет использован OSRM fallback');
            this.app.notificationManager.showNotification(
                'Сервис маршрутизации ограничен - маршруты будут простыми', 
                'warning'
            );
        }
    }
    
    addRouteControls() {
        const routeControl = L.control({ position: 'topleft' });
        routeControl.onAdd = (map) => {
            const container = L.DomUtil.create('div', 'route-control');
            container.innerHTML = `
                <button id="clearRouteBtn" title="Очистить маршрут" class="control-btn" style="display: none;">
                    <i class="fas fa-times"></i> Очистить маршрут
                </button>
            `;
            
            L.DomEvent.disableClickPropagation(container);
            
            container.querySelector('#clearRouteBtn').onclick = () => {
                this.clearRoute();
            };
            
            return container;
        };
        routeControl.addTo(this.map);
    }
    
    // ИСПРАВЛЕНО: Построение маршрута с fallback на OSRM
    async createRoute(startLatLng, endLatLng) {
        console.log('🗺️ Создание маршрута от', startLatLng, 'до', endLatLng);
        
        this.clearRoute();
        
        // Показываем индикатор загрузки
        this.app.notificationManager.showNotification('Построение маршрута...', 'info');
        
        // Определяем профиль маршрута
        const userStatus = this.app.authManager.getCurrentUser()?.status || 'auto';
        let profile = this.getRoutingProfile(userStatus);
        
        // Пробуем OpenRouteService сначала
        if (this.openRouteServiceAvailable) {
            try {
                const success = await this.createOpenRouteServiceRoute(startLatLng, endLatLng, profile);
                if (success) return;
            } catch (error) {
                console.warn('⚠️ OpenRouteService не удался, пробуем OSRM:', error);
                this.openRouteServiceAvailable = false;
            }
        }
        
        // Fallback на OSRM
        try {
            const success = await this.createOSRMRoute(startLatLng, endLatLng, profile);
            if (success) return;
        } catch (error) {
            console.warn('⚠️ OSRM не удался, используем прямую линию:', error);
        }
        
        // Последний fallback - прямая линия
        this.createSimpleRoute(startLatLng, endLatLng);
    }
    
    async createOpenRouteServiceRoute(startLatLng, endLatLng, profile) {
        const start = [startLatLng.lng || startLatLng[1], startLatLng.lat || startLatLng[0]];
        const end = [endLatLng.lng || endLatLng[1], endLatLng.lat || endLatLng[0]];
        
        const url = `${CONFIG.ROUTING.BASE_URL}/${profile}/geojson`;
        const requestBody = {
            coordinates: [start, end],
            format: 'geojson',
            geometry: true,
            instructions: true,
            preference: 'recommended',
            units: 'km'
        };
        
        console.log('📡 Запрос к OpenRouteService:', url);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, application/geo+json',
                'Authorization': CONFIG.ROUTING.API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('API ключ недействителен или превышена квота');
            } else if (response.status === 404) {
                throw new Error('Маршрут не найден');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        
        const routeData = await response.json();
        console.log('✅ Получен ответ от OpenRouteService');
        
        if (routeData.features && routeData.features.length > 0) {
            const route = routeData.features[0];
            const coordinates = route.geometry.coordinates;
            const properties = route.properties;
            
            this.displayRoute(coordinates, properties, startLatLng, endLatLng);
            this.showRouteInfo(properties, 'OpenRouteService');
            
            this.app.notificationManager.showNotification('Маршрут построен по дорогам', 'success');
            return true;
        }
        
        return false;
    }
    
    async createOSRMRoute(startLatLng, endLatLng, profile) {
        // Конвертируем профиль для OSRM
        let osrmProfile = 'driving';
        if (profile === 'foot-walking') osrmProfile = 'walking';
        if (profile === 'cycling-regular') osrmProfile = 'cycling';
        
        const start = [startLatLng.lng || startLatLng[1], startLatLng.lat || startLatLng[0]];
        const end = [endLatLng.lng || endLatLng[1], endLatLng.lat || endLatLng[0]];
        
        const url = `${CONFIG.ROUTING.FALLBACK_URL}/${osrmProfile}/${start.join(',')};${end.join(',')}?overview=full&geometries=geojson&steps=true`;
        
        console.log('📡 Запрос к OSRM:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`OSRM HTTP ${response.status}: ${response.statusText}`);
        }
        
        const routeData = await response.json();
        console.log('✅ Получен ответ от OSRM');
        
        if (routeData.routes && routeData.routes.length > 0) {
            const route = routeData.routes[0];
            const coordinates = route.geometry.coordinates;
            
            // Конвертируем данные OSRM в формат OpenRouteService
            const properties = {
                segments: [{
                    distance: route.distance,
                    duration: route.duration
                }]
            };
            
            this.displayRoute(coordinates, properties, startLatLng, endLatLng);
            this.showRouteInfo(properties, 'OSRM');
            
            this.app.notificationManager.showNotification('Маршрут построен через OSRM', 'success');
            return true;
        }
        
        return false;
    }
    
    getRoutingProfile(userStatus) {
        switch (userStatus) {
            case 'auto':
            case 'moto':
                return 'driving-car';
            case 'walking':
                return 'foot-walking';
            default:
                return 'driving-car';
        }
    }
    
    displayRoute(coordinates, properties, startLatLng, endLatLng) {
        // Конвертируем координаты из [lng, lat] в [lat, lng] для Leaflet
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);
        
        // Создаем полилинию маршрута
        this.routeLayer = L.polyline(latLngs, {
            color: '#2196F3',
            weight: 6,
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
        }).addTo(this.map);
        
        // Добавляем маркеры начала и конца
        const startMarker = L.marker(startLatLng, {
            icon: L.divIcon({
                className: 'route-marker start-marker',
                html: '<i class="fas fa-play" style="color: #4CAF50; font-size: 16px;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map);
        
        const endMarker = L.marker(endLatLng, {
            icon: L.divIcon({
                className: 'route-marker end-marker',
                html: '<i class="fas fa-flag-checkered" style="color: #f44336; font-size: 16px;"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map);
        
        this.routeMarkers = [startMarker, endMarker];
        
        this.currentRoute = {
            line: this.routeLayer,
            markers: this.routeMarkers,
            properties: properties
        };
        
        // Подгоняем карту под маршрут
        const group = new L.featureGroup([this.routeLayer, ...this.routeMarkers]);
        this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        
        // Показываем кнопку очистки
        const clearBtn = document.getElementById('clearRouteBtn');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }
    }
    
    createSimpleRoute(start, end) {
        const waypoints = [start, end];
        
        this.routeLayer = L.polyline(waypoints, {
            color: '#ff9800',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 5'
        }).addTo(this.map);
        
        const startMarker = L.marker(start, {
            icon: L.divIcon({
                className: 'route-marker start-marker',
                html: '<i class="fas fa-play" style="color: #4CAF50; font-size: 14px;"></i>',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).addTo(this.map);
        
        const endMarker = L.marker(end, {
            icon: L.divIcon({
                className: 'route-marker end-marker',
                html: '<i class="fas fa-flag-checkered" style="color: #f44336; font-size: 14px;"></i>',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).addTo(this.map);
        
        this.routeMarkers = [startMarker, endMarker];
        
        this.currentRoute = {
            line: this.routeLayer,
            markers: this.routeMarkers
        };
        
        const group = new L.featureGroup([this.routeLayer, ...this.routeMarkers]);
        this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
        
        const clearBtn = document.getElementById('clearRouteBtn');
        if (clearBtn) {
            clearBtn.style.display = 'block';
        }
        
        const distance = this.calculateDistance(start, end);
        this.showSimpleRouteInfo(distance);
        
        this.app.notificationManager.showNotification('Показан приблизительный маршрут', 'warning');
    }
    
    showRouteInfo(properties, provider) {
        const distance = (properties.segments[0].distance / 1000).toFixed(2);
        const duration = Math.round(properties.segments[0].duration / 60);
        
        let routeInfo = document.getElementById('routeInfo');
        if (routeInfo) routeInfo.remove();
        
        routeInfo = document.createElement('div');
        routeInfo.id = 'routeInfo';
        routeInfo.innerHTML = `
            <div style="background: rgba(0,0,0,0.9); color: white; padding: 15px; border-radius: 8px; position: fixed; top: 80px; left: 20px; z-index: 1000; max-width: 300px;">
                <h4 style="margin-bottom: 10px;">🗺️ Информация о маршруте</h4>
                <p><strong>Расстояние:</strong> ${distance} км</p>
                <p><strong>Время в пути:</strong> ${duration} мин</p>
                <p><strong>Провайдер:</strong> ${provider}</p>
                <p><strong>Тип:</strong> По дорогам</p>
                <small style="opacity: 0.8;">Нажмите чтобы закрыть</small>
            </div>
        `;
        
        routeInfo.addEventListener('click', () => {
            routeInfo.remove();
        });
        
        document.body.appendChild(routeInfo);
        
        setTimeout(() => {
            if (document.getElementById('routeInfo')) {
                document.getElementById('routeInfo').remove();
            }
        }, 15000);
    }
    
    showSimpleRouteInfo(distance) {
        let routeInfo = document.getElementById('routeInfo');
        if (routeInfo) routeInfo.remove();
        
        routeInfo = document.createElement('div');
        routeInfo.id = 'routeInfo';
        routeInfo.innerHTML = `
            <div style="background: rgba(255,152,0,0.9); color: white; padding: 15px; border-radius: 8px; position: fixed; top: 80px; left: 20px; z-index: 1000; max-width: 300px;">
                <h4 style="margin-bottom: 10px;">⚠️ Приблизительный маршрут</h4>
                <p><strong>Расстояние:</strong> ~${distance.toFixed(2)} км</p>
                <p><strong>Время:</strong> ~${Math.ceil(distance * 4)} мин</p>
                <p><strong>Тип:</strong> По прямой</p>
                <small style="opacity: 0.8;">Нажмите чтобы закрыть</small>
            </div>
        `;
        
        routeInfo.addEventListener('click', () => {
            routeInfo.remove();
        });
        
        document.body.appendChild(routeInfo);
        
        setTimeout(() => {
            if (document.getElementById('routeInfo')) {
                document.getElementById('routeInfo').remove();
            }
        }, 15000);
    }
    
    calculateDistance(latlng1, latlng2) {
        const lat1 = latlng1.lat || latlng1[0];
        const lng1 = latlng1.lng || latlng1[1];
        const lat2 = latlng2.lat || latlng2[0];
        const lng2 = latlng2.lng || latlng2[1];
        
        const R = 6371;
        const dLat = this.deg2rad(lat2 - lat1);
        const dLng = this.deg2rad(lng2 - lng1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    deg2rad(deg) {
        return deg * (Math.PI/180);
    }
    
    clearRoute() {
        if (this.currentRoute) {
            if (this.currentRoute.line) {
                this.map.removeLayer(this.currentRoute.line);
            }
            if (this.currentRoute.markers) {
                this.currentRoute.markers.forEach(marker => {
                    this.map.removeLayer(marker);
                });
            }
            this.currentRoute = null;
        }
        
        this.routeMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.routeMarkers = [];
        
        const routeInfo = document.getElementById('routeInfo');
        if (routeInfo) {
            routeInfo.remove();
        }
        
        const clearBtn = document.getElementById('clearRouteBtn');
        if (clearBtn) {
            clearBtn.style.display = 'none';
        }
        
        this.app.notificationManager.showNotification('Маршрут удален');
    }
    
    createRouteToCoordinates(lat, lng) {
        if (!this.app.mapManager.userLocationMarker) {
            this.app.notificationManager.showNotification('Ваше местоположение не определено', 'error');
            return;
        }
        
        const from = this.app.mapManager.userLocationMarker.getLatLng();
        const to = L.latLng(lat, lng);
        
        this.createRoute(from, to);
    }
}
