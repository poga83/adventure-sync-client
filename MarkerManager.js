class MarkerManager {
    constructor(app) {
        this.app = app;
        this.userMarkers = new Map(); // Хранит маркеры пользователей по их ID
        this.users = new Map(); // Хранит данные пользователей по их ID
        this.markerClusterGroup = null;
        this.filteredStatuses = null; // Текущие выбранные статусы для фильтрации
    }
    
    initialize(map) {
        // Инициализация группы кластеризации маркеров
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: CONFIG.MARKER_CLUSTER.CHUNKED_LOADING,
            spiderfyOnMaxZoom: CONFIG.MARKER_CLUSTER.SPIDERFY_ON_MAX_ZOOM,
            disableClusteringAtZoom: CONFIG.MARKER_CLUSTER.DISABLE_CLUSTERING_AT_ZOOM,
            maxClusterRadius: CONFIG.MARKER_CLUSTER.MAX_CLUSTER_RADIUS,
            zoomToBoundsOnClick: CONFIG.MARKER_CLUSTER.ZOOM_TO_BOUNDS_ON_CLICK,
            showCoverageOnHover: CONFIG.MARKER_CLUSTER.SHOW_COVERAGE_ON_HOVER
        });
        
        map.addLayer(this.markerClusterGroup);
        
        // Восстановление позиций из кэша
        this.restoreFromCache();
        
        return this.markerClusterGroup;
    }
    
    restoreFromCache() {
        const cachedPositions = localStorage.getItem(CONFIG.CACHE.POSITIONS_KEY);
        if (cachedPositions) {
            try {
                const positions = JSON.parse(cachedPositions);
                // Применяем позиции, пока загружаются актуальные данные
                positions.forEach(user => {
                    this.addOrUpdateUser(user);
                });
            } catch (e) {
                console.error('Ошибка загрузки кэшированных позиций:', e);
            }
        }
    }
    
    updateUsers(users) {
        // Обновляем кэш
        localStorage.setItem(CONFIG.CACHE.POSITIONS_KEY, JSON.stringify(users));
        
        // Очищаем текущие маркеры
        this.userMarkers.forEach((marker, userId) => {
            this.markerClusterGroup.removeLayer(marker);
        });
        this.userMarkers.clear();
        this.users.clear();
        
        // Добавляем новые маркеры
        users.forEach(user => {
            this.addOrUpdateUser(user);
        });
        
        // Применяем текущий фильтр, если он есть
        if (this.filteredStatuses) {
            this.applyActivityFilter(this.filteredStatuses);
        }
    }
    
    addOrUpdateUser(user) {
        // Сохраняем данные пользователя
        this.users.set(user.id, user);
        
        // Проверяем, есть ли уже маркер для этого пользователя
        if (this.userMarkers.has(user.id)) {
            // Обновляем существующий маркер
            const marker = this.userMarkers.get(user.id);
            marker.setLatLng(user.position);
            marker.setIcon(L.divIcon({
                className: `user-marker user-${user.status}`,
                html: this.getUserIcon(user.status),
                iconSize: [30, 30]
            }));
            
            // Обновляем статус в маркере для фильтрации
            marker.userStatus = user.status;
            
            // Обновляем всплывающее окно
            marker.setPopupContent(this.createPopupContent(user));
        } else {
            // Создаем новый маркер
            const marker = L.marker(user.position, {
                icon: L.divIcon({
                    className: `user-marker user-${user.status}`,
                    html: this.getUserIcon(user.status),
                    iconSize: [30, 30]
                })
            }).bindPopup(this.createPopupContent(user));
            
            // Сохраняем статус пользователя в маркере для фильтрации
            marker.userStatus = user.status;
            
            // Добавляем маркер в группу кластеризации
            this.markerClusterGroup.addLayer(marker);
            
            // Сохраняем маркер в Map
            this.userMarkers.set(user.id, marker);
        }
        
        // Применяем текущий фильтр, если он есть
        if (this.filteredStatuses) {
            this.applyActivityFilter(this.filteredStatuses);
        }
    }
    
    removeUser(userId) {
        if (this.userMarkers.has(userId)) {
            const marker = this.userMarkers.get(userId);
            this.markerClusterGroup.removeLayer(marker);
            this.userMarkers.delete(userId);
        }
        
        this.users.delete(userId);
    }
    
    updateUserStatus(userId, status) {
        // Обновляем данные пользователя
        const user = this.users.get(userId);
        if (user) {
            user.status = status;
            
            // Обновляем маркер
            if (this.userMarkers.has(userId)) {
                const marker = this.userMarkers.get(userId);
                marker.setIcon(L.divIcon({
                    className: `user-marker user-${status}`,
                    html: this.getUserIcon(status),
                    iconSize: [30, 30]
                }));
                
                // Обновляем статус в маркере для фильтрации
                marker.userStatus = status;
                
                // Обновляем всплывающее окно
                marker.setPopupContent(this.createPopupContent(user));
                
                // Применяем текущий фильтр, если он есть
                if (this.filteredStatuses) {
                    this.applyActivityFilter(this.filteredStatuses);
                }
            }
        }
    }
    
    updateUserPosition(userId, position) {
        // Обновляем данные пользователя
        const user = this.users.get(userId);
        if (user) {
            user.position = position;
            
            // Обновляем маркер
            if (this.userMarkers.has(userId)) {
                const marker = this.userMarkers.get(userId);
                marker.setLatLng(position);
            }
        }
    }
    
    getUser(userId) {
        return this.users.get(userId);
    }
    
    getUserIcon(status) {
        switch (status) {
            case CONFIG.STATUSES.AVAILABLE:
                return '👤';
            case CONFIG.STATUSES.HIKING:
                return '🥾';
            case CONFIG.STATUSES.TRAVELING:
                return '🚗';
            case CONFIG.STATUSES.BUSY:
                return '⏱️';
            default:
                return '👤';
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case CONFIG.STATUSES.AVAILABLE:
                return 'Доступен';
            case CONFIG.STATUSES.HIKING:
                return 'В походе';
            case CONFIG.STATUSES.TRAVELING:
                return 'Путешествую';
            case CONFIG.STATUSES.BUSY:
                return 'Занят';
            default:
                return 'Неизвестно';
        }
    }
    
    createPopupContent(user) {
        return `
            <div class="user-popup">
                <b>${user.name}</b><br>
                ${this.getStatusText(user.status)}<br>
                <button onclick="window.adventureSync.openPrivateChat('${user.id}', '${user.name}')">
                    💬 Написать
                </button>
                <button onclick="window.adventureSync.createRouteToUser('${user.id}')">
                    🗺️ Маршрут
                </button>
            </div>
        `;
    }
    
    applyActivityFilter(statuses) {
        // Сохраняем текущий фильтр
        this.filteredStatuses = statuses;
        
        // Получаем текущие координаты и масштаб карты
        const currentCenter = this.app.mapManager.map.getCenter();
        const currentZoom = this.app.mapManager.map.getZoom();
        
        if (statuses.includes('all')) {
            // Показать все маркеры пользователей
            this.userMarkers.forEach(marker => {
                this.markerClusterGroup.addLayer(marker);
            });
        } else {
            // Фильтровать маркеры по выбранным статусам
            this.userMarkers.forEach(marker => {
                if (statuses.includes(marker.userStatus)) {
                    this.markerClusterGroup.addLayer(marker);
                } else {
                    this.markerClusterGroup.removeLayer(marker);
                }
            });
        }
        
        // Восстанавливаем предыдущие координаты и масштаб карты
        this.app.mapManager.map.setView(currentCenter, currentZoom);
    }
}
