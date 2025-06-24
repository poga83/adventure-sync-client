class ChatManager {
    constructor(app) {
        this.app = app;
        this.groupMessages = [];
        this.privateMessages = new Map();
        this.isInitialized = false;
    }
    
    initialize() {
        console.log('💬 Инициализация ChatManager...');
        
        try {
            // Проверяем наличие необходимых элементов
            if (!document.getElementById('messagesList')) {
                console.error('❌ Элемент messagesList не найден');
                return false;
            }
            
            if (!document.getElementById('privateMessagesList')) {
                console.error('❌ Элемент privateMessagesList не найден');
                return false;
            }
            
            // Загружаем историю из локального хранилища
            this.loadFromCache();
            
            // Настраиваем обработчики событий
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ ChatManager инициализирован успешно');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации ChatManager:', error);
            this.app.notificationManager.showNotification('Ошибка инициализации чата', 'error');
            return false;
        }
    }
    
    setupEventListeners() {
        // Обработчики уже настроены в UIManager, здесь только дополнительные
        console.log('🎛️ Настройка обработчиков событий чата...');
    }
    
    loadFromCache() {
        try {
            // Загружаем групповые сообщения
            const cachedGroupMessages = localStorage.getItem(CONFIG.CACHE.MESSAGES_KEY + '_group');
            if (cachedGroupMessages) {
                this.groupMessages = JSON.parse(cachedGroupMessages);
                console.log(`📋 Загружено ${this.groupMessages.length} групповых сообщений из кэша`);
            }
            
            // Загружаем приватные сообщения
            const cachedPrivateMessages = localStorage.getItem(CONFIG.CACHE.MESSAGES_KEY + '_private');
            if (cachedPrivateMessages) {
                const privateData = JSON.parse(cachedPrivateMessages);
                this.privateMessages = new Map(privateData);
                console.log(`📋 Загружены приватные сообщения из кэша`);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки сообщений из кэша:', error);
        }
    }
    
    saveToCache() {
        try {
            // Сохраняем групповые сообщения
            localStorage.setItem(CONFIG.CACHE.MESSAGES_KEY + '_group', JSON.stringify(this.groupMessages));
            
            // Сохраняем приватные сообщения
            const privateData = Array.from(this.privateMessages.entries());
            localStorage.setItem(CONFIG.CACHE.MESSAGES_KEY + '_private', JSON.stringify(privateData));
            
        } catch (error) {
            console.error('❌ Ошибка сохранения сообщений в кэш:', error);
        }
    }
    
    addGroupMessage(message) {
        if (!this.isInitialized) {
            console.warn('⚠️ ChatManager не инициализирован');
            return;
        }
        
        try {
            this.groupMessages.push(message);
            
            // Ограничиваем количество сообщений
            if (this.groupMessages.length > 1000) {
                this.groupMessages = this.groupMessages.slice(-1000);
            }
            
            // Отображаем сообщение в UI
            if (this.app.uiManager) {
                this.app.uiManager.addMessageToChat(message, false);
            }
            
            // Сохраняем в кэш
            this.saveToCache();
            
        } catch (error) {
            console.error('❌ Ошибка добавления группового сообщения:', error);
        }
    }
    
    addPrivateMessage(message) {
        if (!this.isInitialized) {
            console.warn('⚠️ ChatManager не инициализирован');
            return;
        }
        
        try {
            const currentUserId = this.app.authManager.getCurrentUser().id;
            const otherUserId = message.senderId === currentUserId ? message.recipientId : message.senderId;
            
            if (!this.privateMessages.has(otherUserId)) {
                this.privateMessages.set(otherUserId, []);
            }
            
            this.privateMessages.get(otherUserId).push(message);
            
            // Ограничиваем количество сообщений
            const messages = this.privateMessages.get(otherUserId);
            if (messages.length > 100) {
                this.privateMessages.set(otherUserId, messages.slice(-100));
            }
            
            // Отображаем сообщение в UI (если чат открыт)
            if (this.app.uiManager && this.app.uiManager.currentPrivateChat && 
                this.app.uiManager.currentPrivateChat.userId === otherUserId) {
                this.app.uiManager.addMessageToChat(message, true);
            }
            
            // Сохраняем в кэш
            this.saveToCache();
            
            // Показываем уведомление если чат не открыт
            if (!this.app.uiManager.currentPrivateChat || 
                this.app.uiManager.currentPrivateChat.userId !== otherUserId) {
                this.app.notificationManager.showNotification(
                    `Новое сообщение от ${message.senderName}`, 'info'
                );
            }
            
        } catch (error) {
            console.error('❌ Ошибка добавления приватного сообщения:', error);
        }
    }
    
    setGroupChatHistory(messages) {
        if (!this.isInitialized) {
            console.warn('⚠️ ChatManager не инициализирован');
            return;
        }
        
        try {
            this.groupMessages = messages || [];
            
            // Очищаем чат и отображаем историю
            if (this.app.uiManager) {
                this.app.uiManager.clearChat(false);
                this.groupMessages.forEach(message => {
                    this.app.uiManager.addMessageToChat(message, false);
                });
            }
            
            this.saveToCache();
            
        } catch (error) {
            console.error('❌ Ошибка установки истории группового чата:', error);
        }
    }
    
    setPrivateChatHistory(userId, messages) {
        if (!this.isInitialized) {
            console.warn('⚠️ ChatManager не инициализирован');
            return;
        }
        
        try {
            this.privateMessages.set(userId, messages || []);
            
            // Если это текущий приватный чат, отображаем историю
            if (this.app.uiManager && this.app.uiManager.currentPrivateChat && 
                this.app.uiManager.currentPrivateChat.userId === userId) {
                this.app.uiManager.clearChat(true);
                messages.forEach(message => {
                    this.app.uiManager.addMessageToChat(message, true);
                });
            }
            
            this.saveToCache();
            
        } catch (error) {
            console.error('❌ Ошибка установки истории приватного чата:', error);
        }
    }
    
    getPrivateMessages(userId) {
        return this.privateMessages.get(userId) || [];
    }
    
    clearAllMessages() {
        this.groupMessages = [];
        this.privateMessages.clear();
        this.saveToCache();
        
        if (this.app.uiManager) {
            this.app.uiManager.clearChat(false);
            this.app.uiManager.clearChat(true);
        }
        
        console.log('🗑️ Все сообщения очищены');
    }
}
