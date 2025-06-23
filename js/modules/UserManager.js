class UserManager {
    constructor() {
        this.users = new Map(); // socketId -> userData
        this.usersByUserId = new Map(); // userId -> userData
    }
    
    addUser(socketId, userData) {
        const user = {
            ...userData,
            socketId: socketId,
            connectedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        };
        
        this.users.set(socketId, user);
        this.usersByUserId.set(userData.id, user);
        
        console.log(`➕ Пользователь добавлен: ${userData.nickname} (${socketId})`);
        return user;
    }
    
    removeUser(socketId) {
        const user = this.users.get(socketId);
        if (user) {
            this.users.delete(socketId);
            this.usersByUserId.delete(user.id);
            console.log(`➖ Пользователь удален: ${user.nickname} (${socketId})`);
        }
        return user;
    }
    
    updateUserStatus(socketId, status) {
        const user = this.users.get(socketId);
        if (user) {
            user.status = status;
            user.lastSeen = new Date().toISOString();
            this.usersByUserId.set(user.id, user);
        }
        return user;
    }
    
    updateUserPosition(socketId, position) {
        const user = this.users.get(socketId);
        if (user) {
            user.position = position;
            user.lastSeen = new Date().toISOString();
            this.usersByUserId.set(user.id, user);
        }
        return user;
    }
    
    getUser(socketId) {
        return this.users.get(socketId);
    }
    
    getUserByUserId(userId) {
        return this.usersByUserId.get(userId);
    }
    
    getAllUsers() {
        return Array.from(this.users.values());
    }
    
    getUserCount() {
        return this.users.size;
    }
    
    getUsersByStatus(status) {
        return Array.from(this.users.values()).filter(user => user.status === status);
    }
}

module.exports = UserManager;
