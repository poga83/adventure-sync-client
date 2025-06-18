class MarkerManager {
    constructor(app) {
        this.app = app;
        this.userMarkers = new Map();
        this.users = new Map();
        this.markerClusterGroup = null;
        this.filteredStatuses = ['all'];
        this.currentUserId = null;
    }
    
    initialize(map) {
        // Улучшенные настройки кластеризации для мобильных
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 15,
            maxClusterRadius: window.innerWidth <= 768 ? 60 : 50,
            zoomToBoundsOnClick: true,
            showCoverageOnHover: false,
            iconCreateFunction: (cluster) => {
                const count = cluster.getChildCount();
                let size = 'small';
                if (count > 10) size = 'medium';
                if (count > 100) size = 'large';
                
                return L.divIcon({
                    html: `<div><span>${count}</span></div>`,
                    className: `marker-cluster marker-cluster-${size}`,
                    iconSize: L.point(40, 40)
                });
            }
        });
        
        map.addLayer(this.markerClusterGroup);
        
        // Получаем ID текущего пользователя
        this.currentUserId = this.app.connectionManager.getUserData().id;
        
        this.restoreFromCache();
        return this.markerClusterGroup;
    }
    
    restoreFromCache() {
        const cachedPositions = localStorage.getItem(CONFIG.CACHE.POSITIONS_KEY);
        if (cachedPositions) {
            try {
                const positions = JSON.parse(cachedPositions);
                console.log('Восстанавливаем из кэша:', positions.length, 'пользователей');
                positions.forEach(user => {
                    if (user.id !== this.currentUserId) { // Не добавляем самого себя
                        this.addOrUpdateUser(user);
                    }
                });
            } catch (e) {
                console.error('Ошибка загрузки кэшированных позиций:', e);
            }
        }
    }
    
    updateUsers(users) {
        console.log('Обновление пользователей:', users.length);
        
        // Фильтруем текущего пользователя
        const filteredUsers = users.filter(user => user.id !== this.currentUserId);
        
        // Обновляем кэш
        localStorage.setItem(CONFIG.CACHE.POSITIONS_KEY, JSON.stringify(filteredUsers));
        
        // Очищаем текущие маркеры (кроме текущего пользователя)
        this.userMarkers.forEach((marker, userId) => {
            if (userId !== this.currentUserId) {
                this.markerClusterGroup.removeLayer(marker);
                this.userMarkers.delete(userId);
            }
        });
        
        // Очищаем данные пользователей (кроме текущего)
        const currentUser = this.users.get(this.currentUserId);
        this.users.clear();
        if (currentUser) {
            this.users.set(this.currentUserId, currentUser);
        }
        
        // Добавляем новые маркеры
        filteredUsers.forEach(user => {
            this.addOrUpdateUser(user);
        });
        
        // Применяем текущий фильтр
        this.applyActivityFilter(this.filteredStatuses);
        
        // Обновляем счетчик в UI
        this.app.uiManager.updateUserCount(filteredUsers.length);
        
        console.log('Маркеры на карте:', this.userMarkers.size);
    }
    
    addOrUpdateUser(user) {
        // Не добавляем самого себя
        if (user.id === this.currentUserId) {
            return;
        }
        
        console.log('Добавление/обновление пользователя:', user.name, user.position);
        
        // Сохраняем данные пользователя
        this.users.set(user.id, user);
        
        // Проверяем, есть ли уже маркер для этого пользователя
        if (this.userMarkers.has(user.id)) {
            // Обновляем существующий маркер
            const marker = this.userMarkers.get(user.id);
            marker.setLatLng(user.position);
            marker.setIcon(this.createUserIcon(user.status));
            marker.userStatus = user.status;
            marker.setPopupContent(this.createPopupContent(user));
        } else {
            // Создаем новый маркер
            const marker = L.marker(user.position, {
                icon: this.createUserIcon(user.status)
            });
            
            // Настраиваем попап
            marker.bindPopup(this.createPopupContent(user), {
                maxWidth: 200,
                className: 'user-popup-container'
            });
            
            // Сохраняем статус в маркере для фильтрации
            marker.userStatus = user.status;
            marker.userId = user.id;
            
            // Добавляем в кластер
            this.markerClusterGroup.addLayer(marker);
            this.userMarkers.set(user.id, marker);
            
            console.log('Создан маркер для пользователя:', user.name);
        }
        
        // Применяем текущий фильтр
        this.applyActivityFilter(this.filteredStatuses);
    }
    
    removeUser(userId) {
        console.log('Удаление пользователя:', userId);
        
        if (this.userMarkers.has(userId)) {
            const marker = this.userMarkers.get(userId);
            this.markerClusterGroup.removeLayer(marker);
            this.userMarkers.delete(userId);
        }
        
        this.users.delete(userId);
        
        // Обновляем счетчик
        const userCount = Array.from(this.users.keys()).filter(id => id !== this.currentUserId).length;
        this.app.uiManager.updateUserCount(userCount);
    }
    
    updateUserStatus(userId, status) {
        console.log('Обновление статуса пользователя:', userId, status);
        
        const user = this.users.get(userId);
        if (user) {
            user.status = status;
            
            if (this.userMarkers.has(userId)) {
                const marker = this.userMarkers.get(userId);
                marker.setIcon(this.createUserIcon(status));
                marker.userStatus = status;
                marker.setPopupContent(this.createPopupContent(user));
                
                // Применяем фильтр
                this.applyActivityFilter(this.filteredStatuses);
            }
        }
    }
    
    updateUserPosition(userId, position) {
        console.log('Обновление позиции пользователя:', userId, position);
        
        const user = this.users.get(userId);
        if (user) {
            user.position = position;
            
            if (this.userMarkers.has(userId)) {
                const marker = this.userMarkers.get(userId);
                marker.setLatLng(position);
            }
        }
    }
    
    createUserIcon(status) {
        const iconHtml = this.getUserIcon(status);
        const iconSize = window.innerWidth <= 768 ? [32, 32] : [30, 30];
        
        return L.divIcon({
            className: `user-marker user-${status}`,
            html: iconHtml,
            iconSize: iconSize,
            iconAnchor: [iconSize[0]/2, iconSize[1]/2]
        });
    }
    
    getUser(userId) {
        return this.users.get(userId);
    }
    
    getUserIcon(status) {
        switch (status) {
            case CONFIG.STATUSES.AVAILABLE:
                return '<i class="fas fa-user"></i>';
            case CONFIG.STATUSES.HIKING:
                return '<i class="fas fa-hiking"></i>';
            case CONFIG.STATUSES.TRAVELING:
                return '<i class="fas fa-car"></i>';
            case CONFIG.STATUSES.BUSY:
                return '<i class="fas fa-clock"></i>';
            default:
                return '<i class="fas fa-user"></i>';
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
                <h4>${user.name}</h4>
                <div class="status">${this.getStatusText(user.status)}</div>
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
        this.filteredStatuses = statuses;
        console.log('Применение фильтра:', statuses);
        
        // Сохраняем текущий вид карты
        const currentCenter = this.app.mapManager.map.getCenter();
        const currentZoom = this.app.mapManager.map.getZoom();
        
        if (statuses.includes('all')) {
            // Показать все маркеры
            this.userMarkers.forEach(marker => {
                if (!this.markerClusterGroup.hasLayer(marker)) {
                    this.markerClusterGroup.addLayer(marker);
                }
            });
        } else {
            // Фильтровать по статусам
            this.userMarkers.forEach(marker => {
                if (statuses.includes(marker.userStatus)) {
                    if (!this.markerClusterGroup.hasLayer(marker)) {
                        this.markerClusterGroup.addLayer(marker);
                    }
                } else {
                    if (this.markerClusterGroup.hasLayer(marker)) {
                        this.markerClusterGroup.removeLayer(marker);
                    }
                }
            });
        }
        
        // Восстанавливаем вид карты
        this.app.mapManager.map.setView(currentCenter, currentZoom);
        
        // Подсчитываем отфильтрованных пользователей
        let visibleCount = 0;
        this.userMarkers.forEach(marker => {
            if (this.markerClusterGroup.hasLayer(marker)) {
                visibleCount++;
            }
        });
        
        console.log('Видимых маркеров после фильтрации:', visibleCount);
    }
}
