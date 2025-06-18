class ConnectionManager {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.isOffline = !navigator.onLine;
        this.offlineQueue = [];
        this.setupConnectionListeners();
    }

    connect() {
        try {
            this.socket = io(CONFIG.SERVER_URL);
            
            this.socket.on('connect', () => {
                this.handleReconnection();
                this.app.notificationManager.showNotification('Подключено к серверу');
                
                const userData = this.getUserData();
                this.socket.emit('userConnected', userData);
                this.socket.emit('getUsers');
                this.socket.emit('getGroupChatHistory');
            });
            
            this.socket.on('disconnect', () => {
                this.handleDisconnection();
                this.app.notificationManager.showNotification('Отключено от сервера', 'error');
            });
            
            this.socket.on('users', (users) => {
                this.app.markerManager.updateUsers(users);
            });
            
            this.socket.on('userConnected', (user) => {
                this.app.markerManager.addOrUpdateUser(user);
                this.app.notificationManager.showNotification(`${user.name} онлайн`);
            });
            
            this.socket.on('userDisconnected', (userId) => {
                const user = this.app.markerManager.getUser(userId);
                if (user) {
                    this.app.notificationManager.showNotification(`${user.name} оффлайн`);
                    this.app.markerManager.removeUser(userId);
                }
            });
            
            this.socket.on('userStatusChanged', (data) => {
                this.app.markerManager.updateUserStatus(data.userId, data.status);
            });
            
            this.socket.on('userPositionChanged', (data) => {
                this.app.markerManager.updateUserPosition(data.userId, data.position);
            });
            
            this.socket.on('groupMessage', (message) => {
                this.app.chatManager.addGroupMessage(message);
            });
            
            this.socket.on('privateMessage', (message) => {
                this.app.chatManager.addPrivateMessage(message);
            });
            
            this.socket.on('groupChatHistory', (messages) => {
                this.app.chatManager.setGroupChatHistory(messages);
            });
            
            this.socket.on('privateChatHistory', (data) => {
                this.app.chatManager.setPrivateChatHistory(data.userId, data.messages);
            });
            
            return true;
        } catch (error) {
            console.error('Ошибка подключения:', error);
            this.handleDisconnection();
            return false;
        }
    }
    
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
    
    getUserData() {
        let userData = localStorage.getItem(CONFIG.CACHE.USER_KEY);
        
        if (userData) {
            try {
                return JSON.parse(userData);
            } catch (e) {
                console.error('Ошибка при чтении данных пользователя:', e);
            }
        }
        
        const newUser = {
            id: this.generateUserId(),
            name: 'Пользователь ' + Math.floor(Math.random() * 1000),
            status: CONFIG.STATUSES.AVAILABLE,
            position: CONFIG.MAP.DEFAULT_CENTER
        };
        
        localStorage.setItem(CONFIG.CACHE.USER_KEY, JSON.stringify(newUser));
        return newUser;
    }
    
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    updateUserStatus(status) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updateStatus', status);
        } else {
            this.offlineQueue.push({
                type: 'updateStatus',
                data: status
            });
        }
        
        const userData = this.getUserData();
        userData.status = status;
        localStorage.setItem(CONFIG.CACHE.USER_KEY, JSON.stringify(userData));
    }
    
    updateUserPosition(position) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('updatePosition', position);
        } else {
            this.offlineQueue.push({
                type: 'updatePosition',
                data: position
            });
        }
        
        const userData = this.getUserData();
        userData.position = position;
        localStorage.setItem(CONFIG.CACHE.USER_KEY, JSON.stringify(userData));
    }
    
    sendGroupMessage(message) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('groupMessage', message);
            return true;
        } else {
            this.offlineQueue.push({
                type: 'groupMessage',
                data: message
            });
            return false;
        }
    }
    
    sendPrivateMessage(userId, message) {
        if (this.socket && this.socket.connected) {
            this.socket.emit('privateMessage', { to: userId, content: message });
            return true;
        } else {
            this.offlineQueue.push({
                type: 'privateMessage',
                data: { to: userId, content: message }
            });
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
        this.app.notificationManager.showNotification('Потеряно соединение с сервером', 'error');
        
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
            
            this.syncOfflineChanges();
            
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
