class AdventureSync {
    constructor() {
        this.socket = null;
        this.map = null;
        this.userMarker = null;
        this.userMarkers = new Map();
        this.customMarkers = new Map();
        this.routes = new Map();
        this.activeRoute = null;
        this.markerMode = false;
        this.pendingMarkerLocation = null;
        this.chatPartner = null;
        this.userId = null;
        this.userName = null;
        this.currentStatus = 'available';
        this.watchId = null;
        this.isGPSActive = false;
        this.routingControl = null;
        this.markerClusterGroup = null;
        
        this.init();
    }

    init() {
        this.initializeMap();
        this.initializeSocket();
        this.bindEvents();
        this.requestUserInfo();
    }

    initializeMap() {
        // Инициализация карты
        this.map = L.map('map').setView([55.751244, 37.618423], 13);
        
        // Добавление тайлов
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        // Инициализация кластеризации маркеров
        this.markerClusterGroup = L.markerClusterGroup({
            chunkedLoading: true,
            spiderfyOnMaxZoom: false,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true
        });
        this.map.addLayer(this.markerClusterGroup);

        // Обработка кликов по карте
        this.map.on('click', (e) => {
            if (this.markerMode) {
                this.pendingMarkerLocation = e.latlng;
                this.showModal('markerModal');
            }
        });

        // Добавление контрола масштаба
        L.control.scale({
            position: 'bottomleft',
            imperial: false
        }).addTo(this.map);
    }

    initializeSocket() {
        try {
            this.socket = io({
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                timeout: 20000
            });

            // Обработка подключения
            this.socket.on('connect', () => {
                this.updateConnectionStatus('connected');
                this.showNotification('Подключено к серверу', 'success');
                
                if (this.userName) {
                    this.registerUser();
                }
            });

            this.socket.on('disconnect', () => {
                this.updateConnectionStatus('disconnected');
                this.showNotification('Соединение потеряно', 'error');
            });

            this.socket.on('reconnect', () => {
                this.updateConnectionStatus('connected');
                this.showNotification('Соединение восстановлено', 'success');
                this.registerUser();
            });

            // Обработка пользователей
            this.socket.on('users', (users) => this.updateUsers(users));
            this.socket.on('userJoined', (user) => this.onUserJoined(user));
            this.socket.on('userLeft', (userId) => this.onUserLeft(userId));
            this.socket.on('userStatusChanged', (data) => this.onUserStatusChanged(data));

            // Обработка сообщений
            this.socket.on('groupMessage', (message) => this.addGroupMessage(message));
            this.socket.on('privateMessage', (message) => this.onPrivateMessage(message));
            this.socket.on('chatHistory', (data) => this.loadChatHistory(data));

            // Обработка маркеров
            this.socket.on('markerCreated', (data) => this.addMarkerToMap(data.marker));
            this.socket.on('markerDeleted', (data) => this.removeMarkerFromMap(data.markerId));

            // Обработка маршрутов
            this.socket.on('groupRoutes', (routes) => this.updateRoutesList(routes));
            this.socket.on('routeCreated', (route) => this.onRouteCreated(route));
            this.socket.on('routeJoined', (data) => this.onRouteJoined(data));
            this.socket.on('routeLeft', (data) => this.onRouteLeft(data));
            this.socket.on('routeWaypointAdded', (data) => this.onRouteWaypointAdded(data));

            // Обработка ошибок
            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
                this.showNotification(`Ошибка: ${error.message}`, 'error');
            });

        } catch (error) {
            console.error('Failed to initialize socket:', error);
            this.showNotification('Ошибка подключения к серверу', 'error');
        }
    }

    bindEvents() {
        // Статус пользователя
        document.getElementById('statusSelect').addEventListener('change', (e) => {
            this.updateStatus(e.target.value);
        });

        // GPS
        document.getElementById('gpsBtn').addEventListener('click', () => {
            this.toggleGPS();
        });

        // Кнопки интерфейса
        document.getElementById('routesBtn').addEventListener('click', () => {
            this.toggleRoutesPanel();
        });

        document.getElementById('markerBtn').addEventListener('click', () => {
            this.enterMarkerMode();
        });

        document.getElementById('groupChatBtn').addEventListener('click', () => {
            this.showGroupChat();
        });

        // Фильтр активностей
        document.getElementById('activityFilter').addEventListener('change', () => {
            this.applyActivityFilter();
        });

        // Модальные окна
        this.bindModalEvents();
        
        // Чат события
        this.bindChatEvents();
    }

    bindModalEvents() {
        // Закрытие модальных окон
        document.querySelectorAll('.close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal') || e.target.closest('.chat-window') || e.target.closest('.side-panel');
                if (modal) {
                    modal.style.display = 'none';
                }
                this.markerMode = false;
            });
        });

        // Маркер модал
        document.getElementById('createMarkerBtn').addEventListener('click', () => {
            this.createMarker();
        });

        document.getElementById('cancelMarkerBtn').addEventListener('click', () => {
            this.hideModal('markerModal');
            this.markerMode = false;
        });

        // Маршрут модал
        document.getElementById('saveRouteBtn').addEventListener('click', () => {
            this.saveRoute();
        });

        document.getElementById('cancelRouteBtn').addEventListener('click', () => {
            this.hideModal('routeModal');
        });

        document.getElementById('createRouteBtn').addEventListener('click', () => {
            this.showModal('routeModal');
        });

        // Закрытие модалов по клику вне области
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                    this.markerMode = false;
                }
            });
        });
    }

    bindChatEvents() {
        // Приватный чат
        document.getElementById('privateInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendPrivateMessage();
            }
        });

        document.getElementById('sendPrivateBtn').addEventListener('click', () => {
            this.sendPrivateMessage();
        });

        // Групповой чат
        document.getElementById('groupInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendGroupMessage();
            }
        });

        document.getElementById('sendGroupBtn').addEventListener('click', () => {
            this.sendGroupMessage();
        });
    }

    requestUserInfo() {
        const savedName = localStorage.getItem('adventureSync_userName');
        this.userName = savedName || prompt('Введите ваше имя:');
        
        if (!this.userName || this.userName.trim() === '') {
            this.userName = `Пользователь${Math.floor(Math.random() * 1000)}`;
        }
        
        localStorage.setItem('adventureSync_userName', this.userName);
        
        if (this.socket && this.socket.connected) {
            this.registerUser();
        }
    }

    registerUser() {
        if (!this.socket || !this.userName) return;
        
        this.socket.emit('register', {
            name: this.userName,
            status: this.currentStatus
        });
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('statusText');
        const containerElement = document.getElementById('connectionStatus');
        
        containerElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'Подключено';
                break;
            case 'disconnected':
                statusElement.textContent = 'Не подключено';
                break;
            default:
                statusElement.textContent = 'Подключение...';
        }
    }

    updateStatus(status) {
        this.currentStatus = status;
        
        if (this.socket) {
            this.socket.emit('statusUpdate', { status });
        }
        
        this.showNotification(`Статус изменен: ${this.getStatusText(status)}`, 'success');
    }

    getStatusText(status) {
        const statusMap = {
            'motorcycle': '🏍️ Мото',
            'bicycle': '🚲 Вело',
            'walking': '🚶 Пешком',
            'resting': '☕ Отдых',
            'car': '🚗 Авто',
            'available': '🟢 Свободен'
        };
        return statusMap[status] || status;
    }

    toggleGPS() {
        if (this.isGPSActive) {
            this.stopLocationTracking();
        } else {
            this.startLocationTracking();
        }
    }

    startLocationTracking() {
        if (!navigator.geolocation) {
            this.showNotification('Геолокация не поддерживается', 'error');
            return;
        }

        const options = {
            enableHighAccuracy: true,
            maximumAge: 30000,
            timeout: 10000
        };

        this.watchId = navigator.geolocation.watchPosition(
            (position) => this.onLocationUpdate(position),
            (error) => this.onLocationError(error),
            options
        );

        this.isGPSActive = true;
        document.getElementById('gpsBtn').style.background = '#27ae60';
        this.showNotification('GPS активирован', 'success');
    }

    stopLocationTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }

        this.isGPSActive = false;
        document.getElementById('gpsBtn').style.background = '#34495e';
        this.showNotification('GPS деактивирован', 'warning');
    }

    onLocationUpdate(position) {
        const { latitude, longitude, accuracy } = position.coords;
        const location = [latitude, longitude];

        // Обновление маркера пользователя
        if (this.userMarker) {
            this.userMarker.setLatLng(location);
        } else {
            this.userMarker = L.marker(location, {
                icon: L.divIcon({
                    className: 'user-marker',
                    html: '📍',
                    iconSize: [25, 25]
                })
            }).addTo(this.map);
            
            this.map.setView(location, 15);
        }

        // Отправка позиции на сервер
        if (this.socket) {
            this.socket.emit('locationUpdate', {
                position: location,
                accuracy,
                timestamp: Date.now()
            });
        }
    }

    onLocationError(error) {
        let message = 'Ошибка определения местоположения';
        
        switch (error.code) {
            case error.PERMISSION_DENIED:
                message = 'Доступ к геолокации запрещен';
                break;
            case error.POSITION_UNAVAILABLE:
                message = 'Местоположение недоступно';
                break;
            case error.TIMEOUT:
                message = 'Превышено время ожидания GPS';
                break;
        }
        
        this.showNotification(message, 'error');
        this.stopLocationTracking();
    }

    updateUsers(users) {
        // Очистка старых маркеров
        this.userMarkers.forEach(marker => {
            this.markerClusterGroup.removeLayer(marker);
        });
        this.userMarkers.clear();

        // Добавление новых маркеров
        users.forEach(user => {
            if (user.id === this.socket.id || !user.position) return;
            
            this.addUserMarker(user);
        });
    }

    addUserMarker(user) {
        const marker = L.marker(user.position, {
            icon: L.divIcon({
                className: `user-marker user-${user.status}`,
                html: this.getUserIcon(user.status),
                iconSize: [30, 30]
            })
        })
        .bindPopup(`
            <div class="user-popup">
                <b>${user.name}</b><br>
                ${this.getStatusText(user.status)}<br>
                <button onclick="adventureSync.openPrivateChat('${user.id}', '${user.name}')">
                    💬 Написать
                </button>
                <button onclick="adventureSync.createRouteToUser('${user.id}')">
                    🗺️ Маршрут
                </button>
            </div>
        `);

        this.markerClusterGroup.addLayer(marker);
        this.userMarkers.set(user.id, marker);
    }

    getUserIcon(status) {
        const icons = {
            'motorcycle': '🏍️',
            'bicycle': '🚲',
            'walking': '🚶',
            'resting': '☕',
            'car': '🚗',
            'available': '🟢'
        };
        return icons[status] || '👤';
    }

    onUserJoined(user) {
        this.showNotification(`${user.name} присоединился`, 'success');
        if (user.position) {
            this.addUserMarker(user);
        }
    }

    onUserLeft(userId) {
        const marker = this.userMarkers.get(userId);
        if (marker) {
            this.markerClusterGroup.removeLayer(marker);
            this.userMarkers.delete(userId);
        }
    }

    onUserStatusChanged(data) {
        const marker = this.userMarkers.get(data.userId);
        if (marker) {
            marker.setIcon(L.divIcon({
                className: `user-marker user-${data.status}`,
                html: this.getUserIcon(data.status),
                iconSize: [30, 30]
            }));
        }
    }

    applyActivityFilter() {
        const filter = Array.from(document.getElementById('activityFilter').selectedOptions)
            .map(option => option.value);
        
        if (filter.includes('all')) {
            this.userMarkers.forEach(marker => {
                marker.addTo(this.map);
            });
        } else {
            this.userMarkers.forEach((marker, userId) => {
                // Логика фильтрации по статусу пользователя
                // Нужно хранить статус пользователя в маркере
            });
        }
    }

    // Методы для работы с чатом
    showGroupChat() {
        const groupChat = document.getElementById('groupChat');
        groupChat.style.display = 'flex';
        
        if (this.socket) {
            this.socket.emit('getGroupChatHistory');
        }
    }

    openPrivateChat(userId, userName) {
        this.chatPartner = userId;
        document.getElementById('chatUserName').textContent = userName;
        document.getElementById('privateChat').style.display = 'flex';
        document.getElementById('privateMessages').innerHTML = '';
        
        if (this.socket) {
            this.socket.emit('getChatHistory', { withUser: userId });
        }
    }

    sendGroupMessage() {
        const input = document.getElementById('groupInput');
        const text = input.value.trim();
        
        if (!text || !this.socket) return;
        
        this.socket.emit('groupMessage', { text });
        input.value = '';
    }

    sendPrivateMessage() {
        const input = document.getElementById('privateInput');
        const text = input.value.trim();
        
        if (!text || !this.chatPartner || !this.socket) return;
        
        this.socket.emit('privateMessage', {
            to: this.chatPartner,
            text
        });
        
        this.addPrivateMessage({
            text,
            timestamp: new Date().toISOString(),
            isOwn: true
        });
        
        input.value = '';
    }

    addGroupMessage(message) {
        const messagesContainer = document.getElementById('groupMessages');
        const messageElement = this.createMessageElement(message, false);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    onPrivateMessage(message) {
        if (message.from === this.chatPartner) {
            this.addPrivateMessage({
                ...message,
                isOwn: false
            });
        } else {
            this.showNotification(`Новое сообщение от ${message.fromName}`, 'info');
        }
    }

    addPrivateMessage(message) {
        const messagesContainer = document.getElementById('privateMessages');
        const messageElement = this.createMessageElement(message, true);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(message, isPrivate) {
        const div = document.createElement('div');
        div.className = `message ${message.isOwn ? 'own' : 'other'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        div.innerHTML = `
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-time">${time}</div>
            ${!isPrivate && !message.isOwn ? `<div class="message-author">${message.fromName}</div>` : ''}
        `;
        
        return div;
    }

    loadChatHistory(data) {
        const container = data.type === 'private' ? 
            document.getElementById('privateMessages') : 
            document.getElementById('groupMessages');
        
        container.innerHTML = '';
        
        data.messages.forEach(message => {
            const messageElement = this.createMessageElement(message, data.type === 'private');
            container.appendChild(messageElement);
        });
        
        container.scrollTop = container.scrollHeight;
    }

    // Методы для работы с маркерами
    enterMarkerMode() {
        this.markerMode = true;
        this.showNotification('Выберите точку на карте для создания метки', 'info');
        document.body.style.cursor = 'crosshair';
    }

    createMarker() {
        const title = document.getElementById('markerTitle').value.trim();
        const description = document.getElementById('markerDesc').value.trim();
        const category = document.getElementById('markerCategory').value;
        
        if (!title || !this.pendingMarkerLocation) {
            this.showNotification('Заполните заголовок метки', 'error');
            return;
        }
        
        const markerData = {
            title,
            description,
            category,
            coordinates: [this.pendingMarkerLocation.lat, this.pendingMarkerLocation.lng],
            createdBy: this.userName
        };
        
        if (this.socket) {
            this.socket.emit('createMarker', markerData);
        }
        
        this.hideModal('markerModal');
        this.clearMarkerForm();
        this.markerMode = false;
        document.body.style.cursor = 'default';
    }

    addMarkerToMap(marker) {
        const markerIcon = this.getMarkerIcon(marker.category);
        
        const leafletMarker = L.marker(marker.coordinates, {
            icon: L.divIcon({
                className: `custom-marker marker-${marker.category}`,
                html: markerIcon,
                iconSize: [25, 25]
            })
        })
        .bindPopup(`
            <div class="marker-popup">
                <h4>${this.escapeHtml(marker.title)}</h4>
                <p>${this.escapeHtml(marker.description)}</p>
                <small>Создано: ${marker.createdBy}</small>
                ${marker.createdBy === this.userName ? 
                    `<br><button onclick="adventureSync.deleteMarker('${marker.id}')">🗑️ Удалить</button>` : 
                    ''
                }
            </div>
        `)
        .addTo(this.map);
        
        this.customMarkers.set(marker.id, leafletMarker);
    }

    getMarkerIcon(category) {
        const icons = {
            'note': '📝',
            'danger': '⚠️',
            'food': '🍽️',
            'fuel': '⛽',
            'repair': '🔧',
            'scenic': '🏞️',
            'meeting': '👥'
        };
        return icons[category] || '📍';
    }

    deleteMarker(markerId) {
        if (this.socket) {
            this.socket.emit('deleteMarker', { markerId });
        }
    }

    removeMarkerFromMap(markerId) {
        const marker = this.customMarkers.get(markerId);
        if (marker) {
            this.map.removeLayer(marker);
            this.customMarkers.delete(markerId);
        }
    }

    clearMarkerForm() {
        document.getElementById('markerTitle').value = '';
        document.getElementById('markerDesc').value = '';
        document.getElementById('markerCategory').value = 'note';
    }

    // Методы для работы с маршрутами
    toggleRoutesPanel() {
        const panel = document.getElementById('routesPanel');
        const isVisible = panel.style.display === 'flex';
        panel.style.display = isVisible ? 'none' : 'flex';
        
        if (!isVisible && this.socket) {
            this.socket.emit('getGroupRoutes');
        }
    }

    saveRoute() {
        const name = document.getElementById('routeName').value.trim();
        const description = document.getElementById('routeDesc').value.trim();
        const type = document.getElementById('routeType').value;
        const maxParticipants = parseInt(document.getElementById('maxParticipants').value);
        
        if (!name) {
            this.showNotification('Введите название маршрута', 'error');
            return;
        }
        
        const routeData = {
            name,
            description,
            type,
            maxParticipants,
            createdBy: this.userName
        };
        
        if (this.socket) {
            this.socket.emit('createGroupRoute', routeData);
        }
        
        this.hideModal('routeModal');
        this.clearRouteForm();
    }

    updateRoutesList(routes) {
        const routesList = document.getElementById('routesList');
        routesList.innerHTML = '';
        
        routes.forEach(route => {
            const routeElement = this.createRouteElement(route);
            routesList.appendChild(routeElement);
        });
    }

    createRouteElement(route) {
        const div = document.createElement('div');
        div.className = `route-item ${route.id === this.activeRoute?.id ? 'active' : ''}`;
        div.onclick = () => this.selectRoute(route);
        
        div.innerHTML = `
            <h5>${this.escapeHtml(route.name)}</h5>
            <p>${this.escapeHtml(route.description)}</p>
            <div class="participants">
                👥 ${route.participants?.length || 0}/${route.maxParticipants}
            </div>
        `;
        
        return div;
    }

    selectRoute(route) {
        this.activeRoute = route;
        
        if (this.socket) {
            this.socket.emit('joinGroupRoute', { routeId: route.id });
        }
        
        this.displayRoute(route);
        this.updateRoutesList([route]); // Обновить активный статус
        this.showNotification(`Присоединились к маршруту: ${route.name}`, 'success');
    }

    displayRoute(route) {
        // Очистка предыдущего маршрута
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }
        
        if (route.waypoints && route.waypoints.length > 1) {
            this.routingControl = L.Routing.control({
                waypoints: route.waypoints.map(wp => L.latLng(wp.lat, wp.lng)),
                routeWhileDragging: false,
                addWaypoints: false,
                createMarker: function() { return null; } // Не создавать маркеры
            }).addTo(this.map);
        }
    }

    createRouteToUser(userId) {
        const userMarker = this.userMarkers.get(userId);
        if (!userMarker || !this.userMarker) {
            this.showNotification('Не удается построить маршрут', 'error');
            return;
        }
        
        const userPosition = userMarker.getLatLng();
        const myPosition = this.userMarker.getLatLng();
        
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }
        
        this.routingControl = L.Routing.control({
            waypoints: [myPosition, userPosition],
            routeWhileDragging: false,
            addWaypoints: false
        }).addTo(this.map);
        
        this.showNotification('Маршрут построен', 'success');
    }

    onRouteCreated(route) {
        this.showNotification(`Создан новый маршрут: ${route.name}`, 'success');
        if (this.socket) {
            this.socket.emit('getGroupRoutes');
        }
    }

    onRouteJoined(data) {
        this.showNotification(`${data.userName} присоединился к маршруту`, 'info');
    }

    onRouteLeft(data) {
        this.showNotification(`${data.userName} покинул маршрут`, 'info');
    }

    onRouteWaypointAdded(data) {
        if (this.activeRoute && this.activeRoute.id === data.routeId) {
            this.activeRoute.waypoints.push(data.waypoint);
            this.displayRoute(this.activeRoute);
        }
    }

    clearRouteForm() {
        document.getElementById('routeName').value = '';
        document.getElementById('routeDesc').value = '';
        document.getElementById('routeType').value = 'public';
        document.getElementById('maxParticipants').value = '10';
    }

    // Утилиты
    showModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
    }

    hideModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notification.onclick = () => notification.remove();
        
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
let adventureSync;

document.addEventListener('DOMContentLoaded', () => {
    adventureSync = new AdventureSync();
});

// Глобальные функции для обратной совместимости
window.adventureSync = {
    openPrivateChat: (userId, userName) => adventureSync.openPrivateChat(userId, userName),
    createRouteToUser: (userId) => adventureSync.createRouteToUser(userId),
    deleteMarker: (markerId) => adventureSync.deleteMarker(markerId)
};
