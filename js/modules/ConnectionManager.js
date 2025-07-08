import { CONFIG, pingServer } from '../config.js';

export class ConnectionManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      console.log('🚀 Подключение к Railway...');
      
      const pingResult = await pingServer();
      if (!pingResult.success) {
        throw new Error('Railway сервер недоступен');
      }
      
      this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET);
      this.setupSocketEvents();
      
      return true;
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      return false;
    }
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('✅ Подключен к Railway, ID:', this.socket.id);
      this.isConnected = true;
      
      // Отправляем информацию о пользователе
      const userData = this.getUserData();
      if (userData) {
        this.socket.emit('userConnected', userData);
      }
    });

    this.socket.on('connectionConfirmed', (data) => {
      console.log('🎯 Подтверждение от Railway:', data);
    });

    this.socket.on('groupMessage', (message) => {
      console.log('💬 Сообщение:', message);
      this.displayMessage(message);
    });

    this.socket.on('users', (users) => {
      console.log('👥 Список пользователей:', users);
      this.updateUsersList(users);
    });

    this.socket.on('userConnected', (user) => {
      console.log('👤 Пользователь подключился:', user.name);
    });

    this.socket.on('userPositionChanged', (data) => {
      console.log('📍 Позиция обновлена:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Отключение:', reason);
      this.isConnected = false;
    });
  }

  getUserData() {
    const userData = localStorage.getItem('adv_user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (e) {
        console.error('❌ Ошибка чтения пользователя:', e);
      }
    }
    return null;
  }

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('groupMessage', message);
      return true;
    }
    return false;
  }

  updatePosition(position) {
    if (this.socket && this.isConnected) {
      this.socket.emit('updatePosition', position);
    }
  }

  displayMessage(message) {
    const container = document.getElementById('messagesContainer');
    if (!container) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="sender">${message.senderName}</span>
        <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${message.content}</div>
    `;
    
    container.appendChild(messageElement);
    container.scrollTop = container.scrollHeight;
  }

  updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    if (!usersList) return;

    usersList.innerHTML = '';
    users.forEach(user => {
      const userElement = document.createElement('div');
      userElement.className = 'user-item';
      userElement.innerHTML = `
        <span class="user-name">${user.name}</span>
        <span class="user-status">${user.status}</span>
      `;
      usersList.appendChild(userElement);
    });
  }
}

window.ConnectionManager = ConnectionManager;
