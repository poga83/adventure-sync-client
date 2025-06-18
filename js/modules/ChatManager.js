class ChatManager {
    constructor(app) {
        this.app = app;
        this.groupMessages = [];
        this.privateMessages = new Map();
        this.chatPartner = null;
    }
    
    initialize() {
        document.getElementById('sendGroupBtn').addEventListener('click', () => {
            this.sendGroupMessage();
        });
        
        document.getElementById('groupInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendGroupMessage();
            }
        });
        
        document.getElementById('sendPrivateBtn').addEventListener('click', () => {
            this.sendPrivateMessage();
        });
        
        document.getElementById('privateInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendPrivateMessage();
            }
        });
        
        this.restoreFromCache();
    }
    
    restoreFromCache() {
        const cachedMessages = localStorage.getItem(CONFIG.CACHE.MESSAGES_KEY);
        if (cachedMessages) {
            try {
                const messages = JSON.parse(cachedMessages);
                
                if (messages.group) {
                    this.setGroupChatHistory(messages.group);
                }
                
                if (messages.private) {
                    Object.keys(messages.private).forEach(userId => {
                        this.privateMessages.set(userId, messages.private[userId]);
                    });
                }
            } catch (e) {
                console.error('Ошибка загрузки кэшированных сообщений:', e);
            }
        }
    }
    
    updateCache() {
        const privateMessagesObj = {};
        this.privateMessages.forEach((messages, userId) => {
            privateMessagesObj[userId] = messages;
        });
        
        const messages = {
            group: this.groupMessages,
            private: privateMessagesObj
        };
        
        localStorage.setItem(CONFIG.CACHE.MESSAGES_KEY, JSON.stringify(messages));
    }
    
    sendGroupMessage() {
        const input = document.getElementById('groupInput');
        const message = input.value.trim();
        
        if (message) {
            const userData = this.app.connectionManager.getUserData();
            
            const messageObj = {
                senderId: userData.id,
                senderName: userData.name,
                content: message,
                timestamp: new Date().toISOString()
            };
            
            const sent = this.app.connectionManager.sendGroupMessage(messageObj);
            this.addGroupMessage(messageObj);
            input.value = '';
            
            if (!sent) {
                this.app.notificationManager.showNotification('Сообщение будет отправлено при восстановлении соединения', 'warning');
            }
        }
    }
    
    sendPrivateMessage() {
        if (!this.chatPartner) return;
        
        const input = document.getElementById('privateInput');
        const message = input.value.trim();
        
        if (message) {
            const userData = this.app.connectionManager.getUserData();
            
            const messageObj = {
                senderId: userData.id,
                senderName: userData.name,
                recipientId: this.chatPartner,
                content: message,
                timestamp: new Date().toISOString()
            };
            
            const sent = this.app.connectionManager.sendPrivateMessage(this.chatPartner, messageObj);
            this.addPrivateMessage(messageObj);
            input.value = '';
            
            if (!sent) {
                this.app.notificationManager.showNotification('Сообщение будет отправлено при восстановлении соединения', 'warning');
            }
        }
    }
    
    addGroupMessage(message) {
        this.groupMessages.push(message);
        this.renderGroupMessages();
        this.updateCache();
    }
    
    addPrivateMessage(message) {
        const userData = this.app.connectionManager.getUserData();
        const partnerId = message.senderId === userData.id ? message.recipientId : message.senderId;
        
        if (!this.privateMessages.has(partnerId)) {
            this.privateMessages.set(partnerId, []);
        }
        
        this.privateMessages.get(partnerId).push(message);
        
        if (this.chatPartner === partnerId) {
            this.renderPrivateMessages();
        } else {
            const partner = this.app.markerManager.getUser(partnerId);
            if (partner) {
                this.app.notificationManager.showNotification(`Новое сообщение от ${partner.name}`);
            }
        }
        
        this.updateCache();
    }
    
    setGroupChatHistory(messages) {
        this.groupMessages = messages;
        this.renderGroupMessages();
        this.updateCache();
    }
    
    setPrivateChatHistory(userId, messages) {
        this.privateMessages.set(userId, messages);
        
        if (this.chatPartner === userId) {
            this.renderPrivateMessages();
        }
        
        this.updateCache();
    }
    
    openPrivateChat(userId, userName) {
        this.chatPartner = userId;
        document.getElementById('chatUserName').textContent = userName;
        document.getElementById('privateChat').style.display = 'flex';
        
        this.app.connectionManager.requestPrivateChatHistory(userId);
        this.renderPrivateMessages();
    }
    
    renderGroupMessages() {
        const container = document.getElementById('groupMessages');
        container.innerHTML = '';
        
        this.groupMessages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    renderPrivateMessages() {
        const container = document.getElementById('privateMessages');
        container.innerHTML = '';
        
        if (this.chatPartner && this.privateMessages.has(this.chatPartner)) {
            const messages = this.privateMessages.get(this.chatPartner);
            
            messages.forEach(message => {
                const messageElement = this.createMessageElement(message);
                container.appendChild(messageElement);
            });
        }
        
        container.scrollTop = container.scrollHeight;
    }
    
    createMessageElement(message) {
        const userData = this.app.connectionManager.getUserData();
        const isSelf = message.senderId === userData.id;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSelf ? 'self' : 'other'}`;
        
        const senderDiv = document.createElement('div');
        senderDiv.className = 'sender';
        senderDiv.textContent = isSelf ? 'Вы' : message.senderName;
        
        const contentDiv = document.createElement('div');
        contentDiv.textContent = message.content;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time';
        timeDiv.textContent = this.formatTimestamp(message.timestamp);
        
        messageDiv.appendChild(senderDiv);
        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timeDiv);
        
        return messageDiv;
    }
    
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}
