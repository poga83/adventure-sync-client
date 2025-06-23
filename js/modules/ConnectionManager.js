class ConnectionManager {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.isOffline = !navigator.onLine;
        this.offlineQueue = [];
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = 5;
        this.reconnectDelay = 1000;
        this.setupConnectionListeners();
    }

    connect() {
        if (this.socket && this.socket.connected) {
            console.log('✅ Уже подключен к серверу');
            this.updateConnectionStatus('connected');
            return true;
        }

        console.log('🔄 Попытка подключения к серверу...');
        this.updateConnectionStatus('connecting');

        try {
            // ИСПРАВЛЕНО: Улучшенная конфигурация Socket.IO
            this.socket = io(CONFIG.SERVER_URL, {
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: true,
                reconnectionAttempts: this.maxConnectionAttempts,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: 5000,
                forceNew: false,
                autoConnect: true,
                withCredentials: true,
                extraHeaders: {
                    'Access-Control-Allow-Origin': window.location.origin
                }
            });
            
            this.setupSocketEvents();
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка при создании Socket.IO соединения:', error);
            this.handleConnectionError(error);
            return false;
        }
    }

    setupSocketEvents() {
        // Успешное подключение
        this.socket.on('connect', () => {
            console.log('✅ Подключен к серверу, ID:', this.socket.id);
            this.connectionAttempts = 0;
            this.updateConnectionStatus('connected');
            this.app.notificationManager.showNotification('Подключено к серверу', 'success');
            
            // Отправляем информацию о пользователе
            const userData = this.getUserData();
            if (userData) {
                console.log('📤 Отправляем данные пользователя:', userData);
                this.socket.emit('userConnected', userData);
                this.socket.emit('getUsers');
                this.socket.emit('getGroupChatHistory');
            }
            
            // Синхронизируем оффлайн изменения
            this.syncOfflineChanges();
        });
        
        // Отключение
        this.socket.on('disconnect', (reason) => {
            console.log('❌ Отключен от сервера:', reason);
            this.updateConnectionStatus('disconnected');
            this.app.notificationManager.showNotification(`Отключено: ${reason}`, 'error');
        });

        // ИСПРАВЛЕНО: Детальная обработка ошибок подключения
        this.socket.on('connect_error', (error) => {
            console.error('❌ Ошибка подключения:', error);
            this.connectionAttempts++;
            
            let errorMessage = 'Ошибка подключения';
            
            // Определяем тип ошибки по коду или сообщению
            if (error.message.includes('timeout')) {
                errorMessage = 'Превышено время ожидания';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'Ошибка CORS';
            } else if (error.message.includes('404')) {
                errorMessage = 'Сервер не найден (404)';
            } else if (error.message.includes('xhr poll error')) {
                errorMessage = 'Ошибка XHR polling';
            }
            
            if (this.connectionAttempts >= this.maxConnectionAttempts) {
                this.handleConnectionError(error);
            } else {
                this.updateConnectionStatus('connecting');
                this.app.notificationManager.showNotification(
                    `${errorMessage} (${this.connectionAttempts}/${this.maxConnectionAttempts})`, 
                    'warning'
                );
            }
        });

        // Принудительное отключение
        this.socket.on('disconnect', (reason) => {
            if (reason === 'io server disconnect') {
                // Сервер принудительно отключил клиента
                this.socket.connect();
            }
        });
        
        // Обработчики событий от сервера
        this.socket.on('users', (users) => {
            console.log('📥 Получен список пользователей:', users.length);
            this.app.markerManager.updateUsers(users);
        });
        
        this.socket.on('userConnected', (user) => {
            console.log('👤 Пользователь подключился:', user.name);
            this.app.markerManager.addOrUpdateUser(user);
            this.app.notificationManager.showNotification(`${user.name} онлайн`);
        });
        
        this.socket.on('userDisconnected', (userId) => {
            console.log('👤 Пользователь отключился:', userId);
            const user = this.app.markerManager.getUser(userId);
            if (user) {
                this.app.notificationManager.showNotification(`${user.name} оффлайн`);
                this.app.markerManager.removeUser(userId);
            }
        });
        
        this.socket.on('userStatusChanged', (data) => {
            console.log('🔄 Статус пользователя изменен:', data);
            this.app.markerManager.updateUserStatus(data.userId, data.status);
        });
        
        this.socket.on('userPositionChanged', (data) => {
            this.app.markerManager.updateUserPosition(data.userId, data.position);
        });
        
        this.socket.on('groupMessage', (message) => {
            console.log('💬 Получено сообщение в общем чате:', message);
            this.app.chatManager.addGroupMessage(message);
        });
        
        this.socket.on('privateMessage', (message) => {
            console.log('💬 Получено приватное сообщение:', message);
            this.app.chatManager.addPrivateMessage(message);
        });
        
        this.socket.on('groupChatHistory', (messages) => {
            console.log('📋 Получена история группового чата:', messages.length);
            this.app.chatManager.setGroupChatHistory(messages);
        });
        
        this.socket.on('privateChatHistory', (data) => {
            console.log('📋 Получена история приватного чата:', data);
            this.app.chatManager.setPrivateChatHistory(data.userId, data.messages);
        });

        // Обработка общих ошибок
        this.socket.on('error', (error) => {
            console.error('❌ Ошибка Socket.IO:', error);
            this.app.notificationManager.showNotification('Ошибка соединения', 'error');
        });
    }

    handleConnectionError(error) {
        console.error('❌ Критическая ошибка подключения:', error);
        this.updateConnectionStatus('offline');
        
        let errorMessage = 'Не удалось подключиться к серверу.';
        let suggestions = [];
        
        if (error.message.includes('ECONNREFUSED')) {
            suggestions.push('Убедитесь, что сервер запущен на порту 3000');
        }
        if (error.message.includes('CORS')) {
            suggestions.push('Проверьте CORS настройки сервера');
        }
        
        this.app.notificationManager.showNotification(
            `${errorMessage} ${suggestions.join('. ')}`, 
            'error'
        );
        
        // Переводим в оффлайн режим
        this.handleDisconnection();
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            const iconElement = statusElement.querySelector('i');
            const textElement = statusElement.querySelector('span');
            
            statusElement.className = `connection-status ${status}`;
            
            switch (status) {
                case 'connected':
                    iconElement.className = 'fas fa-wifi';
                    textElement.textContent = 'Онлайн';
                    statusElement.style.opacity = '0.8';
                    setTimeout(() => {
                        if (status === 'connected') {
                            statusElement.style.opacity = '0.5';
                        }
                    }, 3000);
                    break;
                case 'disconnected':
                    iconElement.className = 'fas fa-exclamation-triangle';
                    textElement.textContent = 'Переподключение...';
                    statusElement.style.opacity = '1';
                    break;
                case 'connecting':
                    iconElement.className = 'fas fa-spinner fa-spin';
                    textElement.textContent = 'Подключение...';
                    statusElement.style.opacity = '1';
                    break;
                case 'offline':
                    iconElement.className = 'fas fa-times-circle';
                    textElement.textContent = 'Оффлайн';
                    statusElement.style.opacity = '1';
                    break;
            }
        }
    }
    
    // Тестирование подключения к серверу
    async testConnection() {
        try {
            const response = await fetch(`${CONFIG.SERVER_URL}/api/status`);
            if (response.ok) {
                const data = await response.json();
                console.log('✅ Сервер доступен:', data);
                return true;
            }
        } catch (error) {
            console.error('❌ Сервер недоступен:', error);
        }
        return false;
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 Соединение с сервером закрыто');
        }
    }
    
    getUserData() {
        if (this.app.authManager && this.app.authManager.currentUser) {
            return this.app.authManager.currentUser;
        }
        
        const userData = localStorage.getItem(CONFIG.CACHE.USER_KEY);
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                console.error('❌ Ошибка при чтении данных пользователя:', e);
            }
        }
        return null;
    }
    
    // Остальные методы остаются без изменений...
    updateUserStatus(status) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updateStatus', status);
        } else {
            this.offlineQueue.push({ type: 'updateStatus', data: status });
        }
    }
    
    updateUserPosition(position) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updatePosition', position);
        } else {
            this.offlineQueue.push({ type: 'updatePosition', data: position });
        }
    }
    
    sendGroupMessage(message) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('groupMessage', message);
            return true;
        } else {
            this.offlineQueue.push({ type: 'groupMessage', data: message });
            return false;
        }
    }
    
    sendPrivateMessage(userId, message) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('privateMessage', { to: userId, content: message });
            return true;
        } else {
            this.offlineQueue.push({ type: 'privateMessage', data: { to: userId, content: message } });
            return false;
        }
    }
    
    requestPrivateChatHistory(userId) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('getPrivateChatHistory', userId);
        }
    }
    
    setupConnectionListeners() {
        window.addEventListener('online', () => {
            this.isOffline = false;
            this.handleReconnection();
        });
        
        window.addEventListener('offline', () => {
            this.isOffline = true;
            this.handleDisconnection();
        });
    }
    
    handleDisconnection() {
        this.isOffline = true;
        this.updateConnectionStatus('offline');
        
        document.querySelectorAll('.requires-online').forEach(el => {
            el.classList.add('disabled');
        });
    }
    
    handleReconnection() {
        if (this.isOffline) {
            this.isOffline = false;
            this.app.notificationManager.showNotification('Соединение восстановлено');
            
            document.querySelectorAll('.requires-online').forEach(el => {
                el.classList.remove('disabled');
            });
            
            if (!this.socket || !this.socket.connected) {
                this.connect();
            }
        }
    }
    
    syncOfflineChanges() {
        if (this.offlineQueue.length > 0 && this.socket && this.socket.connected) {
            this.app.notificationManager.showNotification('Синхронизация данных...');
            
            this.offlineQueue.forEach(item => {
                switch (item.type) {
                    case 'updateStatus':
                        this.socket.emit('updateStatus', item.data);
                        break;
                    case 'updatePosition':
                        this.socket.emit('updatePosition', item.data);
                        break;
                    case 'groupMessage':
                        this.socket.emit('groupMessage', item.data);
                        break;
                    case 'privateMessage':
                        this.socket.emit('privateMessage', item.data);
                        break;
                }
            });
            
            this.offlineQueue = [];
            this.app.notificationManager.showNotification('Синхронизация завершена');
        }
    }
}
