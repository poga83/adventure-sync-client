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
        
        // Получаем ID текущего пользователя
        const currentUser = this.app.authManager.getCurrentUser();
        if (currentUser) {
            this.currentUserId = currentUser.id;
            console.log('🆔 ID текущего пользователя:', this.currentUserId);
        }
        
        // Создаем группу кластеризации
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
        
        // Восстанавливаем данные из кэша
        this.restoreFromCache();
        
        // ИСПРАВЛЕНО: Создаем тестовых пользователей с новыми статусами
        this.createTestUsers();
        
        console.log('✅ MarkerManager инициализирован');
        return this.markerClusterGroup;
    }
    
    // ИСПРАВЛЕНО: Тестовые пользователи с новыми статусами
    createTestUsers() {
        const testUsers = [
            {
                id: 'test_user_1',
                name: 'Алексей',
                nickname: 'Алексей',
                status: 'auto',
                position: [55.7558, 37.6173] // Москва
            },
            {
                id: 'test_user_2',
                name: 'Мария',
                nickname: 'Мария',
                status: 'moto',
                position: [55.7617, 37.6155] // Красная площадь
            },
            {
                id: 'test_user_3',
                name: 'Дмитрий',
                nickname: 'Дмитрий',
                status: 'walking',
                position: [55.7539, 37.6208] // Парк Зарядье
            },
            {
                id: 'test_user_4',
                name: 'Елена',
                nickname: 'Елена',
                status: 'busy',
                position: [55.7887, 37.6032] // Останкино
            },
            {
                id: 'test_user_5',
                name: 'Игорь',
                nickname: 'Игорь',
                status: 'auto',
                position: [55.7344, 37.5895] // Воробьевы горы
            }
        ];
        
        // Добавляем тестовых пользователей через 2 секунды после инициализации
        setTimeout(() => {
            console.log('👥 Добавление тестовых пользователей...');
            testUsers.forEach(user => {
                this.addOrUpdateUser(user);
            });
            this.app.notificationManager.showNotification(`Добавлено ${testUsers.length} пользователей для демонстрации`);
        }, 2000);
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
        
        // Не фильтруем текущего пользователя здесь
        const allUsers = Array.isArray(users) ? users : [];
        
        // Обновляем кэш
        localStorage.setItem(CONFIG.CACHE.POSITIONS_KEY, JSON.stringify(allUsers));
        
        // Очищаем существующие маркеры (кроме текущего пользователя)
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
        let addedCount = 0;
        allUsers.forEach(user => {
            if (user.id !== this.currentUserId) { // Исключаем только текущего пользователя
                this.addOrUpdateUser(user);
                addedCount++;
            }
        });
        
        console.log(`✅ Добавлено маркеров: ${addedCount}, всего на карте: ${this.userMarkers.size}`);
        
        // Применяем текущий фильтр
        this.applyActivityFilter(this.filteredStatuses);
        
        // Обновляем счетчик в UI
        if (this.app.uiManager) {
            this.app.uiManager.updateUsersCount(addedCount);
        }
    }
    
    addOrUpdateUser(user) {
        // Не добавляем самого себя
        if (user.id === this.currentUserId) {
            return;
        }
        
        console.log('➕ Добавление/обновление пользователя:', user.name, user.position);
        
        // Проверяем корректность позиции
        if (!user.position || !Array.isArray(user.position) || user.position.length !== 2) {
            console.warn('⚠️ Некорректная позиция пользователя:', user.name, user.position);
            return;
        }
        
        // Сохраняем данные пользователя
        this.users.set(user.id, user);
        
        // Проверяем, есть ли уже маркер
        if (this.userMarkers.has(user.id)) {
            // Обновляем существующий маркер
            const marker = this.userMarkers.get(user.id);
            marker.setLatLng(user.position);
            marker.setIcon(this.createUserIcon(user.status));
            marker.userStatus = user.status;
            marker.setPopupContent(this.createPopupContent(user));
            console.log('🔄 Обновлен маркер пользователя:', user.name);
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
            
            // Сохраняем данные для фильтрации
            marker.userStatus = user.status;
            marker.userId = user.id;
            
            // Добавляем в кластер
            this.markerClusterGroup.addLayer(marker);
            this.userMarkers.set(user.id, marker);
            
            console.log('✅ Создан новый маркер для пользователя:', user.name);
        }
        
        // Применяем фильтр
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
        
        // Обновляем счетчик
        const userCount = Array.from(this.users.keys()).filter(id => id !== this.currentUserId).length;
        if (this.app.uiManager) {
            this.app.uiManager.updateUsersCount(userCount);
        }
    }
    
    updateUserStatus(userId, status) {
        console.log('🔄 Обновление статуса пользователя:', userId, status);
        
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
        const iconSize = [30, 30];
        
        return L.divIcon({
            className: `user-marker user-${status}`,
            html: iconHtml,
            iconSize: iconSize,
            iconAnchor: [15, 15]
        });
    }
    
    getUser(userId) {
        return this.users.get(userId);
    }
    
    // ИСПРАВЛЕНО: Иконки для новых статусов
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
    
    // ИСПРАВЛЕНО: Текст для новых статусов
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
        
        // Подсчитываем видимые маркеры
        let visibleCount = 0;
        this.userMarkers.forEach(marker => {
            if (this.markerClusterGroup.hasLayer(marker)) {
                visibleCount++;
            }
        });
        
        console.log('👁️ Видимых маркеров после фильтрации:', visibleCount);
    }
}
