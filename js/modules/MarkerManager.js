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
        console.log('👥 Инициализация MarkerManager...');
        
        const currentUser = this.app.authManager.getCurrentUser();
        if (currentUser) {
            this.currentUserId = currentUser.id;
            console.log('🆔 ID текущего пользователя:', this.currentUserId);
        }
        
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: true,
            disableClusteringAtZoom: 15,
            maxClusterRadius: 50,
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
        this.restoreFromCache();
        
        // УДАЛЕНО: Создание тестовых пользователей (по запросу)
        // this.createTestUsers();
        
        console.log('✅ MarkerManager инициализирован');
        return this.markerClusterGroup;
    }
    
    restoreFromCache() {
        const cachedPositions = localStorage.getItem(CONFIG.CACHE.POSITIONS_KEY);
        if (cachedPositions) {
            try {
                const positions = JSON.parse(cachedPositions);
                console.log('💾 Восстановление из кэша:', positions.length, 'пользователей');
                positions.forEach(user => {
                    if (user.id !== this.currentUserId) {
                        this.addOrUpdateUser(user);
                    }
                });
            } catch (e) {
                console.error('❌ Ошибка загрузки кэшированных позиций:', e);
            }
        }
    }
    
    updateUsers(users) {
        console.log('🔄 Обновление списка пользователей:', users.length);
        
        const allUsers = Array.isArray(users) ? users : [];
        localStorage.setItem(CONFIG.CACHE.POSITIONS_KEY, JSON.stringify(allUsers));
        
        // Очищаем существующие маркеры (кроме текущего пользователя)
        this.userMarkers.forEach((marker, userId) => {
            if (userId !== this.currentUserId) {
                this.markerClusterGroup.removeLayer(marker);
                this.userMarkers.delete(userId);
            }
        });
        
        const currentUser = this.users.get(this.currentUserId);
        this.users.clear();
        if (currentUser) {
            this.users.set(this.currentUserId, currentUser);
        }
        
        let addedCount = 0;
        allUsers.forEach(user => {
            if (user.id !== this.currentUserId) {
                this.addOrUpdateUser(user);
                addedCount++;
            }
        });
        
        console.log(`✅ Добавлено маркеров: ${addedCount}, всего на карте: ${this.userMarkers.size}`);
        this.applyActivityFilter(this.filteredStatuses);
        
        if (this.app.uiManager) {
            this.app.uiManager.updateUsersCount(addedCount);
        }
    }
    
    addOrUpdateUser(user) {
        if (user.id === this.currentUserId) return;
        
        console.log('➕ Добавление/обновление пользователя:', user.name, user.position);
        
        if (!user.position || !Array.isArray(user.position) || user.position.length !== 2) {
            console.warn('⚠️ Некорректная позиция пользователя:', user.name, user.position);
            return;
        }
        
        this.users.set(user.id, user);
        
        if (this.userMarkers.has(user.id)) {
            const marker = this.userMarkers.get(user.id);
            marker.setLatLng(user.position);
            // ИСПРАВЛЕНО: Принудительное обновление иконки
            const newIcon = this.createUserIcon(user.status);
            marker.setIcon(newIcon);
            marker.userStatus = user.status;
            marker.setPopupContent(this.createPopupContent(user));
            console.log('🔄 Обновлен маркер пользователя:', user.name);
        } else {
            const marker = L.marker(user.position, {
                icon: this.createUserIcon(user.status)
            });
            
            marker.bindPopup(this.createPopupContent(user), {
                maxWidth: 200,
                className: 'user-popup-container'
            });
            
            marker.userStatus = user.status;
            marker.userId = user.id;
            
            this.markerClusterGroup.addLayer(marker);
            this.userMarkers.set(user.id, marker);
            
            console.log('✅ Создан новый маркер для пользователя:', user.name);
        }
        
        this.applyActivityFilter(this.filteredStatuses);
    }
    
    removeUser(userId) {
        console.log('❌ Удаление пользователя:', userId);
        
        if (this.userMarkers.has(userId)) {
            const marker = this.userMarkers.get(userId);
            this.markerClusterGroup.removeLayer(marker);
            this.userMarkers.delete(userId);
        }
        
        this.users.delete(userId);
        
        const userCount = Array.from(this.users.keys()).filter(id => id !== this.currentUserId).length;
        if (this.app.uiManager) {
            this.app.uiManager.updateUsersCount(userCount);
        }
    }
    
    // ИСПРАВЛЕНО: Правильное обновление статуса с принудительным обновлением иконки
    updateUserStatus(userId, status) {
        console.log('🔄 Обновление статуса пользователя:', userId, status);
        
        const user = this.users.get(userId);
        if (user) {
            // Обновляем статус в данных
            user.status = status;
            
            if (this.userMarkers.has(userId)) {
                const marker = this.userMarkers.get(userId);
                
                // ИСПРАВЛЕНО: Принудительно создаем новую иконку
                const newIcon = this.createUserIcon(status);
                marker.setIcon(newIcon);
                marker.userStatus = status;
                
                // Обновляем контент попапа
                marker.setPopupContent(this.createPopupContent(user));
                
                // Применяем фильтр для обновления отображения
                this.applyActivityFilter(this.filteredStatuses);
                
                console.log('✅ Статус и иконка пользователя обновлены:', user.name, status);
                
                // Показываем уведомление об изменении статуса
                this.app.notificationManager.showNotification(
                    `${user.name} сменил статус на ${this.getStatusText(status)}`, 
                    'info'
                );
            }
        } else {
            console.warn('⚠️ Пользователь не найден для обновления статуса:', userId);
        }
    }
    
    updateUserPosition(userId, position) {
        const user = this.users.get(userId);
        if (user) {
            user.position = position;
            
            if (this.userMarkers.has(userId)) {
                const marker = this.userMarkers.get(userId);
                marker.setLatLng(position);
            }
        }
    }
    
    // ИСПРАВЛЕНО: Создание иконки с уникальным классом для каждого статуса
    createUserIcon(status) {
        const iconHtml = this.getUserIcon(status);
        const iconSize = [30, 30];
        
        return L.divIcon({
            className: `user-marker user-${status} marker-${status}-${Date.now()}`, // Уникальный класс
            html: iconHtml,
            iconSize: iconSize,
            iconAnchor: [15, 15]
        });
    }
    
    getUser(userId) {
        return this.users.get(userId);
    }
    
    // ИСПРАВЛЕНО: Иконки для статусов
    getUserIcon(status) {
        const iconStyle = 'font-size: 16px; color: white;';
        switch (status) {
            case CONFIG.STATUSES.AUTO:
                return `<i class="fas fa-car" style="${iconStyle}"></i>`;
            case CONFIG.STATUSES.MOTO:
                return `<i class="fas fa-motorcycle" style="${iconStyle}"></i>`;
            case CONFIG.STATUSES.WALKING:
                return `<i class="fas fa-walking" style="${iconStyle}"></i>`;
            case CONFIG.STATUSES.BUSY:
                return `<i class="fas fa-clock" style="${iconStyle}"></i>`;
            default:
                return `<i class="fas fa-user" style="${iconStyle}"></i>`;
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case CONFIG.STATUSES.AUTO:
                return 'Авто';
            case CONFIG.STATUSES.MOTO:
                return 'Мото';
            case CONFIG.STATUSES.WALKING:
                return 'Пешкодрали';
            case CONFIG.STATUSES.BUSY:
                return 'Занят';
            default:
                return 'Неизвестно';
        }
    }
    
    createPopupContent(user) {
        return `
            <div class="user-popup">
                <h4 class="user-popup-name">${user.name}</h4>
                <div class="user-popup-status">${this.getStatusText(user.status)}</div>
                <button onclick="window.adventureSync.openPrivateChat('${user.id}', '${user.name}')" 
                        style="margin: 3px; padding: 6px 10px; background: #64b5f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    💬 Написать
                </button>
                <button onclick="window.adventureSync.mapManager.createRouteToUser('${user.id}')" 
                        style="margin: 3px; padding: 6px 10px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                    🗺️ Маршрут
                </button>
            </div>
        `;
    }
    
    applyActivityFilter(statuses) {
        this.filteredStatuses = statuses;
        console.log('🔍 Применение фильтра:', statuses);
        
        const currentCenter = this.app.mapManager.map.getCenter();
        const currentZoom = this.app.mapManager.map.getZoom();
        
        if (statuses.includes('all')) {
            this.userMarkers.forEach(marker => {
                if (!this.markerClusterGroup.hasLayer(marker)) {
                    this.markerClusterGroup.addLayer(marker);
                }
            });
        } else {
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
        
        this.app.mapManager.map.setView(currentCenter, currentZoom);
        
        let visibleCount = 0;
        this.userMarkers.forEach(marker => {
            if (this.markerClusterGroup.hasLayer(marker)) {
                visibleCount++;
            }
        });
        
        console.log('👁️ Видимых маркеров после фильтрации:', visibleCount);
    }
}
