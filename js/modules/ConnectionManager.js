class ConnectionManager {
  constructor(app) {
    this.app = app;
    this.socket = null;
    this.offlineQueue = [];
    this.attempts = 0;
    this.serverWakeupAttempted = false;
  }

  async connect() {
    if (!this.serverWakeupAttempted) {
      this.app.notificationManager.showNotification('Активация сервера... это может занять до 2 минут', 'info');
      const ready = await CONFIG.testServerWithWakeup();
      this.serverWakeupAttempted = true;
      if (!ready) return this.handleError('Сервер не активирован');
    }
    const available = await CONFIG.testServerConnection();
    if (!available) return this.handleError('Сервер недоступен');
    this.initSocket();
  }

  initSocket() {
    this.socket = io(CONFIG.SERVER_URL, {
      timeout: CONFIG.SOCKET.TIMEOUT,
      reconnectionAttempts: CONFIG.SOCKET.RECONNECTION_ATTEMPTS,
      reconnectionDelay: CONFIG.getExponentialBackoffDelay(this.attempts, CONFIG.SOCKET.RECONNECTION_DELAY, CONFIG.SOCKET.RECONNECTION_DELAY_MAX),
      transports: ['websocket', 'polling'],
      upgrade: CONFIG.SOCKET.UPGRADE
    });
    this.setupEvents();
  }

  setupEvents() {
    this.socket.on('connect', () => {
      this.attempts = 0;
      this.app.notificationManager.showNotification('Подключено к серверу', 'success');
    });
    this.socket.on('connect_error', err => this.retry(err));
    this.socket.on('disconnect', () => this.app.notificationManager.showNotification('Отключено от сервера', 'error'));
  }

  retry(error) {
    this.attempts++;
    if (this.attempts >= CONFIG.SOCKET.RECONNECTION_ATTEMPTS) {
      return this.handleError('Превышено число попыток подключения');
    }
    const delay = CONFIG.getExponentialBackoffDelay(this.attempts, CONFIG.SOCKET.RECONNECTION_DELAY, CONFIG.SOCKET.RECONNECTION_DELAY_MAX);
    this.app.notificationManager.showNotification(`Ошибка подключения. Повтор через ${delay/1000}s`, 'warning');
    setTimeout(() => this.socket.connect(), delay);
  }

  handleError(msg) {
    this.app.notificationManager.showNotification(msg, 'error');
    return false;
  }

  sendGroupMessage(msg) {
    if (this.socket.connected) this.socket.emit('groupMessage', msg);
    else this.offlineQueue.push(msg);
  }
}
