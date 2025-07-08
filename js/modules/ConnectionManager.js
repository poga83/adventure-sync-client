import { CONFIG, pingServer } from '../config.js';

export class ConnectionManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const serverAvailable = await pingServer();
      if (!serverAvailable) {
        throw new Error('Сервер недоступен');
      }

      this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET);
      this.setupSocketEvents();
      return true;
    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
      window.ui?.showError(`Не удалось подключиться к серверу: ${error.message}`);
      return false;
    }
  }

  setupSocketEvents() {
    this.socket.on('connect', () => {
      console.log('✅ Подключен к серверу, ID:', this.socket.id);
      this.isConnected = true;
      
      // Отправляем информацию о пользователе
      const userData = this.getUserData();
      if (userData) {
        this.socket.emit('userConnected', userData);
      }
    });

    this.socket.on('connectionConfirmed', (data) => {
      console.log('🎯 Подтверждение подключения:', data);
    });

    this.socket.on('users', (users) => {
      console.log('👥 Получен список пользователей:', users);
      this.updateUsers(users);
    });

    this.socket.on('groupMessage', (message) => {
      console.log('💬 Получено сообщение:', message);
      this.displayMessage(message);
    });

    this.socket.on('userPositionChanged', (data) => {
      console.log('📍 Обновлена позиция пользователя:', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Отключение от сервера:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения:', error);
    });
  }

  getUserData() {
    if (window.auth?.current()) {
      return window.auth.current();
    }
    
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

  updateUsers(users) {
    // Обновление UI списка пользователей
    const usersList = document.getElementById('usersList');
    if (usersList) {
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

  displayMessage(msg) {
    const container = document.getElementById('messagesContainer');
    if (container) {
      const messageElement = document.createElement('div');
      messageElement.className = 'message';
      messageElement.innerHTML = `
        <div class="message-header">
          <span class="sender">${msg.senderName}</span>
          <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="message-content">${msg.content}</div>
      `;
      container.appendChild(messageElement);
      container.scrollTop = container.scrollHeight;
    }
  }

  sendMessage(content, tripId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('groupMessage', { content, tripId });
      return true;
    }
    return false;
  }

  updatePosition(position) {
    if (this.socket && this.isConnected) {
      this.socket.emit('updatePosition', position);
    }
  }
}

window.ConnectionManager = ConnectionManager;
