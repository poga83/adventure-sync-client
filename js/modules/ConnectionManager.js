/* js/modules/ConnectionManager.js */
import { CONFIG, serverIsAlive } from '../config.js';

export class ConnectionManager {
  constructor () { this.socket = null; }

  async connect () {
    if (!await serverIsAlive()) throw new Error('Сервер недоступен');
    this.socket = io(CONFIG.SERVER_URL, CONFIG.SOCKET);

    this.socket.on('connect', () =>
      window.ui.notify('Подключено к серверу','success'));
    this.socket.on('connect_error', err =>
      window.ui.notify(`Ошибка подключения: ${err.message}`,'error'));
  }
}
window.ConnectionManager = ConnectionManager;
