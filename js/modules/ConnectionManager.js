import CONFIG from '../config.js';
import { io } from 'socket.io-client';

export class ConnectionManager {
  constructor(app) {
    this.app=app; this.socket=null; this.attempts=0;
    this.serverWakeup=false;
    this.initListeners();
  }

  async connect() {
    if (!this.serverWakeup) {
      this.app.notificationManager.showNotification('Активация сервера может занять до 60 сек', 'info');
      const ok = await CONFIG.testServer();
      this.serverWakeup=true;
      if (!ok) return this.error('Сервер недоступен');
    }
    this.socket = io(CONFIG.SERVER_URL, {...CONFIG.SOCKET});
    this.setupEvents();
  }

  setupEvents() {
    this.socket.on('connect', () => {
      this.attempts=0;
      this.app.notificationManager.showNotification('Подключено', 'success');
    });
    this.socket.on('connect_error', err => this.retry(err));
    this.socket.on('disconnect', () => this.app.notificationManager.showNotification('Отключено', 'error'));
  }

  retry(error) {
    this.attempts++;
    if (this.attempts>CONFIG.SOCKET.reconnectionAttempts) return this.error('Не удалось подключиться');
    const delay=CONFIG.SOCKET.reconnectionDelay;
    this.app.notificationManager.showNotification(`Повтор через ${delay/1000}сек`, 'warning');
    setTimeout(()=>this.socket.connect(), delay);
  }

  error(msg) {
    this.app.notificationManager.showNotification(msg, 'error');
  }
}
