class ChatManager {
    constructor() {
        this.groupMessages = [];
        this.privateMessages = new Map(); // userId -> messages[]
        this.maxGroupMessages = 1000;
        this.maxPrivateMessages = 100;
    }
    
    addGroupMessage(message) {
        this.groupMessages.push({
            ...message,
            type: 'group'
        });
        
        // Ограничиваем количество сообщений
        if (this.groupMessages.length > this.maxGroupMessages) {
            this.groupMessages = this.groupMessages.slice(-this.maxGroupMessages);
        }
        
        console.log(`💬 Добавлено групповое сообщение от ${message.senderName}`);
    }
    
    addPrivateMessage(userId, message) {
        if (!this.privateMessages.has(userId)) {
            this.privateMessages.set(userId, []);
        }
        
        const userMessages = this.privateMessages.get(userId);
        userMessages.push({
            ...message,
            type: 'private'
        });
        
        // Ограничиваем количество сообщений
        if (userMessages.length > this.maxPrivateMessages) {
            this.privateMessages.set(userId, userMessages.slice(-this.maxPrivateMessages));
        }
        
        console.log(`💌 Добавлено приватное сообщение для пользователя ${userId}`);
    }
    
    getGroupMessages(limit = 50) {
        return this.groupMessages.slice(-limit);
    }
    
    getPrivateMessages(userId, limit = 50) {
        const messages = this.privateMessages.get(userId) || [];
        return messages.slice(-limit);
    }
    
    clearGroupMessages() {
        this.groupMessages = [];
        console.log('🗑️ Групповые сообщения очищены');
    }
    
    clearPrivateMessages(userId) {
        this.privateMessages.delete(userId);
        console.log(`🗑️ Приватные сообщения для пользователя ${userId} очищены`);
    }
    
    getStats() {
        return {
            groupMessagesCount: this.groupMessages.length,
            privateChatsCount: this.privateMessages.size,
            totalPrivateMessages: Array.from(this.privateMessages.values())
                .reduce((total, messages) => total + messages.length, 0)
        };
    }
}

module.exports = ChatManager;
