/* js/modules/ConnectionManager.js */
import { CONFIG, pingServer } from '../config.js';

export class ConnectionManager {
  constructor() { this.socket = null; }

  async connect() {
    if (!await pingServer()) throw new Error('Сервер недоступен');
    this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET);
    this.socket.on('connect', () => window.ui.notify('Подключено к серверу', 'success'));
    this.socket.on('connect_error', e => window.ui.notify('Нет соединения с сервером', 'error'));
  }
}

window.ConnectionManager = ConnectionManager;
