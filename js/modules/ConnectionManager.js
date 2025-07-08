/* js/modules/ConnectionManager.js */
import { CONFIG, pingServer } from '../config.js';

export class ConnectionManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = CONFIG.SOCKET.reconnectionAttempts;
    this.serverInfo = null;
  }

  async connect() {
    try {
      console.log('🚀 Подключение к Railway серверу...');
      
      // Проверяем доступность Railway сервера
      const pingResult = await pingServer();
      if (!pingResult.success) {
        throw new Error('Railway сервер недоступен');
      }
      
      this.serverInfo = pingResult.data;
      
      // Создаем Socket.IO соединение
      this.socket = io(CONFIG.SERVER_URL, {
        ...CONFIG.SOCKET,
        extraHeaders: {
          'User-Agent': 'Adventure-Sync-Client-Railway'
        }
      });
      
      this.setupSocketEvents();
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка подключения к Railway:', error);
      window.ui?.showError(`Не удалось подключиться к серверу: ${error.message}`);
      return false;
    }
  }

  setupSocketEvents() {
    // Успешное подключение
    this.socket.on('connect', () => {
      console.log('✅ Подключен к Railway серверу, ID:', this.socket.id);
      console.log('🔗 Транспорт:', this.socket.io.engine.transport.name);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      
      const platform = this.serverInfo?.platform || 'Railway';
      window.ui?.notify(`Подключено к ${platform}`, 'success');
      
      // Отправляем информацию о пользователе
      const userData = this.getUserData();
      if (userData) {
        this.socket.emit('userConnected', userData);
        this.socket.emit('getUsers');
      }
    });

    // Подтверждение подключения от Railway сервера
    this.socket.on('connectionConfirmed', (data) => {
      console.log('🎯 Подтверждение от Railway сервера:', data);
      if (data.server === 'railway') {
        console.log('🚂 Успешно подключен к Railway инфраструктуре');
      }
    });

    // Обработчики событий чата
    this.socket.on('groupMessage', (message) => {
      console.log('💬 Сообщение от Railway:', message);
      this.displayMessage(message);
    });

    // Обработчики событий пользователей
    this.socket.on('users', (users) => {
      console.log('👥 Получен список пользователей с Railway:', users.length);
      this.updateUsersList(users);
    });

    this.socket.on('userConnected', (user) => {
      console.log('👤 Пользователь подключился через Railway:', user.name);
      this.addUserToMap(user);
      window.ui?.notify(`${user.name} онлайн`, 'info');
    });

    this.socket.on('userDisconnected', (userId) => {
      console.log('👤 Пользователь отключился через Railway:', userId);
      this.removeUserFromMap(userId);
    });

    this.socket.on('userPositionChanged', (data) => {
      this.updateUserPosition(data.userId, data.position);
    });

    // Обработчики событий поездок
    this.socket.on('userJoinedTrip', (data) => {
      console.log('🎯 Пользователь присоединился к поездке:', data);
      window.ui?.notify(`${data.user.name} присоединился к поездке`, 'info');
    });

    this.socket.on('trackSaved', (data) => {
      if (data.success) {
        window.ui?.notify('Трек сохранен успешно', 'success');
      } else {
        window.ui?.notify('Ошибка сохранения трека', 'error');
      }
    });

    // Отключение
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Отключен от Railway сервера:', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
      
      let message = 'Отключено от Railway сервера';
      if (reason === 'io server disconnect') {
        message = 'Railway сервер принудительно разорвал соединение';
      } else if (reason === 'transport close') {
        message = 'Потеря соединения с Railway';
      }
      
      window.ui?.notify(message, 'error');
    });

    // Ошибки подключения
    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения к Railway:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('offline');
        window.ui?.notify('Превышено количество попыток подключения к Railway', 'error');
        return;
      }
      
      this.updateConnectionStatus('connecting');
      window.ui?.notify(
        `Переподключение к Railway... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        'warning'
      );
    });
  }

  updateConnectionStatus(status) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;

    const iconElement = statusElement.querySelector('i');
    const textElement = statusElement.querySelector('span');
    
    statusElement.className = `connection-status ${status}`;
    
    switch (status) {
      case 'connected':
        iconElement.className = 'fas fa-train';
        textElement.textContent = 'Railway';
        statusElement.style.opacity = '0.7';
        break;
      case 'connecting':
        iconElement.className = 'fas fa-spinner fa-spin';
        textElement.textContent = 'Подключение к Railway...';
        statusElement.style.opacity = '1';
        break;
      case 'disconnected':
        iconElement.className = 'fas fa-exclamation-triangle';
        textElement.textContent = 'Переподключение к Railway...';
        statusElement.style.opacity = '1';
        break;
      case 'offline':
        iconElement.className = 'fas fa-times-circle';
        textElement.textContent = 'Railway недоступен';
        statusElement.style.opacity = '1';
        break;
    }
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
        console.error('❌ Ошибка при чтении данных пользователя:', e);
      }
    }
    return null;
  }

  sendMessage(message, tripId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('groupMessage', {
        content: message,
        tripId: tripId
      });
      return true;
    } else {
      window.ui?.notify('Нет соединения с Railway сервером', 'warning');
      return false;
    }
  }

  joinTrip(tripId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('joinTrip', tripId);
      return true;
    }
    return false;
  }

  saveTrack(trackData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('saveTrack', trackData);
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
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="sender">${message.senderName}</span>
        <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div class="message-content">${message.content}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

  addUserToMap(user) {
    if (user.position && window.map) {
      // Добавление маркера пользователя на карту
      // Реализация зависит от используемой карты
    }
  }

  removeUserFromMap(userId) {
    // Удаление маркера пользователя с карты
    // Реализация зависит от используемой карты
  }

  updateUserPosition(userId, position) {
    // Обновление позиции пользователя на карте
    // Реализация зависит от используемой карты
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Отключение от Railway сервера');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

window.ConnectionManager = ConnectionManager;
