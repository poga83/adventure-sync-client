class ConnectionManager {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.isOffline = !navigator.onLine;
        this.offlineQueue = [];
        this.connectionAttempts = 0;
        this.maxConnectionAttempts = CONFIG.SOCKET.RECONNECTION_ATTEMPTS;
        this.reconnectDelay = CONFIG.SOCKET.RECONNECTION_DELAY;
        this.setupConnectionListeners();
    }

    async connect() {
        if (this.socket && this.socket.connected) {
            console.log('✅ Уже подключен к серверу');
            this.updateConnectionStatus('connected');
            return true;
        }

        console.log('🔄 Тестирование подключения к Render серверу...');
        
        // ИСПРАВЛЕНО: Тестируем HTTPS соединение
        const serverAvailable = await CONFIG.testServerConnection();
        if (!serverAvailable) {
            console.error('❌ Сервер Render недоступен');
            this.handleConnectionError(new Error('Сервер Adventure Sync на Render недоступен'));
            return false;
        }

        console.log(`🔄 Подключение к серверу: ${CONFIG.SERVER_URL}`);
        this.updateConnectionStatus('connecting');

        try {
            // ИСПРАВЛЕНО: Конфигурация для HTTPS Render сервера
            this.socket = io(CONFIG.SERVER_URL, {
                transports: ['websocket', 'polling'],
                timeout: CONFIG.SOCKET.TIMEOUT,
                reconnection: true,
                reconnectionAttempts: this.maxConnectionAttempts,
                reconnectionDelay: this.reconnectDelay,
                reconnectionDelayMax: 10000,
                randomizationFactor: 0.5,
                forceNew: CONFIG.SOCKET.FORCE_NEW,
                autoConnect: true,
                secure: CONFIG.SOCKET.SECURE, // Для HTTPS
                upgrade: CONFIG.SOCKET.UPGRADE,
                rememberUpgrade: true,
                pingTimeout: CONFIG.SOCKET.PING_TIMEOUT,
                pingInterval: CONFIG.SOCKET.PING_INTERVAL,
                withCredentials: true,
                extraHeaders: {
                    'Access-Control-Allow-Origin': window.location.origin,
                    'Access-Control-Allow-Credentials': 'true'
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
        // Подтверждение подключения
        this.socket.on('connectionConfirmed', (data) => {
            console.log('✅ Подтверждение подключения от Render сервера:', data);
        });

        // Успешное подключение
        this.socket.on('connect', () => {
            console.log('✅ Подключен к Render серверу, ID:', this.socket.id);
            console.log('🔗 Транспорт:', this.socket.io.engine.transport.name);
            console.log('🌐 URL:', CONFIG.SERVER_URL);
            
            this.connectionAttempts = 0;
            this.updateConnectionStatus('connected');
            this.app.notificationManager.showNotification('Подключено к серверу Adventure Sync', 'success');
            
            const userData = this.getUserData();
            if (userData) {
                console.log('📤 Отправляем данные пользователя на сервер...');
                this.socket.emit('userConnected', userData);
                this.socket.emit('getUsers');
                this.socket.emit('getGroupChatHistory');
            }
            
            this.syncOfflineChanges();
        });
        
        // Изменение транспорта
        this.socket.io.on('upgrade', () => {
            console.log('🔄 Обновление транспорта на:', this.socket.io.engine.transport.name);
        });
        
        // Отключение
        this.socket.on('disconnect', (reason) => {
            console.log('❌ Отключен от Render сервера:', reason);
            this.updateConnectionStatus('disconnected');
            
            let message = 'Отключено от сервера';
            if (reason === 'io server disconnect') {
                message = 'Сервер разорвал соединение';
            } else if (reason === 'transport close') {
                message = 'Потеря соединения с сервером';
            } else if (reason === 'ping timeout') {
                message = 'Превышено время ожидания ответа сервера';
            }
            
            this.app.notificationManager.showNotification(message, 'error');
        });

        // ИСПРАВЛЕНО: Расширенная обработка ошибок для Render
        this.socket.on('connect_error', (error) => {
            console.error('❌ Ошибка подключения к Render:', error);
            this.connectionAttempts++;
            
            let errorMessage = 'Ошибка подключения к серверу Adventure Sync';
            let errorDetails = '';
            
            if (error.message) {
                if (error.message.includes('timeout')) {
                    errorMessage = 'Превышено время ожидания подключения к Render';
                    errorDetails = 'Сервер может быть в режиме "сна" - повторите попытку';
                } else if (error.message.includes('CORS')) {
                    errorMessage = 'Ошибка CORS политики';
                    errorDetails = 'Проблема с настройками безопасности сервера';
                } else if (error.message.includes('404')) {
                    errorMessage = 'Сервер на Render не найден';
                    errorDetails = 'Проверьте правильность URL сервера';
                } else if (error.message.includes('503')) {
                    errorMessage = 'Сервер Render временно недоступен';
                    errorDetails = 'Попробуйте подключиться через несколько минут';
                } else if (error.message.includes('polling')) {
                    errorMessage = 'Ошибка polling транспорта';
                    errorDetails = 'Проблема с fallback соединением';
                }
            }
            
            if (this.connectionAttempts >= this.maxConnectionAttempts) {
                console.error(`❌ Исчерпаны попытки подключения к Render (${this.maxConnectionAttempts})`);
                this.handleConnectionError(error);
            } else {
                this.updateConnectionStatus('connecting');
                const attemptMessage = `${errorMessage} (${this.connectionAttempts}/${this.maxConnectionAttempts})`;
                this.app.notificationManager.showNotification(attemptMessage, 'warning');
                
                if (errorDetails) {
                    console.warn(`💡 Рекомендация: ${errorDetails}`);
                }
            }
        });

        // Обработчики событий от сервера
        this.socket.on('users', (users) => {
            console.log('📥 Получен список пользователей с сервера:', users.length);
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
        
        // ИСПРАВЛЕНО: Правильная обработка изменения статуса
        this.socket.on('userStatusChanged', (data) => {
            console.log('🔄 Получено изменение статуса пользователя:', data);
            if (data.userId && data.status) {
                this.app.markerManager.updateUserStatus(data.userId, data.status);
            }
        });
        
        this.socket.on('userPositionChanged', (data) => {
            if (data.userId && data.position) {
                this.app.markerManager.updateUserPosition(data.userId, data.position);
            }
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

        this.socket.on('error', (error) => {
            console.error('❌ Ошибка Socket.IO:', error);
            this.app.notificationManager.showNotification(`Ошибка соединения: ${error.message || 'Неизвестная ошибка'}`, 'error');
        });
    }

    handleConnectionError(error) {
        console.error('❌ Критическая ошибка подключения к Render:', error);
        this.updateConnectionStatus('offline');
        
        let errorMessage = 'Не удалось подключиться к серверу Adventure Sync на Render.';
        let suggestions = [];
        
        if (error.message && error.message.includes('timeout')) {
            suggestions.push('Сервер может находиться в режиме "сна" - подождите 1-2 минуты');
            suggestions.push('Render бесплатные сервисы засыпают при отсутствии активности');
        } else if (error.message && error.message.includes('503')) {
            suggestions.push('Сервер Render временно недоступен');
            suggestions.push('Проверьте статус Render на https://status.render.com');
        } else {
            suggestions.push('Проверьте подключение к интернету');
            suggestions.push('Возможно, сервер перезапускается');
        }
        
        const fullMessage = suggestions.length > 0 
            ? `${errorMessage}\n\nРекомендации:\n• ${suggestions.join('\n• ')}`
            : errorMessage;
            
        this.app.notificationManager.showNotification(fullMessage, 'error');
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
                    textElement.textContent = 'Подключен к Render';
                    statusElement.style.opacity = '0.8';
                    setTimeout(() => {
                        if (statusElement.classList.contains('connected')) {
                            statusElement.style.opacity = '0.4';
                        }
                    }, 5000);
                    break;
                case 'disconnected':
                    iconElement.className = 'fas fa-exclamation-triangle';
                    textElement.textContent = 'Переподключение к Render...';
                    statusElement.style.opacity = '1';
                    break;
                case 'connecting':
                    iconElement.className = 'fas fa-spinner fa-spin';
                    textElement.textContent = 'Подключение к Render...';
                    statusElement.style.opacity = '1';
                    break;
                case 'offline':
                    iconElement.className = 'fas fa-times-circle';
                    textElement.textContent = 'Оффлайн режим';
                    statusElement.style.opacity = '1';
                    break;
            }
        }
    }
    
    // Остальные методы остаются без изменений...
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 Соединение с Render сервером закрыто');
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
    
    // ИСПРАВЛЕНО: Методы для отправки данных с проверкой соединения
    updateUserStatus(status) {
        console.log('📤 Отправляем обновление статуса:', status);
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
            this.app.notificationManager.showNotification('Соединение с интернетом восстановлено');
            
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
            console.log(`🔄 Синхронизация ${this.offlineQueue.length} оффлайн изменений...`);
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
            this.app.notificationManager.showNotification('Синхронизация завершена', 'success');
        }
    }
}
