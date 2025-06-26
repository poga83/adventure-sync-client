/* js/modules/ConnectionManager.js */
import { CONFIG, pingServer, checkFlyRegion } from '../config.js';

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
      console.log('🚀 Подключение к Fly.io серверу...');
      
      // Проверяем доступность Fly.io сервера
      if (!await pingServer()) {
        throw new Error('Fly.io сервер недоступен');
      }
      
      // Получаем информацию о сервере
      this.serverInfo = await checkFlyRegion();
      
      // Создаем Socket.IO соединение
      this.socket = io(CONFIG.SERVER_URL, {
        ...CONFIG.SOCKET,
        extraHeaders: {
          'User-Agent': 'Adventure-Sync-Client-Fly'
        }
      });
      
      this.setupSocketEvents();
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка подключения к Fly.io:', error);
      window.ui?.showError(`Не удалось подключиться к серверу: ${error.message}`);
      return false;
    }
  }

  setupSocketEvents() {
    // Успешное подключение
    this.socket.on('connect', () => {
      console.log('✅ Подключен к Fly.io серверу, ID:', this.socket.id);
      console.log('🔗 Транспорт:', this.socket.io.engine.transport.name);
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus('connected');
      
      const region = this.serverInfo?.environment || 'production';
      window.ui?.notify(`Подключено к Fly.io (${region})`, 'success');
      
      // Отправляем информацию о пользователе
      const userData = this.getUserData();
      if (userData) {
        this.socket.emit('userConnected', userData);
        this.socket.emit('getUsers');
        this.socket.emit('getGroupChatHistory');
      }
    });

    // Подтверждение подключения от Fly.io сервера
    this.socket.on('connectionConfirmed', (data) => {
      console.log('🎯 Подтверждение от Fly.io сервера:', data);
      if (data.server === 'fly.io') {
        console.log('🛩️ Успешно подключен к Fly.io инфраструктуре');
      }
    });

    // Отключение
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Отключен от Fly.io сервера:', reason);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected');
      
      let message = 'Отключено от Fly.io сервера';
      if (reason === 'io server disconnect') {
        message = 'Fly.io сервер принудительно разорвал соединение';
      } else if (reason === 'transport close') {
        message = 'Потеря соединения с Fly.io';
      }
      
      window.ui?.notify(message, 'error');
    });

    // Ошибки подключения
    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения к Fly.io:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.updateConnectionStatus('offline');
        window.ui?.notify('Превышено количество попыток подключения к Fly.io', 'error');
        return;
      }
      
      this.updateConnectionStatus('connecting');
      const waitTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      window.ui?.notify(
        `Переподключение к Fly.io... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        'warning'
      );
    });

    // Уведомление о перезапуске сервера
    this.socket.on('serverShutdown', (data) => {
      console.log('🔄 Fly.io сервер перезапускается:', data.message);
      window.ui?.notify(data.message, 'info');
    });

    // Обработчики событий приложения
    this.socket.on('users', (users) => {
      console.log('👥 Получен список пользователей с Fly.io:', users.length);
      if (window.markerManager) {
        window.markerManager.updateUsers(users);
      }
    });

    this.socket.on('groupMessage', (message) => {
      console.log('💬 Сообщение от Fly.io:', message);
      if (window.chatManager) {
        window.chatManager.addGroupMessage(message);
      }
    });

    this.socket.on('userConnected', (user) => {
      console.log('👤 Пользователь подключился через Fly.io:', user.name);
      if (window.markerManager) {
        window.markerManager.addOrUpdateUser(user);
      }
      window.ui?.notify(`${user.name} онлайн`, 'info');
    });

    this.socket.on('userDisconnected', (userId) => {
      console.log('👤 Пользователь отключился через Fly.io:', userId);
      if (window.markerManager) {
        window.markerManager.removeUser(userId);
      }
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
        textElement.textContent = 'Fly.io';
        statusElement.style.opacity = '0.7';
        break;
      case 'connecting':
        iconElement.className = 'fas fa-spinner fa-spin';
        textElement.textContent = 'Подключение к Fly.io...';
        statusElement.style.opacity = '1';
        break;
      case 'disconnected':
        iconElement.className = 'fas fa-exclamation-triangle';
        textElement.textContent = 'Переподключение к Fly.io...';
        statusElement.style.opacity = '1';
        break;
      case 'offline':
        iconElement.className = 'fas fa-times-circle';
        textElement.textContent = 'Fly.io недоступен';
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

  sendMessage(message) {
    if (this.socket && this.isConnected) {
      this.socket.emit('groupMessage', message);
      return true;
    } else {
      window.ui?.notify('Нет соединения с Fly.io сервером', 'warning');
      return false;
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Отключение от Fly.io сервера');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

window.ConnectionManager = ConnectionManager;
