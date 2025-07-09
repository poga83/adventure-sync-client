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
      console.log('🚀 Подключение к Render серверу...');
      
      // Проверяем доступность Render сервера
      const pingResult = await pingServer();
      if (!pingResult.success) {
        throw new Error('Render сервер недоступен');
      }
      
      this.serverInfo = pingResult.data;
      
      // Создаем Socket.IO соединение
      this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET);
      
      this.setupSocketEvents();
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка подключения к Render:', error);
      window.ui?.showError(`Не удалось подключиться к серверу: ${error.message}`);
      return false;
    }
  }

  setupSocketEvents() {
    // Успешное подключение
    this.socket.on('connect', () => {
      console.log('✅ Подключен к Render серверу, ID:', this.socket.id);
      console.log('🔗 Транспорт:', this.socket.io.engine.transport.name);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      
      const platform = this.serverInfo?.platform || 'Render';
      window.ui?.notify(`Подключено к ${platform}`, 'success');
      
      // Отправляем информацию о пользователе
      const userData = this.getUserData();
      if (userData) {
        this.socket.emit('userConnected', userData);
      }
    });

    // Подтверждение подключения от Render сервера
    this.socket.on('connectionConfirmed', (data) => {
      console.log('🎯 Подтверждение от Render сервера:', data);
      if (data.server === 'render') {
        console.log('🌐 Успешно подключен к Render инфраструктуре');
      }
    });

    // Обработчики событий
    this.socket.on('groupMessage', (message) => {
      console.log('💬 Сообщение:', message);
      this.displayMessage(message);
    });

    this.socket.on('users', (users) => {
      console.log('👥 Получен список пользователей:', users.length);
      this.updateUsersList(users);
    });

    this.socket.on('userConnected', (user) => {
      console.log('👤 Пользователь подключился:', user.name);
      window.ui?.notify(`${user.name} онлайн`, 'info');
    });

    this.socket.on('userDisconnected', (userId) => {
      console.log('👤 Пользователь отключился:', userId);
      this.removeUserFromMap(userId);
    });

    this.socket.on('userPositionChanged', (data) => {
      this.updateUserPosition(data.userId, data.position);
    });

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
      console.log('❌ Отключен от Render сервера:', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
      
      let message = 'Отключено от Render сервера';
      if (reason === 'io server disconnect') {
        message = 'Render сервер принудительно разорвал соединение';
      }
      
      window.ui?.notify(message, 'error');
    });

    // Ошибки подключения
    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения к Render:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('offline');
        window.ui?.notify('Превышено количество попыток подключения к Render', 'error');
        return;
      }
      
      this.updateConnectionStatus('connecting');
      window.ui?.notify(
        `Переподключение к Render... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
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
        iconElement.className = 'fas fa-cloud';
        textElement.textContent = 'Render';
        statusElement.style.opacity = '0.7';
        break;
      case 'connecting':
        iconElement.className = 'fas fa-spinner fa-spin';
        textElement.textContent = 'Подключение к Render...';
        statusElement.style.opacity = '1';
        break;
      case 'disconnected':
        iconElement.className = 'fas fa-exclamation-triangle';
        textElement.textContent = 'Переподключение к Render...';
        statusElement.style.opacity = '1';
        break;
      case 'offline':
        iconElement.className = 'fas fa-times-circle';
        textElement.textContent = 'Render недоступен';
        statusElement.style.opacity = '1';
        break;
    }
  }

  getUserData() {
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
      window.ui?.notify('Нет соединения с Render сервером', 'warning');
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
    }
  }

  removeUserFromMap(userId) {
    // Удаление маркера пользователя с карты
  }

  updateUserPosition(userId, position) {
    // Обновление позиции пользователя на карте
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Отключение от Render сервера');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

window.ConnectionManager = ConnectionManager;
